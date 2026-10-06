"""Stripe Checkout Session for an order. The session total always equals order.total_cents:

product lines + "Estimated tax" line - one-time coupon (discount) + fixed shipping rate
= subtotal + tax - discount + shipping
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import stripe

from app.core.config import get_settings
from app.models import Order

CURRENCY = "usd"


class PaymentsNotConfigured(RuntimeError):
    pass


def _api_key() -> str:
    key = get_settings().stripe_secret_key.get_secret_value()
    if not key:
        raise PaymentsNotConfigured("Payments aren't configured yet. Please try again later.")
    return key


def _absolute(url: str | None, base: str) -> list[str]:
    if not url:
        return []
    if url.startswith("https://"):
        return [url]
    if url.startswith("/") and base.startswith("https://"):
        return [base.rstrip("/") + url]
    return []


def session_params(order: Order, email: str, base_url: str, coupon_id: str | None) -> dict[str, Any]:
    line_items: list[dict[str, Any]] = []
    for item in order.items:
        name = item.title_snapshot + (
            f" ({item.variant_label_snapshot})" if item.variant_label_snapshot else ""
        )
        line_items.append(
            {
                "quantity": item.quantity,
                "price_data": {
                    "currency": CURRENCY,
                    "unit_amount": item.unit_price_cents,
                    "product_data": {"name": name[:250], "images": _absolute(item.image_snapshot, base_url)},
                },
            }
        )
    if order.tax_cents:
        line_items.append(
            {
                "quantity": 1,
                "price_data": {
                    "currency": CURRENCY,
                    "unit_amount": order.tax_cents,
                    "product_data": {"name": "Estimated tax (8%)"},
                },
            }
        )
    shipping_name = "One-Day delivery" if order.delivery_method == "one_day" else "Standard delivery"
    params: dict[str, Any] = {
        "mode": "payment",
        "line_items": line_items,
        "shipping_options": [
            {
                "shipping_rate_data": {
                    "type": "fixed_amount",
                    "display_name": shipping_name,
                    "fixed_amount": {"amount": order.shipping_cents, "currency": CURRENCY},
                }
            }
        ],
        "customer_email": email,
        "client_reference_id": str(order.id),
        "metadata": {"order_id": str(order.id)},
        "payment_intent_data": {"metadata": {"order_id": str(order.id)}},
        "success_url": f"{base_url}/checkout/success?order={order.id}&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{base_url}/cart?checkout=cancelled",
        "expires_at": int((datetime.now(UTC) + timedelta(minutes=31)).timestamp()),
    }
    if coupon_id:
        params["discounts"] = [{"coupon": coupon_id}]
    return params


def expected_total(params: dict[str, Any], discount_cents: int) -> int:
    """What Stripe will charge for these params; used by tests and as a guard."""
    lines = sum(li["price_data"]["unit_amount"] * li["quantity"] for li in params["line_items"])
    shipping = params["shipping_options"][0]["shipping_rate_data"]["fixed_amount"]["amount"]
    return lines - discount_cents + shipping


def create_session(order: Order, email: str, base_url: str) -> stripe.checkout.Session:
    api_key = _api_key()
    coupon_id = None
    if order.discount_cents:
        coupon = stripe.Coupon.create(
            api_key=api_key,
            amount_off=order.discount_cents,
            currency=CURRENCY,
            duration="once",
            max_redemptions=1,
            name=f"Promo {order.promo_code}" if order.promo_code else "Discount",
        )
        coupon_id = coupon.id
    params = session_params(order, email, base_url, coupon_id)
    if expected_total(params, order.discount_cents) != order.total_cents:
        raise RuntimeError("Stripe total does not match the order total")
    return stripe.checkout.Session.create(api_key=api_key, **params)


def retrieve_session(session_id: str) -> stripe.checkout.Session:
    return stripe.checkout.Session.retrieve(session_id, api_key=_api_key())


def construct_event(payload: bytes, signature: str) -> stripe.Event:
    secret = get_settings().stripe_webhook_secret.get_secret_value()
    if not secret:
        raise PaymentsNotConfigured("Webhook secret is not configured.")
    return stripe.Webhook.construct_event(payload, signature, secret)
