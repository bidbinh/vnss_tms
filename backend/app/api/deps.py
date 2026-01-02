from typing import Generator, Callable, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.db import engine
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def get_session() -> Generator[Session, None, None]:
    yield from get_db()


def _decode_or_401(token: str) -> dict:
    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(token: str = Depends(oauth2_scheme)):
    return _decode_or_401(token)


def require_role(expected_role: str) -> Callable[[str], Any]:
    """
    Dependency factory ensuring the JWT contains the expected role.
    Returns the decoded payload for downstream use.
    """
    def _check_role(token: str = Depends(oauth2_scheme)):
        payload = _decode_or_401(token)
        if payload.get("role") != expected_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return payload

    return _check_role
