from __future__ import annotations

from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class SystemRole(str, Enum):
    """System-level roles (platform-wide)"""
    SUPER_ADMIN = "SUPER_ADMIN"      # 9log.tech platform admin
    TENANT_ADMIN = "TENANT_ADMIN"    # Tenant/Company admin
    MODULE_ADMIN = "MODULE_ADMIN"    # Module-level admin
    USER = "USER"                    # Regular user


# Available modules
AVAILABLE_MODULES = [
    "tms",        # Transportation Management
    "wms",        # Warehouse Management
    "fms",        # Forwarding Management
    "pms",        # Port Management
    "ems",        # Express Management
    "crm",        # Customer Relationship
    "hrm",        # Human Resources
    "accounting", # Financial/Accounting
    "settings",   # Platform Settings
]

# Resources per module
MODULE_RESOURCES = {
    "tms": [
        "dashboard", "orders", "trips", "vehicles", "trailers", "drivers",
        "customers", "locations", "sites", "rates", "fuel_logs",
        "maintenance", "salary", "reports"
    ],
    "wms": [
        "dashboard", "warehouses", "zones", "locations", "products",
        "inventory", "inbound", "outbound", "transfers", "reports"
    ],
    "fms": [
        "dashboard", "shipments", "bookings", "carriers", "rates",
        "customs", "documents", "tracking", "reports"
    ],
    "pms": [
        "dashboard", "terminals", "berths", "vessels", "voyages",
        "yard", "containers", "gate", "appointments", "tariffs",
        "invoices", "reports"
    ],
    "ems": [
        "dashboard", "orders", "hubs", "zones", "couriers", "routes",
        "tracking", "pricing", "shippers", "cod", "settlements", "reports"
    ],
    "crm": [
        "dashboard", "accounts", "contacts", "leads", "opportunities",
        "activities", "quotes", "reports"
    ],
    "hrm": [
        "dashboard", "employees", "departments", "positions",
        "attendance", "leaves", "payroll", "recruitment", "training", "reports"
    ],
    "accounting": [
        "dashboard", "chart_of_accounts", "journal_entries",
        "invoices", "bills", "payments", "bank_accounts",
        "reconciliation", "reports"
    ],
    "settings": [
        "users", "roles", "company", "modules", "integrations", "api_keys"
    ],
}

# Available actions
AVAILABLE_ACTIONS = ["view", "create", "edit", "delete", "export", "approve", "assign"]


class Role(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Custom roles per tenant"""
    __tablename__ = "roles"

    name: str = Field(index=True, nullable=False)
    code: str = Field(index=True, nullable=False)
    description: Optional[str] = Field(default=None)

    # System role (cannot be deleted/modified)
    is_system: bool = Field(default=False)

    # Module scope (null = all modules)
    module_code: Optional[str] = Field(default=None, index=True)

    # Status
    is_active: bool = Field(default=True)


class Permission(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """Permissions linked to roles"""
    __tablename__ = "permissions"

    role_id: str = Field(index=True, nullable=False, foreign_key="roles.id")

    # Permission definition
    module: str = Field(index=True, nullable=False)      # tms, wms, crm, etc.
    resource: str = Field(index=True, nullable=False)    # orders, vehicles, customers, etc.
    action: str = Field(nullable=False)                  # view, create, edit, delete, export, approve

    # Conditions (optional JSON for complex permissions)
    # e.g., {"only_own": true, "status": ["DRAFT", "PENDING"]}
    conditions_json: Optional[str] = Field(default=None)


class UserRole(BaseUUIDModel, SQLModel, table=True):
    """Many-to-many: Users can have multiple roles"""
    __tablename__ = "user_roles"

    user_id: str = Field(index=True, nullable=False, foreign_key="users.id")
    role_id: str = Field(index=True, nullable=False, foreign_key="roles.id")

    assigned_at: str = Field(nullable=False)
    assigned_by: Optional[str] = Field(default=None, foreign_key="users.id")


# Default role templates
DEFAULT_ROLE_TEMPLATES = {
    "TENANT_ADMIN": {
        "name": "Administrator",
        "code": "ADMIN",
        "description": "Full access to all modules",
        "is_system": True,
        "permissions": "all"  # Special marker for all permissions
    },
    "TMS_DISPATCHER": {
        "name": "Dispatcher",
        "code": "TMS_DISPATCHER",
        "description": "TMS - Order and Trip management",
        "module_code": "tms",
        "permissions": {
            "tms": {
                "dashboard": ["view"],
                "orders": ["view", "create", "edit"],
                "trips": ["view", "create", "edit", "assign"],
                "vehicles": ["view"],
                "drivers": ["view"],
                "customers": ["view", "create", "edit"],
                "locations": ["view"],
                "sites": ["view"],
                "fuel_logs": ["view", "create"],
                "reports": ["view"],
            }
        }
    },
    "TMS_ACCOUNTANT": {
        "name": "Accountant",
        "code": "TMS_ACCOUNTANT",
        "description": "TMS - Finance and salary management",
        "module_code": "tms",
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
    "TMS_DRIVER": {
        "name": "Driver",
        "code": "TMS_DRIVER",
        "description": "TMS - Driver mobile app access",
        "module_code": "tms",
        "permissions": {
            "tms": {
                "dashboard": ["view"],
                "trips": ["view"],
                "fuel_logs": ["view", "create"],
            }
        }
    },
    "WMS_OPERATOR": {
        "name": "Warehouse Operator",
        "code": "WMS_OPERATOR",
        "description": "WMS - Warehouse operations",
        "module_code": "wms",
        "permissions": {
            "wms": {
                "dashboard": ["view"],
                "inventory": ["view"],
                "inbound": ["view", "create", "edit"],
                "outbound": ["view", "create", "edit"],
                "transfers": ["view", "create"],
                "reports": ["view"],
            }
        }
    },
    "EMS_COURIER": {
        "name": "Courier",
        "code": "EMS_COURIER",
        "description": "EMS - Courier/delivery driver",
        "module_code": "ems",
        "permissions": {
            "ems": {
                "dashboard": ["view"],
                "orders": ["view"],
                "routes": ["view"],
                "tracking": ["view", "edit"],
                "cod": ["view", "edit"],
            }
        }
    },
    "PMS_GATE_CLERK": {
        "name": "Gate Clerk",
        "code": "PMS_GATE_CLERK",
        "description": "PMS - Gate operations",
        "module_code": "pms",
        "permissions": {
            "pms": {
                "dashboard": ["view"],
                "containers": ["view"],
                "gate": ["view", "create", "edit"],
                "appointments": ["view"],
            }
        }
    },
    "HR_MANAGER": {
        "name": "HR Manager",
        "code": "HR_MANAGER",
        "description": "HRM - Human resources management",
        "module_code": "hrm",
        "permissions": {
            "hrm": {
                "dashboard": ["view"],
                "employees": ["view", "create", "edit", "delete"],
                "departments": ["view", "create", "edit"],
                "positions": ["view", "create", "edit"],
                "attendance": ["view", "edit"],
                "leaves": ["view", "approve"],
                "payroll": ["view", "create", "edit"],
                "recruitment": ["view", "create", "edit"],
                "training": ["view", "create", "edit"],
                "reports": ["view", "export"],
            },
            "settings": {
                "users": ["view", "create", "edit"],
            }
        }
    },
    "SALES_REP": {
        "name": "Sales Representative",
        "code": "SALES_REP",
        "description": "CRM - Sales activities",
        "module_code": "crm",
        "permissions": {
            "crm": {
                "dashboard": ["view"],
                "accounts": ["view", "create", "edit"],
                "contacts": ["view", "create", "edit"],
                "leads": ["view", "create", "edit"],
                "opportunities": ["view", "create", "edit"],
                "activities": ["view", "create", "edit"],
                "quotes": ["view", "create", "edit"],
                "reports": ["view"],
            }
        }
    },
}
