"""Seed the database with the Apex demo catalog, stores, users, reviews and orders.

    python seed.py                              # seeds an empty database; refuses if demo data exists
    python seed.py --reset                      # wipes and re-seeds, but REFUSES if real users exist
    python seed.py --reset --wipe-real-users    # also deletes real sign-ups and their orders (dev only)

Demo logins (password for all: ApexDemo2026!):
    buyer@apex.demo       shopper with past orders
    seller@apex.demo      owns "KeyForge Supply"
    northwind@apex.demo   owns "Northwind Audio"
    official@apex.demo    owns "Apex Official Store"
"""

import random
import secrets
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, not_, select, text
from sqlalchemy.orm import Session

from app.core.db import get_engine
from app.core.security import hash_password
from app.models import (
    Address,
    Brand,
    Category,
    Deal,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductVariant,
    PromoCode,
    Review,
    Seller,
    User,
)
from app.services import pricing
from seed_catalog import CATEGORIES, PRODUCTS, PROMO_CODES, REVIEWERS, REVIEWS, STORES

DEMO_PASSWORD = "ApexDemo2026!"
# Accounts created by this script. Anything else is a real sign-up and is never wiped silently.
DEMO_EMAIL_DOMAINS = ("@apex.demo", "@reviewers.apex.demo")
TABLES = (
    "order_items, orders, reviews, cart_items, wishlist_items, deals, product_variants, product_images, "
    "products, brands, categories, promo_codes, addresses, sellers, users"
)

# Star-share templates by average rating (percent for 5..1 stars).
SHARES = {
    4.9: (86, 10, 2, 1, 1), 4.8: (78, 14, 5, 2, 1), 4.7: (72, 17, 6, 3, 2), 4.6: (68, 18, 7, 4, 3),
    4.5: (63, 20, 8, 5, 4), 4.4: (58, 22, 10, 5, 5), 4.3: (54, 22, 11, 7, 6), 4.2: (50, 22, 12, 8, 8),
}  # fmt: skip

rng = random.Random(2026)


def cents(dollars: float | None) -> int | None:
    return None if dollars is None else round(dollars * 100)


def slugify(text_: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in text_.lower()).strip("-").replace("--", "-")


def breakdown_for(avg: float, count: int) -> dict[str, int]:
    if count <= 0:
        return {}
    shares = SHARES.get(round(avg, 1), SHARES[4.5])
    counts = [round(count * s / 100) for s in shares]
    counts[0] += count - sum(counts)
    return {str(5 - i): n for i, n in enumerate(counts)}


def review_group(cat: str) -> str:
    return {"audio": "audio", "keyboards": "keyboards"}.get(cat, "general")


def address_for(name: str) -> dict:
    streets = ["410 Terry Ave N", "1200 Pine St", "88 Harbor Way", "2401 Elliott Ave", "77 Maple Ct"]
    cities = [("Seattle", "WA", "98109"), ("Portland", "OR", "97205"), ("Austin", "TX", "78701"),
              ("Denver", "CO", "80202"), ("Chicago", "IL", "60607")]  # fmt: skip
    city, state, zip_ = rng.choice(cities)
    return {
        "full_name": name, "line1": rng.choice(streets), "line2": None, "city": city, "state": state,
        "zip": zip_, "phone": f"(206) 555-0{rng.randint(100, 199)}",
    }  # fmt: skip


def seed(db: Session) -> None:
    now = datetime.now(UTC)
    pw = hash_password(DEMO_PASSWORD)

    # ---- users and stores
    users: dict[str, User] = {}
    for key, store in STORES.items():
        users[key] = User(email=store["email"], name=store["owner"], password_hash=pw)
    users["buyer"] = User(email="buyer@apex.demo", name="Jordan Lee", password_hash=pw)
    reviewers = [
        User(
            email=f"{slugify(n).replace('-', '.')}@reviewers.apex.demo",
            name=n,
            password_hash=hash_password(secrets.token_urlsafe(24)),
        )  # fmt: skip
        for n in REVIEWERS
    ]
    db.add_all([*users.values(), *reviewers])
    db.flush()

    sellers = {
        key: Seller(
            user_id=users[key].id,
            store_name=s["store_name"],
            slug=slugify(s["store_name"]),
            description=s["description"],
        )  # fmt: skip
        for key, s in STORES.items()
    }
    db.add_all(sellers.values())

    buyer_address = {
        "full_name": "Jordan Lee", "line1": "410 Terry Ave N", "line2": "Apt 5B", "city": "Seattle",
        "state": "WA", "zip": "98109", "phone": "(206) 555-0142",
    }  # fmt: skip
    db.add(Address(user_id=users["buyer"].id, is_default=True, **buyer_address))

    # ---- categories and brands
    cats: dict[str, Category] = {}
    for slug, name, parent, icon, position in CATEGORIES:
        c = Category(slug=slug, name=name, icon=icon, position=position)
        if parent:
            c.parent = cats[parent]
        cats[slug] = c
    db.add_all(cats.values())
    brands: dict[str, Brand] = {}
    for p in PRODUCTS:
        if p["brand"] not in brands:
            brands[p["brand"]] = Brand(name=p["brand"], slug=slugify(p["brand"]))
    db.add_all(brands.values())
    db.flush()

    # ---- products
    products: dict[str, Product] = {}
    for i, p in enumerate(PRODUCTS):
        image_base = p.get("image_from")
        images = (
            [f"/products/{image_base}.webp"]
            if image_base
            else [f"/products/{p['slug']}.webp"]
            + [f"/products/{p['slug']}-{n}.webp" for n in range(2, p["images"] + 1)]
        )
        product = Product(
            slug=p["slug"],
            seller_id=sellers[p["store"]].id,
            title=p["title"],
            description=p["desc"],
            brand_id=brands[p["brand"]].id,
            category_id=cats[p["cat"]].id,
            price_cents=cents(p["price"]),
            list_price_cents=cents(p["list"]),
            rating_avg=0,
            rating_count=0,
            rating_breakdown={},
            bought_past_month=p["bought"],
            stock=p["stock"],
            badges=p["badges"],
            highlights=p["hl"],
            specs=p["specs"],
            facets=p.get("facets", {}),
            delivery_speed=p["speed"],
            is_featured=p.get("featured", False),
            status=p.get("status", "published"),
            created_at=now - timedelta(days=60 - i),
            images=[ProductImage(url=u, position=n) for n, u in enumerate(images)],
        )
        if p["count"]:
            product.rating_breakdown = breakdown_for(p["rating"], p["count"])
            total = sum(product.rating_breakdown.values())
            product.rating_count = total
            product.rating_avg = round(
                sum(int(k) * v for k, v in product.rating_breakdown.items()) / total, 1
            )
        for label, swatch, delta, stock in p.get("colors", []):
            product.variants.append(
                ProductVariant(
                    kind="color", label=label, swatch=swatch, price_delta_cents=cents(delta), stock=stock
                )
            )
        for label, detail, delta in p.get("editions", []):
            product.variants.append(
                ProductVariant(
                    kind="edition", label=label, detail=detail, price_delta_cents=cents(delta), stock=0
                )
            )
        if p.get("colors"):
            product.stock = sum(c[3] for c in p["colors"])
        products[p["slug"]] = product
    db.add_all(products.values())
    db.flush()

    # ---- deals (discount shown matches price vs list price)
    for p in PRODUCTS:
        if "deal" in p:
            _, hours_left, total_qty, claimed = p["deal"]
            pct = round((p["list"] - p["price"]) * 100 / p["list"])
            db.add(
                Deal(
                    product_id=products[p["slug"]].id,
                    discount_pct=pct,
                    ends_at=now + timedelta(hours=hours_left),
                    total_qty=total_qty,
                    claimed_qty=claimed,
                )  # fmt: skip
            )

    for code, pct, active, days in PROMO_CODES:
        db.add(PromoCode(code=code, percent_off=pct, active=active, expires_at=now + timedelta(days=days)))

    # ---- reviews: 8-12 on featured products, 0-3 elsewhere
    for p in PRODUCTS:
        if p.get("status") == "draft":
            continue
        n = rng.randint(8, 12) if p.get("featured") else rng.randint(0, 3)
        pool = REVIEWS[review_group(p["cat"])]
        authors = rng.sample(reviewers, k=min(n, len(reviewers)))
        weights = [5 if r[0] >= 4 else 2 if r[0] == 3 else 1 for r in pool]
        for author in authors:
            rating, title, body = rng.choices(pool, weights=weights)[0]
            db.add(
                Review(
                    product_id=products[p["slug"]].id,
                    user_id=author.id,
                    rating=rating,
                    title=title,
                    body=body,
                    verified_purchase=rng.random() < 0.85,
                    helpful_count=rng.randint(0, 480),
                    created_at=now - timedelta(days=rng.randint(3, 300)),
                )  # fmt: skip
            )

    # ---- orders spread over the last 30 days
    published = [p for p in products.values() if p.status == "published"]
    by_store: dict[int, list[Product]] = {}
    for p in published:
        by_store.setdefault(p.seller_id, []).append(p)
    keyforge = by_store[sellers["keyforge"].id]
    buyers = [users["buyer"], *reviewers[:8]]

    def make_order(user: User, items: list[Product], days_ago: float, state: str, shipped_ids=()) -> None:
        created = now - timedelta(days=days_ago)
        lines = []
        for prod in items:
            colors = [v for v in prod.variants if v.kind == "color"]
            editions = [v for v in prod.variants if v.kind == "edition"]
            color = rng.choice(colors) if colors else None
            edition = editions[0] if editions else None
            qty = 1 if prod.price_cents > 10000 else rng.randint(1, 2)
            lines.append((prod, color, edition, qty))
        subtotal = sum(pricing.unit_price(p, c, e) * q for p, c, e, q in lines)
        promo = "APEX10" if rng.random() < 0.2 else None
        method = "one_day" if rng.random() < 0.3 else "standard"
        totals = pricing.compute_totals(
            subtotal, sum(q for *_, q in lines), percent_off=10 if promo else 0, promo_code=promo,
            delivery_method=method,
        )  # fmt: skip
        order = Order(
            user_id=user.id, status=state, subtotal_cents=totals.subtotal_cents, tax_cents=totals.tax_cents,
            shipping_cents=totals.shipping_cents, discount_cents=totals.discount_cents,
            total_cents=totals.total_cents, promo_code=totals.promo_code, delivery_method=method,
            address_snapshot=buyer_address if user is users["buyer"] else address_for(user.name),
            stripe_session_id=f"cs_test_seed_{secrets.token_hex(8)}",
            created_at=created, paid_at=None if state == "cancelled" else created + timedelta(minutes=2),
        )  # fmt: skip
        for prod, color, edition, qty in lines:
            if state in ("shipped", "delivered"):
                shipped = True
            elif state == "paid":
                shipped = prod.seller_id in shipped_ids
            else:
                shipped = False
            label = " · ".join(v.label for v in (color, edition) if v) or None
            order.items.append(
                OrderItem(
                    product_id=prod.id,
                    variant_id=color.id if color else None,
                    edition_id=edition.id if edition else None,
                    seller_id=prod.seller_id,
                    title_snapshot=prod.title,
                    image_snapshot=prod.images[0].url if prod.images else None,
                    seller_name_snapshot=next(
                        s.store_name for s in sellers.values() if s.id == prod.seller_id
                    ),
                    variant_label_snapshot=label,
                    product_slug_snapshot=prod.slug,
                    unit_price_cents=pricing.unit_price(prod, color, edition),
                    quantity=qty,
                    fulfillment_status="shipped" if shipped else "unfulfilled",
                    shipped_at=created + timedelta(days=1) if shipped else None,
                )  # fmt: skip
            )
        db.add(order)

    for _ in range(38):
        days_ago = rng.uniform(0.2, 29.5)
        store_items = rng.sample(published, k=rng.choice([1, 1, 2, 3]))
        state = "delivered" if days_ago > 8 else "shipped" if days_ago > 3 else "paid"
        if rng.random() < 0.05:
            state = "cancelled"
        make_order(rng.choice(buyers[1:]), store_items, days_ago, state)

    # Guaranteed demo content for buyer@apex.demo and the KeyForge seller dashboard.
    northwind = by_store[sellers["northwind"].id]
    apex = by_store[sellers["apex"].id]
    make_order(
        users["buyer"], [keyforge[0], northwind[0]], 1.2, "paid", shipped_ids={sellers["northwind"].id}
    )
    make_order(users["buyer"], [keyforge[1]], 0.6, "paid")
    make_order(users["buyer"], [apex[0], keyforge[2]], 5, "shipped")
    make_order(users["buyer"], [northwind[1]], 12, "delivered")
    make_order(users["buyer"], [apex[3], apex[5]], 21, "delivered")
    for days_ago in (0.3, 0.9, 1.7, 2.4):
        make_order(rng.choice(buyers[1:]), [rng.choice(keyforge)], days_ago, "paid")

    db.commit()


def real_user_count(db: Session) -> int:
    """Users that did not come from this script (people who signed up)."""
    demo = [User.email.like(f"%{domain}") for domain in DEMO_EMAIL_DOMAINS]
    return db.scalar(select(func.count(User.id)).where(*(not_(cond) for cond in demo))) or 0


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    reset = "--reset" in argv
    with Session(get_engine()) as db:
        exists = db.scalar(select(User.id).where(User.email == "seller@apex.demo"))
        if exists and not reset:
            print("Demo data already exists. Run `python seed.py --reset` to wipe and re-seed.")
            return
        if reset:
            real = real_user_count(db)
            if real and "--wipe-real-users" not in argv:
                # --reset truncates every table; never delete real sign-ups by accident.
                print(
                    f"Refusing to reset: {real} real (non-demo) user account(s) exist and would be deleted."
                )
                print("Their accounts and orders would be lost. If you really want that, run:")
                print("    python seed.py --reset --wipe-real-users")
                raise SystemExit(1)
            db.execute(text(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE"))
            db.commit()
        seed(db)
        counts = {
            "products": db.scalar(select(text("count(*)")).select_from(Product)),
            "reviews": db.scalar(select(text("count(*)")).select_from(Review)),
            "orders": db.scalar(select(text("count(*)")).select_from(Order)),
        }
        print(f"Seeded: {counts}. Demo password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
