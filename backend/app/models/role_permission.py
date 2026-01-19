"""
Role Permission Model - Store permissions in database
"""
from typing import Optional, Dict, List, Any
import json
from sqlmodel import SQLModel, Field
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped
from enum import Enum


class AppModule(str, Enum):
    """Top-level application modules"""
    TMS = "tms"      # Transport Management System
    CRM = "crm"      # Customer Relationship Management
    HRM = "hrm"      # Human Resource Management
    DMS = "dms"      # Document Management System
    PLATFORM = "platform"  # Platform settings (users, roles, billing)


# Module display info (top-level)
APP_MODULE_INFO = {
    AppModule.TMS: {"label": "TMS - Vận tải", "icon": "🚚", "order": 1},
    AppModule.CRM: {"label": "CRM - Khách hàng", "icon": "👥", "order": 2},
    AppModule.HRM: {"label": "HRM - Nhân sự", "icon": "👤", "order": 3},
    AppModule.DMS: {"label": "DMS - Tài liệu", "icon": "📁", "order": 4},
    AppModule.PLATFORM: {"label": "Nền tảng", "icon": "⚙️", "order": 5},
}


class ModuleType(str, Enum):
    """Available resources/features in the system"""
    # TMS Resources
    DASHBOARD = "dashboard"
    ORDERS = "orders"
    TRIPS = "trips"
    EMPTY_RETURNS = "empty_returns"
    DRIVERS = "drivers"
    VEHICLES = "vehicles"
    CUSTOMERS = "customers"
    SITES = "sites"
    LOCATIONS = "locations"
    RATES = "rates"
    MAINTENANCE = "maintenance"
    FUEL_LOGS = "fuel_logs"
    SALARY = "salary"
    ADVANCE_PAYMENTS = "advance_payments"
    REPORTS = "reports"
    # Platform Resources
    USERS = "users"
    SETTINGS = "settings"
    AI_ASSISTANT = "ai_assistant"


# Map resources to their parent module
RESOURCE_TO_MODULE = {
    ModuleType.DASHBOARD: AppModule.TMS,
    ModuleType.ORDERS: AppModule.TMS,
    ModuleType.TRIPS: AppModule.TMS,
    ModuleType.EMPTY_RETURNS: AppModule.TMS,
    ModuleType.DRIVERS: AppModule.TMS,
    ModuleType.VEHICLES: AppModule.TMS,
    ModuleType.CUSTOMERS: AppModule.CRM,
    ModuleType.SITES: AppModule.TMS,
    ModuleType.LOCATIONS: AppModule.TMS,
    ModuleType.RATES: AppModule.TMS,
    ModuleType.MAINTENANCE: AppModule.TMS,
    ModuleType.FUEL_LOGS: AppModule.TMS,
    ModuleType.SALARY: AppModule.HRM,
    ModuleType.ADVANCE_PAYMENTS: AppModule.HRM,
    ModuleType.REPORTS: AppModule.TMS,
    ModuleType.USERS: AppModule.PLATFORM,
    ModuleType.SETTINGS: AppModule.PLATFORM,
    ModuleType.AI_ASSISTANT: AppModule.PLATFORM,
}


class PermissionAction(str, Enum):
    """Available permission actions"""
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    EXPORT = "export"
    USE = "use"


# Module display info
MODULE_INFO = {
    ModuleType.DASHBOARD: {"label": "Dashboard", "icon": "◆", "order": 1},
    ModuleType.ORDERS: {"label": "Đơn hàng", "icon": "□", "order": 2},
    ModuleType.TRIPS: {"label": "Chuyến xe", "icon": "◇", "order": 3},
    ModuleType.EMPTY_RETURNS: {"label": "Trả vỏ rỗng", "icon": "↻", "order": 4},
    ModuleType.DRIVERS: {"label": "Tài xế", "icon": "◉", "order": 5},
    ModuleType.VEHICLES: {"label": "Phương tiện", "icon": "≡", "order": 6},
    ModuleType.CUSTOMERS: {"label": "Khách hàng", "icon": "▤", "order": 7},
    ModuleType.SITES: {"label": "Điểm giao nhận", "icon": "▦", "order": 8},
    ModuleType.LOCATIONS: {"label": "Địa điểm", "icon": "◈", "order": 9},
    ModuleType.RATES: {"label": "Đơn giá", "icon": "$", "order": 10},
    ModuleType.MAINTENANCE: {"label": "Bảo trì", "icon": "▢", "order": 11},
    ModuleType.FUEL_LOGS: {"label": "Nhiên liệu", "icon": "▣", "order": 12},
    ModuleType.SALARY: {"label": "Lương tài xế", "icon": "◐", "order": 13},
    ModuleType.ADVANCE_PAYMENTS: {"label": "Tạm ứng", "icon": "💰", "order": 14},
    ModuleType.REPORTS: {"label": "Báo cáo", "icon": "📊", "order": 15},
    ModuleType.USERS: {"label": "Quản lý người dùng", "icon": "👥", "order": 16},
    ModuleType.SETTINGS: {"label": "Cài đặt", "icon": "⚙", "order": 17},
    ModuleType.AI_ASSISTANT: {"label": "AI Assistant", "icon": "🤖", "order": 18},
}

# Action display info
ACTION_INFO = {
    PermissionAction.VIEW: {"label": "Xem", "description": "Xem danh sách và chi tiết"},
    PermissionAction.CREATE: {"label": "Tạo mới", "description": "Tạo bản ghi mới"},
    PermissionAction.EDIT: {"label": "Chỉnh sửa", "description": "Sửa đổi bản ghi"},
    PermissionAction.DELETE: {"label": "Xóa", "description": "Xóa bản ghi"},
    PermissionAction.EXPORT: {"label": "Xuất file", "description": "Xuất báo cáo Excel/PDF"},
    PermissionAction.USE: {"label": "Sử dụng", "description": "Sử dụng tính năng"},
}

# Default available actions per module
MODULE_ACTIONS = {
    ModuleType.DASHBOARD: [PermissionAction.VIEW],
    ModuleType.ORDERS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.TRIPS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.EMPTY_RETURNS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.DRIVERS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.VEHICLES: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.CUSTOMERS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.SITES: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.LOCATIONS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.RATES: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.MAINTENANCE: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.FUEL_LOGS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.SALARY: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.ADVANCE_PAYMENTS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.REPORTS: [PermissionAction.VIEW, PermissionAction.EXPORT],
    ModuleType.USERS: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE],
    ModuleType.SETTINGS: [PermissionAction.VIEW, PermissionAction.EDIT],
    ModuleType.AI_ASSISTANT: [PermissionAction.VIEW, PermissionAction.USE],
}


class RolePermission(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Store role permissions in database"""
    __tablename__ = "role_permissions"

    role: str = Field(index=True)  # ADMIN, DISPATCHER, etc.
    permissions_json: Optional[str] = Field(default="{}")
    # permissions format: {"orders": ["view", "create"], "drivers": ["view"]}

    # Module access - which top-level modules this role can access
    # Format: ["tms", "crm"] - empty means no module restrictions (legacy behavior)
    modules_json: Optional[str] = Field(default="[]")

    description: Optional[str] = Field(default=None)
    is_system: bool = Field(default=False)  # True for default roles, can't delete

    def get_permissions(self) -> Dict[str, List[str]]:
        """Get permissions as dict"""
        try:
            return json.loads(self.permissions_json or "{}")
        except:
            return {}

    def set_permissions(self, value: Dict[str, List[str]]):
        """Set permissions from dict"""
        self.permissions_json = json.dumps(value)

    def get_modules(self) -> List[str]:
        """Get list of accessible modules"""
        try:
            return json.loads(self.modules_json or "[]")
        except:
            return []

    def set_modules(self, value: List[str]):
        """Set accessible modules"""
        self.modules_json = json.dumps(value)

    def has_module_access(self, module: str) -> bool:
        """Check if role has access to a module"""
        modules = self.get_modules()
        # Empty list means all modules (backward compatibility)
        if not modules:
            return True
        return module in modules
