"""
Worker Permission System

Defines and checks permissions for workers accessing tenant resources.

Permission Format (stored in permissions_json):
{
    "modules": ["tms", "dispatch", "masterdata"],
    "permissions": {
        "orders": ["view", "create", "update", "delete"],
        "drivers": ["view"],
        "vehicles": ["view"],
        "sites": ["view", "update"],
        "locations": ["view"],
        "rates": ["view"],
        "customers": ["view", "update"]
    }
}

Role-based default permissions:
- DRIVER: View assigned orders, update order status
- DISPATCHER: Full TMS access (orders, drivers, vehicles)
- MANAGER: Full access to all modules
- WORKER: View tasks only
"""
import json
from typing import Optional
from fastapi import HTTPException
from sqlmodel import Session

from app.models.worker import Worker, WorkerTenantAccess


# Default permissions by role
ROLE_PERMISSIONS = {
    "DRIVER": {
        "modules": ["workspace"],
        "permissions": {
            "orders": ["view_assigned", "update_status"],
            "tasks": ["view", "update"],
        }
    },
    "DISPATCHER": {
        "modules": ["tms", "dispatch", "workspace"],
        "permissions": {
            "orders": ["view", "create", "update", "update_status", "delete", "assign"],
            "drivers": ["view", "update"],
            "vehicles": ["view", "update"],
            "sites": ["view"],
            "locations": ["view"],
            "rates": ["view"],
            "customers": ["view"],
            "tasks": ["view", "update"],
        }
    },
    "MANAGER": {
        "modules": ["tms", "dispatch", "masterdata", "reports", "workspace"],
        "permissions": {
            "orders": ["view", "create", "update", "update_status", "delete", "assign"],
            "drivers": ["view", "create", "update", "delete"],
            "vehicles": ["view", "create", "update", "delete"],
            "sites": ["view", "create", "update", "delete"],
            "locations": ["view", "create", "update", "delete"],
            "rates": ["view", "create", "update", "delete"],
            "customers": ["view", "create", "update", "delete"],
            "tasks": ["view", "update", "assign"],
        }
    },
    "ACCOUNTANT": {
        "modules": ["reports", "workspace"],
        "permissions": {
            "orders": ["view"],
            "drivers": ["view"],
            "reports": ["view", "export"],
            "tasks": ["view", "update"],
        }
    },
    "WORKER": {
        "modules": ["workspace"],
        "permissions": {
            "tasks": ["view", "update"],
        }
    },
}


def get_worker_permissions(access: WorkerTenantAccess) -> dict:
    """
    Get effective permissions for a worker's tenant access.

    Merges role-based defaults with custom overrides from permissions_json.
    """
    # Start with role defaults
    role = access.role or "WORKER"
    base_perms = ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["WORKER"]).copy()

    # Deep copy to avoid modifying defaults
    result = {
        "modules": list(base_perms.get("modules", [])),
        "permissions": {k: list(v) for k, v in base_perms.get("permissions", {}).items()}
    }

    # Merge custom permissions if any
    if access.permissions_json:
        try:
            custom = json.loads(access.permissions_json)

            # Add custom modules
            if "modules" in custom:
                for mod in custom["modules"]:
                    if mod not in result["modules"]:
                        result["modules"].append(mod)

            # Add custom permissions
            if "permissions" in custom:
                for resource, perms in custom["permissions"].items():
                    if resource not in result["permissions"]:
                        result["permissions"][resource] = []
                    for perm in perms:
                        if perm not in result["permissions"][resource]:
                            result["permissions"][resource].append(perm)
        except json.JSONDecodeError:
            pass

    return result


def check_worker_permission(
    access: WorkerTenantAccess,
    resource: str,
    action: str,
) -> bool:
    """
    Check if worker has permission for a specific action on a resource.

    Args:
        access: WorkerTenantAccess record
        resource: Resource name (orders, drivers, vehicles, etc.)
        action: Action name (view, create, update, delete, etc.)

    Returns:
        True if permitted, False otherwise
    """
    perms = get_worker_permissions(access)
    resource_perms = perms.get("permissions", {}).get(resource, [])
    return action in resource_perms


def check_worker_module(
    access: WorkerTenantAccess,
    module: str,
) -> bool:
    """
    Check if worker has access to a module.

    Args:
        access: WorkerTenantAccess record
        module: Module name (tms, dispatch, masterdata, etc.)

    Returns:
        True if permitted, False otherwise
    """
    perms = get_worker_permissions(access)
    return module in perms.get("modules", [])


def require_worker_permission(
    session: Session,
    worker: Worker,
    tenant_id: str,
    resource: str,
    action: str,
):
    """
    Require worker to have a specific permission. Raises HTTPException if not.

    Usage:
        require_worker_permission(session, worker, tenant_id, "orders", "view")
    """
    from sqlmodel import select, and_

    access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == worker.id,
                WorkerTenantAccess.tenant_id == tenant_id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).first()

    if not access:
        raise HTTPException(403, "Bạn không có quyền truy cập tenant này")

    if not check_worker_permission(access, resource, action):
        raise HTTPException(403, f"Bạn không có quyền {action} trên {resource}")

    return access


def require_worker_module(
    session: Session,
    worker: Worker,
    tenant_id: str,
    module: str,
):
    """
    Require worker to have access to a module. Raises HTTPException if not.
    """
    from sqlmodel import select, and_

    access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == worker.id,
                WorkerTenantAccess.tenant_id == tenant_id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).first()

    if not access:
        raise HTTPException(403, "Bạn không có quyền truy cập tenant này")

    if not check_worker_module(access, module):
        raise HTTPException(403, f"Bạn không có quyền truy cập module {module}")

    return access
