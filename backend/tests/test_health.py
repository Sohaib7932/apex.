import os

# Tests never need a real database; give Settings a dummy URL before the app imports it.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.routers.health import get_db_check  # noqa: E402


def _client(db_check):
    app.dependency_overrides[get_db_check] = lambda: db_check
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_health_ok():
    res = _client(lambda: None).get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["database_latency_ms"] >= 0


def test_health_db_down_returns_503_without_details():
    def boom():
        raise RuntimeError("connection to host secret-host failed")

    res = _client(boom).get("/health")
    assert res.status_code == 503
    assert res.json() == {"status": "degraded", "database": "unreachable", "database_latency_ms": None}
    assert "secret-host" not in res.text


def test_health_also_served_under_api_prefix():
    res = _client(lambda: None).get("/api/v1/health")
    assert res.status_code == 200
