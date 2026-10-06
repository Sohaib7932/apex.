from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.routers import health

API_PREFIX = "/api/v1"

configure_logging()
settings = get_settings()

app = FastAPI(
    title="Apex Marketplace API",
    version="0.1.0",
    docs_url=f"{API_PREFIX}/docs",
    openapi_url=f"{API_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /health at the root for Render's health check, and under /api/v1 so the
# frontend can reach it through the Next.js /api proxy.
app.include_router(health.router)
app.include_router(health.router, prefix=API_PREFIX)
