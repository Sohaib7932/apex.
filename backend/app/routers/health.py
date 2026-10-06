import logging
import time
from collections.abc import Callable

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel

from app.core.db import ping_database

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    database: str
    database_latency_ms: float | None = None


def get_db_check() -> Callable[[], None]:
    """Indirection so tests can swap the database check out."""
    return ping_database


@router.get("/health", response_model=HealthResponse)
def health(response: Response, db_check: Callable[[], None] = Depends(get_db_check)) -> HealthResponse:
    started = time.perf_counter()
    try:
        db_check()
    except Exception:
        logger.exception("health check: database unreachable")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(status="degraded", database="unreachable")
    latency = round((time.perf_counter() - started) * 1000, 1)
    return HealthResponse(status="ok", database="ok", database_latency_ms=latency)
