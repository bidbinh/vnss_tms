"""
Controlling - Activity-Based Costing Models
Chi phí theo hoạt động (ABC - Activity-Based Costing)
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ActivityType(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Loại hoạt động (Activity Type)
    """
    __tablename__ = "ctrl_activity_types"

    code: str = Field(index=True, nullable=False)           # ACT001
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)

    # Unit of measure
    uom: str = Field(default="HOUR")  # HOUR, UNIT, KM, KG...
    uom_name: str = Field(default="Giờ")

    # Category
    category: Optional[str] = Field(default=None)  # LABOR, MACHINE, SERVICE...

    # Default cost center
    default_cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class Activity(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Hoạt động cụ thể
    """
    __tablename__ = "ctrl_activities"

    activity_type_id: str = Field(foreign_key="ctrl_activity_types.id", nullable=False, index=True)

    code: str = Field(index=True, nullable=False)
    name: str = Field(nullable=False)

    # Owner cost center
    cost_center_id: str = Field(foreign_key="acc_cost_centers.id", nullable=False)

    # Capacity
    planned_quantity: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    actual_quantity: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    available_capacity: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)

    # Prices
    planned_price: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    actual_price: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class ActivityRate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Đơn giá hoạt động theo kỳ
    """
    __tablename__ = "ctrl_activity_rates"

    activity_id: str = Field(foreign_key="ctrl_activities.id", nullable=False, index=True)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    fiscal_period_id: Optional[str] = Field(default=None, foreign_key="acc_fiscal_periods.id")

    valid_from: datetime = Field(nullable=False)
    valid_to: Optional[datetime] = Field(default=None)

    # Rates
    planned_rate: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    actual_rate: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)

    # Cost components
    fixed_cost_rate: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    variable_cost_rate: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)

    # Status
    is_released: bool = Field(default=False)
    released_at: Optional[datetime] = Field(default=None)
    released_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class ActivityAllocation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phân bổ hoạt động
    Ghi nhận sử dụng hoạt động từ cost center này cho cost center/order khác
    """
    __tablename__ = "ctrl_activity_allocations"

    allocation_number: str = Field(index=True, nullable=False)
    allocation_date: datetime = Field(nullable=False)

    # Sender (provider)
    sender_cost_center_id: str = Field(foreign_key="acc_cost_centers.id", nullable=False)
    activity_id: str = Field(foreign_key="ctrl_activities.id", nullable=False)

    # Receiver
    receiver_type: str = Field(default="COST_CENTER")  # COST_CENTER, INTERNAL_ORDER, PROJECT
    receiver_cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")
    receiver_internal_order_id: Optional[str] = Field(default=None, foreign_key="ctrl_internal_orders.id")
    receiver_project_id: Optional[str] = Field(default=None, foreign_key="acc_projects.id")

    # Quantity & Amount
    quantity: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    rate: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=4)
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Period
    fiscal_period_id: str = Field(foreign_key="acc_fiscal_periods.id", nullable=False)

    # Journal entry reference
    journal_entry_id: Optional[str] = Field(default=None, foreign_key="acc_journal_entries.id")

    # Status
    status: str = Field(default="DRAFT")  # DRAFT, POSTED, REVERSED

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
