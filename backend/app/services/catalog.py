"""Catalog queries and serializers shared by the public product, search and home endpoints."""

import math
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, and_, false, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import Brand, Category, Deal, Product, Seller
from app.schemas.catalog import (
    BrandOut,
    CategoryOut,
    DealOut,
    FacetGroup,
    FacetValue,
    ProductDetail,
    ProductSummary,
    SearchFilters,
    SellerDetail,
    SellerRef,
    VariantOut,
)

# Deals restart on a fixed cycle so countdowns on a long-running demo never hit zero for good.
DEAL_CYCLE = timedelta(hours=12)

BADGE_SLUGS = {
    "best-seller": "Best Seller",
    "apex-choice": "Apex Choice",
    "limited-deal": "Limited Deal",
    "new-arrival": "New Arrival",
    "top-rated": "Top Rated",
}
BADGES = tuple(BADGE_SLUGS.values())

FACET_LABELS = {
    "switch_type": "Mechanical Switch",
    "connectivity": "Connectivity",
    "form_factor": "Form Factor",
    "hot_swap": "Hot-Swap",
    "audio_type": "Headphone Type",
    "resolution": "Resolution",
    "screen_size": "Screen Size",
    "memory": "Memory",
}

PRICE_BUCKETS: list[tuple[int | None, int | None, str]] = [
    (None, 50, "Under $50"),
    (50, 100, "$50 to $100"),
    (100, 200, "$100 to $200"),
    (200, 500, "$200 to $500"),
    (500, None, "$500 & Above"),
]

SORTS = ("featured", "price_asc", "price_desc", "rating", "newest")


def deal_ends_at(deal: Deal, now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    end = deal.ends_at
    if end > now:
        return end
    cycles = (now - end) // DEAL_CYCLE + 1
    return end + cycles * DEAL_CYCLE


def summary_options():
    # Many-to-one relations ride along in the main query; collections use one IN query each.
    return (
        joinedload(Product.brand),
        joinedload(Product.seller),
        joinedload(Product.deal),
        selectinload(Product.images),
        selectinload(Product.variants),
    )


def deal_out(deal: Deal | None) -> DealOut | None:
    if deal is None:
        return None
    pct = min(100, round(deal.claimed_qty * 100 / deal.total_qty)) if deal.total_qty else 0
    return DealOut(
        discount_pct=deal.discount_pct,
        ends_at=deal_ends_at(deal),
        total_qty=deal.total_qty,
        claimed_qty=deal.claimed_qty,
        claimed_pct=pct,
    )


def to_summary(p: Product) -> ProductSummary:
    return ProductSummary(
        id=p.id,
        slug=p.slug,
        title=p.title,
        brand=BrandOut(slug=p.brand.slug, name=p.brand.name),
        image=p.images[0].url if p.images else None,
        price_cents=p.price_cents,
        list_price_cents=p.list_price_cents,
        rating_avg=float(p.rating_avg or 0),
        rating_count=p.rating_count,
        bought_past_month=p.bought_past_month,
        badges=list(p.badges or []),
        delivery_speed=p.delivery_speed,
        stock=p.stock,
        seller=SellerRef(name=p.seller.store_name, slug=p.seller.slug),
        deal=deal_out(p.deal),
        has_options=bool(p.variants),
    )


def category_out(c: Category, parent_slug: str | None = None) -> CategoryOut:
    return CategoryOut(id=c.id, slug=c.slug, name=c.name, parent_slug=parent_slug, icon=c.icon)


def to_detail(db: Session, p: Product) -> ProductDetail:
    category = p.category
    crumbs: list[CategoryOut] = []
    if category.parent_id:
        parent = db.get(Category, category.parent_id)
        if parent:
            crumbs.append(category_out(parent))
    crumbs.append(category_out(category))

    def variant(v) -> VariantOut:
        return VariantOut(
            id=v.id,
            kind=v.kind,
            label=v.label,
            detail=v.detail,
            swatch=v.swatch,
            price_delta_cents=v.price_delta_cents,
            image_url=v.image_url,
            stock=v.stock,
        )

    base = to_summary(p).model_dump()
    return ProductDetail(
        **base,
        description=p.description,
        highlights=list(p.highlights or []),
        specs={str(k): str(v) for k, v in (p.specs or {}).items()},
        facets={str(k): str(v) for k, v in (p.facets or {}).items()},
        images=[i.url for i in p.images],
        colors=[variant(v) for v in p.variants if v.kind == "color"],
        editions=[variant(v) for v in p.variants if v.kind == "edition"],
        category=category_out(category),
        breadcrumbs=crumbs,
        rating_breakdown={str(k): int(v) for k, v in (p.rating_breakdown or {}).items()},
        seller_detail=SellerDetail(
            name=p.seller.store_name,
            slug=p.seller.slug,
            description=p.seller.description,
            logo_url=p.seller.logo_url,
        ),
    )


_TREE_TTL = 60.0
_tree_cache: tuple[float, dict[str, list[int]]] | None = None


def _category_tree(db: Session) -> dict[str, list[int]]:
    """slug -> [id, *child ids]. Categories rarely change, so cache briefly per process."""
    global _tree_cache
    if _tree_cache and time.monotonic() - _tree_cache[0] < _TREE_TTL:
        return _tree_cache[1]
    rows = db.execute(select(Category.id, Category.slug, Category.parent_id)).all()
    tree: dict[str, list[int]] = {slug: [cid] for cid, slug, _ in rows}
    slug_by_id = {cid: slug for cid, slug, _ in rows}
    for cid, _, parent in rows:
        if parent in slug_by_id:
            tree[slug_by_id[parent]].append(cid)
    _tree_cache = (time.monotonic(), tree)
    return tree


def category_ids_for(db: Session, slug: str | None) -> list[int] | None:
    """The category and its children (the tree is two levels deep)."""
    if not slug:
        return None
    return list(_category_tree(db).get(slug, []))


def _like(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@dataclass
class SearchParams:
    q: str | None = None
    category: str | None = None
    seller: str | None = None
    brands: list[str] = field(default_factory=list)
    min_price: int | None = None  # dollars
    max_price: int | None = None
    min_rating: float | None = None
    one_day: bool = False
    in_stock: bool = False
    deals: bool = False
    badge: str | None = None
    facets: dict[str, list[str]] = field(default_factory=dict)
    sort: str = "featured"
    page: int = 1
    per_page: int = 16


def _base_conditions(db: Session, params: SearchParams) -> list:
    """Conditions from the query box, department, deals and badge links.
    Sidebar filters are applied on top of these."""
    conds: list = [Product.status == "published"]
    if params.q:
        for term in params.q.lower().split()[:6]:
            pattern = _like(term)
            conds.append(
                or_(
                    Product.title.ilike(pattern),
                    Brand.name.ilike(pattern),
                    Category.name.ilike(pattern),
                )
            )
    cat_ids = category_ids_for(db, params.category)
    if cat_ids is not None:
        conds.append(Product.category_id.in_(cat_ids or [-1]))
    if params.seller:
        conds.append(Product.seller_id.in_(select(Seller.id).where(Seller.slug == params.seller)))
    if params.deals:
        conds.append(Product.deal.has())
    if params.badge:
        label = BADGE_SLUGS.get(params.badge)
        conds.append(Product.badges.any(label) if label else false())
    return conds


def _sidebar_conditions(params: SearchParams) -> list:
    conds: list = []
    if params.brands:
        conds.append(Brand.slug.in_(params.brands))
    if params.min_price is not None:
        conds.append(Product.price_cents >= params.min_price * 100)
    if params.max_price is not None:
        conds.append(Product.price_cents <= params.max_price * 100)
    if params.min_rating is not None:
        conds.append(Product.rating_avg >= params.min_rating)
    if params.one_day:
        conds.append(Product.delivery_speed == "one_day")
    if params.in_stock:
        conds.append(Product.stock > 0)
    for key, values in params.facets.items():
        if values:
            conds.append(Product.facets[key].astext.in_(values))
    return conds


def _joined(stmt: Select) -> Select:
    return stmt.join(Brand, Product.brand_id == Brand.id).join(Category, Product.category_id == Category.id)


def search_products(db: Session, params: SearchParams) -> tuple[list[Product], int]:
    conds = _base_conditions(db, params) + _sidebar_conditions(params)
    where = and_(*conds)
    total = db.scalar(_joined(select(func.count(Product.id))).where(where)) or 0

    order = {
        "price_asc": [Product.price_cents.asc(), Product.id],
        "price_desc": [Product.price_cents.desc(), Product.id],
        "rating": [Product.rating_avg.desc(), Product.rating_count.desc(), Product.id],
        "newest": [Product.created_at.desc(), Product.id.desc()],
    }.get(params.sort, [Product.is_featured.desc(), Product.bought_past_month.desc(), Product.id])

    stmt = (
        _joined(select(Product))
        .where(where)
        .options(*summary_options())
        .order_by(*order)
        .offset((params.page - 1) * params.per_page)
        .limit(params.per_page)
    )
    return list(db.scalars(stmt).all()), total


def search_filters(db: Session, params: SearchParams) -> SearchFilters:
    """Facet options with counts for the query/department, before sidebar filters."""
    stmt = _joined(
        select(
            Product.price_cents,
            Product.rating_avg,
            Product.delivery_speed,
            Product.stock,
            Product.facets,
            Brand.slug,
            Brand.name,
            Category.slug,
            Category.name,
        )
    ).where(and_(*_base_conditions(db, params)))
    rows = db.execute(stmt).all()

    brand_counts: Counter[tuple[str, str]] = Counter()
    cat_counts: Counter[tuple[str, str]] = Counter()
    facet_counts: dict[str, Counter[str]] = {}
    price_counts = [0] * len(PRICE_BUCKETS)
    rating_counts = {4: 0, 3: 0, 2: 0}
    one_day = in_stock = 0
    for price, rating, speed, stock, facets, b_slug, b_name, c_slug, c_name in rows:
        brand_counts[(b_slug, b_name)] += 1
        cat_counts[(c_slug, c_name)] += 1
        dollars = price / 100
        for i, (lo, hi, _) in enumerate(PRICE_BUCKETS):
            if (lo is None or dollars >= lo) and (hi is None or dollars <= hi):
                price_counts[i] += 1
                break
        for stars in rating_counts:
            if float(rating or 0) >= stars:
                rating_counts[stars] += 1
        one_day += speed == "one_day"
        in_stock += stock > 0
        for key, value in (facets or {}).items():
            facet_counts.setdefault(key, Counter())[str(value)] += 1

    def bucket_value(lo: int | None, hi: int | None) -> str:
        return f"{lo or ''}-{hi or ''}"

    groups = [
        FacetGroup(
            key=key,
            label=FACET_LABELS.get(key, key.replace("_", " ").title()),
            values=[FacetValue(value=v, label=v, count=n) for v, n in sorted(counts.items())],
        )
        for key, counts in facet_counts.items()
        if sum(counts.values()) >= 2
    ]
    groups.sort(key=lambda g: list(FACET_LABELS).index(g.key) if g.key in FACET_LABELS else 99)

    return SearchFilters(
        total=len(rows),
        categories=[FacetValue(value=s, label=n, count=c) for (s, n), c in cat_counts.most_common()],
        brands=[FacetValue(value=s, label=n, count=c) for (s, n), c in brand_counts.most_common()],
        ratings=[
            FacetValue(value=str(k), label=f"{k} stars & up", count=v) for k, v in rating_counts.items()
        ],
        prices=[
            FacetValue(value=bucket_value(lo, hi), label=label, count=price_counts[i])
            for i, (lo, hi, label) in enumerate(PRICE_BUCKETS)
        ],
        one_day_count=one_day,
        in_stock_count=in_stock,
        facets=groups,
    )


def published_products(db: Session) -> Select:
    return select(Product).where(Product.status == "published").options(*summary_options())


def top_products(db: Session, *conds, limit: int = 8, order=None) -> list[Product]:
    stmt = (
        published_products(db)
        .join(Category, Product.category_id == Category.id)
        .where(*conds)
        .order_by(*(order or [Product.bought_past_month.desc(), Product.id]))
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def in_category_tree(db: Session, slugs: list[str]):
    ids: list[int] = []
    for slug in slugs:
        ids.extend(category_ids_for(db, slug) or [])
    return Product.category_id.in_(ids or [-1])


BUNDLE_KEYWORDS = ("headphone", "keyboard", "laptop", "monitor", "mouse")


def related(db: Session, product: Product) -> tuple[list[Product], list[Product]]:
    """Bundle (two add-ons sharing a keyword with the product) and same-category picks."""
    title = product.title.lower()
    keyword = next((k for k in BUNDLE_KEYWORDS if k in title), None)
    accessories = in_category_tree(db, ["accessories"])
    bundle: list[Product] = []
    if keyword:
        bundle = top_products(
            db,
            accessories,
            Product.id != product.id,
            Product.title.ilike(f"%{keyword}%"),
            limit=2,
            order=[Product.price_cents.asc()],
        )
    if len(bundle) < 2:
        exclude = [product.id, *(b.id for b in bundle)]
        bundle += top_products(db, accessories, Product.id.notin_(exclude), limit=2 - len(bundle))

    also = top_products(db, Product.category_id == product.category_id, Product.id != product.id, limit=8)
    if len(also) < 4 and product.category.parent_id:
        exclude = [product.id, *(a.id for a in also)]
        siblings = in_category_tree(db, [db.get(Category, product.category.parent_id).slug])
        also += top_products(db, siblings, Product.id.notin_(exclude), limit=8 - len(also))
    return bundle, also


def pages_for(total: int, per_page: int) -> int:
    return max(1, math.ceil(total / per_page))


def seller_by_slug(db: Session, slug: str) -> Seller | None:
    return db.scalar(select(Seller).where(Seller.slug == slug))
