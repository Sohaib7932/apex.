import os
from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _serverless() -> bool:
    """True on Vercel (or AWS Lambda), where each instance is short-lived."""
    return bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))


@lru_cache
def get_engine() -> Engine:
    # Use the pooled DATABASE_URL. It runs PgBouncer in transaction mode, so skip server-side
    # prepares. Neon computes scale to zero; pre-ping drops dead connections instead of failing.
    common = {
        "pool_pre_ping": True,
        "connect_args": {"prepare_threshold": None, "connect_timeout": 10},
    }
    if _serverless():
        # Neon's PgBouncer does the pooling. Holding connections in a frozen or recycled
        # function instance would only leak them, so open one per request and close it after.
        return create_engine(get_settings().sqlalchemy_url, poolclass=NullPool, **common)
    return create_engine(
        get_settings().sqlalchemy_url, pool_size=5, max_overflow=5, pool_recycle=300, **common
    )


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    session = _session_factory()()
    try:
        yield session
    finally:
        session.close()


def ping_database() -> None:
    """Raise if the database is unreachable."""
    with get_engine().connect() as conn:
        conn.execute(text("SELECT 1"))
