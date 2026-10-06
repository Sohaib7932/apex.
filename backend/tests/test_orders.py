"""Checkout, payment and webhook behaviour against a real (throwaway) database."""

import hashlib
import hmac
import json
import time

from sqlalchemy import select

from app.core.config import get_settings
from app.models import CartItem, Order, Product, User
from app.services import orders as order_svc
from tests import factories
from tests.conftest import signup

ADDRESS = {
    "full_name": "Jordan Lee",
    "line1": "410 Terry Ave N",
    "line2": None,
    "city": "Seattle",
    "state": "WA",
    "zip": "98109",
    "phone": "(206) 555-0142",
}


def _setup(db, make_client):
    client = make_client()
    buyer = signup(client, "buyer@example.com", "Jordan Lee")
    seller_user = User(email="seller@example.com", name="Sam Seller", password_hash="x")
    db.add(seller_user)
    db.flush()
    store = factories.seller(db, seller_user.id, "Store One")
    p = factories.product(db, store.id, slug="test-keyboard", price_cents=12000, stock=5)
    db.commit()
    return client, buyer, p


def test_add_to_cart_respects_stock(db, make_client):
    client, _, p = _setup(db, make_client)
    res = client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 6})
    assert res.status_code == 409
    assert "Only 5 left" in res.json()["detail"]
    res = client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 2})
    assert res.status_code == 201
    assert res.json()["summary"]["subtotal_cents"] == 24000


def test_merge_keeps_higher_quantity_without_duplicates(db, make_client):
    client, _, p = _setup(db, make_client)
    client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 1})
    res = client.post("/api/v1/cart/merge", json={"items": [{"product_id": p.id, "quantity": 3}]})
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1 and items[0]["quantity"] == 3
    res = client.post("/api/v1/cart/merge", json={"items": [{"product_id": p.id, "quantity": 2}]})
    assert res.json()["items"][0]["quantity"] == 3


def test_guest_pricing_matches_signed_in_cart(db, make_client):
    client, _, p = _setup(db, make_client)
    guest = make_client().post("/api/v1/cart/price", json={"items": [{"product_id": p.id, "quantity": 2}]})
    client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 2})
    mine = client.get("/api/v1/cart")
    assert guest.json()["summary"] == mine.json()["summary"]


def test_pending_order_snapshots_and_mark_paid_is_idempotent(db, make_client):
    client, buyer, p = _setup(db, make_client)
    client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 2})
    user = db.get(User, buyer["id"])

    order = order_svc.create_pending_order(db, user, ADDRESS, "standard", None)
    db.commit()
    assert order.status == "pending"
    assert order.total_cents == order.subtotal_cents + order.tax_cents + order.shipping_cents
    assert order.items[0].unit_price_cents == 12000
    assert order.items[0].seller_id == p.seller_id

    assert order_svc.mark_paid(db, order.id) is True
    assert order_svc.mark_paid(db, order.id) is False  # second webhook delivery: no-op
    db.expire_all()
    assert db.get(Product, p.id).stock == 3  # decremented once, not twice
    assert db.scalar(select(CartItem).where(CartItem.user_id == user.id)) is None
    assert db.get(Order, order.id).status == "paid"


def test_checkout_rejects_promo_that_is_invalid(db, make_client):
    client, buyer, p = _setup(db, make_client)
    client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 1})
    res = client.post(
        "/api/v1/checkout/session",
        json={"address": ADDRESS, "delivery_method": "standard", "promo_code": "NOPE"},
        headers={"origin": "https://shop.example.com"},
    )
    assert res.status_code == 409
    assert "promo code" in res.json()["detail"]


def _signed(payload: dict, secret: str) -> tuple[bytes, str]:
    body = json.dumps(payload).encode()
    ts = int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return body, f"t={ts},v1={sig}"


def test_webhook_rejects_bad_signature_and_pays_once(db, make_client, monkeypatch):
    client, buyer, p = _setup(db, make_client)
    secret = "whsec_test_only"
    settings = get_settings()
    monkeypatch.setattr(settings, "stripe_webhook_secret", type(settings.stripe_webhook_secret)(secret))

    client.post("/api/v1/cart/items", json={"product_id": p.id, "quantity": 1})
    order = order_svc.create_pending_order(db, db.get(User, buyer["id"]), ADDRESS, "standard", None)
    db.commit()

    event = {
        "id": "evt_test",
        "object": "event",
        "type": "checkout.session.completed",
        "data": {"object": {"metadata": {"order_id": str(order.id)}, "payment_status": "paid"}},
    }
    body, header = _signed(event, "wrong-secret")
    res = client.post("/api/v1/webhooks/stripe", content=body, headers={"stripe-signature": header})
    assert res.status_code == 400

    body, header = _signed(event, secret)
    for _ in range(2):  # Stripe may deliver the same event twice
        res = client.post("/api/v1/webhooks/stripe", content=body, headers={"stripe-signature": header})
        assert res.status_code == 200
    db.expire_all()
    assert db.get(Order, order.id).status == "paid"
    assert db.get(Product, p.id).stock == 4


def test_orders_are_private_to_their_buyer(db, make_client):
    client, buyer, p = _setup(db, make_client)
    order = factories.paid_order(db, db.get(User, buyer["id"]), [(p, 1)])
    db.commit()
    assert client.get(f"/api/v1/orders/{order.id}").status_code == 200
    other = make_client()
    signup(other, "someone@example.com")
    assert other.get(f"/api/v1/orders/{order.id}").status_code == 404
