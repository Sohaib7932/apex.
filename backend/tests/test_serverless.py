from sqlalchemy.pool import NullPool, QueuePool

from app.core import db as db_module


def _fresh_engine():
    db_module.get_engine.cache_clear()
    try:
        return db_module.get_engine()
    finally:
        db_module.get_engine.cache_clear()


def test_engine_holds_no_pool_on_vercel(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    engine = _fresh_engine()
    assert isinstance(engine.pool, NullPool)
    engine.dispose()


def test_engine_keeps_a_small_pool_elsewhere(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("AWS_LAMBDA_FUNCTION_NAME", raising=False)
    engine = _fresh_engine()
    assert isinstance(engine.pool, QueuePool)
    assert engine.pool.size() == 5
    engine.dispose()
