"""
HRM - Advance Payment Models
Tạm ứng lương (chuyển từ TMS sang HRM để dùng chung)
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class AdvanceStatus(str, Enum):
    """Trạng thái tạm ứng"""
    PENDING = "PENDING"          # Chờ duyệt
    APPROVED = "APPROVED"        # Đã duyệt
    REJECTED = "REJECTED"        # Từ chối
    PAID = "PAID"                # Đã chi
    PARTIALLY_REPAID = "PARTIALLY_REPAID"  # Đã trả một phần
    FULLY_REPAID = "FULLY_REPAID"  # Đã trả hết
    CANCELLED = "CANCELLED"


class AdvanceRequest(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Yêu cầu tạm ứng"""
    __tablename__ = "hrm_advance_requests"

    # Request info
    request_number: str = Field(index=True, nullable=False, max_length=30)  # TU-2024-001
    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # Amount
    requested_amount: Decimal = Field(nullable=False, max_digits=18, decimal_places=2)
    approved_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Số tiền được duyệt (có thể khác requested)

    # Purpose
    purpose: Optional[str] = Field(default=None, max_length=500)  # Lý do tạm ứng
    advance_type: str = Field(default="SALARY", max_length=20)  # SALARY, TRIP, OTHER

    # For trip-related advances (link to TMS)
    trip_id: Optional[str] = Field(default=None, foreign_key="trips.id", index=True)

    # Dates
    request_date: date = Field(nullable=False, index=True)
    needed_date: Optional[date] = Field(default=None)  # Ngày cần tiền

    # Status
    status: str = Field(default=AdvanceStatus.PENDING.value, index=True, max_length=20)

    # Approval
    approved_by: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")
    approved_at: Optional[datetime] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None, max_length=500)

    # Payment
    paid_date: Optional[date] = Field(default=None)
    paid_by: Optional[str] = Field(default=None, foreign_key="users.id")
    payment_method: Optional[str] = Field(default=None, max_length=20)  # CASH, TRANSFER
    payment_reference: Optional[str] = Field(default=None, max_length=100)

    # Repayment tracking
    repaid_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    remaining_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    # Repayment settings
    repayment_method: str = Field(default="SALARY_DEDUCTION", max_length=20)  # SALARY_DEDUCTION, CASH, TRANSFER
    deduction_start_month: Optional[str] = Field(default=None, max_length=7)  # YYYY-MM
    monthly_deduction_amount: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)

    notes: Optional[str] = Field(default=None, max_length=500)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")


class AdvanceRepayment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Lịch sử trả tạm ứng"""
    __tablename__ = "hrm_advance_repayments"

    advance_request_id: str = Field(foreign_key="hrm_advance_requests.id", nullable=False, index=True)

    # Repayment details
    repayment_date: date = Field(nullable=False, index=True)
    amount: Decimal = Field(nullable=False, max_digits=18, decimal_places=2)

    repayment_method: str = Field(nullable=False, max_length=20)  # SALARY_DEDUCTION, CASH, TRANSFER
    reference: Optional[str] = Field(default=None, max_length=100)  # Mã giao dịch hoặc payroll_record_id

    # For salary deduction
    payroll_record_id: Optional[str] = Field(default=None, foreign_key="hrm_payroll_records.id", index=True)

    notes: Optional[str] = Field(default=None, max_length=500)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")
