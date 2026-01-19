"""
Role Permissions Management API
"""
from typing import Optional, List
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, RolePermission
from app.models.user import UserRole, ROLE_PERMISSIONS as DEFAULT_PERMISSIONS
from app.models.role_permission import (
    ModuleType, PermissionAction, AppModule,
    MODULE_INFO, ACTION_INFO, MODULE_ACTIONS,
    APP_MODULE_INFO, RESOURCE_TO_MODULE
)
from app.core.security import get_current_user

router = APIRouter(prefix="/role-permissions", tags=["role-permissions"])


# Role labels in Vietnamese
ROLE_LABELS = {
    UserRole.ADMIN.value: "Quản trị viên",
    UserRole.DISPATCHER.value: "Điều phối viên",
    UserRole.ACCOUNTANT.value: "Kế toán",
    UserRole.HR.value: "Nhân sự",
    UserRole.DRIVER.value: "Tài xế",
    UserRole.SALE.value: "Sale",
}


def check_admin(user: User):
    """Only admin can manage permissions"""
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(403, "Chỉ Admin mới có thể quản lý phân quyền")


class PermissionUpdate(BaseModel):
    """Request body for updating permissions"""
    permissions: dict  # {"orders": ["view", "create"], "drivers": ["view"]}
    modules: Optional[List[str]] = None  # ["tms", "crm"] - module access


@router.get("/app-modules")
def get_app_modules(
    current_user: User = Depends(get_current_user),
):
    """Get all available top-level application modules"""
    check_admin(current_user)

    app_modules = []
    for app_module in AppModule:
        info = APP_MODULE_INFO.get(app_module, {})
        app_modules.append({
            "code": app_module.value,
            "label": info.get("label", app_module.value),
            "icon": info.get("icon", ""),
            "order": info.get("order", 99),
        })

    app_modules.sort(key=lambda x: x["order"])
    return {"app_modules": app_modules}


@router.get("/modules")
def get_modules(
    current_user: User = Depends(get_current_user),
):
    """Get all available modules/resources and their actions, grouped by app module"""
    check_admin(current_user)

    # Group resources by app module
    grouped = {}
    for app_module in AppModule:
        info = APP_MODULE_INFO.get(app_module, {})
        grouped[app_module.value] = {
            "code": app_module.value,
            "label": info.get("label", app_module.value),
            "icon": info.get("icon", ""),
            "order": info.get("order", 99),
            "resources": []
        }

    # Add resources to their parent module
    for resource in ModuleType:
        parent_module = RESOURCE_TO_MODULE.get(resource, AppModule.TMS)
        info = MODULE_INFO.get(resource, {})
        available_actions = MODULE_ACTIONS.get(resource, [])

        grouped[parent_module.value]["resources"].append({
            "resource": resource.value,
            "label": info.get("label", resource.value),
            "icon": info.get("icon", ""),
            "order": info.get("order", 99),
            "available_actions": [
                {
                    "action": action.value,
                    "label": ACTION_INFO.get(action, {}).get("label", action.value),
                    "description": ACTION_INFO.get(action, {}).get("description", ""),
                }
                for action in available_actions
            ]
        })

    # Sort resources within each module
    for module_data in grouped.values():
        module_data["resources"].sort(key=lambda x: x["order"])

    # Convert to list and sort by app module order
    modules_list = list(grouped.values())
    modules_list.sort(key=lambda x: x["order"])

    # Also return flat list for backward compatibility
    flat_modules = []
    for module in ModuleType:
        info = MODULE_INFO.get(module, {})
        available_actions = MODULE_ACTIONS.get(module, [])
        parent = RESOURCE_TO_MODULE.get(module, AppModule.TMS)

        flat_modules.append({
            "module": module.value,
            "label": info.get("label", module.value),
            "icon": info.get("icon", ""),
            "order": info.get("order", 99),
            "app_module": parent.value,
            "available_actions": [
                {
                    "action": action.value,
                    "label": ACTION_INFO.get(action, {}).get("label", action.value),
                    "description": ACTION_INFO.get(action, {}).get("description", ""),
                }
                for action in available_actions
            ]
        })

    flat_modules.sort(key=lambda x: x["order"])

    return {
        "modules": flat_modules,  # backward compatible
        "grouped": modules_list,  # new grouped format
    }


@router.get("/roles")
def get_roles_with_permissions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all roles with their current permissions"""
    check_admin(current_user)

    roles = []
    for role in UserRole:
        # Get from database first
        db_permission = session.exec(
            select(RolePermission).where(
                RolePermission.tenant_id == current_user.tenant_id,
                RolePermission.role == role.value
            )
        ).first()

        if db_permission:
            permissions = db_permission.get_permissions()
            modules = db_permission.get_modules()
            description = db_permission.description
            is_custom = not db_permission.is_system
        else:
            # Fall back to default
            role_enum = role
            permissions = {}
            default_perms = DEFAULT_PERMISSIONS.get(role_enum, {})
            for module, actions in default_perms.items():
                permissions[module] = actions
            modules = []  # Empty means all modules (legacy)
            description = None
            is_custom = False

        roles.append({
            "role": role.value,
            "label": ROLE_LABELS.get(role.value, role.value),
            "permissions": permissions,
            "modules": modules,  # Module access list
            "description": description,
            "is_custom": is_custom,
        })

    return {"roles": roles}


@router.get("/roles/{role}")
def get_role_permissions(
    role: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get permissions for a specific role"""
    check_admin(current_user)

    # Validate role
    if role not in [r.value for r in UserRole]:
        raise HTTPException(400, f"Vai trò không hợp lệ: {role}")

    # Get from database
    db_permission = session.exec(
        select(RolePermission).where(
            RolePermission.tenant_id == current_user.tenant_id,
            RolePermission.role == role
        )
    ).first()

    if db_permission:
        permissions = db_permission.get_permissions()
        modules = db_permission.get_modules()
        description = db_permission.description
        is_custom = not db_permission.is_system
    else:
        # Fall back to default
        role_enum = UserRole(role)
        permissions = {}
        default_perms = DEFAULT_PERMISSIONS.get(role_enum, {})
        for module, actions in default_perms.items():
            permissions[module] = actions
        modules = []
        description = None
        is_custom = False

    return {
        "role": role,
        "label": ROLE_LABELS.get(role, role),
        "permissions": permissions,
        "modules": modules,
        "description": description,
        "is_custom": is_custom,
    }


@router.put("/roles/{role}")
def update_role_permissions(
    role: str,
    data: PermissionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update permissions for a role"""
    check_admin(current_user)

    # Validate role
    if role not in [r.value for r in UserRole]:
        raise HTTPException(400, f"Vai trò không hợp lệ: {role}")

    # Validate permissions format
    valid_resources = [m.value for m in ModuleType]
    valid_actions = [a.value for a in PermissionAction]
    valid_app_modules = [m.value for m in AppModule]

    for resource, actions in data.permissions.items():
        if resource not in valid_resources:
            raise HTTPException(400, f"Resource không hợp lệ: {resource}")
        if not isinstance(actions, list):
            raise HTTPException(400, f"Quyền của resource {resource} phải là danh sách")
        for action in actions:
            if action not in valid_actions:
                raise HTTPException(400, f"Quyền không hợp lệ: {action}")

    # Validate modules if provided
    if data.modules is not None:
        for module in data.modules:
            if module not in valid_app_modules:
                raise HTTPException(400, f"App module không hợp lệ: {module}")

    # Get or create permission record
    db_permission = session.exec(
        select(RolePermission).where(
            RolePermission.tenant_id == current_user.tenant_id,
            RolePermission.role == role
        )
    ).first()

    if db_permission:
        db_permission.permissions_json = json.dumps(data.permissions)
        if data.modules is not None:
            db_permission.modules_json = json.dumps(data.modules)
    else:
        db_permission = RolePermission(
            tenant_id=current_user.tenant_id,
            role=role,
            permissions_json=json.dumps(data.permissions),
            modules_json=json.dumps(data.modules or []),
            is_system=False,
        )
        session.add(db_permission)

    session.commit()
    session.refresh(db_permission)

    return {
        "message": f"Đã cập nhật quyền cho vai trò {ROLE_LABELS.get(role, role)}",
        "role": role,
        "permissions": db_permission.get_permissions(),
        "modules": db_permission.get_modules(),
    }


@router.post("/roles/{role}/reset")
def reset_role_permissions(
    role: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reset role permissions to default"""
    check_admin(current_user)

    # Validate role
    if role not in [r.value for r in UserRole]:
        raise HTTPException(400, f"Vai trò không hợp lệ: {role}")

    # Delete custom permission
    db_permission = session.exec(
        select(RolePermission).where(
            RolePermission.tenant_id == current_user.tenant_id,
            RolePermission.role == role
        )
    ).first()

    if db_permission:
        session.delete(db_permission)
        session.commit()

    # Get default permissions
    role_enum = UserRole(role)
    default_perms = DEFAULT_PERMISSIONS.get(role_enum, {})
    permissions = {}
    for module, actions in default_perms.items():
        permissions[module] = actions

    return {
        "message": f"Đã đặt lại quyền mặc định cho vai trò {ROLE_LABELS.get(role, role)}",
        "role": role,
        "permissions": permissions,
    }


def get_effective_permissions(role: str, tenant_id: str, session: Session) -> dict:
    """Get effective permissions for a role (from DB or default)"""
    # Check database first
    db_permission = session.exec(
        select(RolePermission).where(
            RolePermission.tenant_id == tenant_id,
            RolePermission.role == role
        )
    ).first()

    if db_permission:
        return db_permission.get_permissions()

    # Fall back to default
    try:
        role_enum = UserRole(role)
        default_perms = DEFAULT_PERMISSIONS.get(role_enum, {})
        permissions = {}
        for module, actions in default_perms.items():
            permissions[module] = actions
        return permissions
    except ValueError:
        return {}
