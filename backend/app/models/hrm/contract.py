"""
HRM - Contract Model
Labor contracts with history and renewal tracking
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ContractType(str, Enum):
    """Loại hợp đồng"""
    PROBATION = "PROBATION"          # Thử việc
    DEFINITE_6M = "DEFINITE_6M"      # Xác định thời hạn 6 tháng
    DEFINITE_1Y = "DEFINITE_1Y"      # Xác định thời hạn 1 năm
    DEFINITE_2Y = "DEFINITE_2Y"      # Xác định thời hạn 2 năm
    DEFINITE_3Y = "DEFINITE_3Y"      # Xác định thời hạn 3 năm
    INDEFINITE = "INDEFINITE"        # Không xác định thời hạn
    SEASONAL = "SEASONAL"            # Thời vụ
    COLLABORATION = "COLLABORATION"  # Cộng tác viên


class ContractStatus(str, Enum):
    """Trạng thái hợp đồng"""
    DRAFT = "DRAFT"              # Nháp
    PENDING_SIGN = "PENDING_SIGN"  # Chờ ký
    ACTIVE = "ACTIVE"            # Đang hiệu lực
    EXPIRED = "EXPIRED"          # Hết hạn
    RENEWED = "RENEWED"          # Đã gia hạn (có HĐ mới)
    TERMINATED = "TERMINATED"    # Chấm dứt trước hạn
    CANCELLED = "CANCELLED"      # Hủy


class Contract(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Hợp đồng lao động"""
    __tablename__ = "hrm_contracts"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # Contract info
    contract_number: str = Field(nullable=False, index=True, max_length=50)  # HDLD-2024-001
    contract_type: str = Field(nullable=False, max_length=30)  # PROBATION, DEFINITE_1Y, INDEFINITE...
    status: str = Field(default=ContractStatus.DRAFT.value, index=True, max_length=20)

    # Dates - using date type
    sign_date: Optional[date] = Field(default=None)  # Ngày ký
    start_date: date = Field(nullable=False, index=True)  # Ngày bắt đầu
    end_date: Optional[date] = Field(default=None, index=True)  # Ngày kết thúc (null = vô thời hạn)

    # Previous contract (for renewal tracking)
    previous_contract_id: Optional[str] = Field(default=None, foreign_key="hrm_contracts.id", index=True)

    # === SALARY INFO ===
    basic_salary: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Lương cơ bản
    insurance_salary: Optional[Decimal] = Field(default=None, max_digits=18, decimal_places=2)  # Lương đóng BH (nếu khác lương cơ bản)

    # Allowances (lưu JSON hoặc link đến bảng riêng)
    allowances_json: Optional[str] = Field(default=None, max_length=2000)  # {"meal": 500000, "transport": 300000}

    # Probation salary (% of basic)
    probation_salary_percent: Decimal = Field(default=Decimal("85"), max_digits=5, decimal_places=2)  # 85% lương chính thức

    # === WORK DETAILS ===
    job_title: Optional[str] = Field(default=None, max_length=100)  # Chức danh trong HĐ
    job_description: Optional[str] = Field(default=None, max_length=2000)
    work_location: Optional[str] = Field(default=None, max_length=255)  # Địa điểm làm việc

    # Working hours
    working_hours_per_day: Decimal = Field(default=Decimal("8"), max_digits=3, decimal_places=1)
    working_days_per_week: Decimal = Field(default=Decimal("5"), max_digits=3, decimal_places=1)

    # === TERMINATION ===
    termination_date: Optional[date] = Field(default=None)
    termination_reason: Optional[str] = Field(default=None, max_length=500)
    termination_type: Optional[str] = Field(default=None, max_length=30)  # EMPLOYEE_RESIGN, COMPANY_TERMINATE, MUTUAL_AGREEMENT

    # === DOCUMENTS ===
    contract_file_url: Optional[str] = Field(default=None, max_length=500)  # File HĐ scan

    # Signed by
    employee_signed_date: Optional[date] = Field(default=None)
    company_signed_by: Optional[str] = Field(default=None, max_length=255)  # Người đại diện công ty ký
    company_signed_date: Optional[date] = Field(default=None)

    # === ALERTS ===
    # Cảnh báo trước khi hết hạn (ngày)
    expiry_alert_days: int = Field(default=30)

    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")
