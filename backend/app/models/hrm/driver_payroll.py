"""
HRM - Driver Payroll Models
Monthly payroll records for drivers with workflow integration and distance locking
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, JSON, Column
from enum import Enum
from sqlalchemy import UniqueConstraint
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class DriverPayrollStatus(str, Enum):
    """Driver payroll status - Simplified workflow"""
    DRAFT = "DRAFT"                    # Nháp - Dispatcher đang tạo/chỉnh sửa
    PENDING_REVIEW = "PENDING_REVIEW"  # Đã gửi - Chờ Driver + HR review
    CONFIRMED = "CONFIRMED"            # Driver đã xác nhận (hoặc auto sau 3 ngày)
    PAID = "PAID"                      # Đã thanh toán
    DISPUTED = "DISPUTED"              # Tài xế khiếu nại


class DriverPayroll(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Monthly payroll record for driver with trip snapshot and workflow integration.
    Once status >= PENDING_DRIVER_CONFIRM, distance_km is locked and won't change even if rates are updated.
    """
    __tablename__ = "driver_payroll"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'driver_id', 'year', 'month', name='uq_driver_payroll_period'),
    )

    # Payroll Period
    driver_id: str = Field(foreign_key="drivers.id", index=True, nullable=False)
    year: int = Field(nullable=False, index=True)  # 2025
    month: int = Field(nullable=False, index=True)  # 1-12

    # Status & Workflow
    status: str = Field(default=DriverPayrollStatus.DRAFT.value, index=True, max_length=50)
    # Note: workflow_instance_id has no FK constraint to avoid permission issues
    workflow_instance_id: Optional[str] = Field(default=None, index=True)

    # Trip Snapshot (Locked distance_km)
    # JSON array of trips with locked distance_km values
    # Format: [{"order_id": "xxx", "order_code": "ADG-123", "distance_km": 100, "trip_salary": 500000, ...}, ...]
    trip_snapshot: dict = Field(default={}, sa_column=Column(JSON))

    # Adjustments (điều chỉnh lương - thiếu/sai tháng trước, thưởng, phạt...)
    # Format: [{"reason": "Thiếu chuyến T11", "amount": 500000}, {"reason": "Phạt vi phạm", "amount": -200000}]
    adjustments: dict = Field(default=[], sa_column=Column(JSON))

    # Totals
    total_trips: int = Field(default=0)
    total_distance_km: int = Field(default=0)
    total_trip_salary: int = Field(default=0)         # Lương từ các chuyến trong tháng
    total_adjustments: int = Field(default=0)         # Tổng điều chỉnh (+/-)
    total_bonuses: int = Field(default=0)             # Thưởng chuyến (45-50, 51-54, 55+)
    total_deductions: int = Field(default=0)          # Khấu trừ (bảo hiểm, tạm ứng...)
    net_salary: int = Field(default=0)                # Thực lĩnh = trip_salary + adjustments + bonuses - deductions

    # Workflow Timestamps
    created_by_id: str = Field(foreign_key="users.id", index=True, nullable=False)  # DISPATCHER
    submitted_at: Optional[datetime] = Field(default=None)              # Thời điểm gửi review
    confirmed_by_driver_at: Optional[datetime] = Field(default=None)    # Driver xác nhận
    confirmed_by_hr_at: Optional[datetime] = Field(default=None)        # HR duyệt
    paid_at: Optional[datetime] = Field(default=None)                   # Đã thanh toán

    # Notes
    notes: Optional[str] = Field(default=None, max_length=2000)         # Ghi chú của Dispatcher
    driver_notes: Optional[str] = Field(default=None, max_length=2000)  # Ghi chú/khiếu nại của Driver
    hr_notes: Optional[str] = Field(default=None, max_length=2000)      # Ghi chú của HR
