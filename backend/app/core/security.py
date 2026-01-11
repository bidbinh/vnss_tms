from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.db.session import get_session
from app.models import User

SECRET_KEY = "CHANGE_ME_SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_token_from_request(request: Request, token_from_header: str | None = None) -> str | None:
    """Get token from cookie or Authorization header (cookie takes priority for cross-subdomain)"""
    # First try cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    # Fallback to header (for API clients, mobile apps, etc.)
    return token_from_header


def _truncate_password(password: str) -> str:
    """Truncate password to 72 bytes (bcrypt limit)"""
    # bcrypt only uses first 72 bytes of password
    return password.encode('utf-8')[:72].decode('utf-8', errors='ignore')


def hash_password(password: str) -> str:
    return pwd_context.hash(_truncate_password(password))


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(_truncate_password(password), hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire_dt = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = int(expire_dt.timestamp())
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Thin wrapper to decode a JWT and return its payload.
    Raises JWTError on invalid tokens so callers can handle 401s consistently.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    # Get token from cookie or header
    actual_token = get_token_from_request(request, token)
    if not actual_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_optional(
    request: Request,
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User | None:
    """Get current user but don't require authentication"""
    # Get token from cookie or header
    actual_token = get_token_from_request(request, token)

    try:
        if not actual_token or actual_token == "":
            return None
        payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    try:
        user = session.exec(select(User).where(User.id == user_id)).first()
        return user
    except:
        return None
