"""
HRM - Employee Model
Core employee information with dependents and documents
"""
from typing import Optional
from datetime import date, datetime
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class EmployeeStatus(str, Enum):
    """Trạng thái nhân viên"""
    ACTIVE = "ACTIVE"              # Đang làm việc
    PROBATION = "PROBATION"        # Thử việc
    ON_LEAVE = "ON_LEAVE"          # Nghỉ phép dài hạn
    SUSPENDED = "SUSPENDED"        # Tạm đình chỉ
    RESIGNED = "RESIGNED"          # Đã nghỉ việc
    TERMINATED = "TERMINATED"      # Bị sa thải


class EmployeeType(str, Enum):
    """Loại nhân viên"""
    FULL_TIME = "FULL_TIME"        # Toàn thời gian
    PART_TIME = "PART_TIME"        # Bán thời gian
    CONTRACT = "CONTRACT"          # Hợp đồng
    INTERN = "INTERN"              # Thực tập
    FREELANCER = "FREELANCER"      # Cộng tác viên
    DRIVER = "DRIVER"              # Tài xế (link to TMS)


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class MaritalStatus(str, Enum):
    SINGLE = "SINGLE"
    MARRIED = "MARRIED"
    DIVORCED = "DIVORCED"
    WIDOWED = "WIDOWED"


class Employee(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Nhân viên"""
    __tablename__ = "hrm_employees"

    # === BASIC INFO ===
    employee_code: str = Field(index=True, unique=True, nullable=False, max_length=50)
    full_name: str = Field(nullable=False, index=True, max_length=255)

    # Personal - using date type
    date_of_birth: Optional[date] = Field(default=None)
    gender: Optional[str] = Field(default=None, max_length=20)  # MALE/FEMALE/OTHER
    marital_status: Optional[str] = Field(default=None, max_length=20)
    nationality: str = Field(default="Vietnamese", max_length=50)

    # === CONTACT ===
    phone: Optional[str] = Field(default=None, index=True, max_length=20)
    email: Optional[str] = Field(default=None, index=True, max_length=255)

    # Permanent address
    permanent_address: Optional[str] = Field(default=None, max_length=500)
    permanent_city: Optional[str] = Field(default=None, max_length=100)
    permanent_province: Optional[str] = Field(default=None, max_length=100)

    # Current address
    current_address: Optional[str] = Field(default=None, max_length=500)
    current_city: Optional[str] = Field(default=None, max_length=100)
    current_province: Optional[str] = Field(default=None, max_length=100)

    # === IDENTIFICATION ===
    id_number: Optional[str] = Field(default=None, index=True, max_length=20)  # CCCD/CMND
    id_issue_date: Optional[date] = Field(default=None)
    id_issue_place: Optional[str] = Field(default=None, max_length=255)
    id_expiry_date: Optional[date] = Field(default=None)

    tax_code: Optional[str] = Field(default=None, max_length=20)  # MST cá nhân

    # === BANK INFO ===
    bank_name: Optional[str] = Field(default=None, max_length=255)
    bank_branch: Optional[str] = Field(default=None, max_length=255)
    bank_account: Optional[str] = Field(default=None, max_length=50)
    bank_account_name: Optional[str] = Field(default=None, max_length=255)

    # === EMPLOYMENT ===
    employee_type: str = Field(default=EmployeeType.FULL_TIME.value, index=True, max_length=50)
    status: str = Field(default=EmployeeStatus.ACTIVE.value, index=True, max_length=50)

    join_date: Optional[date] = Field(default=None, index=True)  # Ngày vào làm
    probation_end_date: Optional[date] = Field(default=None)  # Ngày hết thử việc
    official_date: Optional[date] = Field(default=None)  # Ngày chính thức
    resign_date: Optional[date] = Field(default=None, index=True)  # Ngày nghỉ việc
    resign_reason: Optional[str] = Field(default=None, max_length=500)

    # Organization
    branch_id: Optional[str] = Field(default=None, foreign_key="hrm_branches.id", index=True)
    department_id: Optional[str] = Field(default=None, foreign_key="hrm_departments.id", index=True)
    team_id: Optional[str] = Field(default=None, foreign_key="hrm_teams.id", index=True)
    position_id: Optional[str] = Field(default=None, foreign_key="hrm_positions.id", index=True)

    # Manager
    manager_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id", index=True)

    # === INSURANCE ===
    social_insurance_number: Optional[str] = Field(default=None, max_length=20)  # Số sổ BHXH
    health_insurance_number: Optional[str] = Field(default=None, max_length=20)  # Số thẻ BHYT
    health_insurance_place: Optional[str] = Field(default=None, max_length=255)  # Nơi KCB

    # === FOR DRIVERS (Link to TMS) ===
    driver_id: Optional[str] = Field(default=None, foreign_key="drivers.id", index=True)

    # Driver-specific (duplicated for quick access, synced from TMS)
    license_number: Optional[str] = Field(default=None, max_length=50)  # Số bằng lái
    license_class: Optional[str] = Field(default=None, max_length=10)  # Hạng bằng (B2, C, FC...)
    license_expiry: Optional[date] = Field(default=None)

    # Health check (required for drivers)
    health_check_date: Optional[date] = Field(default=None)
    health_check_expiry: Optional[date] = Field(default=None)
    health_check_result: Optional[str] = Field(default=None, max_length=50)  # ĐẠT/KHÔNG ĐẠT

    # === WORK SETTINGS ===
    work_shift_id: Optional[str] = Field(default=None, foreign_key="hrm_work_shifts.id", index=True)

    # Salary calculation type for drivers
    # FIXED = Lương cứng, TRIP_BASED = Theo chuyến, MIXED = Lương cứng + chuyến
    salary_type: Optional[str] = Field(default="FIXED", max_length=20)

    # === LINKED USER ACCOUNT ===
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)

    # === OTHER ===
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=2000)

    # === SOCIAL LINKS (for NameCard) ===
    zalo_phone: Optional[str] = Field(default=None, max_length=20)  # Số Zalo (thường = phone)
    facebook_url: Optional[str] = Field(default=None, max_length=500)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    website_url: Optional[str] = Field(default=None, max_length=500)  # Personal website/portfolio

    class Config:
        use_enum_values = True


class EmployeeDependent(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Người phụ thuộc (để tính giảm trừ thuế TNCN)"""
    __tablename__ = "hrm_employee_dependents"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    full_name: str = Field(nullable=False, max_length=255)
    relationship: str = Field(nullable=False, max_length=50)  # Con, Cha, Mẹ, Vợ/Chồng
    date_of_birth: Optional[date] = Field(default=None)
    id_number: Optional[str] = Field(default=None, max_length=20)

    # Tax deduction registration
    tax_code: Optional[str] = Field(default=None, max_length=20)  # MST người phụ thuộc
    deduction_from: Optional[date] = Field(default=None)  # Giảm trừ từ tháng
    deduction_to: Optional[date] = Field(default=None)  # Đến tháng

    # Document proof
    document_type: Optional[str] = Field(default=None, max_length=100)  # Giấy khai sinh, Giấy đăng ký kết hôn
    document_number: Optional[str] = Field(default=None, max_length=50)

    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class EmployeeDocument(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Hồ sơ/tài liệu nhân viên"""
    __tablename__ = "hrm_employee_documents"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # Document info
    document_type: str = Field(nullable=False, max_length=50)  # CCCD, BẰNG_LÁI, HỌC_VẤN, HỢP_ĐỒNG, CHỨNG_CHỈ
    document_name: str = Field(nullable=False, max_length=255)
    document_number: Optional[str] = Field(default=None, max_length=50)

    issue_date: Optional[date] = Field(default=None)
    expiry_date: Optional[date] = Field(default=None, index=True)
    issue_place: Optional[str] = Field(default=None, max_length=255)

    # File
    file_url: Optional[str] = Field(default=None, max_length=500)
    file_name: Optional[str] = Field(default=None, max_length=255)

    # Alert before expiry (days)
    alert_before_days: int = Field(default=30)

    is_verified: bool = Field(default=False)
    verified_by: Optional[str] = Field(default=None, foreign_key="users.id")
    verified_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None, max_length=500)
