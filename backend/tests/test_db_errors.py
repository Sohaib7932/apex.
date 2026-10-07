import logging

import pytest
from sqlalchemy import exc, text

from app.core.db_errors import describe_db_error
from app.routers import auth as auth_router
from tests.conftest import signup


def test_describe_db_error_keeps_the_sql_but_not_the_values(engine):
    with engine.connect() as conn, pytest.raises(exc.ProgrammingError) as caught:
        conn.execute(
            text("SELECT * FROM no_such_table WHERE email = :email"), {"email": "private@example.com"}
        )
    info = describe_db_error(caught.value)
    assert info["error_class"] == "ProgrammingError"
    assert info["driver_error"] == "psycopg.errors.UndefinedTable"
    assert info["sqlstate"] == "42P01"
    assert info["db_message"] == 'relation "no_such_table" does not exist'
    assert info["statement"] == "SELECT * FROM no_such_table WHERE email = %(email)s"
    assert "private@example.com" not in str(info)


def test_database_errors_are_logged_and_return_a_plain_500(db, make_client, monkeypatch, caplog):
    """What a missing migration looks like at runtime: logged with the failing SQL."""

    def broken_limiter(session, key):
        session.execute(text("SELECT count(*) FROM missing_table WHERE key = :key"), {"key": key})
        return False

    signup(make_client(), "logged@example.com")
    monkeypatch.setattr(auth_router, "_rate_limited", broken_limiter)
    client = make_client()
    with caplog.at_level(logging.ERROR, logger="app.errors"):
        creds = {"email": "logged@example.com", "password": "password123"}
        res = client.post("/api/v1/auth/login", json=creds)

    assert res.status_code == 500
    assert res.json() == {"detail": "Something went wrong on our side. Please try again in a moment."}
    record = next(r for r in caplog.records if r.name == "app.errors")
    fields = record.fields
    assert fields["path"] == "/api/v1/auth/login"
    assert fields["driver_error"] == "psycopg.errors.UndefinedTable"
    assert fields["db_message"] == 'relation "missing_table" does not exist'
    assert fields["statement"] == "SELECT count(*) FROM missing_table WHERE key = %(key)s"
    assert "logged@example.com" not in str(fields)
