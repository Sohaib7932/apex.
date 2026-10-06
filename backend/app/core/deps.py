from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import SESSION_COOKIE, read_session_token
from app.models import Seller, User

DB = Annotated[Session, Depends(get_db)]


def get_optional_user(
    db: DB, session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None
) -> User | None:
    if not session:
        return None
    user_id = read_session_token(session)
    if user_id is None:
        return None
    return db.get(User, user_id)


def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in to continue.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def get_current_seller(db: DB, user: CurrentUser) -> Seller:
    """The store owned by the signed-in user. The client never sends a seller id."""
    seller = db.scalar(select(Seller).where(Seller.user_id == user.id))
    if seller is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Create a store to use the seller workspace.")
    return seller


CurrentSeller = Annotated[Seller, Depends(get_current_seller)]
