from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import User, Tenant
from app.models.user import UserStatus, UserRole, ROLE_PERMISSIONS
from app.core.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Role labels
ROLE_LABELS = {
    UserRole.ADMIN.value: "Quan tri vien",
    UserRole.DISPATCHER.value: "Dieu phoi vien",
    UserRole.ACCOUNTANT.value: "Ke toan",
    UserRole.HR.value: "Nhan su",
    UserRole.DRIVER.value: "Tai xe",
}


@router.post("/login")
def login(username: str, password: str, session: Session = Depends(get_session)):
    """
    Login with username, email, or phone number.
    The 'username' parameter accepts any of these formats.
    """
    from sqlalchemy import or_

    # Find user by username OR email OR phone
    user = session.exec(
        select(User).where(
            or_(
                User.username == username,
                User.email == username,
                User.phone == username
            )
        )
    ).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    # Check if user is active
    if user.status == UserStatus.INACTIVE.value:
        raise HTTPException(403, "Account is inactive. Please contact administrator.")

    if user.status == UserStatus.SUSPENDED.value:
        raise HTTPException(403, "Account is suspended. Please contact administrator.")

    # Update last login
    user.last_login_at = datetime.utcnow().isoformat()
    session.add(user)
    session.commit()

    # Get tenant info for subdomain routing
    tenant = session.exec(
        select(Tenant).where(Tenant.id == user.tenant_id)
    ).first()

    tenant_code = tenant.code if tenant and hasattr(tenant, 'code') and tenant.code else "demo"
    tenant_name = tenant.name if tenant else "Unknown"

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "tenant_id": str(user.tenant_id),
    })

    # Get permissions for role
    role_enum = UserRole(user.role) if user.role in [r.value for r in UserRole] else None
    permissions = ROLE_PERMISSIONS.get(role_enum, {})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "system_role": user.system_role,
            "role_label": ROLE_LABELS.get(user.role, user.role),
            "permissions": permissions,
            "tenant_id": str(user.tenant_id),
            "tenant_code": tenant_code,
            "tenant_name": tenant_name,
        }
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get current user information"""
    role_enum = UserRole(current_user.role) if current_user.role in [r.value for r in UserRole] else None
    permissions = ROLE_PERMISSIONS.get(role_enum, {})

    # Get tenant info
    tenant = session.exec(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    ).first()

    tenant_code = tenant.code if tenant and hasattr(tenant, 'code') and tenant.code else "demo"
    tenant_name = tenant.name if tenant else "Unknown"

    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "system_role": current_user.system_role,
        "role_label": ROLE_LABELS.get(current_user.role, current_user.role),
        "status": current_user.status,
        "permissions": permissions,
        "tenant_id": str(current_user.tenant_id),
        "tenant_code": tenant_code,
        "tenant_name": tenant_name,
    }
