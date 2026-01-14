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
    """Driver payroll status"""
    DRAFT = "DRAFT"                                    # Nháp - Dispatcher tạo
    PENDING_HR_REVIEW = "PENDING_HR_REVIEW"           # Chờ HR duyệt
    PENDING_DRIVER_CONFIRM = "PENDING_DRIVER_CONFIRM" # Chờ tài xế xác nhận
    CONFIRMED = "CONFIRMED"                            # Đã xác nhận - distance_km locked
    PAID = "PAID"                                      # Đã chi trả
    REJECTED = "REJECTED"                              # Bị từ chối


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
    workflow_instance_id: Optional[str] = Field(
        default=None,
        foreign_key="wf_instances.id",
        index=True
    )

    # Trip Snapshot (Locked distance_km)
    # JSON array of trips with locked distance_km values
    # Format: [{"order_id": "xxx", "order_code": "ADG-123", "distance_km": 100, "calculated_salary": 500000, ...}, ...]
    trip_snapshot: dict = Field(default={}, sa_column=Column(JSON))

    # Totals
    total_trips: int = Field(default=0)
    total_distance_km: int = Field(default=0)
    total_salary: int = Field(default=0)              # Gross salary from trips
    total_bonuses: int = Field(default=0)             # Monthly trip bonuses (45-50, 51-54, 55+ trips)
    total_deductions: int = Field(default=0)          # Insurance, tax, advances
    net_salary: int = Field(default=0)                # Total after deductions

    # Workflow Timestamps
    created_by_id: str = Field(foreign_key="users.id", index=True, nullable=False)  # DISPATCHER
    confirmed_by_driver_at: Optional[datetime] = Field(default=None)
    confirmed_by_hr_at: Optional[datetime] = Field(default=None)
    paid_at: Optional[datetime] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None, max_length=2000)
    driver_notes: Optional[str] = Field(default=None, max_length=2000)  # Driver's comments when rejecting
    hr_notes: Optional[str] = Field(default=None, max_length=2000)      # HR's comments
