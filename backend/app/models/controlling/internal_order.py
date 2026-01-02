"""
Controlling - Internal Order Models
Đơn hàng nội bộ (theo dõi chi phí theo dự án/sự kiện)
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class InternalOrderType(str, Enum):
    """Loại đơn hàng nội bộ"""
    INVESTMENT = "INVESTMENT"           # Đầu tư
    MAINTENANCE = "MAINTENANCE"         # Bảo trì
    MARKETING = "MARKETING"             # Marketing/Quảng cáo
    RESEARCH = "RESEARCH"               # Nghiên cứu & Phát triển
    TRAINING = "TRAINING"               # Đào tạo
    EVENT = "EVENT"                     # Sự kiện
    IT_PROJECT = "IT_PROJECT"           # Dự án CNTT
    OVERHEAD = "OVERHEAD"               # Chi phí chung
    OTHER = "OTHER"                     # Khác


class InternalOrderStatus(str, Enum):
    """Trạng thái đơn hàng nội bộ"""
    CREATED = "CREATED"                 # Mới tạo
    RELEASED = "RELEASED"               # Đã phát hành (cho phép hạch toán)
    TECHNICALLY_COMPLETE = "TECHNICALLY_COMPLETE"  # Hoàn thành kỹ thuật
    CLOSED = "CLOSED"                   # Đóng
    CANCELLED = "CANCELLED"             # Hủy


class InternalOrder(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Đơn hàng nội bộ
    Dùng để thu thập chi phí cho các dự án/sự kiện cụ thể
    """
    __tablename__ = "ctrl_internal_orders"

    order_number: str = Field(index=True, nullable=False)   # IO-2024-001
    name: str = Field(nullable=False)
    description: Optional[str] = Field(default=None)

    order_type: str = Field(default=InternalOrderType.OTHER.value, index=True)

    # Responsible
    responsible_cost_center_id: str = Field(foreign_key="acc_cost_centers.id", nullable=False)
    responsible_user_id: Optional[str] = Field(default=None, foreign_key="users.id")

    # Links
    profit_center_id: Optional[str] = Field(default=None, foreign_key="ctrl_profit_centers.id")
    project_id: Optional[str] = Field(default=None, foreign_key="acc_projects.id")

    # Period
    start_date: datetime = Field(nullable=False)
    end_date: Optional[datetime] = Field(default=None)

    # Budget
    planned_total: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    committed_total: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    actual_total: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    remaining_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Currency
    currency: str = Field(default="VND")

    # Status
    status: str = Field(default=InternalOrderStatus.CREATED.value, index=True)

    # Settlement (quyết toán)
    settlement_rule_id: Optional[str] = Field(default=None)  # Quy tắc quyết toán
    is_settled: bool = Field(default=False)
    settled_at: Optional[datetime] = Field(default=None)
    settled_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Control
    allow_posting: bool = Field(default=True)
    statistical_only: bool = Field(default=False)

    # Completion
    technically_completed_at: Optional[datetime] = Field(default=None)
    closed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class InternalOrderLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết dòng ngân sách đơn hàng nội bộ
    """
    __tablename__ = "ctrl_internal_order_lines"

    internal_order_id: str = Field(foreign_key="ctrl_internal_orders.id", nullable=False, index=True)

    # Cost element (account)
    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False)
    account_code: str = Field(nullable=False)

    # Budget
    planned_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    committed_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    actual_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    remaining_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Variance
    variance_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    variance_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    notes: Optional[str] = Field(default=None)
