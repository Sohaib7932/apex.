import logging
from datetime import datetime
from typing import Annotated, Any
from urllib.parse import urlparse

import stripe
from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.deps import DB, CurrentUser
from app.models import Address, Order, User
from app.services import orders as order_svc
from app.services import stripe_checkout
from app.services.catalog import pages_for

logger = logging.getLogger(__name__)

router = APIRouter(tags=["orders"])


class AddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    line1: str = Field(min_length=3, max_length=200)
    line2: str | None = Field(None, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=50)
    zip: str = Field(pattern=r"^\d{5}(-\d{4})?$")
    phone: str = Field(pattern=r"^[0-9+()\-.\s]{7,30}$")


class AddressOut(AddressIn):
    id: int
    is_default: bool


class CheckoutIn(BaseModel):
    address: AddressIn
    delivery_method: str = Field("standard", pattern="^(standard|one_day)$")
    promo_code: str | None = Field(None, max_length=40)
    save_address: bool = True


class CheckoutOut(BaseModel):
    order_id: int
    url: str


class ConfirmIn(BaseModel):
    order_id: int


class OrderItemOut(BaseModel):
    id: int
    product_slug: str
    title: str
    image: str | None
    variant_label: str | None
    seller_name: str
    unit_price_cents: int
    quantity: int
    line_total_cents: int
    fulfillment_status: str
    shipped_at: datetime | None


class OrderOut(BaseModel):
    id: int
    number: str
    status: str
    display_status: str
    created_at: datetime
    paid_at: datetime | None
    estimated_delivery: datetime
    subtotal_cents: int
    discount_cents: int
    tax_cents: int
    shipping_cents: int
    total_cents: int
    promo_code: str | None
    delivery_method: str
    address: dict[str, Any]
    item_count: int
    items: list[OrderItemOut]


class OrderPage(BaseModel):
    items: list[OrderOut]
    total: int
    page: int
    pages: int


def order_out(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        number=order.number,
        status=order.status,
        display_status=order_svc.display_status(order),
        created_at=order.created_at,
        paid_at=order.paid_at,
        estimated_delivery=order_svc.estimated_delivery(order),
        subtotal_cents=order.subtotal_cents,
        discount_cents=order.discount_cents,
        tax_cents=order.tax_cents,
        shipping_cents=order.shipping_cents,
        total_cents=order.total_cents,
        promo_code=order.promo_code,
        delivery_method=order.delivery_method,
        address=order.address_snapshot,
        item_count=sum(i.quantity for i in order.items),
        items=[
            OrderItemOut(
                id=i.id,
                product_slug=i.product_slug_snapshot,
                title=i.title_snapshot,
                image=i.image_snapshot,
                variant_label=i.variant_label_snapshot,
                seller_name=i.seller_name_snapshot,
                unit_price_cents=i.unit_price_cents,
                quantity=i.quantity,
                line_total_cents=i.unit_price_cents * i.quantity,
                fulfillment_status=i.fulfillment_status,
                shipped_at=i.shipped_at,
            )
            for i in order.items
        ],
    )


def _own_order(db: DB, user: User, order_id: int) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    if order is None or order.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return order


def _site_url(request: Request) -> str:
    configured = get_settings().frontend_url.rstrip("/")
    if configured:
        return configured
    for header in ("origin", "referer"):
        value = request.headers.get(header)
        if value:
            u = urlparse(value)
            if u.scheme in ("http", "https") and u.netloc:
                return f"{u.scheme}://{u.netloc}"
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "FRONTEND_URL is not configured.")


@router.get("/addresses", response_model=list[AddressOut])
def list_addresses(db: DB, user: CurrentUser) -> list[AddressOut]:
    rows = db.scalars(
        select(Address)
        .where(Address.user_id == user.id)
        .order_by(Address.is_default.desc(), Address.id.desc())
    ).all()
    return [AddressOut.model_validate(a, from_attributes=True) for a in rows]


def _save_default_address(db: DB, user: User, address: AddressIn) -> None:
    for a in db.scalars(select(Address).where(Address.user_id == user.id, Address.is_default.is_(True))):
        a.is_default = False
    db.add(Address(user_id=user.id, is_default=True, **address.model_dump()))


@router.post("/checkout/session", response_model=CheckoutOut)
def create_checkout(db: DB, user: CurrentUser, body: CheckoutIn, request: Request) -> CheckoutOut:
    base_url = _site_url(request)
    try:
        order = order_svc.create_pending_order(
            db, user, body.address.model_dump(), body.delivery_method, body.promo_code
        )
    except order_svc.CheckoutError as e:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e
    if body.save_address:
        _save_default_address(db, user, body.address)
    try:
        session = stripe_checkout.create_session(order, user.email, base_url)
    except stripe_checkout.PaymentsNotConfigured as e:
        db.rollback()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from e
    except stripe.StripeError as e:
        db.rollback()
        logger.error("stripe session failed", extra={"fields": {"stripe_error": type(e).__name__}})
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "We couldn't reach the payment provider. Please try again."
        ) from e
    order.stripe_session_id = session.id
    db.commit()
    return CheckoutOut(order_id=order.id, url=session.url or "")


@router.post("/checkout/confirm", response_model=OrderOut)
def confirm_checkout(db: DB, user: CurrentUser, body: ConfirmIn) -> OrderOut:
    """Called by the success page. Asks Stripe directly (never trusts the redirect) and
    applies the same idempotent transition as the webhook, in case the webhook is slow."""
    order = _own_order(db, user, body.order_id)
    if order.status == "pending" and order.stripe_session_id:
        try:
            session = stripe_checkout.retrieve_session(order.stripe_session_id)
            if session.payment_status == "paid":
                pi = session.payment_intent if isinstance(session.payment_intent, str) else None
                order_svc.mark_paid(db, order.id, pi)
        except (stripe.StripeError, stripe_checkout.PaymentsNotConfigured):
            logger.warning("checkout confirm: could not reach Stripe")
        db.expire_all()
        order = _own_order(db, user, body.order_id)
    return order_out(order)


@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(
    request: Request, db: DB, stripe_signature: Annotated[str | None, Header()] = None
) -> dict[str, bool]:
    payload = await request.body()
    try:
        event = stripe_checkout.construct_event(payload, stripe_signature or "")
    except stripe_checkout.PaymentsNotConfigured as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Webhook not configured.") from e
    except (ValueError, stripe.SignatureVerificationError) as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid signature.") from e

    obj = event["data"]["object"]
    order_id = (obj.get("metadata") or {}).get("order_id") or obj.get("client_reference_id")
    if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if order_id and obj.get("payment_status") == "paid":
            pi = obj.get("payment_intent") if isinstance(obj.get("payment_intent"), str) else None
            order_svc.mark_paid(db, int(order_id), pi)
    elif event["type"] in ("checkout.session.expired", "checkout.session.async_payment_failed"):
        if order_id:
            order_svc.cancel_pending(db, int(order_id))
    return {"received": True}


@router.get("/orders", response_model=OrderPage)
def list_orders(
    db: DB,
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 10,
) -> OrderPage:
    # Unpaid checkouts the buyer abandoned aren't real orders; hide them.
    where = (Order.user_id == user.id, Order.status != "pending")
    total = db.scalar(select(func.count(Order.id)).where(*where)) or 0
    rows = db.scalars(
        select(Order)
        .where(*where)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return OrderPage(
        items=[order_out(o) for o in rows], total=total, page=page, pages=pages_for(total, per_page)
    )


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(db: DB, user: CurrentUser, order_id: int) -> OrderOut:
    return order_out(_own_order(db, user, order_id))
