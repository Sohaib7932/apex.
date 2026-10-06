"""Seller access rules (PRD 4.10): everything is scoped to the signed-in user's store.
Another store's product or order is a 404 (ids don't leak); no store means 403."""

import pytest

from app.models import Order, Product, User
from tests import factories
from tests.conftest import signup

PRODUCT_BODY = {
    "title": "Seller Test Keyboard",
    "description": "A keyboard",
    "brand": "TestBrand",
    "price_cents": 5000,
    "list_price_cents": 6000,
    "stock": 10,
    "images": ["/products/test.webp"],
    "variants": [{"kind": "color", "label": "Black", "price_delta_cents": 0, "stock": 10}],
    "badges": ["New Arrival"],
}


@pytest.fixture
def world(db, make_client):
    """Two stores (A and B), each with a product, and a buyer who ordered from both."""
    a, b, buyer, nostore = make_client(), make_client(), make_client(), make_client()
    a_user = signup(a, "a@example.com", "Alice A")
    b_user = signup(b, "b@example.com", "Bob B")
    buyer_user = signup(buyer, "buyer@example.com", "Jordan Lee")
    signup(nostore, "nostore@example.com", "No Store")
    assert (
        a.post("/api/v1/seller/store", json={"store_name": "Store A", "description": "A's"}).status_code
        == 201
    )
    assert (
        b.post("/api/v1/seller/store", json={"store_name": "Store B", "description": "B's"}).status_code
        == 201
    )

    cat = factories.category(db, "keyboards")
    db.commit()  # the API uses its own session
    pa = a.post(
        "/api/v1/seller/products", json={**PRODUCT_BODY, "category_id": cat.id, "status": "published"}
    )
    pb = b.post(
        "/api/v1/seller/products", json={**PRODUCT_BODY, "category_id": cat.id, "status": "published"}
    )
    assert pa.status_code == 201 and pb.status_code == 201, (pa.text, pb.text)

    pa_row, pb_row = db.get(Product, pa.json()["id"]), db.get(Product, pb.json()["id"])
    order = factories.paid_order(db, db.get(User, buyer_user["id"]), [(pa_row, 1), (pb_row, 2)])
    b_only = factories.paid_order(db, db.get(User, buyer_user["id"]), [(pb_row, 1)])
    db.commit()
    return {
        "a": a, "b": b, "buyer": buyer, "nostore": nostore,
        "pa": pa.json()["id"], "pb": pb.json()["id"],
        "order": order.id, "b_only": b_only.id, "a_user": a_user, "b_user": b_user,
    }  # fmt: skip


def test_seller_cannot_touch_another_stores_products(world):
    a, pb = world["a"], world["pb"]
    assert a.get(f"/api/v1/seller/products/{pb}").status_code == 404
    assert a.put(f"/api/v1/seller/products/{pb}", json={**PRODUCT_BODY, "category_id": 1}).status_code == 404
    assert a.post(f"/api/v1/seller/products/{pb}/publish").status_code == 404
    assert a.post(f"/api/v1/seller/products/{pb}/unpublish").status_code == 404
    assert a.delete(f"/api/v1/seller/products/{pb}").status_code == 404
    listed = [p["id"] for p in a.get("/api/v1/seller/products").json()["items"]]
    assert listed == [world["pa"]]


def test_seller_cannot_read_or_ship_another_stores_order(world):
    a = world["a"]
    assert a.get(f"/api/v1/seller/orders/{world['b_only']}").status_code == 404
    assert a.post(f"/api/v1/seller/orders/{world['b_only']}/ship").status_code == 404
    ids = [o["id"] for o in a.get("/api/v1/seller/orders").json()["items"]]
    assert world["b_only"] not in ids and world["order"] in ids


def test_shared_order_shows_only_own_lines_and_subtotal(world):
    detail = world["a"].get(f"/api/v1/seller/orders/{world['order']}").json()
    assert [line["quantity"] for line in detail["lines"]] == [1]
    assert detail["subtotal_cents"] == 5000  # A's line only, not B's 2 x 5000


def test_user_without_store_gets_403_except_store_creation(world):
    c = world["nostore"]
    for path in ("/api/v1/seller/overview", "/api/v1/seller/products", "/api/v1/seller/orders"):
        assert c.get(path).status_code == 403
    assert c.post("/api/v1/seller/products", json={**PRODUCT_BODY, "category_id": 1}).status_code == 403
    assert c.get("/api/v1/seller/store").status_code == 404
    res = c.post("/api/v1/seller/store", json={"store_name": "Store A", "description": "dup"})
    assert res.status_code == 409  # names are unique
    assert (
        c.post("/api/v1/seller/store", json={"store_name": "Store C", "description": "ok"}).status_code == 201
    )


def test_client_cannot_choose_the_seller(world, db):
    """Even if a seller_id is sent, the product belongs to the signed-in store."""
    a = world["a"]
    cat_id = a.get(f"/api/v1/seller/products/{world['pa']}").json()["category_id"]
    res = a.post(
        "/api/v1/seller/products",
        json={
            **PRODUCT_BODY,
            "category_id": cat_id,
            "seller_id": world["b_user"]["id"],
            "title": "Sneaky Product",
        },
    )
    assert res.status_code == 201
    own = db.get(Product, world["pa"]).seller_id
    db.expire_all()
    assert db.get(Product, res.json()["id"]).seller_id == own


def test_shipping_updates_the_buyers_view(world, db):
    buyer, a, b = world["buyer"], world["a"], world["b"]
    order_id = world["order"]
    assert buyer.get(f"/api/v1/orders/{order_id}").json()["display_status"] == "Preparing"

    res = a.post(f"/api/v1/seller/orders/{order_id}/ship")
    assert res.status_code == 200 and res.json()["fulfillment"] == "shipped"
    view = buyer.get(f"/api/v1/orders/{order_id}").json()
    assert view["display_status"] == "Partially shipped"
    assert sorted(i["fulfillment_status"] for i in view["items"]) == ["shipped", "unfulfilled"]

    assert a.post(f"/api/v1/seller/orders/{order_id}/ship").status_code == 409  # nothing left to ship
    assert b.post(f"/api/v1/seller/orders/{order_id}/ship").status_code == 200
    assert buyer.get(f"/api/v1/orders/{order_id}").json()["status"] == "shipped"


def test_only_paid_orders_can_be_shipped(world, db):
    order = db.get(Order, world["b_only"])
    order.status = "cancelled"
    db.commit()
    assert world["b"].post(f"/api/v1/seller/orders/{order.id}/ship").status_code == 409


def test_drafts_are_hidden_and_delete_archives_ordered_products(world):
    a, buyer = world["a"], world["buyer"]
    pa = world["pa"]
    slug = a.get(f"/api/v1/seller/products/{pa}").json()["slug"]
    assert buyer.get(f"/api/v1/products/{slug}").status_code == 200
    assert a.post(f"/api/v1/seller/products/{pa}/unpublish").json()["status"] == "draft"
    assert buyer.get(f"/api/v1/products/{slug}").status_code == 404  # drafts never public
    assert slug not in [p["slug"] for p in buyer.get("/api/v1/products").json()["items"]]
    assert a.delete(f"/api/v1/seller/products/{pa}").json()["result"] == "archived"  # it's in an order
    assert a.get(f"/api/v1/seller/products/{pa}").status_code == 404
