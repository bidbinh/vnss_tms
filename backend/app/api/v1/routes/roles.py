"""
Role Management API
Manages roles and permissions with multi-role support
"""
from typing import Optional, List
from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, Role, Permission
from app.models.role import UserRole, AVAILABLE_MODULES, MODULE_RESOURCES, AVAILABLE_ACTIONS, DEFAULT_ROLE_TEMPLATES
from app.core.security import get_current_user

router = APIRouter(prefix="/roles", tags=["roles"])


# ============ Pydantic Schemas ============

class PermissionCreate(BaseModel):
    module: str
    resource: str
    action: str
    conditions_json: Optional[str] = None


class RoleCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    module_code: Optional[str] = None
    permissions: List[PermissionCreate] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[PermissionCreate]] = None


class AssignRoleRequest(BaseModel):
    user_id: str
    role_ids: List[str]


class RoleResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str]
    module_code: Optional[str]
    is_system: bool
    is_active: bool
    user_count: int = 0
    permissions: List[dict] = []


# ============ Helper Functions ============

def check_admin(current_user: User):
    """Only ADMIN can manage roles"""
    if current_user.role != "ADMIN" and current_user.system_role not in ["SUPER_ADMIN", "TENANT_ADMIN"]:
        raise HTTPException(403, "Permission denied. Only ADMIN can manage roles.")


def get_role_permissions(session: Session, role_id: str) -> List[dict]:
    """Get all permissions for a role"""
    permissions = session.exec(
        select(Permission).where(Permission.role_id == role_id)
    ).all()

    return [
        {
            "id": p.id,
            "module": p.module,
            "resource": p.resource,
            "action": p.action,
            "conditions": json.loads(p.conditions_json) if p.conditions_json else None,
        }
        for p in permissions
    ]


def get_user_permissions(session: Session, user_id: str) -> dict:
    """Get all permissions for a user (aggregated from all assigned roles)"""
    # Get all roles assigned to user
    user_roles = session.exec(
        select(UserRole).where(UserRole.user_id == user_id)
    ).all()

    if not user_roles:
        return {}

    role_ids = [ur.role_id for ur in user_roles]

    # Get roles
    roles = session.exec(
        select(Role).where(Role.id.in_(role_ids), Role.is_active == True)
    ).all()

    # Check if user has ADMIN role (full access)
    for role in roles:
        if role.code == "ADMIN":
            return {"all": True}

    # Get all permissions from all roles
    permissions = session.exec(
        select(Permission).where(Permission.role_id.in_(role_ids))
    ).all()

    # Aggregate permissions by module/resource
    result = {}
    for p in permissions:
        if p.module not in result:
            result[p.module] = {}
        if p.resource not in result[p.module]:
            result[p.module][p.resource] = []
        if p.action not in result[p.module][p.resource]:
            result[p.module][p.resource].append(p.action)

    return result


# ============ API Endpoints ============

@router.get("/available-modules")
def get_available_modules(current_user: User = Depends(get_current_user)):
    """Get list of available modules and their resources"""
    return {
        "modules": AVAILABLE_MODULES,
        "resources": MODULE_RESOURCES,
        "actions": AVAILABLE_ACTIONS,
    }


@router.get("/templates")
def get_role_templates(current_user: User = Depends(get_current_user)):
    """Get default role templates"""
    check_admin(current_user)
    return {"templates": DEFAULT_ROLE_TEMPLATES}


@router.get("")
def list_roles(
    search: Optional[str] = Query(None),
    module_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all roles for current tenant"""
    query = select(Role).where(Role.tenant_id == current_user.tenant_id)

    if search:
        query = query.where(
            (Role.name.ilike(f"%{search}%")) | (Role.code.ilike(f"%{search}%"))
        )

    if module_code:
        query = query.where(Role.module_code == module_code)

    if is_active is not None:
        query = query.where(Role.is_active == is_active)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Get roles
    query = query.order_by(Role.is_system.desc(), Role.name).offset(skip).limit(limit)
    roles = session.exec(query).all()

    # Build response with user counts and permissions
    result = []
    for role in roles:
        # Count users with this role
        user_count = session.exec(
            select(func.count()).select_from(UserRole).where(UserRole.role_id == role.id)
        ).one()

        # Get permissions
        permissions = get_role_permissions(session, role.id)

        result.append({
            "id": role.id,
            "name": role.name,
            "code": role.code,
            "description": role.description,
            "module_code": role.module_code,
            "is_system": role.is_system,
            "is_active": role.is_active,
            "user_count": user_count,
            "permissions": permissions,
            "created_at": role.created_at.isoformat() if role.created_at else None,
        })

    return {
        "roles": result,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{role_id}")
def get_role(
    role_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific role with permissions"""
    role = session.exec(
        select(Role).where(
            Role.id == role_id,
            Role.tenant_id == current_user.tenant_id
        )
    ).first()

    if not role:
        raise HTTPException(404, "Role not found")

    # Get permissions
    permissions = get_role_permissions(session, role.id)

    # Count users
    user_count = session.exec(
        select(func.count()).select_from(UserRole).where(UserRole.role_id == role.id)
    ).one()

    # Get users with this role
    user_roles = session.exec(
        select(UserRole).where(UserRole.role_id == role.id).limit(20)
    ).all()

    users = []
    for ur in user_roles:
        user = session.get(User, ur.user_id)
        if user:
            users.append({
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "assigned_at": ur.assigned_at,
            })

    return {
        "id": role.id,
        "name": role.name,
        "code": role.code,
        "description": role.description,
        "module_code": role.module_code,
        "is_system": role.is_system,
        "is_active": role.is_active,
        "user_count": user_count,
        "permissions": permissions,
        "users": users,
        "created_at": role.created_at.isoformat() if role.created_at else None,
        "updated_at": role.updated_at.isoformat() if role.updated_at else None,
    }


@router.post("")
def create_role(
    data: RoleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom role"""
    check_admin(current_user)

    # Check if code already exists
    existing = session.exec(
        select(Role).where(
            Role.tenant_id == current_user.tenant_id,
            Role.code == data.code
        )
    ).first()

    if existing:
        raise HTTPException(400, f"Role code '{data.code}' already exists")

    # Validate module_code
    if data.module_code and data.module_code not in AVAILABLE_MODULES:
        raise HTTPException(400, f"Invalid module_code. Must be one of: {AVAILABLE_MODULES}")

    # Create role
    role = Role(
        tenant_id=current_user.tenant_id,
        name=data.name,
        code=data.code.upper(),
        description=data.description,
        module_code=data.module_code,
        is_system=False,  # Custom roles are not system roles
        is_active=True,
    )
    session.add(role)
    session.commit()
    session.refresh(role)

    # Create permissions
    for perm in data.permissions:
        # Validate
        if perm.module not in AVAILABLE_MODULES:
            continue
        if perm.resource not in MODULE_RESOURCES.get(perm.module, []):
            continue
        if perm.action not in AVAILABLE_ACTIONS:
            continue

        permission = Permission(
            role_id=role.id,
            module=perm.module,
            resource=perm.resource,
            action=perm.action,
            conditions_json=perm.conditions_json,
        )
        session.add(permission)

    session.commit()

    return {
        "message": "Role created successfully",
        "role": {
            "id": role.id,
            "name": role.name,
            "code": role.code,
        }
    }


@router.put("/{role_id}")
def update_role(
    role_id: str,
    data: RoleUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a role"""
    check_admin(current_user)

    role = session.exec(
        select(Role).where(
            Role.id == role_id,
            Role.tenant_id == current_user.tenant_id
        )
    ).first()

    if not role:
        raise HTTPException(404, "Role not found")

    # System roles can only have name/description updated
    if role.is_system and data.permissions is not None:
        raise HTTPException(400, "Cannot modify permissions of system roles")

    # Update fields
    if data.name is not None:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.is_active is not None and not role.is_system:
        role.is_active = data.is_active

    role.updated_at = datetime.utcnow()

    # Update permissions (for non-system roles)
    if data.permissions is not None and not role.is_system:
        # Delete existing permissions
        session.exec(
            select(Permission).where(Permission.role_id == role.id)
        )
        existing_perms = session.exec(
            select(Permission).where(Permission.role_id == role.id)
        ).all()
        for p in existing_perms:
            session.delete(p)

        # Create new permissions
        for perm in data.permissions:
            if perm.module not in AVAILABLE_MODULES:
                continue
            if perm.resource not in MODULE_RESOURCES.get(perm.module, []):
                continue
            if perm.action not in AVAILABLE_ACTIONS:
                continue

            permission = Permission(
                role_id=role.id,
                module=perm.module,
                resource=perm.resource,
                action=perm.action,
                conditions_json=perm.conditions_json,
            )
            session.add(permission)

    session.commit()
    session.refresh(role)

    return {
        "message": "Role updated successfully",
        "role": {
            "id": role.id,
            "name": role.name,
            "code": role.code,
        }
    }


@router.delete("/{role_id}")
def delete_role(
    role_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom role"""
    check_admin(current_user)

    role = session.exec(
        select(Role).where(
            Role.id == role_id,
            Role.tenant_id == current_user.tenant_id
        )
    ).first()

    if not role:
        raise HTTPException(404, "Role not found")

    if role.is_system:
        raise HTTPException(400, "Cannot delete system roles")

    # Check if role is assigned to any users
    user_count = session.exec(
        select(func.count()).select_from(UserRole).where(UserRole.role_id == role.id)
    ).one()

    if user_count > 0:
        raise HTTPException(400, f"Cannot delete role. It is assigned to {user_count} users.")

    # Delete permissions
    permissions = session.exec(
        select(Permission).where(Permission.role_id == role.id)
    ).all()
    for p in permissions:
        session.delete(p)

    # Delete role
    session.delete(role)
    session.commit()

    return {"message": f"Role '{role.name}' deleted successfully"}


# ============ User-Role Assignment ============

@router.get("/user/{user_id}")
def get_user_roles(
    user_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all roles assigned to a user"""
    # Check if user exists and belongs to same tenant
    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(404, "User not found")

    # Get assigned roles
    user_roles = session.exec(
        select(UserRole).where(UserRole.user_id == user_id)
    ).all()

    roles = []
    for ur in user_roles:
        role = session.get(Role, ur.role_id)
        if role:
            roles.append({
                "id": role.id,
                "name": role.name,
                "code": role.code,
                "description": role.description,
                "is_system": role.is_system,
                "assigned_at": ur.assigned_at,
            })

    # Get aggregated permissions
    permissions = get_user_permissions(session, user_id)

    return {
        "user_id": user_id,
        "username": user.username,
        "full_name": user.full_name,
        "roles": roles,
        "permissions": permissions,
    }


@router.post("/assign")
def assign_roles_to_user(
    data: AssignRoleRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Assign multiple roles to a user (replaces existing assignments)"""
    check_admin(current_user)

    # Check if user exists
    user = session.exec(
        select(User).where(
            User.id == data.user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()

    if not user:
        raise HTTPException(404, "User not found")

    # Validate all role_ids exist and belong to same tenant
    for role_id in data.role_ids:
        role = session.exec(
            select(Role).where(
                Role.id == role_id,
                Role.tenant_id == current_user.tenant_id,
                Role.is_active == True
            )
        ).first()
        if not role:
            raise HTTPException(400, f"Role {role_id} not found or inactive")

    # Remove existing role assignments
    existing = session.exec(
        select(UserRole).where(UserRole.user_id == data.user_id)
    ).all()
    for ur in existing:
        session.delete(ur)

    # Create new assignments
    now = datetime.utcnow().isoformat()
    for role_id in data.role_ids:
        user_role = UserRole(
            user_id=data.user_id,
            role_id=role_id,
            assigned_at=now,
            assigned_by=current_user.id,
        )
        session.add(user_role)

    session.commit()

    return {
        "message": f"Assigned {len(data.role_ids)} roles to user",
        "user_id": data.user_id,
        "role_ids": data.role_ids,
    }


@router.post("/user/{user_id}/add/{role_id}")
def add_role_to_user(
    user_id: str,
    role_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a single role to a user"""
    check_admin(current_user)

    # Check user
    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Check role
    role = session.exec(
        select(Role).where(
            Role.id == role_id,
            Role.tenant_id == current_user.tenant_id,
            Role.is_active == True
        )
    ).first()
    if not role:
        raise HTTPException(404, "Role not found or inactive")

    # Check if already assigned
    existing = session.exec(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        )
    ).first()
    if existing:
        raise HTTPException(400, "Role already assigned to user")

    # Create assignment
    user_role = UserRole(
        user_id=user_id,
        role_id=role_id,
        assigned_at=datetime.utcnow().isoformat(),
        assigned_by=current_user.id,
    )
    session.add(user_role)
    session.commit()

    return {"message": f"Role '{role.name}' added to user"}


@router.delete("/user/{user_id}/remove/{role_id}")
def remove_role_from_user(
    user_id: str,
    role_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a single role from a user"""
    check_admin(current_user)

    # Check user
    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Find and delete assignment
    user_role = session.exec(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        )
    ).first()

    if not user_role:
        raise HTTPException(404, "Role not assigned to user")

    session.delete(user_role)
    session.commit()

    return {"message": "Role removed from user"}


# ============ Permission Check ============

@router.get("/check-permission")
def check_permission(
    module: str,
    resource: str,
    action: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Check if current user has a specific permission"""
    permissions = get_user_permissions(session, current_user.id)

    # Admin has all permissions
    if permissions.get("all"):
        return {"allowed": True, "reason": "Admin role"}

    # Check specific permission
    if module in permissions:
        if resource in permissions[module]:
            if action in permissions[module][resource]:
                return {"allowed": True}

    return {"allowed": False, "reason": "Permission not granted"}


@router.get("/my-permissions")
def get_my_permissions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all permissions for current user"""
    # Get assigned roles
    user_roles = session.exec(
        select(UserRole).where(UserRole.user_id == current_user.id)
    ).all()

    roles = []
    for ur in user_roles:
        role = session.get(Role, ur.role_id)
        if role and role.is_active:
            roles.append({
                "id": role.id,
                "name": role.name,
                "code": role.code,
            })

    # Get aggregated permissions
    permissions = get_user_permissions(session, current_user.id)

    return {
        "user_id": current_user.id,
        "roles": roles,
        "permissions": permissions,
    }
