from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from sqlmodel import Session, select

from app.db.session import get_session
from app.models import User

SECRET_KEY = "CHANGE_ME_SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_token_from_request(request: Request, token_from_header: str | None = None) -> str | None:
    """Get token from cookie or Authorization header (cookie takes priority for cross-subdomain)"""
    # First try cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    # Fallback to header (for API clients, mobile apps, etc.)
    return token_from_header


def _truncate_password(password: str) -> bytes:
    """Truncate password to 72 bytes (bcrypt limit) and return as bytes"""
    return password.encode('utf-8')[:72]


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    truncated = _truncate_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(truncated, salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password using bcrypt directly"""
    try:
        truncated = _truncate_password(password)
        return bcrypt.checkpw(truncated, hashed.encode('utf-8'))
    except Exception:
        return False


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


# ============ Permission Check Utilities ============

def get_role_permissions_from_db(session: Session, user: User) -> dict:
    """
    Get permissions for user's role from RolePermission table (tenant-specific).
    Falls back to legacy defaults if not found in DB.

    Returns: {"resource": ["action1", "action2"], ...}
    """
    from app.models import RolePermission
    from app.models.user import LEGACY_ROLE_PERMISSIONS, LegacyUserRole

    # Get from RolePermission table (tenant-specific)
    role_permission = session.exec(
        select(RolePermission).where(
            RolePermission.tenant_id == user.tenant_id,
            RolePermission.role == user.role
        )
    ).first()

    if role_permission:
        return role_permission.get_permissions()

    # Fall back to legacy defaults
    try:
        role_enum = LegacyUserRole(user.role)
        return LEGACY_ROLE_PERMISSIONS.get(role_enum, {})
    except ValueError:
        return {}


def check_resource_permission(
    session: Session,
    user: User,
    resource: str,
    action: str,
    raise_exception: bool = True
) -> bool:
    """
    Check if user has permission for a resource action.
    Uses tenant-specific RolePermission from database.

    Args:
        session: Database session
        user: Current user
        resource: Resource name (e.g., "orders", "drivers", "dashboard")
        action: Action name (e.g., "view", "create", "edit", "delete")
        raise_exception: If True, raises HTTPException 403 when not allowed

    Returns:
        True if allowed, False if not
    """
    # ADMIN role always has full access
    if user.role == "ADMIN":
        return True

    # System admin roles have full access
    if hasattr(user, 'system_role') and user.system_role in ("SUPER_ADMIN", "TENANT_ADMIN"):
        return True

    # Get permissions from tenant-specific RolePermission table
    permissions = get_role_permissions_from_db(session, user)

    # Check if resource/action is allowed
    resource_perms = permissions.get(resource, [])
    allowed = action in resource_perms

    if not allowed and raise_exception:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "permission_denied",
                "message": f"Bạn không có quyền '{action}' cho '{resource}'",
                "resource": resource,
                "action": action
            }
        )

    return allowed


def require_resource_permission(resource: str, action: str):
    """
    Dependency factory to require a specific resource permission.
    Uses tenant-specific permissions from RolePermission table.

    Usage:
        @router.get("/orders")
        def list_orders(
            _: None = Depends(require_resource_permission("orders", "view")),
            current_user: User = Depends(get_current_user),
        ):
            ...
    """
    def permission_checker(
        session: Session = Depends(get_session),
        current_user: User = Depends(get_current_user),
    ):
        check_resource_permission(session, current_user, resource, action)
        return None

    return permission_checker


# Legacy functions for backward compatibility
def get_user_permissions(session: Session, user_id: str) -> dict:
    """Legacy function - use get_role_permissions_from_db instead"""
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        return {}
    if user.role == "ADMIN":
        return {"all": True}
    return get_role_permissions_from_db(session, user)


def check_permission(
    session: Session,
    user: User,
    module: str,
    resource: str,
    action: str,
    raise_exception: bool = True
) -> bool:
    """Legacy function - redirects to check_resource_permission"""
    return check_resource_permission(session, user, resource, action, raise_exception)


def require_permission(module: str, resource: str, action: str):
    """Legacy function - redirects to require_resource_permission"""
    return require_resource_permission(resource, action)
