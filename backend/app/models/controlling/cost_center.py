"""
Controlling - Cost Center Models
Quản lý trung tâm chi phí và phân bổ chi phí
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class CostCenterType(str, Enum):
    """Loại trung tâm chi phí"""
    PRODUCTION = "PRODUCTION"           # Sản xuất
    SERVICE = "SERVICE"                 # Dịch vụ
    ADMINISTRATION = "ADMINISTRATION"   # Hành chính
    SALES = "SALES"                     # Bán hàng
    LOGISTICS = "LOGISTICS"             # Logistics
    IT = "IT"                           # CNTT
    HR = "HR"                           # Nhân sự
    FINANCE = "FINANCE"                 # Tài chính
    OVERHEAD = "OVERHEAD"               # Chi phí chung


class AllocationMethod(str, Enum):
    """Phương pháp phân bổ chi phí"""
    FIXED_PERCENTAGE = "FIXED_PERCENTAGE"   # Tỷ lệ cố định
    HEADCOUNT = "HEADCOUNT"                 # Theo số nhân viên
    REVENUE = "REVENUE"                     # Theo doanh thu
    DIRECT_COST = "DIRECT_COST"             # Theo chi phí trực tiếp
    FLOOR_SPACE = "FLOOR_SPACE"             # Theo diện tích
    MACHINE_HOURS = "MACHINE_HOURS"         # Theo giờ máy
    LABOR_HOURS = "LABOR_HOURS"             # Theo giờ công
    ACTIVITY_BASED = "ACTIVITY_BASED"       # Theo hoạt động (ABC)


class CostCenterHierarchy(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Cấu trúc phân cấp trung tâm chi phí
    Mở rộng từ acc_cost_centers
    """
    __tablename__ = "ctrl_cost_center_hierarchy"

    cost_center_id: str = Field(foreign_key="acc_cost_centers.id", nullable=False, index=True)

    # Extended attributes
    cost_center_type: str = Field(default=CostCenterType.ADMINISTRATION.value)

    # Responsible person
    responsible_user_id: Optional[str] = Field(default=None, foreign_key="users.id")

    # Budget control
    budget_control_enabled: bool = Field(default=True)
    budget_warning_threshold: Decimal = Field(default=Decimal("80"), max_digits=5, decimal_places=2)  # % cảnh báo
    budget_block_threshold: Decimal = Field(default=Decimal("100"), max_digits=5, decimal_places=2)  # % chặn

    # Period balances (computed)
    ytd_actual: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_variance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Flags
    allow_posting: bool = Field(default=True)
    is_statistical: bool = Field(default=False)  # Chỉ thống kê, không hạch toán

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class CostAllocationRule(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Quy tắc phân bổ chi phí
    Định nghĩa cách phân bổ chi phí từ cost center này sang cost center khác
    """
    __tablename__ = "ctrl_cost_allocation_rules"

    code: str = Field(index=True, nullable=False)
    name: str = Field(nullable=False)

    # Source
    sender_cost_center_id: str = Field(foreign_key="acc_cost_centers.id", nullable=False)

    # Allocation method
    allocation_method: str = Field(default=AllocationMethod.FIXED_PERCENTAGE.value)

    # Account filter (chỉ phân bổ các tài khoản này)
    account_from: Optional[str] = Field(default=None)  # Từ TK
    account_to: Optional[str] = Field(default=None)    # Đến TK

    # Period
    valid_from: datetime = Field(nullable=False)
    valid_to: Optional[datetime] = Field(default=None)

    # Execution
    execution_frequency: str = Field(default="MONTHLY")  # MONTHLY, QUARTERLY, YEARLY
    last_executed_at: Optional[datetime] = Field(default=None)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class CostAllocation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết phân bổ chi phí (receiver và tỷ lệ)
    """
    __tablename__ = "ctrl_cost_allocations"

    rule_id: str = Field(foreign_key="ctrl_cost_allocation_rules.id", nullable=False, index=True)

    # Receiver
    receiver_cost_center_id: str = Field(foreign_key="acc_cost_centers.id", nullable=False)

    # Allocation base
    allocation_percentage: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=4)  # %
    allocation_base_value: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Giá trị cơ sở

    # Override
    fixed_amount: Optional[Decimal] = Field(default=None, max_digits=20, decimal_places=2)  # Số tiền cố định

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None)
