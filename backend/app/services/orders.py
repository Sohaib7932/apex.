"""Order creation, payment and status rules (PRD 4.6, 4.7)."""

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session, selectinload

from app.models import CartItem, Deal, Order, OrderItem, Product, ProductVariant, User
from app.services import pricing

PAID_LIKE = ("paid", "shipped", "delivered")


class CheckoutError(ValueError):
    pass


def checkout_lines(db: Session, user: User) -> list[pricing.PricedLine]:
    """The selected, not-saved lines of the user's cart, priced from the database."""
    rows = db.scalars(
        select(CartItem).where(
            CartItem.user_id == user.id,
            CartItem.saved_for_later.is_(False),
            CartItem.selected.is_(True),
        )
    ).all()
    requests = [
        pricing.LineRequest(
            product_id=r.product_id,
            variant_id=r.variant_id,
            edition_id=r.edition_id,
            quantity=r.quantity,
            cart_item_id=r.id,
        )  # fmt: skip
        for r in rows
    ]
    return pricing.price_lines(db, requests)


def create_pending_order(
    db: Session,
    user: User,
    address: dict[str, Any],
    delivery_method: str,
    promo_code: str | None,
) -> Order:
    lines = checkout_lines(db, user)
    if not lines:
        raise CheckoutError("Your cart has no items selected for checkout.")
    short = [line for line in lines if not line.in_stock]
    if short:
        names = ", ".join(line.product.title for line in short[:2])
        raise CheckoutError(f"Not enough stock for: {names}. Please update your cart.")

    promo = pricing.load_promo(db, promo_code)
    if promo_code and promo is None:
        raise CheckoutError("That promo code isn't valid or has expired.")
    totals = pricing.totals_for_lines(lines, promo, delivery_method)

    order = Order(
        user_id=user.id,
        status="pending",
        subtotal_cents=totals.subtotal_cents,
        tax_cents=totals.tax_cents,
        shipping_cents=totals.shipping_cents,
        discount_cents=totals.discount_cents,
        total_cents=totals.total_cents,
        promo_code=totals.promo_code,
        delivery_method=delivery_method,
        address_snapshot=address,
    )
    for line in lines:
        p = line.product
        order.items.append(
            OrderItem(
                product_id=p.id,
                variant_id=line.variant.id if line.variant else None,
                edition_id=line.edition.id if line.edition else None,
                seller_id=p.seller_id,
                title_snapshot=p.title,
                image_snapshot=(line.variant.image_url if line.variant and line.variant.image_url else None)
                or (p.images[0].url if p.images else None),
                seller_name_snapshot=p.seller.store_name,
                variant_label_snapshot=line.variant_label,
                product_slug_snapshot=p.slug,
                unit_price_cents=line.unit_price_cents,
                quantity=line.quantity,
            )
        )
    db.add(order)
    db.flush()
    return order


def mark_paid(db: Session, order_id: int, payment_intent_id: str | None = None) -> bool:
    """pending -> paid, then apply stock and cart effects. Idempotent: the status
    transition is a single conditional UPDATE, so a repeated webhook does nothing."""
    row = db.execute(
        update(Order)
        .where(Order.id == order_id, Order.status == "pending")
        .values(status="paid", paid_at=datetime.now(UTC), stripe_payment_intent_id=payment_intent_id)
        .returning(Order.id)
    ).first()
    if row is None:
        db.rollback()
        return False

    order = db.scalar(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    assert order is not None
    for item in order.items:
        db.execute(
            update(Product)
            .where(Product.id == item.product_id)
            .values(
                stock=func.greatest(Product.stock - item.quantity, 0),
                bought_past_month=Product.bought_past_month + item.quantity,
            )
        )
        if item.variant_id:
            db.execute(
                update(ProductVariant)
                .where(ProductVariant.id == item.variant_id)
                .values(stock=func.greatest(ProductVariant.stock - item.quantity, 0))
            )
        db.execute(
            update(Deal)
            .where(Deal.product_id == item.product_id)
            .values(claimed_qty=func.least(Deal.claimed_qty + item.quantity, Deal.total_qty))
        )
        db.execute(
            delete(CartItem).where(
                CartItem.user_id == order.user_id,
                CartItem.product_id == item.product_id,
                CartItem.saved_for_later.is_(False),
                CartItem.variant_id.is_(None)
                if item.variant_id is None
                else CartItem.variant_id == item.variant_id,
                CartItem.edition_id.is_(None)
                if item.edition_id is None
                else CartItem.edition_id == item.edition_id,
            )
        )
    db.commit()
    return True


def cancel_pending(db: Session, order_id: int) -> bool:
    row = db.execute(
        update(Order)
        .where(Order.id == order_id, Order.status == "pending")
        .values(status="cancelled")
        .returning(Order.id)
    ).first()
    db.commit()
    return row is not None


def refresh_shipped_status(order: Order) -> None:
    """An order becomes shipped once every item is shipped (PRD 4.7)."""
    if order.status == "paid" and order.items and all(i.fulfillment_status == "shipped" for i in order.items):
        order.status = "shipped"


def display_status(order: Order) -> str:
    if order.status == "pending":
        return "Awaiting payment"
    if order.status == "paid":
        shipped = [i for i in order.items if i.fulfillment_status == "shipped"]
        return "Partially shipped" if shipped else "Preparing"
    return order.status.capitalize()


def estimated_delivery(order: Order) -> datetime:
    start = order.paid_at or order.created_at
    days = 1 if order.delivery_method == "one_day" else 4
    return start + timedelta(days=days)
