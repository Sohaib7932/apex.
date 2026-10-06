from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Response

from app.core.config import get_settings

SESSION_COOKIE = "apex_session"
SESSION_TTL = timedelta(days=7)
_ALGORITHM = "HS256"

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _secret() -> str:
    secret = get_settings().jwt_secret.get_secret_value()
    if not secret:
        raise RuntimeError("JWT_SECRET is not configured")
    return secret


def create_session_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "iat": now, "exp": now + SESSION_TTL}
    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


def read_session_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(user_id),
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=get_settings().is_production,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        SESSION_COOKIE, path="/", httponly=True, secure=get_settings().is_production, samesite="lax"
    )
