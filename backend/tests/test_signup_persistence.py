"""Sign-ups must be committed to the database and survive a demo re-seed."""

import secrets

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

import seed as seed_script
from app.core.security import hash_password
from app.models import User
from tests.conftest import signup


def test_signup_is_committed_and_readable_from_a_new_session(engine, db, make_client):
    email = f"fresh-{secrets.token_hex(4)}@example.com"
    created = signup(make_client(), email, "Fresh Person", "password123")

    # A brand-new database session (new connection) sees the committed row.
    with Session(engine) as fresh:
        user = fresh.scalar(select(User).where(User.email == email))
    assert user is not None
    assert user.id == created["id"]
    assert user.name == "Fresh Person"
    assert user.password_hash != "password123" and user.password_hash.startswith("$argon2")

    # A brand-new HTTP client (no cookies) can sign in and read the account back.
    other = make_client()
    res = other.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 200
    assert other.get("/api/v1/auth/me").json()["email"] == email


def test_seed_reset_refuses_when_real_users_exist(engine, db, monkeypatch, capsys):
    db.add_all(
        [
            User(email="buyer@apex.demo", name="Demo", password_hash=hash_password("x" * 12)),
            User(email="real.person@example.com", name="Real", password_hash=hash_password("x" * 12)),
        ]
    )
    db.commit()
    assert seed_script.real_user_count(db) == 1

    monkeypatch.setattr(seed_script, "get_engine", lambda: engine)
    with pytest.raises(SystemExit) as exc:
        seed_script.main(["--reset"])
    assert exc.value.code == 1
    assert "Refusing to reset" in capsys.readouterr().out

    with Session(engine) as fresh:  # nothing was deleted
        assert fresh.scalar(select(User).where(User.email == "real.person@example.com")) is not None


def test_demo_accounts_do_not_count_as_real(db):
    db.add_all(
        [
            User(email="seller@apex.demo", name="Demo", password_hash="x"),
            User(email="marcus.vance@reviewers.apex.demo", name="Reviewer", password_hash="x"),
        ]
    )
    db.commit()
    assert seed_script.real_user_count(db) == 0
