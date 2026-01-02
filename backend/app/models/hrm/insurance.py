"""
HRM - Insurance Models
BHXH, BHYT, BHTN management
"""
from typing import Optional
from datetime import date
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class InsuranceType(str, Enum):
    """Loại bảo hiểm"""
    SOCIAL = "SOCIAL"            # BHXH
    HEALTH = "HEALTH"            # BHYT
    UNEMPLOYMENT = "UNEMPLOYMENT"  # BHTN
    ACCIDENT = "ACCIDENT"        # BH tai nạn lao động


class InsuranceRecord(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Quản lý bảo hiểm nhân viên"""
    __tablename__ = "hrm_insurance_records"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    insurance_type: str = Field(nullable=False, max_length=20)  # SOCIAL, HEALTH, UNEMPLOYMENT

    # Insurance number
    insurance_number: str = Field(nullable=False, max_length=30)  # Số sổ BHXH hoặc số thẻ BHYT

    # For health insurance
    health_insurance_place: Optional[str] = Field(default=None, max_length=255)  # Nơi đăng ký KCB

    # Registration
    registered_salary: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Mức lương đóng BH
    start_date: date = Field(nullable=False, index=True)  # Ngày bắt đầu đóng
    end_date: Optional[date] = Field(default=None)

    # Contribution rates (%)
    employee_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # Tỷ lệ NV đóng
    employer_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # Tỷ lệ công ty đóng

    # Status
    is_active: bool = Field(default=True, index=True)

    notes: Optional[str] = Field(default=None, max_length=500)


class InsuranceContribution(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Lịch sử đóng bảo hiểm theo tháng"""
    __tablename__ = "hrm_insurance_contributions"

    insurance_record_id: str = Field(foreign_key="hrm_insurance_records.id", nullable=False, index=True)

    year: int = Field(nullable=False, index=True)
    month: int = Field(nullable=False, index=True)

    salary_base: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Lương đóng BH
    employee_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Số tiền NV đóng
    employer_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Số tiền công ty đóng
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    # Link to payroll
    payroll_record_id: Optional[str] = Field(default=None, foreign_key="hrm_payroll_records.id", index=True)

    is_paid: bool = Field(default=False)
    paid_date: Optional[date] = Field(default=None)

    notes: Optional[str] = Field(default=None, max_length=500)
