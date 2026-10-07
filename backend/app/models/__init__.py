"""SQLAlchemy models (PRD section 5). Money is always integer cents."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

PRODUCT_STATUSES = ("draft", "published", "archived")
ORDER_STATUSES = ("pending", "paid", "shipped", "delivered", "cancelled")
FULFILLMENT_STATUSES = ("unfulfilled", "shipped")
DELIVERY_SPEEDS = ("one_day", "two_day", "standard")
VARIANT_KINDS = ("color", "edition")


def _in(col: str, values: tuple[str, ...]) -> str:
    return f"{col} IN ({', '.join(repr(v) for v in values)})"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(80))

    seller: Mapped["Seller | None"] = relationship(back_populates="user", uselist=False)


class Seller(TimestampMixin, Base):
    __tablename__ = "sellers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    store_name: Mapped[str] = mapped_column(String(60), unique=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(280))
    logo_url: Mapped[str | None] = mapped_column(String(1000))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="seller")


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    line1: Mapped[str] = mapped_column(String(200))
    line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(50))
    zip: Mapped[str] = mapped_column(String(20))
    phone: Mapped[str] = mapped_column(String(30))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"))
    icon: Mapped[str | None] = mapped_column(String(40))
    position: Mapped[int] = mapped_column(Integer, default=0)

    parent: Mapped["Category | None"] = relationship(remote_side=[id])


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(80))


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint(_in("status", PRODUCT_STATUSES), name="ck_products_status"),
        CheckConstraint(_in("delivery_speed", DELIVERY_SPEEDS), name="ck_products_delivery_speed"),
        CheckConstraint("price_cents > 0", name="ck_products_price_positive"),
        CheckConstraint("stock >= 0", name="ck_products_stock_nonneg"),
        Index("ix_products_category_price", "category_id", "price_cents"),
        Index("ix_products_seller_status", "seller_id", "status"),
        Index(
            "ix_products_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ),
        Index("ix_products_facets", "facets", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("sellers.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    price_cents: Mapped[int] = mapped_column(Integer)
    list_price_cents: Mapped[int | None] = mapped_column(Integer)
    rating_avg: Mapped[float] = mapped_column(Numeric(2, 1), default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    # Star counts behind rating_avg/rating_count: {"5": n, "4": n, ...}
    rating_breakdown: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict)
    bought_past_month: Mapped[int] = mapped_column(Integer, default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[list[str]] = mapped_column(ARRAY(String(40)), default=list)
    highlights: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    specs: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    facets: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    delivery_speed: Mapped[str] = mapped_column(String(20), default="standard")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    seller: Mapped[Seller] = relationship()
    brand: Mapped[Brand] = relationship()
    category: Mapped[Category] = relationship()
    images: Mapped[list["ProductImage"]] = relationship(
        order_by="ProductImage.position", cascade="all, delete-orphan"
    )
    variants: Mapped[list["ProductVariant"]] = relationship(
        order_by="ProductVariant.id", cascade="all, delete-orphan"
    )
    deal: Mapped["Deal | None"] = relationship(uselist=False, viewonly=True)


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(1000))
    position: Mapped[int] = mapped_column(Integer, default=0)


class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (CheckConstraint(_in("kind", VARIANT_KINDS), name="ck_variants_kind"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    label: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str | None] = mapped_column(String(200))
    swatch: Mapped[str | None] = mapped_column(String(20))
    price_delta_cents: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(1000))
    stock: Mapped[int] = mapped_column(Integer, default=0)


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    rating: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship()

    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating"),)


class CartItem(TimestampMixin, Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "product_id",
            "variant_id",
            "edition_id",
            name="uq_cart_line",
            postgresql_nulls_not_distinct=True,
        ),
        CheckConstraint("quantity > 0", name="ck_cart_quantity_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    # A line can pick one variant of each kind: variant_id (color) and edition_id (edition).
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id", ondelete="CASCADE"))
    edition_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id", ondelete="CASCADE"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    saved_for_later: Mapped[bool] = mapped_column(Boolean, default=False)
    selected: Mapped[bool] = mapped_column(Boolean, default=True)


class WishlistItem(TimestampMixin, Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_wishlist_line"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), unique=True)
    discount_pct: Mapped[int] = mapped_column(Integer)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    total_qty: Mapped[int] = mapped_column(Integer)
    claimed_qty: Mapped[int] = mapped_column(Integer, default=0)


class PromoCode(Base):
    __tablename__ = "promo_codes"

    code: Mapped[str] = mapped_column(String(40), primary_key=True)
    percent_off: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Order(TimestampMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(_in("status", ORDER_STATUSES), name="ck_orders_status"),
        Index("ix_orders_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    subtotal_cents: Mapped[int] = mapped_column(Integer)
    tax_cents: Mapped[int] = mapped_column(Integer)
    shipping_cents: Mapped[int] = mapped_column(Integer)
    discount_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer)
    promo_code: Mapped[str | None] = mapped_column(String(40))
    delivery_method: Mapped[str] = mapped_column(String(20), default="standard")
    address_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship()
    items: Mapped[list["OrderItem"]] = relationship(
        order_by="OrderItem.id", cascade="all, delete-orphan", back_populates="order"
    )

    @property
    def number(self) -> str:
        return f"APX-{1000000 + self.id}"


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint(_in("fulfillment_status", FULFILLMENT_STATUSES), name="ck_order_items_fulfillment"),
        Index("ix_order_items_seller_order", "seller_id", "order_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id", ondelete="SET NULL"))
    edition_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id", ondelete="SET NULL"))
    seller_id: Mapped[int] = mapped_column(ForeignKey("sellers.id"))
    title_snapshot: Mapped[str] = mapped_column(String(200))
    image_snapshot: Mapped[str | None] = mapped_column(String(1000))
    seller_name_snapshot: Mapped[str] = mapped_column(String(60))
    variant_label_snapshot: Mapped[str | None] = mapped_column(String(200))
    product_slug_snapshot: Mapped[str] = mapped_column(String(160))
    unit_price_cents: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer)
    fulfillment_status: Mapped[str] = mapped_column(String(20), default="unfulfilled")
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped[Order] = relationship(back_populates="items")


class LoginAttempt(Base):
    """Failed sign-ins, so the login limit holds across serverless instances (PRD 7)."""

    __tablename__ = "login_attempts"
    __table_args__ = (Index("ix_login_attempts_key_at", "key", "attempted_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # "<client ip>|<email>", the same key the limiter used in memory before.
    key: Mapped[str] = mapped_column(String(320))
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
