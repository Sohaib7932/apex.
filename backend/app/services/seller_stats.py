"""Seller Overview numbers (PRD 4.10). Everything is scoped to one store's order items."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.models import Order, OrderItem, Product, Seller

LOW_STOCK = 5
REVENUE_STATUSES = ("paid", "shipped", "delivered")


def _line_total():
    return OrderItem.unit_price_cents * OrderItem.quantity


def overview(db: Session, seller: Seller, days: int = 30) -> dict:
    now = datetime.now(UTC)
    since = now - timedelta(days=days)
    counted = and_(
        OrderItem.seller_id == seller.id,
        Order.status.in_(REVENUE_STATUSES),
    )
    recent = and_(counted, Order.paid_at >= since)

    revenue, units, orders = db.execute(
        select(
            func.coalesce(func.sum(_line_total()), 0),
            func.coalesce(func.sum(OrderItem.quantity), 0),
            func.count(func.distinct(Order.id)),
        )
        .select_from(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .where(recent)
    ).one()

    earnings = db.scalar(
        select(func.coalesce(func.sum(_line_total()), 0))
        .select_from(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .where(counted)
    )

    low_stock = db.scalar(
        select(func.count(Product.id)).where(
            Product.seller_id == seller.id, Product.status == "published", Product.stock <= LOW_STOCK
        )
    )
    to_ship = db.scalar(
        select(func.count(func.distinct(Order.id)))
        .select_from(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            OrderItem.seller_id == seller.id,
            Order.status == "paid",
            OrderItem.fulfillment_status == "unfulfilled",
        )
    )

    day = func.date_trunc("day", Order.paid_at)
    rows = db.execute(
        select(day, func.sum(_line_total()))
        .select_from(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .where(recent)
        .group_by(day)
    ).all()
    by_day: dict[date, int] = {d.date(): int(v) for d, v in rows}
    start = (now - timedelta(days=days - 1)).date()
    series = [
        {
            "date": (start + timedelta(days=i)).isoformat(),
            "revenue_cents": by_day.get(start + timedelta(days=i), 0),
        }
        for i in range(days)
    ]

    return {
        "revenue_cents": int(revenue),
        "orders": int(orders),
        "units": int(units),
        "low_stock": int(low_stock or 0),
        "to_ship": int(to_ship or 0),
        "earnings_cents": int(earnings or 0),
        "daily": series,
    }


def order_aggregates(seller: Seller):
    """Per-order totals of this seller's lines, as a subquery."""
    return (
        select(
            OrderItem.order_id.label("order_id"),
            func.sum(OrderItem.quantity).label("units"),
            func.sum(_line_total()).label("subtotal"),
            func.sum(case((OrderItem.fulfillment_status == "unfulfilled", 1), else_=0)).label("unfulfilled"),
        )
        .where(OrderItem.seller_id == seller.id)
        .group_by(OrderItem.order_id)
        .subquery()
    )


def seller_fulfillment(order_status: str, unfulfilled: int) -> str:
    if order_status == "cancelled":
        return "cancelled"
    if unfulfilled:
        return "to_ship"
    return "delivered" if order_status == "delivered" else "shipped"
