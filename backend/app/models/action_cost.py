"""
Action Cost Configuration - Define token costs per module/action for billing
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from app.models.base import BaseUUIDModel, TimestampMixin


class ActionCost(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Action Cost Configuration - Token costs for different operations.
    This is a system-wide configuration (not tenant-scoped).
    Can be customized per module/resource/action combination.
    """
    __tablename__ = "action_costs"

    # Unique combination of module + action + resource_type
    module: str = Field(index=True, nullable=False)  # tms, hrm, crm, wms, fms, or * for wildcard
    resource_type: str = Field(index=True, nullable=False)  # orders, drivers, etc., or * for wildcard
    action: str = Field(index=True, nullable=False)  # CREATE, UPDATE, DELETE

    # Cost in tokens
    cost_tokens: int = Field(default=1)

    # Description
    description: Optional[str] = Field(default=None)

    # Whether this config is active
    is_active: bool = Field(default=True)

    # Priority (higher = more specific, used when multiple rules match)
    priority: int = Field(default=0)


# Default cost configuration
# Format: (module, resource_type, action): cost_tokens
DEFAULT_ACTION_COSTS = {
    # TMS Module - Orders (high value operations)
    # CREATE: 2,000đ - 5,000đ per order (1 token = 10 VND)
    ("tms", "orders", "CREATE"): 300,   # 3,000 VND
    ("tms", "orders", "UPDATE"): 3,     # 30 VND (standard)
    ("tms", "orders", "DELETE"): 10,    # 100 VND (standard)

    # TMS Module - Trips
    ("tms", "trips", "CREATE"): 8,
    ("tms", "trips", "UPDATE"): 4,
    ("tms", "trips", "DELETE"): 12,

    # TMS Module - Drivers
    ("tms", "drivers", "CREATE"): 5,
    ("tms", "drivers", "UPDATE"): 3,
    ("tms", "drivers", "DELETE"): 20,

    # TMS Module - Vehicles
    ("tms", "vehicles", "CREATE"): 5,
    ("tms", "vehicles", "UPDATE"): 3,
    ("tms", "vehicles", "DELETE"): 20,

    # TMS Module - Customers
    ("tms", "customers", "CREATE"): 5,
    ("tms", "customers", "UPDATE"): 3,
    ("tms", "customers", "DELETE"): 10,

    # TMS Module - Fuel logs
    ("tms", "fuel_logs", "CREATE"): 3,
    ("tms", "fuel_logs", "UPDATE"): 2,
    ("tms", "fuel_logs", "DELETE"): 5,

    # TMS Module - Rates
    ("tms", "rates", "CREATE"): 5,
    ("tms", "rates", "UPDATE"): 3,
    ("tms", "rates", "DELETE"): 8,

    # TMS Module - Sites/Locations
    ("tms", "sites", "CREATE"): 3,
    ("tms", "sites", "UPDATE"): 2,
    ("tms", "sites", "DELETE"): 5,
    ("tms", "locations", "CREATE"): 3,
    ("tms", "locations", "UPDATE"): 2,
    ("tms", "locations", "DELETE"): 5,

    # HRM Module
    ("hrm", "employees", "CREATE"): 8,
    ("hrm", "employees", "UPDATE"): 4,
    ("hrm", "employees", "DELETE"): 25,
    ("hrm", "attendance", "CREATE"): 2,
    ("hrm", "attendance", "UPDATE"): 1,
    ("hrm", "attendance", "DELETE"): 3,
    ("hrm", "payroll", "CREATE"): 15,
    ("hrm", "payroll", "UPDATE"): 8,
    ("hrm", "payroll", "DELETE"): 20,
    ("hrm", "departments", "CREATE"): 5,
    ("hrm", "departments", "UPDATE"): 3,
    ("hrm", "departments", "DELETE"): 10,
    ("hrm", "positions", "CREATE"): 3,
    ("hrm", "positions", "UPDATE"): 2,
    ("hrm", "positions", "DELETE"): 5,

    # CRM Module
    ("crm", "accounts", "CREATE"): 5,
    ("crm", "accounts", "UPDATE"): 3,
    ("crm", "accounts", "DELETE"): 10,
    ("crm", "leads", "CREATE"): 3,
    ("crm", "leads", "UPDATE"): 2,
    ("crm", "leads", "DELETE"): 5,
    ("crm", "contacts", "CREATE"): 3,
    ("crm", "contacts", "UPDATE"): 2,
    ("crm", "contacts", "DELETE"): 5,
    ("crm", "opportunities", "CREATE"): 5,
    ("crm", "opportunities", "UPDATE"): 3,
    ("crm", "opportunities", "DELETE"): 8,

    # WMS Module
    ("wms", "products", "CREATE"): 5,
    ("wms", "products", "UPDATE"): 3,
    ("wms", "products", "DELETE"): 10,
    ("wms", "stock_moves", "CREATE"): 3,
    ("wms", "stock_moves", "UPDATE"): 2,
    ("wms", "stock_moves", "DELETE"): 5,
    ("wms", "goods_receipt", "CREATE"): 8,
    ("wms", "goods_receipt", "UPDATE"): 4,
    ("wms", "goods_receipt", "DELETE"): 12,

    # FMS Module (Freight Management)
    ("fms", "shipments", "CREATE"): 8,
    ("fms", "shipments", "UPDATE"): 4,
    ("fms", "shipments", "DELETE"): 12,

    # Users management (high cost for security)
    ("system", "users", "CREATE"): 10,
    ("system", "users", "UPDATE"): 5,
    ("system", "users", "DELETE"): 30,

    # Default fallbacks (wildcard)
    ("*", "*", "CREATE"): 5,
    ("*", "*", "UPDATE"): 3,
    ("*", "*", "DELETE"): 10,
}


def get_action_cost(module: str, resource_type: str, action: str) -> int:
    """
    Get the token cost for an action from defaults.
    Priority: exact match > module wildcard > full wildcard
    """
    # Try exact match
    cost = DEFAULT_ACTION_COSTS.get((module, resource_type, action))
    if cost is not None:
        return cost

    # Try wildcard module
    cost = DEFAULT_ACTION_COSTS.get(("*", resource_type, action))
    if cost is not None:
        return cost

    # Try full wildcard
    cost = DEFAULT_ACTION_COSTS.get(("*", "*", action))
    if cost is not None:
        return cost

    return 1  # Default fallback
