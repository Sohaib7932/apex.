from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _to_psycopg_url(url: str) -> str:
    """Neon hands out `postgres://` / `postgresql://` URLs; SQLAlchemy needs the psycopg 3 driver name."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


class Settings(BaseSettings):
    """App settings, read from environment variables (and backend/.env locally).

    Secrets are SecretStr so they never show up in reprs, tracebacks or logs.
    """

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    environment: str = "development"
    # Pooled Neon URL, used by the API at runtime.
    database_url: SecretStr
    # Direct (unpooled) Neon URL, used by Alembic migrations. Falls back to database_url.
    database_url_unpooled: SecretStr | None = None
    jwt_secret: SecretStr = SecretStr("")
    stripe_secret_key: SecretStr = SecretStr("")
    stripe_webhook_secret: SecretStr = SecretStr("")
    # Public URL of the Next.js site; used for Stripe success/cancel redirects.
    frontend_url: str = ""
    # Comma-separated list of browser origins allowed by CORS. Defaults to frontend_url.
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip().startswith("["):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origins:
            return self.cors_origins
        return [self.frontend_url.rstrip("/")] if self.frontend_url else []

    @property
    def sqlalchemy_url(self) -> str:
        return _to_psycopg_url(self.database_url.get_secret_value())

    @property
    def sqlalchemy_url_unpooled(self) -> str:
        url = self.database_url_unpooled or self.database_url
        return _to_psycopg_url(url.get_secret_value())


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
