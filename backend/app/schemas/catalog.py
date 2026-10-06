from datetime import datetime

from pydantic import BaseModel


class BrandOut(BaseModel):
    slug: str
    name: str


class CategoryOut(BaseModel):
    id: int
    slug: str
    name: str
    parent_slug: str | None = None
    icon: str | None = None


class SellerRef(BaseModel):
    name: str
    slug: str


class DealOut(BaseModel):
    discount_pct: int
    ends_at: datetime
    total_qty: int
    claimed_qty: int
    claimed_pct: int


class ProductSummary(BaseModel):
    id: int
    slug: str
    title: str
    brand: BrandOut
    image: str | None
    price_cents: int
    list_price_cents: int | None
    rating_avg: float
    rating_count: int
    bought_past_month: int
    badges: list[str]
    delivery_speed: str
    stock: int
    seller: SellerRef
    deal: DealOut | None = None
    has_options: bool = False


class VariantOut(BaseModel):
    id: int
    kind: str
    label: str
    detail: str | None
    swatch: str | None
    price_delta_cents: int
    image_url: str | None
    stock: int


class SellerDetail(SellerRef):
    description: str
    logo_url: str | None


class ProductDetail(ProductSummary):
    description: str
    highlights: list[str]
    specs: dict[str, str]
    facets: dict[str, str]
    images: list[str]
    colors: list[VariantOut]
    editions: list[VariantOut]
    category: CategoryOut
    breadcrumbs: list[CategoryOut]
    rating_breakdown: dict[str, int]
    seller_detail: SellerDetail
    protection_plan: "PlanOffer | None" = None


class PlanOffer(BaseModel):
    id: int
    title: str
    price_cents: int


class ProductPage(BaseModel):
    items: list[ProductSummary]
    total: int
    page: int
    per_page: int
    pages: int


class FacetValue(BaseModel):
    value: str
    label: str
    count: int


class FacetGroup(BaseModel):
    key: str
    label: str
    values: list[FacetValue]


class SearchFilters(BaseModel):
    total: int
    categories: list[FacetValue]
    brands: list[FacetValue]
    ratings: list[FacetValue]
    prices: list[FacetValue]
    one_day_count: int
    in_stock_count: int
    facets: list[FacetGroup]


class RelatedOut(BaseModel):
    bundle: list[ProductSummary]
    bundle_total_cents: int
    also_bought: list[ProductSummary]


class ReviewOut(BaseModel):
    id: int
    author: str
    rating: int
    title: str
    body: str
    verified_purchase: bool
    helpful_count: int
    created_at: datetime


class ReviewSummary(BaseModel):
    rating_avg: float
    rating_count: int
    breakdown_pct: dict[str, int]


class ReviewPage(BaseModel):
    summary: ReviewSummary
    items: list[ReviewOut]
    total: int
    page: int
    pages: int
    can_review: bool = False


class ReviewIn(BaseModel):
    rating: int
    title: str
    body: str


class DealsGrid(BaseModel):
    workspace: list[ProductSummary]
    deal_of_the_day: ProductSummary | None
    keep_shopping: list[ProductSummary]
    smart_home: list[ProductSummary]


class FeaturedBrand(BaseModel):
    brand: BrandOut
    seller: SellerRef
    tagline: str
    products: list[ProductSummary]


class HomePayload(BaseModel):
    hero: ProductSummary | None
    departments: list[CategoryOut]
    deals: DealsGrid
    trending: list[ProductSummary]
    flash_deals: list[ProductSummary]
    flash_deal_count: int
    featured_brand: FeaturedBrand | None


ProductDetail.model_rebuild()
