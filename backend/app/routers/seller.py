"""Seller workspace API (PRD 4.10). Every query is scoped to the store of the signed-in
user; another store's product or order is a 404 so ids don't leak."""

import re
import secrets
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import and_, func, select
from sqlalchemy.orm import selectinload

from app.core.deps import DB, CurrentSeller, CurrentUser
from app.models import (
    Brand,
    CartItem,
    Category,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductVariant,
    Seller,
)
from app.services import orders as order_svc
from app.services import seller_stats
from app.services.catalog import BADGES, pages_for

router = APIRouter(prefix="/seller", tags=["seller"])


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:70] or "item"


def _clean_url(url: str | None) -> str | None:
    if url is None:
        return None
    url = url.strip()
    if not url:
        return None
    if not (url.startswith("https://") or url.startswith("/")) or len(url) > 1000 or " " in url:
        raise ValueError("Use an image URL that starts with https://")
    return url


# ---------------------------------------------------------------- store


class StoreIn(BaseModel):
    store_name: str
    description: str

    @field_validator("store_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not 3 <= len(v) <= 60:
            raise ValueError("Store name must be 3 to 60 characters.")
        return v

    @field_validator("description")
    @classmethod
    def _desc(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Add a short description of your store.")
        if len(v) > 280:
            raise ValueError("Keep the description to 280 characters or fewer.")
        return v


class StorePatch(BaseModel):
    store_name: str | None = None
    description: str | None = None
    logo_url: str | None = None

    @field_validator("store_name")
    @classmethod
    def _name(cls, v: str | None) -> str | None:
        return None if v is None else StoreIn._name(v)

    @field_validator("description")
    @classmethod
    def _desc(cls, v: str | None) -> str | None:
        return None if v is None else StoreIn._desc(v)

    @field_validator("logo_url")
    @classmethod
    def _logo(cls, v: str | None) -> str | None:
        return _clean_url(v)


class StoreOut(BaseModel):
    id: int
    store_name: str
    slug: str
    description: str
    logo_url: str | None
    created_at: datetime


def store_out(s: Seller) -> StoreOut:
    return StoreOut(
        id=s.id,
        store_name=s.store_name,
        slug=s.slug,
        description=s.description,
        logo_url=s.logo_url,
        created_at=s.created_at,
    )


def _name_taken(db: DB, name: str, exclude_id: int | None = None) -> bool:
    stmt = select(Seller.id).where(func.lower(Seller.store_name) == name.lower())
    if exclude_id:
        stmt = stmt.where(Seller.id != exclude_id)
    return db.scalar(stmt) is not None


def _unique_store_slug(db: DB, name: str, exclude_id: int | None = None) -> str:
    base = slugify(name)
    slug, n = base, 2
    while True:
        stmt = select(Seller.id).where(Seller.slug == slug)
        if exclude_id:
            stmt = stmt.where(Seller.id != exclude_id)
        if db.scalar(stmt) is None:
            return slug
        slug, n = f"{base}-{n}", n + 1


TAKEN = "That store name is already taken. Try another."


@router.post("/store", response_model=StoreOut, status_code=status.HTTP_201_CREATED)
def create_store(db: DB, user: CurrentUser, body: StoreIn) -> StoreOut:
    if db.scalar(select(Seller.id).where(Seller.user_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have a store.")
    if _name_taken(db, body.store_name):
        raise HTTPException(status.HTTP_409_CONFLICT, TAKEN)
    seller = Seller(
        user_id=user.id,
        store_name=body.store_name,
        slug=_unique_store_slug(db, body.store_name),
        description=body.description,
    )
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return store_out(seller)


@router.get("/store", response_model=StoreOut)
def get_store(db: DB, user: CurrentUser) -> StoreOut:
    seller = db.scalar(select(Seller).where(Seller.user_id == user.id))
    if seller is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You don't have a store yet.")
    return store_out(seller)


@router.patch("/store", response_model=StoreOut)
def update_store(db: DB, seller: CurrentSeller, body: StorePatch) -> StoreOut:
    data = body.model_dump(exclude_unset=True)
    if "store_name" in data and data["store_name"]:
        if _name_taken(db, data["store_name"], seller.id):
            raise HTTPException(status.HTTP_409_CONFLICT, TAKEN)
        seller.store_name = data["store_name"]
        seller.slug = _unique_store_slug(db, data["store_name"], seller.id)
    if "description" in data and data["description"]:
        seller.description = data["description"]
    if "logo_url" in data:
        seller.logo_url = data["logo_url"]
    db.commit()
    db.refresh(seller)
    return store_out(seller)


# ---------------------------------------------------------------- overview


class DayRevenue(BaseModel):
    date: str
    revenue_cents: int


class RecentOrder(BaseModel):
    id: int
    number: str
    created_at: datetime
    buyer: str
    units: int
    subtotal_cents: int
    fulfillment: str


class OverviewOut(BaseModel):
    store_name: str
    revenue_cents: int
    orders: int
    units: int
    low_stock: int
    to_ship: int
    earnings_cents: int
    daily: list[DayRevenue]
    recent_orders: list[RecentOrder]


@router.get("/overview", response_model=OverviewOut)
def overview(db: DB, seller: CurrentSeller) -> OverviewOut:
    stats = seller_stats.overview(db, seller)
    rows, _ = _seller_orders(db, seller, "all", 1, 5)
    return OverviewOut(store_name=seller.store_name, recent_orders=rows, **stats)


# ---------------------------------------------------------------- products


class VariantIn(BaseModel):
    kind: str = Field(pattern="^(color|edition)$")
    label: str = Field(min_length=1, max_length=80)
    price_delta_cents: int = Field(0, ge=-1_000_000, le=1_000_000)
    stock: int = Field(0, ge=0, le=100_000)

    @field_validator("label")
    @classmethod
    def _label(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Each variant needs a label.")
        return v


class ProductIn(BaseModel):
    title: str
    description: str = Field("", max_length=5000)
    brand: str
    category_id: int
    price_cents: int = Field(ge=1, le=10_000_000)
    list_price_cents: int | None = Field(None, ge=1, le=10_000_000)
    stock: int = Field(ge=0, le=100_000)
    images: list[str] = Field(default_factory=list, max_length=8)
    variants: list[VariantIn] = Field(default_factory=list, max_length=12)
    badges: list[str] = Field(default_factory=list)
    status: str | None = Field(None, pattern="^(draft|published)$")

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = " ".join(v.split())
        if not 3 <= len(v) <= 200:
            raise ValueError("Title must be 3 to 200 characters.")
        return v

    @field_validator("brand")
    @classmethod
    def _brand(cls, v: str) -> str:
        v = " ".join(v.split())
        if not 2 <= len(v) <= 80:
            raise ValueError("Brand must be 2 to 80 characters.")
        return v

    @field_validator("images")
    @classmethod
    def _images(cls, v: list[str]) -> list[str]:
        cleaned = [u for u in (_clean_url(x) for x in v) if u]
        if not cleaned:
            raise ValueError("Add at least one image URL.")
        return cleaned

    @field_validator("badges")
    @classmethod
    def _badges(cls, v: list[str]) -> list[str]:
        bad = [b for b in v if b not in BADGES]
        if bad:
            raise ValueError(f"Unknown badge: {bad[0]}")
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def _prices(self) -> "ProductIn":
        if self.list_price_cents is not None and self.list_price_cents < self.price_cents:
            raise ValueError("List price must be the same as or higher than the price.")
        for variant in self.variants:
            if self.price_cents + variant.price_delta_cents < 1:
                raise ValueError(f"Variant '{variant.label}' would make the price zero or negative.")
        return self


class SellerProductRow(BaseModel):
    id: int
    slug: str
    title: str
    image: str | None
    price_cents: int
    stock: int
    status: str
    low_stock: bool
    updated_at: datetime


class ProductCounts(BaseModel):
    all: int
    published: int
    draft: int
    low_stock: int


class SellerProductPage(BaseModel):
    items: list[SellerProductRow]
    total: int
    page: int
    pages: int
    counts: ProductCounts


class SellerProductOut(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    brand: str
    category_id: int
    price_cents: int
    list_price_cents: int | None
    stock: int
    images: list[str]
    variants: list[VariantIn]
    badges: list[str]
    status: str
    updated_at: datetime


def _product_out(p: Product) -> SellerProductOut:
    return SellerProductOut(
        id=p.id,
        slug=p.slug,
        title=p.title,
        description=p.description,
        brand=p.brand.name,
        category_id=p.category_id,
        price_cents=p.price_cents,
        list_price_cents=p.list_price_cents,
        stock=p.stock,
        images=[i.url for i in p.images],
        variants=[
            VariantIn(kind=v.kind, label=v.label, price_delta_cents=v.price_delta_cents, stock=v.stock)
            for v in p.variants
        ],
        badges=list(p.badges or []),
        status=p.status,
        updated_at=p.updated_at,
    )


def _own_product(db: DB, seller: Seller, product_id: int) -> Product:
    p = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.images), selectinload(Product.variants), selectinload(Product.brand))
    )
    if p is None or p.seller_id != seller.id or p.status == "archived":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found.")
    return p


def _brand_for(db: DB, name: str) -> Brand:
    brand = db.scalar(select(Brand).where(func.lower(Brand.name) == name.lower()))
    if brand:
        return brand
    base = slugify(name)
    slug, n = base, 2
    while db.scalar(select(Brand.id).where(Brand.slug == slug)):
        slug, n = f"{base}-{n}", n + 1
    brand = Brand(name=name, slug=slug)
    db.add(brand)
    db.flush()
    return brand


def _apply(db: DB, p: Product, body: ProductIn) -> None:
    if db.get(Category, body.category_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Pick a category.")
    p.title = body.title
    p.description = body.description.strip()
    p.brand_id = _brand_for(db, body.brand).id
    p.category_id = body.category_id
    p.price_cents = body.price_cents
    p.list_price_cents = body.list_price_cents
    p.stock = body.stock
    p.badges = body.badges
    p.images = [ProductImage(url=url, position=i) for i, url in enumerate(body.images)]
    p.variants = [
        ProductVariant(kind=v.kind, label=v.label, price_delta_cents=v.price_delta_cents, stock=v.stock)
        for v in body.variants
    ]
    p.updated_at = datetime.now(UTC)


@router.get("/products", response_model=SellerProductPage)
def list_products(
    db: DB,
    seller: CurrentSeller,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[str, Query(alias="status")] = "all",
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SellerProductPage:
    own = and_(Product.seller_id == seller.id, Product.status != "archived")
    low = and_(Product.status == "published", Product.stock <= seller_stats.LOW_STOCK)
    counts = db.execute(
        select(
            func.count(Product.id),
            func.count(Product.id).filter(Product.status == "published"),
            func.count(Product.id).filter(Product.status == "draft"),
            func.count(Product.id).filter(low),
        ).where(own)
    ).one()

    conds = [own]
    if q:
        conds.append(Product.title.ilike(f"%{q.strip()}%"))
    if status_filter in ("published", "draft"):
        conds.append(Product.status == status_filter)
    elif status_filter == "low_stock":
        conds.append(low)
    total = db.scalar(select(func.count(Product.id)).where(*conds)) or 0
    rows = db.scalars(
        select(Product)
        .where(*conds)
        .options(selectinload(Product.images))
        .order_by(Product.updated_at.desc(), Product.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return SellerProductPage(
        items=[
            SellerProductRow(
                id=p.id,
                slug=p.slug,
                title=p.title,
                image=p.images[0].url if p.images else None,
                price_cents=p.price_cents,
                stock=p.stock,
                status=p.status,
                low_stock=p.status == "published" and p.stock <= seller_stats.LOW_STOCK,
                updated_at=p.updated_at,
            )
            for p in rows
        ],
        total=total,
        page=page,
        pages=pages_for(total, per_page),
        counts=ProductCounts(all=counts[0], published=counts[1], draft=counts[2], low_stock=counts[3]),
    )


@router.post("/products", response_model=SellerProductOut, status_code=status.HTTP_201_CREATED)
def create_product(db: DB, seller: CurrentSeller, body: ProductIn) -> SellerProductOut:
    p = Product(
        seller_id=seller.id,
        slug=f"{slugify(body.title)}-{secrets.token_hex(3)}",
        status=body.status or "draft",
        delivery_speed="standard",
        rating_breakdown={},
        specs={},
        facets={},
        highlights=[],
    )
    _apply(db, p, body)
    db.add(p)
    db.commit()
    return _product_out(_own_product(db, seller, p.id))


@router.get("/products/{product_id}", response_model=SellerProductOut)
def get_product(db: DB, seller: CurrentSeller, product_id: int) -> SellerProductOut:
    return _product_out(_own_product(db, seller, product_id))


@router.put("/products/{product_id}", response_model=SellerProductOut)
def update_product(db: DB, seller: CurrentSeller, product_id: int, body: ProductIn) -> SellerProductOut:
    p = _own_product(db, seller, product_id)
    _apply(db, p, body)
    if body.status:
        p.status = body.status
    # Variants were replaced, so cart lines pointing at old variants are stale.
    db.query(CartItem).filter(CartItem.product_id == p.id, CartItem.variant_id.is_not(None)).delete()
    db.query(CartItem).filter(CartItem.product_id == p.id, CartItem.edition_id.is_not(None)).delete()
    db.commit()
    return _product_out(_own_product(db, seller, p.id))


def _set_status(db: DB, seller: Seller, product_id: int, new_status: str) -> SellerProductOut:
    p = _own_product(db, seller, product_id)
    p.status = new_status
    p.updated_at = datetime.now(UTC)
    db.commit()
    return _product_out(_own_product(db, seller, p.id))


@router.post("/products/{product_id}/publish", response_model=SellerProductOut)
def publish(db: DB, seller: CurrentSeller, product_id: int) -> SellerProductOut:
    p = _own_product(db, seller, product_id)
    if not p.images:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Add an image before publishing.")
    return _set_status(db, seller, product_id, "published")


@router.post("/products/{product_id}/unpublish", response_model=SellerProductOut)
def unpublish(db: DB, seller: CurrentSeller, product_id: int) -> SellerProductOut:
    return _set_status(db, seller, product_id, "draft")


class DeleteOut(BaseModel):
    result: str


@router.delete("/products/{product_id}", response_model=DeleteOut)
def delete_product(db: DB, seller: CurrentSeller, product_id: int) -> DeleteOut:
    p = _own_product(db, seller, product_id)
    db.query(CartItem).filter(CartItem.product_id == p.id).delete()
    in_orders = db.scalar(select(func.count(OrderItem.id)).where(OrderItem.product_id == p.id))
    if in_orders:
        p.status = "archived"
        db.commit()
        return DeleteOut(result="archived")
    db.delete(p)
    db.commit()
    return DeleteOut(result="deleted")


# ---------------------------------------------------------------- orders


class SellerOrderLine(BaseModel):
    id: int
    product_slug: str
    title: str
    image: str | None
    variant_label: str | None
    unit_price_cents: int
    quantity: int
    line_total_cents: int
    fulfillment_status: str
    shipped_at: datetime | None


class SellerOrderDetail(RecentOrder):
    status: str
    paid_at: datetime | None
    delivery_method: str
    address: dict[str, Any]
    lines: list[SellerOrderLine]
    can_ship: bool


class SellerOrderPage(BaseModel):
    items: list[RecentOrder]
    total: int
    page: int
    pages: int


ORDER_FILTERS = ("all", "to_ship", "shipped", "cancelled")


def _seller_orders(
    db: DB, seller: Seller, filt: str, page: int, per_page: int
) -> tuple[list[RecentOrder], int]:
    agg = seller_stats.order_aggregates(seller)
    conds = [Order.status != "pending"]
    if filt == "to_ship":
        conds += [Order.status == "paid", agg.c.unfulfilled > 0]
    elif filt == "shipped":
        conds += [Order.status.in_(("paid", "shipped", "delivered")), agg.c.unfulfilled == 0]
    elif filt == "cancelled":
        conds += [Order.status == "cancelled"]
    base = select(Order, agg.c.units, agg.c.subtotal, agg.c.unfulfilled).join(agg, agg.c.order_id == Order.id)
    total = db.scalar(select(func.count()).select_from(base.where(*conds).subquery())) or 0
    rows = db.execute(
        base.where(*conds)
        .options(selectinload(Order.user))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return [
        RecentOrder(
            id=o.id,
            number=o.number,
            created_at=o.created_at,
            buyer=o.user.name.split(" ")[0],
            units=int(units),
            subtotal_cents=int(subtotal),
            fulfillment=seller_stats.seller_fulfillment(o.status, int(unfulfilled)),
        )
        for o, units, subtotal, unfulfilled in rows
    ], total


@router.get("/orders", response_model=SellerOrderPage)
def list_orders(
    db: DB,
    seller: CurrentSeller,
    status_filter: Annotated[str, Query(alias="status")] = "all",
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SellerOrderPage:
    filt = status_filter if status_filter in ORDER_FILTERS else "all"
    rows, total = _seller_orders(db, seller, filt, page, per_page)
    return SellerOrderPage(items=rows, total=total, page=page, pages=pages_for(total, per_page))


def _own_order(db: DB, seller: Seller, order_id: int) -> tuple[Order, list[OrderItem]]:
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.status != "pending")
        .options(selectinload(Order.items), selectinload(Order.user))
    )
    lines = [i for i in order.items if i.seller_id == seller.id] if order else []
    if order is None or not lines:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return order, lines


def _order_detail(order: Order, lines: list[OrderItem]) -> SellerOrderDetail:
    unfulfilled = sum(1 for i in lines if i.fulfillment_status == "unfulfilled")
    return SellerOrderDetail(
        id=order.id,
        number=order.number,
        created_at=order.created_at,
        buyer=order.user.name.split(" ")[0],
        units=sum(i.quantity for i in lines),
        subtotal_cents=sum(i.unit_price_cents * i.quantity for i in lines),
        fulfillment=seller_stats.seller_fulfillment(order.status, unfulfilled),
        status=order.status,
        paid_at=order.paid_at,
        delivery_method=order.delivery_method,
        address=order.address_snapshot,
        lines=[
            SellerOrderLine(
                id=i.id,
                product_slug=i.product_slug_snapshot,
                title=i.title_snapshot,
                image=i.image_snapshot,
                variant_label=i.variant_label_snapshot,
                unit_price_cents=i.unit_price_cents,
                quantity=i.quantity,
                line_total_cents=i.unit_price_cents * i.quantity,
                fulfillment_status=i.fulfillment_status,
                shipped_at=i.shipped_at,
            )
            for i in lines
        ],
        can_ship=order.status == "paid" and unfulfilled > 0,
    )


@router.get("/orders/{order_id}", response_model=SellerOrderDetail)
def get_order(db: DB, seller: CurrentSeller, order_id: int) -> SellerOrderDetail:
    order, lines = _own_order(db, seller, order_id)
    return _order_detail(order, lines)


@router.post("/orders/{order_id}/ship", response_model=SellerOrderDetail)
def ship_order(db: DB, seller: CurrentSeller, order_id: int) -> SellerOrderDetail:
    order, lines = _own_order(db, seller, order_id)
    if order.status != "paid":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only paid orders can be shipped.")
    pending = [i for i in lines if i.fulfillment_status == "unfulfilled"]
    if not pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "Your items in this order are already shipped.")
    now = datetime.now(UTC)
    for item in pending:
        item.fulfillment_status = "shipped"
        item.shipped_at = now
    order_svc.refresh_shipped_status(order)
    db.commit()
    return _order_detail(order, lines)
