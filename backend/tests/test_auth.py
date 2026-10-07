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


def test_login_limit_is_kept_in_the_database(db, make_client):
    """Serverless instances share nothing in memory, so failed tries must live in Postgres."""
    from sqlalchemy import func, select

    from app.models import LoginAttempt

    signup(make_client(), "limit@example.com")
    bad = {"email": "limit@example.com", "password": "wrong-pass"}
    for _ in range(10):
        # A fresh client each time stands in for a fresh function instance.
        assert make_client().post("/api/v1/auth/login", json=bad).status_code == 401
    assert db.scalar(select(func.count(LoginAttempt.id))) == 10

    res = make_client().post("/api/v1/auth/login", json={**bad, "password": "password123"})
    assert res.status_code == 429
    assert "Too many sign-in attempts" in res.json()["detail"]


def test_successful_login_clears_failed_tries(db, make_client):
    from sqlalchemy import func, select

    from app.models import LoginAttempt

    signup(make_client(), "clear@example.com")
    for _ in range(3):
        make_client().post("/api/v1/auth/login", json={"email": "clear@example.com", "password": "nope-nope"})
    good = {"email": "clear@example.com", "password": "password123"}
    ok = make_client().post("/api/v1/auth/login", json=good)
    assert ok.status_code == 200
    db.expire_all()
    assert db.scalar(select(func.count(LoginAttempt.id))) == 0


def test_signup_login_logout_login_again(db, make_client):
    """The full sign-in cycle on a schema built by the Alembic migrations (see conftest)."""
    client = make_client()
    created = signup(client, "cycle@example.com", "Cycle User")
    assert client.get("/api/v1/auth/me").json()["id"] == created["id"]

    creds = {"email": "cycle@example.com", "password": "password123"}
    for _ in range(2):
        assert client.post("/api/v1/auth/logout").status_code == 204
        assert client.get("/api/v1/auth/me").status_code == 401
        res = client.post("/api/v1/auth/login", json=creds)
        assert res.status_code == 200, res.text
        assert res.json()["id"] == created["id"]
        assert client.get("/api/v1/auth/me").status_code == 200
