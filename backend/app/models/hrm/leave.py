"""
HRM - Leave Management Models
Leave types, balances, requests and approval workflow
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class LeaveStatus(str, Enum):
    """Trạng thái đơn nghỉ phép"""
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class LeaveType(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Loại nghỉ phép"""
    __tablename__ = "hrm_leave_types"

    code: str = Field(index=True, nullable=False, max_length=20)  # AL, SL, UL, ML, PL
    name: str = Field(nullable=False, max_length=100)  # Phép năm, Nghỉ ốm, Nghỉ không lương...

    # Paid or unpaid
    is_paid: bool = Field(default=True)

    # Default entitlement per year
    default_days_per_year: Decimal = Field(default=Decimal("12"), max_digits=5, decimal_places=1)

    # Accrual rules
    is_accrual: bool = Field(default=False)  # Tích lũy theo tháng
    accrual_per_month: Decimal = Field(default=Decimal("1"), max_digits=4, decimal_places=2)  # 1 ngày/tháng

    # Carry forward
    allow_carry_forward: bool = Field(default=False)  # Cho phép chuyển sang năm sau
    max_carry_forward_days: Decimal = Field(default=Decimal("5"), max_digits=4, decimal_places=1)  # Tối đa 5 ngày

    # Advance leave
    allow_negative_balance: bool = Field(default=False)  # Cho phép nghỉ âm
    max_negative_days: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)

    # Requires approval
    requires_approval: bool = Field(default=True)
    requires_attachment: bool = Field(default=False)  # Yêu cầu đính kèm (ví dụ: giấy khám bệnh)

    # Gender specific (for maternity/paternity)
    gender_specific: Optional[str] = Field(default=None, max_length=10)  # MALE, FEMALE, null = all

    # Minimum tenure required (months)
    min_tenure_months: int = Field(default=0)  # Ví dụ: phải làm đủ 12 tháng mới có phép năm

    # Description
    description: Optional[str] = Field(default=None, max_length=500)

    is_active: bool = Field(default=True, index=True)
    sort_order: int = Field(default=0)


class LeaveBalance(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Số dư phép của nhân viên"""
    __tablename__ = "hrm_leave_balances"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    leave_type_id: str = Field(foreign_key="hrm_leave_types.id", nullable=False, index=True)
    year: int = Field(nullable=False, index=True)  # 2024

    # Entitlement
    entitled_days: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)  # Số ngày được hưởng
    carried_forward_days: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)  # Số ngày chuyển từ năm trước

    # Used
    used_days: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)  # Số ngày đã nghỉ
    pending_days: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)  # Số ngày đang chờ duyệt

    # Available = entitled + carried_forward - used - pending
    # (Calculated field, but stored for quick access)
    available_days: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=1)

    notes: Optional[str] = Field(default=None, max_length=500)


class LeaveRequest(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Đơn xin nghỉ phép"""
    __tablename__ = "hrm_leave_requests"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    leave_type_id: str = Field(foreign_key="hrm_leave_types.id", nullable=False, index=True)

    # Request details
    request_number: str = Field(nullable=False, index=True, max_length=50)  # NP-2024-001
    from_date: date = Field(nullable=False, index=True)
    to_date: date = Field(nullable=False, index=True)

    # Half day option
    is_half_day: bool = Field(default=False)
    half_day_type: Optional[str] = Field(default=None, max_length=20)  # MORNING, AFTERNOON

    # Total days (auto-calculated)
    total_days: Decimal = Field(default=Decimal("1"), max_digits=4, decimal_places=1)

    reason: Optional[str] = Field(default=None, max_length=1000)
    attachment_url: Optional[str] = Field(default=None, max_length=500)

    # Status
    status: str = Field(default=LeaveStatus.PENDING.value, index=True, max_length=20)

    # Handover (bàn giao công việc)
    handover_to_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id", index=True)
    handover_notes: Optional[str] = Field(default=None, max_length=1000)

    # Cancellation
    cancelled_at: Optional[datetime] = Field(default=None)
    cancellation_reason: Optional[str] = Field(default=None, max_length=500)

    notes: Optional[str] = Field(default=None, max_length=500)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")

    # Workflow integration
    workflow_instance_id: Optional[str] = Field(default=None, index=True)


class LeaveApprovalFlow(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Quy trình duyệt phép"""
    __tablename__ = "hrm_leave_approval_flows"

    name: str = Field(nullable=False, max_length=100)  # Quy trình duyệt phép mặc định

    # Conditions (when to use this flow)
    leave_type_id: Optional[str] = Field(default=None, foreign_key="hrm_leave_types.id", index=True)
    min_days: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)  # Áp dụng từ X ngày trở lên
    max_days: Optional[Decimal] = Field(default=None, max_digits=4, decimal_places=1)
    department_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id", index=True)

    # Number of approval levels
    approval_levels: int = Field(default=1)

    is_active: bool = Field(default=True, index=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class LeaveApprover(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Lịch sử duyệt đơn phép"""
    __tablename__ = "hrm_leave_approvers"

    leave_request_id: str = Field(foreign_key="hrm_leave_requests.id", nullable=False, index=True)

    # Approval level
    level: int = Field(default=1)  # 1 = cấp 1, 2 = cấp 2...

    # Approver
    approver_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    approver_role: Optional[str] = Field(default=None, max_length=50)  # MANAGER, HR, DIRECTOR

    # Status
    status: str = Field(default=LeaveStatus.PENDING.value, max_length=20)
    approved_at: Optional[datetime] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None, max_length=500)

    notes: Optional[str] = Field(default=None, max_length=500)
