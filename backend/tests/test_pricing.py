"""Order math (PRD 4.5/4.6): 8% tax on the discounted subtotal, free standard delivery from $35."""

from types import SimpleNamespace

from app.services import pricing
from app.services.stripe_checkout import expected_total, session_params


def test_percent_rounds_half_up():
    assert pricing.percent_of(1005, 10) == 101  # 100.5 -> 101
    assert pricing.percent_of(1004, 10) == 100


def test_free_standard_shipping_at_threshold():
    below = pricing.compute_totals(3499, 1)
    at = pricing.compute_totals(3500, 1)
    assert below.shipping_cents == pricing.STANDARD_SHIPPING_CENTS
    assert at.shipping_cents == 0
    assert below.amount_to_free_shipping_cents == 1


def test_one_day_is_flat_fee_even_over_threshold():
    t = pricing.compute_totals(50000, 1, delivery_method="one_day")
    assert t.shipping_cents == pricing.ONE_DAY_SHIPPING_CENTS


def test_tax_applies_after_discount_and_total_adds_up():
    t = pricing.compute_totals(32996, 4, percent_off=10, promo_code="APEX10")
    assert t.discount_cents == 3300
    assert t.tax_cents == 2376  # 8% of 296.96
    assert t.shipping_cents == 0
    assert t.total_cents == 32996 - 3300 + 2376


def test_empty_cart_costs_nothing():
    t = pricing.compute_totals(0, 0)
    assert (t.shipping_cents, t.tax_cents, t.total_cents) == (0, 0, 0)


def _order(items, *, tax, shipping, discount, total, method="standard"):
    return SimpleNamespace(
        id=7,
        items=[
            SimpleNamespace(
                title_snapshot=t,
                variant_label_snapshot=None,
                quantity=q,
                unit_price_cents=u,
                image_snapshot=None,
            )
            for t, u, q in items
        ],
        tax_cents=tax,
        shipping_cents=shipping,
        discount_cents=discount,
        total_cents=total,
        delivery_method=method,
        promo_code="APEX10" if discount else None,
    )


def test_stripe_session_total_matches_order_total():
    """Stripe charges product lines + tax line - coupon + shipping; that must equal the order total."""
    items = [("Headphones", 22999, 1), ("Charger", 3999, 2), ("Plan", 1999, 1)]
    subtotal = sum(u * q for _, u, q in items)
    totals = pricing.compute_totals(
        subtotal, 4, percent_off=10, promo_code="APEX10", delivery_method="one_day"
    )
    order = _order(
        items,
        tax=totals.tax_cents,
        shipping=totals.shipping_cents,
        discount=totals.discount_cents,
        total=totals.total_cents,
        method="one_day",
    )
    params = session_params(order, "buyer@example.com", "https://shop.example.com", coupon_id="co_test")
    assert expected_total(params, order.discount_cents) == order.total_cents
    assert params["discounts"] == [{"coupon": "co_test"}]
    assert params["success_url"].startswith("https://shop.example.com/checkout/success?order=7")
    assert params["adaptive_pricing"] == {"enabled": False}


def test_relative_images_become_absolute_for_stripe():
    order = _order([("Item", 1000, 1)], tax=80, shipping=599, discount=0, total=1679)
    order.items[0].image_snapshot = "/products/item.webp"
    params = session_params(order, "b@example.com", "https://shop.example.com", None)
    product_data = params["line_items"][0]["price_data"]["product_data"]
    assert product_data["images"] == ["https://shop.example.com/products/item.webp"]
    assert "discounts" not in params
