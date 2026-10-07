from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select

from app.core.deps import DB, CurrentUser
from app.core.security import clear_session_cookie, hash_password, set_session_cookie, verify_password
from app.models import LoginAttempt, Seller, User

router = APIRouter(prefix="/auth", tags=["auth"])

# Login limit (PRD 7, P1): 10 failed tries per 5 minutes per IP+email. Kept in Postgres, not
# memory, because serverless instances come and go and do not share state.
_WINDOW = timedelta(minutes=5)
_MAX_ATTEMPTS = 10


def _rate_limited(db: DB, key: str) -> bool:
    since = datetime.now(UTC) - _WINDOW
    # Expired rows are useless; clear them as we go so the table stays tiny.
    db.execute(delete(LoginAttempt).where(LoginAttempt.attempted_at < since))
    recent = db.scalar(
        select(func.count(LoginAttempt.id)).where(LoginAttempt.key == key, LoginAttempt.attempted_at >= since)
    )
    db.commit()
    return (recent or 0) >= _MAX_ATTEMPTS


def _record_failure(db: DB, key: str) -> None:
    db.add(LoginAttempt(key=key[:320]))
    db.commit()


class SellerBrief(BaseModel):
    id: int
    store_name: str
    slug: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    seller: SellerBrief | None


class SignupIn(BaseModel):
    name: str = Field(max_length=80)
    email: EmailStr
    password: str = Field(max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


def user_out(db: DB, user: User) -> UserOut:
    seller = db.scalar(select(Seller).where(Seller.user_id == user.id))
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        seller=SellerBrief(id=seller.id, store_name=seller.store_name, slug=seller.slug) if seller else None,
    )


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(db: DB, body: SignupIn, response: Response) -> UserOut:
    name = " ".join(body.name.split())
    if len(name) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Enter your name (at least 2 characters).")
    if len(body.password) < 8:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Use at least 8 characters for your password."
        )
    email = body.email.lower()
    if db.scalar(select(func.count(User.id)).where(User.email == email)):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists. Try signing in instead."
        )
    user = User(name=name, email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, user.id)
    return user_out(db, user)


@router.post("/login", response_model=UserOut)
def login(db: DB, body: LoginIn, request: Request, response: Response) -> UserOut:
    email = body.email.lower()
    client = request.headers.get("x-forwarded-for", request.client.host if request.client else "?")
    key = f"{client.split(',')[0].strip()}|{email}"[:320]
    if _rate_limited(db, key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many sign-in attempts. Please wait a few minutes."
        )
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(user.password_hash, body.password):
        _record_failure(db, key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    db.execute(delete(LoginAttempt).where(LoginAttempt.key == key))
    db.commit()
    set_session_cookie(response, user.id)
    return user_out(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(db: DB, user: CurrentUser) -> UserOut:
    return user_out(db, user)
