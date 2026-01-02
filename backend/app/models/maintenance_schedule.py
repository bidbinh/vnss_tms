from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class MaintenanceSchedule(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Lịch bảo trì định kỳ cho xe
    Tự động nhắc nhở khi đến hạn dựa trên km hoặc thời gian
    """
    __tablename__ = "maintenance_schedules"

    vehicle_id: str = Field(foreign_key="vehicles.id", index=True, nullable=False)

    # Loại bảo trì
    maintenance_type: str = Field(index=True, nullable=False)
    # OIL_CHANGE (đổi dầu), PERIODIC (bảo dưỡng định kỳ),
    # TIRE_REPLACEMENT (thay lốp), BRAKE_SERVICE (bảo dưỡng phanh),
    # BATTERY_CHECK (kiểm tra ắc quy), ENGINE_TUNE (điều chỉnh động cơ),
    # TRANSMISSION_SERVICE (bảo dưỡng hộp số), COOLANT_CHANGE (thay nước làm mát),
    # AIR_FILTER (thay lọc gió), OTHER (khác)

    # Chu kỳ bảo trì
    interval_type: str = Field(nullable=False)  # MILEAGE, TIME, BOTH
    interval_km: Optional[int] = Field(default=None)  # VD: 5000 km
    interval_days: Optional[int] = Field(default=None)  # VD: 90 ngày (3 tháng)

    # Lần bảo trì gần nhất
    last_service_date: Optional[date] = Field(default=None)
    last_service_mileage: Optional[int] = Field(default=None)

    # Lần bảo trì tiếp theo (tự động tính)
    next_due_date: Optional[date] = Field(default=None)
    next_due_mileage: Optional[int] = Field(default=None)

    # Cảnh báo trước (days/km)
    alert_before_days: Optional[int] = Field(default=7)  # Cảnh báo trước 7 ngày
    alert_before_km: Optional[int] = Field(default=500)  # Cảnh báo trước 500km

    description: Optional[str] = Field(default=None)
    status: str = Field(default="ACTIVE")  # ACTIVE, INACTIVE
