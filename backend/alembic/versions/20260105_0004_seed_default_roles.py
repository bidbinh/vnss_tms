"""Seed default roles and permissions

Revision ID: 20260105_0004
Revises: 20260105_0003_migrate_to_actors
Create Date: 2026-01-05

This migration:
- Seeds default system roles for each tenant
- Creates default permissions for each role
"""
from typing import Sequence, Union
from datetime import datetime
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = 'seed_default_roles'
down_revision: Union[str, None] = 'perf_indexes_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Default role templates
DEFAULT_ROLES = [
    {
        "code": "ADMIN",
        "name": "Administrator",
        "description": "Toàn quyền quản lý hệ thống",
        "is_system": True,
        "permissions": "all"
    },
    {
        "code": "DISPATCHER",
        "name": "Điều phối viên",
        "description": "Quản lý đơn hàng, chuyến xe, điều phối tài xế",
        "is_system": True,
        "permissions": {
            "tms": {
                "dashboard": ["view"],
                "orders": ["view", "create", "edit"],
                "trips": ["view", "create", "edit", "assign"],
                "vehicles": ["view"],
                "trailers": ["view"],
                "drivers": ["view"],
                "customers": ["view", "create", "edit"],
                "locations": ["view"],
                "sites": ["view"],
                "fuel_logs": ["view", "create"],
                "reports": ["view"],
            }
        }
    },
    {
        "code": "ACCOUNTANT",
        "name": "Kế toán",
        "description": "Quản lý tài chính, báo cáo, lương",
        "is_system": True,
        "permissions": {
            "tms": {
                "dashboard": ["view"],
                "orders": ["view"],
                "trips": ["view"],
                "rates": ["view", "create", "edit"],
                "fuel_logs": ["view", "create", "edit"],
                "maintenance": ["view", "create", "edit"],
                "salary": ["view", "create", "edit"],
                "reports": ["view", "export"],
            },
            "accounting": {
                "dashboard": ["view"],
                "invoices": ["view", "create", "edit"],
                "payments": ["view", "create"],
                "reports": ["view", "export"],
            }
        }
    },
    {
        "code": "HR_MANAGER",
        "name": "Nhân sự",
        "description": "Quản lý nhân viên, tài xế, tuyển dụng",
        "is_system": True,
        "permissions": {
            "hrm": {
                "dashboard": ["view"],
                "employees": ["view", "create", "edit", "delete"],
                "departments": ["view", "create", "edit"],
                "positions": ["view", "create", "edit"],
                "attendance": ["view", "edit"],
                "leaves": ["view", "approve"],
                "payroll": ["view", "create", "edit"],
                "reports": ["view", "export"],
            },
            "tms": {
                "drivers": ["view", "create", "edit"],
                "salary": ["view"],
            },
            "settings": {
                "users": ["view", "create", "edit"],
            }
        }
    },
    {
        "code": "DRIVER",
        "name": "Tài xế",
        "description": "Sử dụng app mobile, nhận chuyến",
        "is_system": True,
        "permissions": {
            "tms": {
                "dashboard": ["view"],
                "trips": ["view"],
                "fuel_logs": ["view", "create"],
            }
        }
    },
    {
        "code": "SALES_REP",
        "name": "Nhân viên kinh doanh",
        "description": "Quản lý khách hàng, báo giá",
        "is_system": True,
        "permissions": {
            "crm": {
                "dashboard": ["view"],
                "accounts": ["view", "create", "edit"],
                "contacts": ["view", "create", "edit"],
                "leads": ["view", "create", "edit"],
                "opportunities": ["view", "create", "edit"],
                "quotes": ["view", "create", "edit"],
                "reports": ["view"],
            },
            "tms": {
                "customers": ["view", "create", "edit"],
                "orders": ["view", "create"],
                "rates": ["view"],
            }
        }
    },
    {
        "code": "VIEWER",
        "name": "Xem báo cáo",
        "description": "Chỉ xem báo cáo, không chỉnh sửa",
        "is_system": True,
        "permissions": {
            "tms": {
                "dashboard": ["view"],
                "orders": ["view"],
                "trips": ["view"],
                "reports": ["view"],
            }
        }
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.utcnow().isoformat()

    # Get all tenants
    result = conn.execute(text("SELECT id FROM tenants"))
    tenants = result.fetchall()

    for tenant_row in tenants:
        tenant_id = tenant_row[0]

        for role_template in DEFAULT_ROLES:
            # Check if role already exists for this tenant
            existing = conn.execute(
                text("SELECT id FROM roles WHERE tenant_id = :tenant_id AND code = :code"),
                {"tenant_id": tenant_id, "code": role_template["code"]}
            ).fetchone()

            if existing:
                continue

            # Create role
            role_id = str(uuid.uuid4())
            conn.execute(
                text("""
                    INSERT INTO roles (id, tenant_id, name, code, description, is_system, is_active, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :code, :description, :is_system, :is_active, :created_at, :updated_at)
                """),
                {
                    "id": role_id,
                    "tenant_id": tenant_id,
                    "name": role_template["name"],
                    "code": role_template["code"],
                    "description": role_template["description"],
                    "is_system": role_template["is_system"],
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                }
            )

            # Create permissions for this role
            permissions = role_template["permissions"]
            if permissions == "all":
                # Admin gets all permissions - will be handled at runtime
                continue

            for module, resources in permissions.items():
                for resource, actions in resources.items():
                    for action in actions:
                        perm_id = str(uuid.uuid4())
                        conn.execute(
                            text("""
                                INSERT INTO permissions (id, role_id, module, resource, action, created_at, updated_at)
                                VALUES (:id, :role_id, :module, :resource, :action, :created_at, :updated_at)
                            """),
                            {
                                "id": perm_id,
                                "role_id": role_id,
                                "module": module,
                                "resource": resource,
                                "action": action,
                                "created_at": now,
                                "updated_at": now,
                            }
                        )


def downgrade() -> None:
    conn = op.get_bind()

    # Delete permissions for system roles
    conn.execute(
        text("""
            DELETE FROM permissions
            WHERE role_id IN (SELECT id FROM roles WHERE is_system = true)
        """)
    )

    # Delete system roles
    conn.execute(text("DELETE FROM roles WHERE is_system = true"))
