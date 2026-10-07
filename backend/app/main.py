import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.db_errors import describe_db_error
from app.core.logging import configure_logging
from app.routers import auth, cart, catalog, health, orders, seller

API_PREFIX = "/api/v1"

configure_logging()
settings = get_settings()
logger = logging.getLogger("app.errors")

app = FastAPI(
    title="Apex Marketplace API",
    version="1.0.0",
    docs_url=f"{API_PREFIX}/docs",
    openapi_url=f"{API_PREFIX}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FIELD_MESSAGES = {
    "email": "Enter a valid email address.",
    "zip": "Enter a 5-digit ZIP code.",
    "phone": "Enter a valid phone number.",
}


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Turn Pydantic's error list into one readable sentence in `detail`."""
    errors = exc.errors()
    message = "Please check the form and try again."
    if errors:
        err = errors[0]
        field = str(err.get("loc", ["", ""])[-1])
        msg = str(err.get("msg", ""))
        if msg.startswith("Value error, "):
            message = msg.removeprefix("Value error, ")
        elif field in FIELD_MESSAGES:
            message = FIELD_MESSAGES[field]
        elif field:
            label = field.replace("_", " ").capitalize()
            message = f"{label}: {msg[0].lower() + msg[1:] if msg else 'invalid value'}."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": message, "errors": [{"loc": e.get("loc"), "msg": e.get("msg")} for e in errors]},
    )


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Log what failed (class, SQLSTATE, message, SQL without values) to stdout, which is
    what Vercel and Render show as runtime logs, then answer with a plain 500."""
    logger.error(
        "database error",
        extra={"fields": {"method": request.method, "path": request.url.path, **describe_db_error(exc)}},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Something went wrong on our side. Please try again in a moment."},
    )


# /health at the root for Render's health check, and under /api/v1 so the
# frontend can reach it through the Next.js /api proxy.
app.include_router(health.router)
app.include_router(health.router, prefix=API_PREFIX)
for module in (auth, catalog, cart, orders, seller):
    app.include_router(module.router, prefix=API_PREFIX)
