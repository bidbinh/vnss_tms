"""
HRM - Payroll Models
Salary structure, components, payroll periods and records
"""
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ComponentType(str, Enum):
    """Loại thành phần lương"""
    EARNING = "EARNING"        # Thu nhập
    DEDUCTION = "DEDUCTION"    # Khấu trừ
    EMPLOYER_CONTRIBUTION = "EMPLOYER_CONTRIBUTION"  # Công ty đóng (BHXH, BHYT...)


class DeductionType(str, Enum):
    """Loại khấu trừ"""
    INSURANCE_EMPLOYEE = "INSURANCE_EMPLOYEE"    # BHXH, BHYT, BHTN phần NV đóng
    TAX = "TAX"                                  # Thuế TNCN
    ADVANCE = "ADVANCE"                          # Tạm ứng
    LOAN = "LOAN"                                # Khoản vay
    PENALTY = "PENALTY"                          # Phạt vi phạm
    OTHER = "OTHER"


class SalaryStructure(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Cơ cấu lương (template)"""
    __tablename__ = "hrm_salary_structures"

    code: str = Field(index=True, nullable=False, max_length=50)  # SALARY-OFFICE, SALARY-DRIVER
    name: str = Field(nullable=False, max_length=255)  # Cơ cấu lương văn phòng, Cơ cấu lương tài xế

    # Apply to
    employee_type: Optional[str] = Field(default=None, max_length=50)  # FULL_TIME, DRIVER, etc.
    department_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id", index=True)
    position_id: Optional[str] = Field(default=None, foreign_key="hrm_positions.id", index=True)

    description: Optional[str] = Field(default=None, max_length=1000)
    is_active: bool = Field(default=True, index=True)
    is_default: bool = Field(default=False)  # Cơ cấu mặc định


class SalaryComponent(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Thành phần lương"""
    __tablename__ = "hrm_salary_components"

    structure_id: str = Field(foreign_key="hrm_salary_structures.id", nullable=False, index=True)

    code: str = Field(nullable=False, max_length=50)  # BASIC, MEAL, TRANSPORT, OT
    name: str = Field(nullable=False, max_length=255)  # Lương cơ bản, Phụ cấp ăn, Phụ cấp xăng xe, Làm thêm giờ

    component_type: str = Field(default=ComponentType.EARNING.value, max_length=50)  # EARNING, DEDUCTION

    # Calculation
    # FIXED = Cố định, FORMULA = Công thức, PERCENT = % của component khác
    calculation_type: str = Field(default="FIXED", max_length=20)
    default_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Số tiền mặc định
    formula: Optional[str] = Field(default=None, max_length=500)  # Công thức tính
    percent_of_component: Optional[str] = Field(default=None, max_length=50)  # Code của component khác
    percent_value: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)

    # Taxable
    is_taxable: bool = Field(default=True)  # Tính thuế TNCN
    is_insurance_base: bool = Field(default=False)  # Tính vào lương đóng BH

    # Display
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class EmployeeSalary(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Lương nhân viên (áp dụng cơ cấu lương + override giá trị)"""
    __tablename__ = "hrm_employee_salaries"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    structure_id: str = Field(foreign_key="hrm_salary_structures.id", nullable=False, index=True)

    effective_from: date = Field(nullable=False, index=True)  # Áp dụng từ ngày
    effective_to: Optional[date] = Field(default=None, index=True)

    # Override amounts (JSON: {"BASIC": 15000000, "MEAL": 500000})
    overrides_json: Optional[str] = Field(default=None, max_length=5000)

    # For drivers - special settings
    trip_rate_json: Optional[str] = Field(default=None, max_length=2000)  # Bảng tính chuyến {"km_rate": 3000, "container_rate": 500000}

    is_current: bool = Field(default=True, index=True)
    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")


class PayrollPeriod(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Kỳ lương"""
    __tablename__ = "hrm_payroll_periods"

    code: str = Field(index=True, nullable=False, max_length=20)  # 2024-12, 2024-11
    name: str = Field(nullable=False, max_length=100)  # Lương tháng 12/2024

    year: int = Field(nullable=False, index=True)
    month: int = Field(nullable=False, index=True)

    # Period dates
    start_date: date = Field(nullable=False)  # Từ ngày (thường là 01)
    end_date: date = Field(nullable=False)    # Đến ngày (thường là cuối tháng)

    # Cutoff dates
    attendance_cutoff_date: date = Field(nullable=False)  # Chốt công ngày
    payroll_run_date: Optional[date] = Field(default=None)  # Ngày chạy lương
    payment_date: Optional[date] = Field(default=None)  # Ngày trả lương

    # Status
    status: str = Field(default="OPEN", index=True, max_length=20)  # OPEN, LOCKED, PROCESSING, COMPLETED
    locked_at: Optional[datetime] = Field(default=None)
    locked_by: Optional[str] = Field(default=None, foreign_key="users.id")

    # Working days in period
    total_working_days: Decimal = Field(default=Decimal("22"), max_digits=4, decimal_places=1)
    holidays_json: Optional[str] = Field(default=None, max_length=1000)  # ["2024-12-25", "2024-12-31"]

    notes: Optional[str] = Field(default=None, max_length=1000)


class PayrollRecord(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Bảng lương nhân viên theo kỳ"""
    __tablename__ = "hrm_payroll_records"

    payroll_period_id: str = Field(foreign_key="hrm_payroll_periods.id", nullable=False, index=True)
    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    employee_salary_id: str = Field(foreign_key="hrm_employee_salaries.id", nullable=False, index=True)

    # Attendance summary
    working_days: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)  # Số ngày công
    leave_days: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)  # Số ngày nghỉ phép (có lương)
    unpaid_leave_days: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)  # Nghỉ không lương
    absent_days: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)  # Vắng mặt
    late_count: int = Field(default=0)  # Số lần đi muộn
    early_leave_count: int = Field(default=0)  # Số lần về sớm

    # Overtime
    ot_hours_weekday: Decimal = Field(default=Decimal("0"), max_digits=6, decimal_places=2)  # OT ngày thường
    ot_hours_weekend: Decimal = Field(default=Decimal("0"), max_digits=6, decimal_places=2)  # OT cuối tuần
    ot_hours_holiday: Decimal = Field(default=Decimal("0"), max_digits=6, decimal_places=2)  # OT ngày lễ

    # === EARNINGS ===
    basic_salary: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    prorated_salary: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Lương theo ngày công
    allowances_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Tổng phụ cấp
    overtime_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Tổng OT
    bonus_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Thưởng
    commission_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Hoa hồng
    trip_income_total: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Thu nhập chuyến (tài xế)

    gross_salary: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Tổng thu nhập

    # === DEDUCTIONS ===
    insurance_employee: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # BHXH, BHYT, BHTN (phần NV)
    tax_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Thuế TNCN
    advance_deduction: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Trừ tạm ứng
    loan_deduction: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Trừ khoản vay
    penalty_deduction: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Trừ phạt
    other_deductions: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    total_deductions: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)

    # === NET ===
    net_salary: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Thực lĩnh

    # === EMPLOYER COST ===
    insurance_employer: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # BHXH, BHYT, BHTN (phần công ty)
    total_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Tổng chi phí công ty

    # Payment
    payment_status: str = Field(default="PENDING", index=True, max_length=20)  # PENDING, PAID, PARTIAL
    payment_date: Optional[date] = Field(default=None)
    payment_reference: Optional[str] = Field(default=None, max_length=100)  # Mã giao dịch

    # Detail breakdown (JSON for all components)
    earnings_json: Optional[str] = Field(default=None, max_length=10000)
    deductions_json: Optional[str] = Field(default=None, max_length=5000)

    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")


class PayrollItem(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Chi tiết từng khoản trong bảng lương"""
    __tablename__ = "hrm_payroll_items"

    payroll_record_id: str = Field(foreign_key="hrm_payroll_records.id", nullable=False, index=True)

    component_code: str = Field(nullable=False, max_length=50)
    component_name: str = Field(nullable=False, max_length=255)
    component_type: str = Field(nullable=False, max_length=50)  # EARNING, DEDUCTION

    amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    calculation_notes: Optional[str] = Field(default=None, max_length=500)  # Ghi chú cách tính

    sort_order: int = Field(default=0)


class Deduction(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Các khoản khấu trừ đặc biệt (ngoài lương)"""
    __tablename__ = "hrm_deductions"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    deduction_type: str = Field(nullable=False, max_length=50)  # ADVANCE, LOAN, PENALTY, OTHER
    description: str = Field(nullable=False, max_length=500)

    total_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Tổng số tiền
    remaining_amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Còn lại
    monthly_deduction: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)  # Trừ hàng tháng

    start_date: date = Field(nullable=False, index=True)
    end_date: Optional[date] = Field(default=None)

    # For loans
    interest_rate: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)

    is_active: bool = Field(default=True, index=True)
    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")


class BonusType(str, Enum):
    """Loại thưởng"""
    PERFORMANCE = "PERFORMANCE"      # Thưởng hiệu suất
    PROJECT = "PROJECT"              # Thưởng dự án
    HOLIDAY = "HOLIDAY"              # Thưởng lễ/tết
    REFERRAL = "REFERRAL"            # Thưởng giới thiệu
    ATTENDANCE = "ATTENDANCE"        # Thưởng chuyên cần
    OTHER = "OTHER"


class BonusStatus(str, Enum):
    """Trạng thái thưởng"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PAID = "PAID"


class Bonus(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Khoản thưởng"""
    __tablename__ = "hrm_bonuses"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    bonus_type: str = Field(default=BonusType.PERFORMANCE.value, max_length=50)
    amount: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=2)
    reason: str = Field(nullable=False, max_length=500)
    effective_date: date = Field(nullable=False, index=True)

    status: str = Field(default=BonusStatus.PENDING.value, index=True, max_length=20)
    approved_by: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")
