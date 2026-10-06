"""Server-side pricing. The client never sends a price; everything is recomputed here
from the database, so cart, Stripe and the order record always agree."""

from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Product, ProductVariant, PromoCode

TAX_RATE_PERCENT = 8
FREE_SHIPPING_THRESHOLD_CENTS = 3500
STANDARD_SHIPPING_CENTS = 599
ONE_DAY_SHIPPING_CENTS = 999
MAX_LINE_QUANTITY = 30
DELIVERY_METHODS = ("standard", "one_day")


class PricingError(ValueError):
    """A line can't be priced (unknown product, wrong variant, ...)."""


def percent_of(amount_cents: int, percent: int) -> int:
    """amount * percent / 100, rounded half up, in whole cents."""
    return (amount_cents * percent + 50) // 100


@dataclass
class LineRequest:
    product_id: int
    quantity: int
    variant_id: int | None = None
    edition_id: int | None = None
    saved_for_later: bool = False
    selected: bool = True
    cart_item_id: int | None = None


@dataclass
class PricedLine:
    request: LineRequest
    product: Product
    variant: ProductVariant | None
    edition: ProductVariant | None
    unit_price_cents: int
    available: int

    @property
    def quantity(self) -> int:
        return self.request.quantity

    @property
    def line_total_cents(self) -> int:
        return self.unit_price_cents * self.request.quantity

    @property
    def variant_label(self) -> str | None:
        parts = [v.label for v in (self.variant, self.edition) if v is not None]
        return " · ".join(parts) or None

    @property
    def in_stock(self) -> bool:
        return self.available >= self.request.quantity

    @property
    def counts_toward_total(self) -> bool:
        return self.request.selected and not self.request.saved_for_later


@dataclass
class Totals:
    item_count: int
    subtotal_cents: int
    discount_cents: int
    tax_cents: int
    shipping_cents: int
    total_cents: int
    delivery_method: str
    promo_code: str | None = None
    percent_off: int = 0
    amount_to_free_shipping_cents: int = 0
    free_shipping_threshold_cents: int = FREE_SHIPPING_THRESHOLD_CENTS
    notes: list[str] = field(default_factory=list)


def shipping_for(subtotal_cents: int, delivery_method: str) -> int:
    if subtotal_cents <= 0:
        return 0
    if delivery_method == "one_day":
        return ONE_DAY_SHIPPING_CENTS
    return 0 if subtotal_cents >= FREE_SHIPPING_THRESHOLD_CENTS else STANDARD_SHIPPING_CENTS


def compute_totals(
    subtotal_cents: int,
    item_count: int,
    *,
    percent_off: int = 0,
    promo_code: str | None = None,
    delivery_method: str = "standard",
) -> Totals:
    """Order math, used by the cart summary, checkout and the order record.

    discount = percent_off of subtotal; tax = 8% of (subtotal - discount);
    shipping is not taxed; total = subtotal - discount + tax + shipping.
    """
    if delivery_method not in DELIVERY_METHODS:
        raise PricingError("Unknown delivery method.")
    discount = percent_of(subtotal_cents, percent_off) if percent_off else 0
    tax = percent_of(subtotal_cents - discount, TAX_RATE_PERCENT)
    shipping = shipping_for(subtotal_cents, delivery_method)
    return Totals(
        item_count=item_count,
        subtotal_cents=subtotal_cents,
        discount_cents=discount,
        tax_cents=tax,
        shipping_cents=shipping,
        total_cents=subtotal_cents - discount + tax + shipping,
        delivery_method=delivery_method,
        promo_code=promo_code if percent_off else None,
        percent_off=percent_off,
        amount_to_free_shipping_cents=max(FREE_SHIPPING_THRESHOLD_CENTS - subtotal_cents, 0),
    )


def load_promo(db: Session, code: str | None) -> PromoCode | None:
    if not code:
        return None
    promo = db.get(PromoCode, code.strip().upper())
    if promo is None or not promo.active:
        return None
    if promo.expires_at is not None and promo.expires_at <= datetime.now(UTC):
        return None
    return promo


def resolve_options(
    product: Product, variant_id: int | None, edition_id: int | None
) -> tuple[ProductVariant | None, ProductVariant | None]:
    """Pick the color/edition for a line, defaulting to the first of each kind."""
    colors = [v for v in product.variants if v.kind == "color"]
    editions = [v for v in product.variants if v.kind == "edition"]

    def pick(options: list[ProductVariant], wanted: int | None, what: str) -> ProductVariant | None:
        if not options:
            if wanted is not None:
                raise PricingError(f"This product has no {what} options.")
            return None
        if wanted is None:
            return next((o for o in options if o.stock > 0), options[0])
        for o in options:
            if o.id == wanted:
                return o
        raise PricingError(f"That {what} isn't available for this product.")

    return pick(colors, variant_id, "color"), pick(editions, edition_id, "edition")


def unit_price(product: Product, variant: ProductVariant | None, edition: ProductVariant | None) -> int:
    price = product.price_cents
    for v in (variant, edition):
        if v is not None:
            price += v.price_delta_cents
    return max(price, 1)


def available_stock(product: Product, variant: ProductVariant | None) -> int:
    # Color variants carry their own stock; editions don't change availability.
    return variant.stock if variant is not None else product.stock


def load_products(db: Session, product_ids: set[int]) -> dict[int, Product]:
    if not product_ids:
        return {}
    rows = db.scalars(
        select(Product)
        .where(Product.id.in_(product_ids))
        .options(
            selectinload(Product.variants),
            selectinload(Product.images),
            selectinload(Product.brand),
            selectinload(Product.seller),
        )
    ).all()
    return {p.id: p for p in rows}


def price_lines(db: Session, requests: list[LineRequest]) -> list[PricedLine]:
    """Price each line from the database. Lines for products that are gone or
    unpublished, or whose options no longer exist, are dropped."""
    products = load_products(db, {r.product_id for r in requests})
    priced: list[PricedLine] = []
    for req in requests:
        product = products.get(req.product_id)
        if product is None or product.status != "published":
            continue
        try:
            variant, edition = resolve_options(product, req.variant_id, req.edition_id)
        except PricingError:
            continue
        req.variant_id = variant.id if variant else None
        req.edition_id = edition.id if edition else None
        req.quantity = max(1, min(req.quantity, MAX_LINE_QUANTITY))
        priced.append(
            PricedLine(
                request=req,
                product=product,
                variant=variant,
                edition=edition,
                unit_price_cents=unit_price(product, variant, edition),
                available=available_stock(product, variant),
            )
        )
    return priced


def totals_for_lines(
    lines: list[PricedLine], promo: PromoCode | None, delivery_method: str = "standard"
) -> Totals:
    counted = [line for line in lines if line.counts_toward_total]
    return compute_totals(
        sum(line.line_total_cents for line in counted),
        sum(line.quantity for line in counted),
        percent_off=promo.percent_off if promo else 0,
        promo_code=promo.code if promo else None,
        delivery_method=delivery_method,
    )
