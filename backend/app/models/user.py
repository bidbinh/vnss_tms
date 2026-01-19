from typing import Optional
from sqlmodel import SQLModel, Field
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped
from enum import Enum


class UserSystemRole(str, Enum):
    """Platform-level role hierarchy"""
    SUPER_ADMIN = "SUPER_ADMIN"      # 9log.tech platform admin (across all tenants)
    TENANT_ADMIN = "TENANT_ADMIN"    # Tenant/Company admin (full access within tenant)
    MODULE_ADMIN = "MODULE_ADMIN"    # Module-level admin
    USER = "USER"                    # Regular user (permissions from custom roles)


class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


# Legacy role mapping (for backward compatibility)
class LegacyUserRole(str, Enum):
    """Legacy user roles - will be migrated to new role system"""
    ADMIN = "ADMIN"
    DISPATCHER = "DISPATCHER"
    ACCOUNTANT = "ACCOUNTANT"
    HR = "HR"
    DRIVER = "DRIVER"
    SALE = "SALE"  # Sales/CRM role


# Legacy permission definitions (kept for backward compatibility)
LEGACY_ROLE_PERMISSIONS = {
    LegacyUserRole.ADMIN: {
        "dashboard": ["view"],
        "orders": ["view", "create", "edit", "delete"],
        "trips": ["view", "create", "edit", "delete"],
        "drivers": ["view", "create", "edit", "delete"],
        "vehicles": ["view", "create", "edit", "delete"],
        "customers": ["view", "create", "edit", "delete"],
        "sites": ["view", "create", "edit", "delete"],
        "locations": ["view", "create", "edit", "delete"],
        "rates": ["view", "create", "edit", "delete"],
        "maintenance": ["view", "create", "edit", "delete"],
        "fuel_logs": ["view", "create", "edit", "delete"],
        "salary": ["view", "create", "edit", "delete"],
        "reports": ["view", "export"],
        "users": ["view", "create", "edit", "delete"],
        "settings": ["view", "edit"],
        "ai_assistant": ["view", "use"],
    },
    LegacyUserRole.DISPATCHER: {
        "dashboard": ["view"],
        "orders": ["view", "create", "edit"],
        "trips": ["view", "create", "edit"],
        "drivers": ["view"],
        "vehicles": ["view"],
        "customers": ["view", "create", "edit"],
        "sites": ["view"],
        "locations": ["view"],
        "rates": ["view"],
        "fuel_logs": ["view", "create"],
        "reports": ["view"],
        "ai_assistant": ["view", "use"],
    },
    LegacyUserRole.ACCOUNTANT: {
        "dashboard": ["view"],
        "orders": ["view"],
        "trips": ["view"],
        "drivers": ["view"],
        "vehicles": ["view"],
        "customers": ["view"],
        "rates": ["view", "create", "edit"],
        "maintenance": ["view", "create", "edit"],
        "fuel_logs": ["view", "create", "edit"],
        "salary": ["view", "create", "edit"],
        "reports": ["view", "export"],
        "settings": ["view"],
    },
    LegacyUserRole.HR: {
        "dashboard": ["view"],
        "drivers": ["view", "create", "edit"],
        "vehicles": ["view"],
        "salary": ["view"],
        "users": ["view", "create", "edit"],
        "reports": ["view"],
    },
    LegacyUserRole.DRIVER: {
        "dashboard": ["view"],
        "trips": ["view"],
        "fuel_logs": ["view", "create"],
    },
    LegacyUserRole.SALE: {
        "dashboard": ["view"],
        "orders": ["view", "create", "edit"],
        "customers": ["view", "create", "edit", "delete"],
        "sites": ["view", "create", "edit"],
        "locations": ["view"],
        "rates": ["view"],
        "reports": ["view", "export"],
        "ai_assistant": ["view", "use"],
    },
}

# Alias for backward compatibility
UserRole = LegacyUserRole
ROLE_PERMISSIONS = LEGACY_ROLE_PERMISSIONS


class User(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "users"

    # Auth
    username: str = Field(index=True, unique=True)
    password_hash: str

    # User profile
    full_name: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None)
    avatar_url: Optional[str] = Field(default=None)

    # Platform-level role: SUPER_ADMIN, TENANT_ADMIN, MODULE_ADMIN, USER
    system_role: str = Field(default=UserSystemRole.USER.value, index=True)

    # Legacy role field (for backward compatibility)
    # ADMIN / DISPATCHER / ACCOUNTANT / HR / DRIVER
    role: str = Field(index=True, default=LegacyUserRole.DRIVER.value)

    # Account status: ACTIVE / INACTIVE / SUSPENDED / PENDING_VERIFICATION
    status: str = Field(default=UserStatus.ACTIVE.value, index=True)

    # Linked entities (optional)
    employee_id: Optional[str] = Field(default=None, index=True)  # Link to HRM employee
    driver_id: Optional[str] = Field(default=None, index=True)    # Link to TMS driver

    # Security
    last_login_at: Optional[str] = Field(default=None)
    password_changed_at: Optional[str] = Field(default=None)
    failed_login_attempts: int = Field(default=0)
    locked_until: Optional[str] = Field(default=None)

    # 2FA (future)
    two_factor_enabled: bool = Field(default=False)
    two_factor_secret: Optional[str] = Field(default=None)

    # Notes/description
    notes: Optional[str] = Field(default=None)
