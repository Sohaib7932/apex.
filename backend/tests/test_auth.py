from tests.conftest import signup


def test_signup_login_me_logout(db, make_client):
    client = make_client()
    user = signup(client, "Person@Example.com", "  Pat   Doe ")
    assert user["email"] == "person@example.com"
    assert user["name"] == "Pat Doe"
    assert user["seller"] is None
    assert client.get("/api/v1/auth/me").status_code == 200

    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401

    res = client.post("/api/v1/auth/login", json={"email": "person@example.com", "password": "password123"})
    assert res.status_code == 200
    assert "apex_session" in res.cookies or client.cookies.get("apex_session")


def test_duplicate_email_and_wrong_password_have_clear_messages(db, make_client):
    client = make_client()
    signup(client, "dup@example.com")
    res = client.post(
        "/api/v1/auth/signup", json={"name": "Dup", "email": "dup@example.com", "password": "password123"}
    )
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"]

    res = make_client().post(
        "/api/v1/auth/login", json={"email": "dup@example.com", "password": "wrong-pass"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password."


def test_validation_errors_are_one_readable_sentence(db, make_client):
    res = make_client().post(
        "/api/v1/auth/signup", json={"name": "A B", "email": "not-an-email", "password": "x"}
    )
    assert res.status_code == 422
    assert res.json()["detail"] == "Enter a valid email address."
    res = make_client().post(
        "/api/v1/auth/signup", json={"name": "A B", "email": "ok@example.com", "password": "short"}
    )
    assert res.json()["detail"] == "Use at least 8 characters for your password."
