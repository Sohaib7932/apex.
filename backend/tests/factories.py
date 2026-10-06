"""Small helpers that insert catalog rows for database tests."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import Brand, Category, Order, OrderItem, Product, ProductImage, Seller, User
from app.services import pricing


def category(db: Session, slug: str = "keyboards") -> Category:
    c = Category(slug=slug, name=slug.title())
    db.add(c)
    db.flush()
    return c


def brand(db: Session, name: str = "TestBrand") -> Brand:
    b = Brand(slug=name.lower(), name=name)
    db.add(b)
    db.flush()
    return b


def seller(db: Session, user_id: int, name: str) -> Seller:
    s = Seller(user_id=user_id, store_name=name, slug=name.lower().replace(" ", "-"), description="A store")
    db.add(s)
    db.flush()
    return s


def product(
    db: Session,
    seller_id: int,
    *,
    slug: str,
    price_cents: int = 10000,
    stock: int = 10,
    status: str = "published",
    cat: Category | None = None,
    br: Brand | None = None,
) -> Product:
    p = Product(
        slug=slug,
        seller_id=seller_id,
        title=slug.replace("-", " ").title(),
        description="",
        brand_id=(br or brand(db, f"Brand{slug[:6]}")).id,
        category_id=(cat or category(db, f"cat-{slug}")).id,
        price_cents=price_cents,
        stock=stock,
        status=status,
        badges=[],
        highlights=[],
        specs={},
        facets={},
        rating_breakdown={},
        images=[ProductImage(url=f"/products/{slug}.webp", position=0)],
    )
    db.add(p)
    db.flush()
    return p


def paid_order(db: Session, buyer: User, lines: list[tuple[Product, int]], status: str = "paid") -> Order:
    subtotal = sum(p.price_cents * q for p, q in lines)
    totals = pricing.compute_totals(subtotal, sum(q for _, q in lines))
    order = Order(
        user_id=buyer.id,
        status=status,
        subtotal_cents=totals.subtotal_cents,
        tax_cents=totals.tax_cents,
        shipping_cents=totals.shipping_cents,
        discount_cents=0,
        total_cents=totals.total_cents,
        address_snapshot={"full_name": buyer.name},
        paid_at=datetime.now(UTC),
    )
    for p, q in lines:
        order.items.append(
            OrderItem(
                product_id=p.id,
                seller_id=p.seller_id,
                title_snapshot=p.title,
                seller_name_snapshot="store",
                product_slug_snapshot=p.slug,
                unit_price_cents=p.price_cents,
                quantity=q,
            )
        )
    db.add(order)
    db.flush()
    return order
