"""
Controlling - Budget Models
Quản lý ngân sách
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class BudgetType(str, Enum):
    """Loại ngân sách"""
    OPERATING = "OPERATING"             # Ngân sách hoạt động
    CAPITAL = "CAPITAL"                 # Ngân sách vốn (đầu tư)
    PROJECT = "PROJECT"                 # Ngân sách dự án
    DEPARTMENT = "DEPARTMENT"           # Ngân sách phòng ban
    COST_CENTER = "COST_CENTER"         # Ngân sách trung tâm chi phí
    REVENUE = "REVENUE"                 # Ngân sách doanh thu
    CASH_FLOW = "CASH_FLOW"             # Ngân sách dòng tiền


class BudgetStatus(str, Enum):
    """Trạng thái ngân sách"""
    DRAFT = "DRAFT"                     # Nháp
    SUBMITTED = "SUBMITTED"             # Đã gửi duyệt
    APPROVED = "APPROVED"               # Đã duyệt
    ACTIVE = "ACTIVE"                   # Đang áp dụng
    FROZEN = "FROZEN"                   # Đóng băng (tạm dừng)
    CLOSED = "CLOSED"                   # Đã đóng
    REJECTED = "REJECTED"               # Từ chối


class Budget(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Ngân sách chính
    """
    __tablename__ = "ctrl_budgets"

    code: str = Field(index=True, nullable=False)           # BUD-2024-001
    name: str = Field(nullable=False)

    budget_type: str = Field(default=BudgetType.OPERATING.value, index=True)

    # Period
    fiscal_year_id: str = Field(foreign_key="acc_fiscal_years.id", nullable=False)
    period_from: datetime = Field(nullable=False)
    period_to: datetime = Field(nullable=False)

    # Scope (optional filters)
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")
    department_id: Optional[str] = Field(default=None)
    project_id: Optional[str] = Field(default=None, foreign_key="acc_projects.id")

    # Totals
    total_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    total_committed: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Đã cam kết
    total_actual: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)     # Thực tế
    total_remaining: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)  # Còn lại

    # Currency
    currency: str = Field(default="VND")

    # Status
    status: str = Field(default=BudgetStatus.DRAFT.value, index=True)

    # Approval
    submitted_at: Optional[datetime] = Field(default=None)
    submitted_by: Optional[str] = Field(default=None)
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    # Control
    allow_overspend: bool = Field(default=False)
    overspend_limit_percent: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BudgetVersion(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiên bản ngân sách (cho phép so sánh các bản dự thảo)
    """
    __tablename__ = "ctrl_budget_versions"

    budget_id: str = Field(foreign_key="ctrl_budgets.id", nullable=False, index=True)

    version_number: int = Field(default=1)
    version_name: str = Field(nullable=False)  # V1, V2, Final

    total_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    is_current: bool = Field(default=False)
    is_approved: bool = Field(default=False)

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BudgetLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết dòng ngân sách
    """
    __tablename__ = "ctrl_budget_lines"

    budget_id: str = Field(foreign_key="ctrl_budgets.id", nullable=False, index=True)
    version_id: Optional[str] = Field(default=None, foreign_key="ctrl_budget_versions.id")

    # Account
    account_id: str = Field(foreign_key="acc_chart_of_accounts.id", nullable=False)
    account_code: str = Field(nullable=False)

    # Optional dimensions
    cost_center_id: Optional[str] = Field(default=None, foreign_key="acc_cost_centers.id")
    project_id: Optional[str] = Field(default=None, foreign_key="acc_projects.id")

    # Period breakdown (monthly budget)
    period_01: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_02: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_03: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_04: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_05: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_06: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_07: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_08: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_09: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_10: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_11: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    period_12: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Totals
    annual_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_budget: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_actual: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    ytd_variance: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    variance_percent: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    notes: Optional[str] = Field(default=None)


class BudgetTransfer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chuyển ngân sách giữa các dòng
    """
    __tablename__ = "ctrl_budget_transfers"

    transfer_number: str = Field(index=True, nullable=False)
    transfer_date: datetime = Field(nullable=False)

    # From
    from_budget_line_id: str = Field(foreign_key="ctrl_budget_lines.id", nullable=False)
    from_account_code: str = Field(nullable=False)
    from_cost_center_id: Optional[str] = Field(default=None)

    # To
    to_budget_line_id: str = Field(foreign_key="ctrl_budget_lines.id", nullable=False)
    to_account_code: str = Field(nullable=False)
    to_cost_center_id: Optional[str] = Field(default=None)

    # Amount
    transfer_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # Status
    status: str = Field(default="DRAFT")  # DRAFT, APPROVED, REJECTED

    reason: str = Field(nullable=False)

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class BudgetRevision(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Điều chỉnh ngân sách (tăng/giảm)
    """
    __tablename__ = "ctrl_budget_revisions"

    revision_number: str = Field(index=True, nullable=False)
    revision_date: datetime = Field(nullable=False)

    budget_id: str = Field(foreign_key="ctrl_budgets.id", nullable=False, index=True)
    budget_line_id: str = Field(foreign_key="ctrl_budget_lines.id", nullable=False)

    # Revision
    revision_type: str = Field(default="INCREASE")  # INCREASE, DECREASE
    original_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    revision_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)
    new_amount: Decimal = Field(default=Decimal("0"), max_digits=20, decimal_places=2)

    # For specific period (optional)
    period_number: Optional[int] = Field(default=None)

    # Status
    status: str = Field(default="DRAFT")  # DRAFT, APPROVED, REJECTED

    reason: str = Field(nullable=False)

    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
