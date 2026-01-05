"""
User Management API
Manages users, roles, and permissions
"""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel, EmailStr

from app.db.session import get_session
from app.models import User
from app.models.user import UserRole, UserStatus, ROLE_PERMISSIONS
from app.core.security import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])


# ============ Pydantic Schemas ============

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = UserRole.DRIVER.value
    status: str = UserStatus.ACTIVE.value
    driver_id: Optional[str] = None
    notes: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    driver_id: Optional[str] = None
    notes: Optional[str] = None


class PasswordChange(BaseModel):
    new_password: str


class SelfPasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    role: str
    status: str
    driver_id: Optional[str]
    notes: Optional[str]
    last_login_at: Optional[str]
    created_at: datetime
    updated_at: datetime
    tenant_id: str


class PermissionInfo(BaseModel):
    module: str
    actions: List[str]


class RoleInfo(BaseModel):
    role: str
    label: str
    description: str
    permissions: List[PermissionInfo]


# ============ Helper Functions ============

def check_admin_or_hr(current_user: User):
    """Only ADMIN or HR can manage users"""
    if current_user.role not in [UserRole.ADMIN.value, UserRole.HR.value]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied. Only ADMIN or HR can manage users."
        )


def check_admin_only(current_user: User):
    """Only ADMIN can perform this action"""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Permission denied. Only ADMIN can perform this action."
        )


ROLE_LABELS = {
    UserRole.ADMIN.value: ("Quản trị viên", "Toàn quyền quản lý hệ thống"),
    UserRole.DISPATCHER.value: ("Điều phối viên", "Quản lý đơn hàng, chuyến xe, điều phối tài xế"),
    UserRole.ACCOUNTANT.value: ("Kế toán", "Quản lý tài chính, báo cáo, lương"),
    UserRole.HR.value: ("Nhân sự", "Quản lý tài xế, nhân viên"),
    UserRole.DRIVER.value: ("Tài xế", "Sử dụng app mobile, nhận chuyến"),
}


# ============ API Endpoints ============

@router.get("/roles")
def get_roles(
    current_user: User = Depends(get_current_user),
):
    """Get all available roles with their permissions"""
    roles = []
    for role in UserRole:
        label, description = ROLE_LABELS.get(role.value, (role.value, ""))
        permissions = []
        role_perms = ROLE_PERMISSIONS.get(role, {})
        for module, actions in role_perms.items():
            permissions.append(PermissionInfo(module=module, actions=actions))

        roles.append(RoleInfo(
            role=role.value,
            label=label,
            description=description,
            permissions=permissions,
        ))

    return {"roles": roles}


@router.get("/permissions")
def get_current_user_permissions(
    current_user: User = Depends(get_current_user),
):
    """Get permissions for the current logged-in user"""
    role = UserRole(current_user.role) if current_user.role in [r.value for r in UserRole] else None
    permissions = ROLE_PERMISSIONS.get(role, {})

    return {
        "user_id": current_user.id,
        "role": current_user.role,
        "role_label": ROLE_LABELS.get(current_user.role, (current_user.role, ""))[0],
        "permissions": permissions,
    }


@router.get("")
def list_users(
    search: Optional[str] = Query(None, description="Search by username, full_name, email, phone"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all users with filtering and pagination"""
    check_admin_or_hr(current_user)

    # Base query
    query = select(User).where(User.tenant_id == current_user.tenant_id)

    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.username.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.phone.ilike(search_pattern),
            )
        )

    # Role filter
    if role:
        query = query.where(User.role == role)

    # Status filter
    if status:
        query = query.where(User.status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Get users with pagination
    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    users = session.exec(query).all()

    # Format response
    users_data = []
    for user in users:
        users_data.append({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "role_label": ROLE_LABELS.get(user.role, (user.role, ""))[0],
            "status": user.status,
            "driver_id": user.driver_id,
            "notes": user.notes,
            "last_login_at": user.last_login_at,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        })

    return {
        "users": users_data,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/stats")
def get_user_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get user statistics by role and status"""
    check_admin_or_hr(current_user)

    # Total users
    total_query = select(func.count()).where(User.tenant_id == current_user.tenant_id)
    total = session.exec(total_query.select_from(User)).one()

    # By role
    by_role = {}
    for role in UserRole:
        count = session.exec(
            select(func.count()).select_from(User).where(
                User.tenant_id == current_user.tenant_id,
                User.role == role.value
            )
        ).one()
        by_role[role.value] = {
            "count": count,
            "label": ROLE_LABELS.get(role.value, (role.value, ""))[0],
        }

    # By status
    by_status = {}
    for status in UserStatus:
        count = session.exec(
            select(func.count()).select_from(User).where(
                User.tenant_id == current_user.tenant_id,
                User.status == status.value
            )
        ).one()
        by_status[status.value] = count

    return {
        "total": total,
        "by_role": by_role,
        "by_status": by_status,
    }


@router.get("/{user_id}")
def get_user(
    user_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific user by ID"""
    # Users can view their own profile
    if user_id != current_user.id:
        check_admin_or_hr(current_user)

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "role_label": ROLE_LABELS.get(user.role, (user.role, ""))[0],
        "status": user.status,
        "driver_id": user.driver_id,
        "notes": user.notes,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "permissions": ROLE_PERMISSIONS.get(UserRole(user.role), {}) if user.role in [r.value for r in UserRole] else {},
    }


@router.post("")
def create_user(
    data: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new user"""
    check_admin_or_hr(current_user)

    # HR cannot create ADMIN users
    if current_user.role == UserRole.HR.value and data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="HR cannot create ADMIN users"
        )

    # Check if username already exists
    existing = session.exec(
        select(User).where(User.username == data.username)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Username '{data.username}' already exists"
        )

    # Validate role
    if data.role not in [r.value for r in UserRole]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
        )

    # Validate status
    if data.status not in [s.value for s in UserStatus]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {[s.value for s in UserStatus]}"
        )

    # Create user
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        role=data.role,
        status=data.status,
        driver_id=data.driver_id,
        notes=data.notes,
        tenant_id=current_user.tenant_id,
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "role_label": ROLE_LABELS.get(user.role, (user.role, ""))[0],
            "status": user.status,
        }
    }


@router.put("/{user_id}")
def update_user(
    user_id: str,
    data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a user"""
    # Users can update their own profile (limited fields)
    is_self_update = user_id == current_user.id

    if not is_self_update:
        check_admin_or_hr(current_user)

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # HR cannot modify ADMIN users
    if current_user.role == UserRole.HR.value and user.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="HR cannot modify ADMIN users"
        )

    # Self-update can only change limited fields
    if is_self_update and current_user.role != UserRole.ADMIN.value:
        if data.role or data.status:
            raise HTTPException(
                status_code=403,
                detail="You cannot change your own role or status"
            )

    # Validate role if changing
    if data.role and data.role not in [r.value for r in UserRole]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
        )

    # Validate status if changing
    if data.status and data.status not in [s.value for s in UserStatus]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {[s.value for s in UserStatus]}"
        )

    # HR cannot promote to ADMIN
    if current_user.role == UserRole.HR.value and data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="HR cannot promote users to ADMIN role"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(user, key, value)

    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "role_label": ROLE_LABELS.get(user.role, (user.role, ""))[0],
            "status": user.status,
        }
    }


@router.patch("/{user_id}")
def patch_user(
    user_id: str,
    data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Partial update a user (same as PUT but explicit PATCH method)"""
    # Users can update their own profile (limited fields)
    is_self_update = user_id == current_user.id

    if not is_self_update:
        check_admin_or_hr(current_user)

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # HR cannot modify ADMIN users
    if current_user.role == UserRole.HR.value and user.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="HR cannot modify ADMIN users"
        )

    # Self-update can only change limited fields (full_name, email, phone)
    if is_self_update and current_user.role != UserRole.ADMIN.value:
        if data.role or data.status:
            raise HTTPException(
                status_code=403,
                detail="You cannot change your own role or status"
            )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(user, key, value)

    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "role_label": ROLE_LABELS.get(user.role, (user.role, ""))[0],
            "status": user.status,
        }
    }


@router.put("/{user_id}/password")
def change_user_password(
    user_id: str,
    data: PasswordChange,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Change user password (admin only - reset password without current password)"""
    check_admin_only(current_user)

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate password length
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters"
        )

    user.password_hash = hash_password(data.new_password)
    user.password_changed_at = datetime.utcnow().isoformat()
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()

    return {"message": "Password changed successfully"}


@router.post("/{user_id}/change-password")
def self_change_password(
    user_id: str,
    data: SelfPasswordChange,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Change own password (requires current password verification)"""
    # Only allow users to change their own password via this endpoint
    if user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only change your own password"
        )

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Mat khau hien tai khong dung"
        )

    # Validate new password length
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Mat khau moi phai co it nhat 6 ky tu"
        )

    # Update password
    user.password_hash = hash_password(data.new_password)
    user.password_changed_at = datetime.utcnow().isoformat()
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()

    return {"message": "Doi mat khau thanh cong"}


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a user (admin only)"""
    check_admin_only(current_user)

    # Cannot delete yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(user)
    session.commit()

    return {"message": f"User '{user.username}' deleted successfully"}


@router.put("/{user_id}/status")
def toggle_user_status(
    user_id: str,
    new_status: str = Query(..., description="New status: ACTIVE, INACTIVE, SUSPENDED"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Toggle user status (admin/HR)"""
    check_admin_or_hr(current_user)

    # Cannot change your own status
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own status"
        )

    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # HR cannot modify ADMIN users
    if current_user.role == UserRole.HR.value and user.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="HR cannot modify ADMIN users"
        )

    # Validate status
    if new_status not in [s.value for s in UserStatus]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {[s.value for s in UserStatus]}"
        )

    user.status = new_status
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()

    return {
        "message": f"User status changed to {new_status}",
        "user": {
            "id": user.id,
            "username": user.username,
            "status": user.status,
        }
    }
