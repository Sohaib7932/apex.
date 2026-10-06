"""Test setup.

Unit tests need nothing. Database tests run in a throwaway Postgres schema
(`test_<random>`) on TEST_DATABASE_URL, or on the direct Neon URL from backend/.env,
and the schema is dropped afterwards. With no database available they are skipped.
"""

import os
import secrets
from collections.abc import Iterator
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
if not os.environ.get("DATABASE_URL") and not (BACKEND / ".env").exists():
    os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
os.environ.setdefault("JWT_SECRET", "test-only-jwt-secret-0123456789abcdef")
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from app.core.config import _to_psycopg_url, get_settings  # noqa: E402
from app.core.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services import catalog as catalog_svc  # noqa: E402


def _test_db_url() -> str | None:
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        return _to_psycopg_url(url)
    settings = get_settings()
    if "localhost:5432/test" in settings.database_url.get_secret_value():
        return None
    return settings.sqlalchemy_url_unpooled


_state: dict[str, str] = {}


@pytest.fixture(scope="session")
def engine():
    url = _test_db_url()
    if not url:
        pytest.skip("No test database configured")
    schema = f"test_{secrets.token_hex(4)}"
    admin = create_engine(url, connect_args={"connect_timeout": 15})
    try:
        with admin.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            # Clean up schemas left by an interrupted earlier run (only our own naming pattern).
            for (old,) in conn.execute(
                text("SELECT nspname FROM pg_namespace WHERE nspname ~ '^test_[0-9a-f]{8}$'")
            ):
                conn.execute(text(f'DROP SCHEMA "{old}" CASCADE'))
            conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    except Exception as e:  # pragma: no cover - depends on environment
        pytest.skip(f"Test database unreachable: {type(e).__name__}")
    eng = create_engine(
        url, connect_args={"options": f"-csearch_path={schema},public", "connect_timeout": 15}
    )
    # checkfirst=False: the existence check would find the real tables in `public`
    # and skip creating them here. CREATE TABLE goes to the first schema on the path.
    Base.metadata.create_all(eng, checkfirst=False)
    with eng.connect() as conn:
        home = conn.execute(
            text(
                "SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE c.oid = 'users'::regclass"
            )
        ).scalar()
    if home != schema:
        pytest.exit(f"Refusing to run: test tables resolve to schema {home!r}, not {schema!r}", returncode=2)
    _state["schema"] = schema
    yield eng
    eng.dispose()
    with admin.begin() as conn:
        conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    admin.dispose()


@pytest.fixture
def db(engine) -> Iterator[Session]:
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = factory()
    yield session
    session.close()
    schema = _state["schema"]
    tables = ", ".join(f'"{schema}"."{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    catalog_svc._tree_cache = None


@pytest.fixture
def make_client(engine, db):
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override() -> Iterator[Session]:
        s = factory()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override
    clients: list[TestClient] = []

    def _make() -> TestClient:
        c = TestClient(app)
        clients.append(c)
        return c

    yield _make
    app.dependency_overrides.pop(get_db, None)
    for c in clients:
        c.close()


def signup(client: TestClient, email: str, name: str = "Test User", password: str = "password123") -> dict:
    res = client.post("/api/v1/auth/signup", json={"name": name, "email": email, "password": password})
    assert res.status_code == 201, res.text
    return res.json()
