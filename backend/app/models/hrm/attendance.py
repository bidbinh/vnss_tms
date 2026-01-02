"""
HRM - Attendance & Overtime Models
Work shifts, attendance records, overtime management
"""
from typing import Optional
from datetime import date as DateType, datetime, time as TimeType
from decimal import Decimal
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class AttendanceStatus(str, Enum):
    """Trạng thái chấm công"""
    PRESENT = "PRESENT"          # Có mặt đủ
    LATE = "LATE"                # Đi muộn
    EARLY_LEAVE = "EARLY_LEAVE"  # Về sớm
    LATE_AND_EARLY = "LATE_AND_EARLY"  # Đi muộn và về sớm
    ABSENT = "ABSENT"            # Vắng mặt
    ON_LEAVE = "ON_LEAVE"        # Nghỉ phép
    HOLIDAY = "HOLIDAY"          # Ngày lễ
    WEEKEND = "WEEKEND"          # Cuối tuần
    WORK_FROM_HOME = "WFH"       # Làm việc từ xa
    BUSINESS_TRIP = "BUSINESS_TRIP"  # Công tác
    ON_TRIP = "ON_TRIP"          # Đang chạy chuyến (tài xế)


class OvertimeStatus(str, Enum):
    """Trạng thái đăng ký OT"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class WorkShift(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Ca làm việc"""
    __tablename__ = "hrm_work_shifts"

    code: str = Field(index=True, nullable=False, max_length=20)  # CA-HC, CA-S, CA-C
    name: str = Field(nullable=False, max_length=100)  # Ca hành chính, Ca sáng, Ca chiều

    # Time - using time type
    start_time: TimeType = Field(nullable=False)  # 08:00
    end_time: TimeType = Field(nullable=False)    # 17:00

    # Break time
    break_start: Optional[TimeType] = Field(default=None)  # 12:00
    break_end: Optional[TimeType] = Field(default=None)    # 13:00
    break_duration_minutes: int = Field(default=60)

    # Working hours (excluding break)
    working_hours: Decimal = Field(default=Decimal("8"), max_digits=4, decimal_places=2)

    # Grace period (minutes)
    late_grace_minutes: int = Field(default=15)  # Cho phép trễ 15 phút
    early_leave_grace_minutes: int = Field(default=15)

    # Night shift bonus
    is_night_shift: bool = Field(default=False)
    night_shift_multiplier: Decimal = Field(default=Decimal("1.3"), max_digits=3, decimal_places=2)  # Hệ số ca đêm

    # Flexible hours
    is_flexible: bool = Field(default=False)  # Ca linh hoạt
    core_start_time: Optional[TimeType] = Field(default=None)  # Giờ bắt buộc có mặt từ
    core_end_time: Optional[TimeType] = Field(default=None)    # Đến

    is_active: bool = Field(default=True, index=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class ShiftAssignment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Phân ca làm việc"""
    __tablename__ = "hrm_shift_assignments"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    shift_id: str = Field(foreign_key="hrm_work_shifts.id", nullable=False, index=True)

    # Period
    effective_from: DateType = Field(nullable=False, index=True)  # Áp dụng từ ngày
    effective_to: Optional[DateType] = Field(default=None)  # Đến ngày (null = vô thời hạn)

    # Working days (JSON array: [1,2,3,4,5] = Mon-Fri)
    working_days_json: str = Field(default='[1,2,3,4,5]', max_length=50)

    is_active: bool = Field(default=True, index=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class AttendanceRecord(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Bảng chấm công"""
    __tablename__ = "hrm_attendance_records"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)
    date: DateType = Field(nullable=False, index=True)

    shift_id: Optional[str] = Field(default=None, foreign_key="hrm_work_shifts.id", index=True)

    # Check-in/out - using datetime for precise timestamps
    check_in_time: Optional[datetime] = Field(default=None)
    check_out_time: Optional[datetime] = Field(default=None)
    check_in_location: Optional[str] = Field(default=None, max_length=255)  # GPS coordinates or address
    check_out_location: Optional[str] = Field(default=None, max_length=255)

    # Source of check-in
    check_in_source: Optional[str] = Field(default=None, max_length=20)  # MOBILE, FINGERPRINT, MANUAL, SYSTEM
    check_out_source: Optional[str] = Field(default=None, max_length=20)

    # Status
    status: str = Field(default=AttendanceStatus.PRESENT.value, index=True, max_length=20)

    # Calculated values
    late_minutes: int = Field(default=0)  # Số phút đi muộn
    early_leave_minutes: int = Field(default=0)  # Số phút về sớm
    working_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # Số giờ làm thực tế
    overtime_hours: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)  # Số giờ OT

    # Work units (for payroll calculation)
    work_units: Decimal = Field(default=Decimal("1"), max_digits=3, decimal_places=2)  # 1 = 1 công, 0.5 = nửa công

    # For drivers - link to trips
    trip_ids_json: Optional[str] = Field(default=None, max_length=2000)  # ["trip_1", "trip_2"]

    # Approval (for manual adjustments)
    is_approved: bool = Field(default=True)
    approved_by: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None, max_length=500)


class OvertimeRequest(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Đăng ký làm thêm giờ"""
    __tablename__ = "hrm_overtime_requests"

    employee_id: str = Field(foreign_key="hrm_employees.id", nullable=False, index=True)

    # OT details - using proper date/time types
    date: DateType = Field(nullable=False, index=True)
    start_time: TimeType = Field(nullable=False)
    end_time: TimeType = Field(nullable=False)
    hours: Decimal = Field(nullable=False, max_digits=5, decimal_places=2)  # Số giờ OT

    # OT type and multiplier
    ot_type: str = Field(default="WEEKDAY", max_length=20)  # WEEKDAY, WEEKEND, HOLIDAY, NIGHT
    multiplier: Decimal = Field(default=Decimal("1.5"), max_digits=3, decimal_places=2)  # Hệ số OT (1.5, 2.0, 3.0)

    reason: Optional[str] = Field(default=None, max_length=500)  # Lý do làm thêm

    # Approval
    status: str = Field(default=OvertimeStatus.PENDING.value, index=True, max_length=20)
    approved_by: Optional[str] = Field(default=None, foreign_key="hrm_employees.id")
    approved_at: Optional[datetime] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None, max_length=500)

    # Link to attendance record after completion
    attendance_record_id: Optional[str] = Field(default=None, foreign_key="hrm_attendance_records.id", index=True)

    notes: Optional[str] = Field(default=None, max_length=500)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")
