from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class DriverSource:
    """Driver source types"""
    INTERNAL = "INTERNAL"  # Company employee
    EXTERNAL = "EXTERNAL"  # External worker from 9log platform


class Driver(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "drivers"

    # Basic info
    name: str = Field(nullable=False)
    short_name: Optional[str] = Field(default=None)  # Tên viết tắt
    phone: Optional[str] = Field(default=None)
    date_of_birth: Optional[date] = Field(default=None)  # Ngày sinh

    # Identification
    citizen_id: Optional[str] = Field(default=None)  # CCCD

    # License
    license_no: Optional[str] = Field(default=None)  # Bằng lái
    license_expiry: Optional[date] = Field(default=None)  # Hạn bằng lái

    # Banking
    bank_account: Optional[str] = Field(default=None)  # STK
    bank_name: Optional[str] = Field(default=None)  # Tên ngân hàng
    bank_bin: Optional[str] = Field(default=None)  # Mã BIN ngân hàng (VietQR)

    # Vehicle assignment
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)  # Assigned tractor (DEPRECATED: use tractor_id)
    tractor_id: Optional[str] = Field(default=None, foreign_key="vehicles.id", index=True)  # Assigned tractor (vehicle with type=TRACTOR)
    trailer_id: Optional[str] = Field(default=None, foreign_key="trailers.id", index=True)  # Assigned trailer

    # Salary
    base_salary: int = Field(default=5000000)  # Lương cơ bản (VND)
    dependent_count: int = Field(default=0)  # Số người phụ thuộc
    hire_date: Optional[date] = Field(default=None)  # Ngày vào làm (for seniority bonus calculation)

    # Work status
    status: str = Field(default="ACTIVE")  # ACTIVE, INACTIVE
    work_status: Optional[str] = Field(default=None)  # Trạng thái làm việc (Đang làm việc, Công tác viên, etc.)

    # Link to HRM Employee (internal)
    employee_id: Optional[str] = Field(default=None, foreign_key="hrm_employees.id", index=True)

    # External Worker Integration
    source: str = Field(default=DriverSource.INTERNAL, index=True)  # INTERNAL or EXTERNAL
    external_worker_id: Optional[str] = Field(default=None, index=True)  # Link to workers table (9log platform)
    external_worker_username: Optional[str] = Field(default=None)  # Username for display
