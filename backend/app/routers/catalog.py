from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import DB, CurrentUser, OptionalUser
from app.models import Brand, Category, Deal, Order, OrderItem, Product, Review
from app.schemas.catalog import (
    BrandOut,
    CategoryOut,
    DealsGrid,
    FeaturedBrand,
    HomePayload,
    PlanOffer,
    ProductDetail,
    ProductPage,
    ProductSummary,
    RelatedOut,
    ReviewIn,
    ReviewOut,
    ReviewPage,
    ReviewSummary,
    SearchFilters,
    SellerRef,
)
from app.services import catalog as svc

router = APIRouter(tags=["catalog"])

PAID_STATUSES = ("paid", "shipped", "delivered")


def _params(
    q: str | None,
    category: str | None,
    seller: str | None,
    brand: list[str] | None,
    min_price: int | None,
    max_price: int | None,
    min_rating: float | None,
    delivery: str | None,
    in_stock: bool,
    deals: str | None,
    badge: str | None,
    facet: list[str] | None,
    sort: str,
    page: int,
    per_page: int,
) -> svc.SearchParams:
    facets: dict[str, list[str]] = {}
    for item in facet or []:
        key, _, value = item.partition(":")
        if key in svc.FACET_LABELS and value:
            facets.setdefault(key, []).append(value)
    return svc.SearchParams(
        q=(q or "").strip()[:100] or None,
        category=category or None,
        seller=seller or None,
        brands=[b for b in brand or [] if b],
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        one_day=delivery == "one_day",
        in_stock=in_stock,
        deals=bool(deals),
        badge=badge or None,
        facets=facets,
        sort=sort if sort in svc.SORTS else "featured",
        page=max(page, 1),
        per_page=per_page if per_page in (12, 16, 24, 48) else 16,
    )


@router.get("/products", response_model=ProductPage)
def list_products(
    db: DB,
    q: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    seller: Annotated[str | None, Query()] = None,
    brand: Annotated[list[str] | None, Query()] = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
    min_rating: Annotated[float | None, Query(ge=0, le=5)] = None,
    delivery: Annotated[str | None, Query()] = None,
    in_stock: Annotated[bool, Query()] = False,
    deals: Annotated[str | None, Query()] = None,
    badge: Annotated[str | None, Query()] = None,
    facet: Annotated[list[str] | None, Query()] = None,
    sort: Annotated[str, Query()] = "featured",
    page: Annotated[int, Query(ge=1, le=500)] = 1,
    per_page: Annotated[int, Query(ge=1, le=48)] = 16,
) -> ProductPage:
    params = _params(
        q, category, seller, brand, min_price, max_price, min_rating, delivery, in_stock, deals, badge, facet,
        sort, page, per_page,
    )  # fmt: skip
    rows, total = svc.search_products(db, params)
    return ProductPage(
        items=[svc.to_summary(p) for p in rows],
        total=total,
        page=params.page,
        per_page=params.per_page,
        pages=svc.pages_for(total, params.per_page),
    )


@router.get("/search/filters", response_model=SearchFilters)
def search_filters(
    db: DB,
    q: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    seller: Annotated[str | None, Query()] = None,
    deals: Annotated[str | None, Query()] = None,
    badge: Annotated[str | None, Query()] = None,
) -> SearchFilters:
    params = _params(
        q, category, seller, None, None, None, None, None, False, deals, badge, None, "featured", 1, 16
    )
    return svc.search_filters(db, params)


@router.get("/products/also-bought", response_model=list[ProductSummary])
def also_bought(db: DB, ids: Annotated[str, Query()] = "") -> list[ProductSummary]:
    """ "Customers also bought" for the cart: same categories, excluding what's in the cart."""
    wanted = [int(x) for x in ids.split(",") if x.strip().isdigit()][:30]
    cat_ids = set(db.scalars(select(Product.category_id).where(Product.id.in_(wanted or [-1]))).all())
    picks: list[Product] = []
    if cat_ids:
        picks = svc.top_products(db, Product.category_id.in_(cat_ids), Product.id.notin_(wanted or [-1]))
    if len(picks) < 4:
        exclude = [*wanted, *(p.id for p in picks)] or [-1]
        picks += svc.top_products(db, Product.id.notin_(exclude), limit=8 - len(picks))
    return [svc.to_summary(p) for p in picks]


def _published(db: DB, slug: str) -> Product:
    product = db.scalar(
        select(Product)
        .where(Product.slug == slug, Product.status == "published")
        .options(*svc.summary_options(), selectinload(Product.category))
    )
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found.")
    return product


PLAN_SLUG = "apex-2-year-protection-plan"
PLAN_MIN_PRICE_CENTS = 5000


@router.get("/products/{slug}", response_model=ProductDetail)
def product_detail(db: DB, slug: str) -> ProductDetail:
    product = _published(db, slug)
    detail = svc.to_detail(db, product)
    # Offer the protection plan (a real product, priced on the server) on items over $50.
    if product.slug != PLAN_SLUG and product.price_cents >= PLAN_MIN_PRICE_CENTS:
        plan = db.scalar(select(Product).where(Product.slug == PLAN_SLUG, Product.status == "published"))
        if plan:
            detail.protection_plan = PlanOffer(id=plan.id, title=plan.title, price_cents=plan.price_cents)
    return detail


@router.get("/products/{slug}/related", response_model=RelatedOut)
def product_related(db: DB, slug: str) -> RelatedOut:
    product = _published(db, slug)
    bundle, also = svc.related(db, product)
    return RelatedOut(
        bundle=[svc.to_summary(p) for p in bundle],
        bundle_total_cents=product.price_cents + sum(p.price_cents for p in bundle),
        also_bought=[svc.to_summary(p) for p in also],
    )


def _has_bought(db: DB, user_id: int, product_id: int) -> bool:
    return bool(
        db.scalar(
            select(func.count(OrderItem.id))
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.user_id == user_id,
                Order.status.in_(PAID_STATUSES),
                OrderItem.product_id == product_id,
            )
        )
    )


def _review_summary(product: Product) -> ReviewSummary:
    breakdown = {str(k): int(v) for k, v in (product.rating_breakdown or {}).items()}
    total = sum(breakdown.values()) or 0
    pct = {str(s): (round(breakdown.get(str(s), 0) * 100 / total) if total else 0) for s in range(5, 0, -1)}
    return ReviewSummary(
        rating_avg=float(product.rating_avg or 0), rating_count=product.rating_count, breakdown_pct=pct
    )


@router.get("/products/{slug}/reviews", response_model=ReviewPage)
def product_reviews(
    db: DB,
    user: OptionalUser,
    slug: str,
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=20)] = 6,
    sort: Annotated[str, Query()] = "helpful",
    q: Annotated[str | None, Query(max_length=80)] = None,
    stars: Annotated[int | None, Query(ge=1, le=5)] = None,
) -> ReviewPage:
    product = _published(db, slug)
    conds = [Review.product_id == product.id]
    if q:
        pattern = svc._like(q.strip().lower())
        conds.append(Review.title.ilike(pattern) | Review.body.ilike(pattern))
    if stars:
        conds.append(Review.rating == stars)
    total = db.scalar(select(func.count(Review.id)).where(*conds)) or 0
    order = (
        [Review.created_at.desc()]
        if sort == "recent"
        else [Review.helpful_count.desc(), Review.created_at.desc()]
    )
    rows = db.scalars(
        select(Review)
        .where(*conds)
        .options(selectinload(Review.user))
        .order_by(*order, Review.id)
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    can_review = False
    if user is not None and _has_bought(db, user.id, product.id):
        already = db.scalar(
            select(func.count(Review.id)).where(Review.product_id == product.id, Review.user_id == user.id)
        )
        can_review = not already
    return ReviewPage(
        summary=_review_summary(product),
        items=[
            ReviewOut(
                id=r.id,
                author=r.user.name,
                rating=r.rating,
                title=r.title,
                body=r.body,
                verified_purchase=r.verified_purchase,
                helpful_count=r.helpful_count,
                created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
        page=page,
        pages=svc.pages_for(total, per_page),
        can_review=can_review,
    )


@router.post("/products/{slug}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def add_review(db: DB, user: CurrentUser, slug: str, body: ReviewIn) -> ReviewOut:
    product = _published(db, slug)
    if not 1 <= body.rating <= 5:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Pick a rating from 1 to 5 stars.")
    title, text = body.title.strip(), body.body.strip()
    if not 3 <= len(title) <= 120:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Give your review a title (3-120 characters)."
        )
    if not 10 <= len(text) <= 4000:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Write at least 10 characters.")
    if not _has_bought(db, user.id, product.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can review products you've bought.")
    if db.scalar(select(Review.id).where(Review.product_id == product.id, Review.user_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "You've already reviewed this product.")

    review = Review(
        product_id=product.id, user_id=user.id, rating=body.rating, title=title, body=text,
        verified_purchase=True,
    )  # fmt: skip
    db.add(review)
    breakdown = {str(k): int(v) for k, v in (product.rating_breakdown or {}).items()}
    breakdown[str(body.rating)] = breakdown.get(str(body.rating), 0) + 1
    count = sum(breakdown.values())
    product.rating_breakdown = breakdown
    product.rating_count = count
    product.rating_avg = round(sum(int(k) * v for k, v in breakdown.items()) / count, 1)
    db.commit()
    db.refresh(review)
    return ReviewOut(
        id=review.id, author=user.name, rating=review.rating, title=review.title, body=review.body,
        verified_purchase=True, helpful_count=0, created_at=review.created_at,
    )  # fmt: skip


@router.post("/reviews/{review_id}/helpful", status_code=status.HTTP_204_NO_CONTENT)
def mark_helpful(db: DB, review_id: int) -> None:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found.")
    review.helpful_count += 1
    db.commit()


@router.get("/categories", response_model=list[CategoryOut])
def categories(db: DB) -> list[CategoryOut]:
    rows = db.scalars(select(Category).order_by(Category.position, Category.name)).all()
    slugs = {c.id: c.slug for c in rows}
    return [svc.category_out(c, slugs.get(c.parent_id) if c.parent_id else None) for c in rows]


@router.get("/brands", response_model=list[BrandOut])
def brands(db: DB) -> list[BrandOut]:
    return [BrandOut(slug=b.slug, name=b.name) for b in db.scalars(select(Brand).order_by(Brand.name))]


@router.get("/home", response_model=HomePayload)
def home(db: DB) -> HomePayload:
    s = svc.to_summary
    featured = svc.top_products(db, Product.is_featured.is_(True), limit=1)

    deal_products = svc.top_products(db, Product.deal.has(), limit=12, order=[Product.id])
    deals_by_qty = sorted(deal_products, key=lambda p: p.deal.total_qty if p.deal else 0, reverse=True)
    deal_of_day = deals_by_qty[0] if deals_by_qty else None
    flash = [p for p in deals_by_qty[1:]]
    flash.sort(key=lambda p: p.deal.discount_pct if p.deal else 0, reverse=True)

    workspace = svc.top_products(db, svc.in_category_tree(db, ["accessories"]), limit=4)
    smart_home = svc.top_products(db, svc.in_category_tree(db, ["smart-home"]), limit=4)
    keep = svc.top_products(
        db,
        svc.in_category_tree(db, ["audio", "keyboards", "mice"]),
        limit=4,
        order=[Product.rating_avg.desc()],
    )
    trending = svc.top_products(db, svc.in_category_tree(db, ["electronics", "computing"]), limit=10)

    # Featured brand: the third-party brand (not Apex's own lines) with the most published products.
    brand_row = db.execute(
        select(Brand, func.count(Product.id).label("n"))
        .join(Product, Product.brand_id == Brand.id)
        .where(Product.status == "published", Brand.name.not_ilike("apex%"))
        .group_by(Brand.id)
        .order_by(func.count(Product.id).desc(), Brand.name)
        .limit(1)
    ).first()
    featured_brand = None
    if brand_row:
        brand = brand_row[0]
        products = svc.top_products(db, Product.brand_id == brand.id, limit=3)
        if products:
            seller = products[0].seller
            featured_brand = FeaturedBrand(
                brand=BrandOut(slug=brand.slug, name=brand.name),
                seller=SellerRef(name=seller.store_name, slug=seller.slug),
                tagline=seller.description,
                products=[s(p) for p in products],
            )

    departments = db.scalars(
        select(Category).where(Category.icon.is_not(None)).order_by(Category.position)
    ).all()
    deal_count = db.scalar(select(func.count(Deal.id))) or 0
    return HomePayload(
        hero=s(featured[0]) if featured else None,
        departments=[svc.category_out(c) for c in departments],
        deals=DealsGrid(
            workspace=[s(p) for p in workspace],
            deal_of_the_day=s(deal_of_day) if deal_of_day else None,
            keep_shopping=[s(p) for p in keep],
            smart_home=[s(p) for p in smart_home],
        ),
        trending=[s(p) for p in trending],
        flash_deals=[s(p) for p in flash[:4]],
        flash_deal_count=max(deal_count - 1, 0),
        featured_brand=featured_brand,
    )
