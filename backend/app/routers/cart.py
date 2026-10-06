from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.deps import DB, CurrentUser
from app.models import CartItem, User
from app.services import pricing
from app.services.pricing import LineRequest, PricedLine

router = APIRouter(prefix="/cart", tags=["cart"])


class CartLineOut(BaseModel):
    key: str
    id: int | None
    product_id: int
    variant_id: int | None
    edition_id: int | None
    slug: str
    title: str
    brand: str
    image: str | None
    seller_name: str
    variant_label: str | None
    unit_price_cents: int
    list_price_cents: int | None
    quantity: int
    line_total_cents: int
    stock: int
    in_stock: bool
    delivery_speed: str
    saved_for_later: bool
    selected: bool


class PromoOut(BaseModel):
    code: str
    percent_off: int


class SummaryOut(BaseModel):
    item_count: int
    subtotal_cents: int
    discount_cents: int
    tax_cents: int
    shipping_cents: int
    total_cents: int
    free_shipping_threshold_cents: int
    amount_to_free_shipping_cents: int


class CartOut(BaseModel):
    items: list[CartLineOut]
    saved: list[CartLineOut]
    summary: SummaryOut
    promo: PromoOut | None
    promo_error: str | None = None


class GuestLine(BaseModel):
    product_id: int
    variant_id: int | None = None
    edition_id: int | None = None
    quantity: int = Field(1, ge=1, le=pricing.MAX_LINE_QUANTITY)
    saved_for_later: bool = False
    selected: bool = True


class PriceIn(BaseModel):
    items: list[GuestLine] = Field(default_factory=list, max_length=100)
    promo: str | None = None


class MergeIn(BaseModel):
    items: list[GuestLine] = Field(default_factory=list, max_length=100)


class AddIn(BaseModel):
    product_id: int
    variant_id: int | None = None
    edition_id: int | None = None
    quantity: int = Field(1, ge=1, le=pricing.MAX_LINE_QUANTITY)


class PatchIn(BaseModel):
    quantity: int | None = Field(None, ge=1, le=pricing.MAX_LINE_QUANTITY)
    saved_for_later: bool | None = None
    selected: bool | None = None


class PromoIn(BaseModel):
    code: str = Field(max_length=40)


INVALID_PROMO = "That promo code isn't valid or has expired."


def line_out(line: PricedLine) -> CartLineOut:
    p, r = line.product, line.request
    list_price = None
    if p.list_price_cents:
        deltas = sum(v.price_delta_cents for v in (line.variant, line.edition) if v is not None)
        list_price = p.list_price_cents + deltas
    return CartLineOut(
        key=f"{p.id}:{r.variant_id or 0}:{r.edition_id or 0}",
        id=r.cart_item_id,
        product_id=p.id,
        variant_id=r.variant_id,
        edition_id=r.edition_id,
        slug=p.slug,
        title=p.title,
        brand=p.brand.name,
        image=(line.variant.image_url if line.variant and line.variant.image_url else None)
        or (p.images[0].url if p.images else None),
        seller_name=p.seller.store_name,
        variant_label=line.variant_label,
        unit_price_cents=line.unit_price_cents,
        list_price_cents=list_price,
        quantity=r.quantity,
        line_total_cents=line.line_total_cents,
        stock=line.available,
        in_stock=line.in_stock,
        delivery_speed=p.delivery_speed,
        saved_for_later=r.saved_for_later,
        selected=r.selected,
    )


def build_cart(db: DB, requests: list[LineRequest], promo_code: str | None) -> CartOut:
    lines = pricing.price_lines(db, requests)
    promo = pricing.load_promo(db, promo_code)
    totals = pricing.totals_for_lines(lines, promo)
    return CartOut(
        items=[line_out(x) for x in lines if not x.request.saved_for_later],
        saved=[line_out(x) for x in lines if x.request.saved_for_later],
        summary=SummaryOut(
            item_count=totals.item_count,
            subtotal_cents=totals.subtotal_cents,
            discount_cents=totals.discount_cents,
            tax_cents=totals.tax_cents,
            shipping_cents=totals.shipping_cents,
            total_cents=totals.total_cents,
            free_shipping_threshold_cents=totals.free_shipping_threshold_cents,
            amount_to_free_shipping_cents=totals.amount_to_free_shipping_cents,
        ),
        promo=PromoOut(code=promo.code, percent_off=promo.percent_off) if promo else None,
        promo_error=INVALID_PROMO if promo_code and promo is None else None,
    )


def user_requests(db: DB, user: User) -> list[LineRequest]:
    rows = db.scalars(select(CartItem).where(CartItem.user_id == user.id).order_by(CartItem.created_at)).all()
    return [
        LineRequest(
            product_id=r.product_id,
            variant_id=r.variant_id,
            edition_id=r.edition_id,
            quantity=r.quantity,
            saved_for_later=r.saved_for_later,
            selected=r.selected,
            cart_item_id=r.id,
        )
        for r in rows
    ]


def user_cart(db: DB, user: User, promo: str | None) -> CartOut:
    return build_cart(db, user_requests(db, user), promo)


def _own_item(db: DB, user: User, item_id: int) -> CartItem:
    item = db.get(CartItem, item_id)
    if item is None or item.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That item is no longer in your cart.")
    return item


def _find_line(db: DB, user: User, product_id: int, variant_id: int | None, edition_id: int | None):
    return db.scalar(
        select(CartItem).where(
            CartItem.user_id == user.id,
            CartItem.product_id == product_id,
            CartItem.variant_id.is_(None) if variant_id is None else CartItem.variant_id == variant_id,
            CartItem.edition_id.is_(None) if edition_id is None else CartItem.edition_id == edition_id,
        )
    )


def _resolve(db: DB, product_id: int, variant_id: int | None, edition_id: int | None):
    product = pricing.load_products(db, {product_id}).get(product_id)
    if product is None or product.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This product isn't available.")
    try:
        variant, edition = pricing.resolve_options(product, variant_id, edition_id)
    except pricing.PricingError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from e
    return product, variant, edition


Promo = Annotated[str | None, Query(max_length=40)]


@router.get("", response_model=CartOut)
def get_cart(db: DB, user: CurrentUser, promo: Promo = None) -> CartOut:
    return user_cart(db, user, promo)


@router.post("/price", response_model=CartOut)
def price_guest_cart(db: DB, body: PriceIn) -> CartOut:
    """Prices a guest (localStorage) cart so guests see server-calculated totals."""
    requests = [LineRequest(**line.model_dump()) for line in body.items]
    return build_cart(db, requests, body.promo)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_item(db: DB, user: CurrentUser, body: AddIn, promo: Promo = None) -> CartOut:
    product, variant, edition = _resolve(db, body.product_id, body.variant_id, body.edition_id)
    available = pricing.available_stock(product, variant)
    if available <= 0:
        raise HTTPException(status.HTTP_409_CONFLICT, "Sorry, this item is out of stock.")
    variant_id, edition_id = (variant.id if variant else None), (edition.id if edition else None)
    item = _find_line(db, user, product.id, variant_id, edition_id)
    current = item.quantity if item else 0
    wanted = min(current + body.quantity, pricing.MAX_LINE_QUANTITY)
    if wanted > available:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Only {available} left in stock" + (f" and {current} already in your cart." if current else "."),
        )
    if item:
        item.quantity = wanted
        item.saved_for_later = False
        item.selected = True
    else:
        db.add(
            CartItem(
                user_id=user.id,
                product_id=product.id,
                variant_id=variant_id,
                edition_id=edition_id,
                quantity=wanted,
            )  # fmt: skip
        )
    db.commit()
    return user_cart(db, user, promo)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(db: DB, user: CurrentUser, item_id: int, body: PatchIn, promo: Promo = None) -> CartOut:
    item = _own_item(db, user, item_id)
    if body.quantity is not None:
        product, variant, _ = _resolve(db, item.product_id, item.variant_id, item.edition_id)
        available = pricing.available_stock(product, variant)
        if body.quantity > available:
            raise HTTPException(status.HTTP_409_CONFLICT, f"Only {available} left in stock.")
        item.quantity = body.quantity
    if body.saved_for_later is not None:
        item.saved_for_later = body.saved_for_later
        if not body.saved_for_later:
            item.selected = True
    if body.selected is not None:
        item.selected = body.selected
    db.commit()
    return user_cart(db, user, promo)


@router.delete("/items/{item_id}", response_model=CartOut)
def delete_item(db: DB, user: CurrentUser, item_id: int, promo: Promo = None) -> CartOut:
    db.delete(_own_item(db, user, item_id))
    db.commit()
    return user_cart(db, user, promo)


class SelectAllIn(BaseModel):
    selected: bool


@router.post("/select-all", response_model=CartOut)
def select_all(db: DB, user: CurrentUser, body: SelectAllIn, promo: Promo = None) -> CartOut:
    for item in db.scalars(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.saved_for_later.is_(False))
    ):
        item.selected = body.selected
    db.commit()
    return user_cart(db, user, promo)


@router.post("/saved/move-all", response_model=CartOut)
def move_all_saved(db: DB, user: CurrentUser, promo: Promo = None) -> CartOut:
    for item in db.scalars(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.saved_for_later.is_(True))
    ):
        item.saved_for_later = False
        item.selected = True
    db.commit()
    return user_cart(db, user, promo)


@router.post("/merge", response_model=CartOut)
def merge(db: DB, user: CurrentUser, body: MergeIn, promo: Promo = None) -> CartOut:
    """Merge the guest cart after login: no duplicates, the higher quantity wins."""
    for line in body.items:
        try:
            product, variant, edition = _resolve(db, line.product_id, line.variant_id, line.edition_id)
        except HTTPException:
            continue
        available = pricing.available_stock(product, variant)
        if available <= 0:
            continue
        variant_id, edition_id = (variant.id if variant else None), (edition.id if edition else None)
        qty = min(line.quantity, available)
        item = _find_line(db, user, product.id, variant_id, edition_id)
        if item:
            item.quantity = max(item.quantity, qty)
        else:
            db.add(
                CartItem(
                    user_id=user.id,
                    product_id=product.id,
                    variant_id=variant_id,
                    edition_id=edition_id,
                    quantity=qty,
                    saved_for_later=line.saved_for_later,
                    selected=line.selected,
                )  # fmt: skip
            )
            db.flush()
    db.commit()
    return user_cart(db, user, promo)


@router.post("/promo", response_model=PromoOut)
def check_promo(db: DB, body: PromoIn) -> PromoOut:
    promo = pricing.load_promo(db, body.code)
    if promo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, INVALID_PROMO)
    return PromoOut(code=promo.code, percent_off=promo.percent_off)
