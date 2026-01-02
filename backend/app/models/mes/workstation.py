"""
Workstation/Work Center Models
Trạm/Trung tâm làm việc
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class WorkstationType(str, Enum):
    """Loại trạm làm việc"""
    MACHINE = "MACHINE"          # Máy móc
    ASSEMBLY = "ASSEMBLY"        # Lắp ráp
    MANUAL = "MANUAL"            # Thủ công
    PACKING = "PACKING"          # Đóng gói
    QUALITY = "QUALITY"          # Kiểm tra chất lượng
    STORAGE = "STORAGE"          # Lưu trữ
    OTHER = "OTHER"


class WorkstationStatus(str, Enum):
    """Trạng thái trạm làm việc"""
    ACTIVE = "ACTIVE"            # Đang hoạt động
    INACTIVE = "INACTIVE"        # Không hoạt động
    MAINTENANCE = "MAINTENANCE"  # Đang bảo trì
    BROKEN = "BROKEN"            # Hỏng


class Workstation(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Trạm làm việc / Work Center"""
    __tablename__ = "mes_workstations"

    # Basic Info
    code: str = Field(index=True)                 # Mã trạm
    name: str = Field(index=True)                 # Tên trạm
    description: Optional[str] = Field(default=None)

    # Type & Status
    workstation_type: WorkstationType = Field(default=WorkstationType.MACHINE)
    status: WorkstationStatus = Field(default=WorkstationStatus.ACTIVE)

    # Location
    warehouse_id: Optional[str] = Field(default=None)  # FK → wms_warehouses.id
    location_code: Optional[str] = Field(default=None)
    zone_id: Optional[str] = Field(default=None)

    # Capacity
    capacity_per_hour: Decimal = Field(default=Decimal("1"))  # Năng suất/giờ
    max_capacity: Decimal = Field(default=Decimal("100"))     # Công suất tối đa
    efficiency_rate: Decimal = Field(default=Decimal("100"))  # Hiệu suất (%)

    # Time Settings
    setup_time_minutes: int = Field(default=0)    # Thời gian chuẩn bị (phút)
    cleanup_time_minutes: int = Field(default=0)  # Thời gian dọn dẹp (phút)

    # Working Hours
    working_hours_per_day: Decimal = Field(default=Decimal("8"))  # Giờ làm việc/ngày
    days_per_week: int = Field(default=6)         # Ngày làm việc/tuần

    # Costs
    hourly_cost: Decimal = Field(default=Decimal("0"))        # Chi phí/giờ
    overhead_cost: Decimal = Field(default=Decimal("0"))      # Chi phí gián tiếp

    # Equipment Info
    equipment_id: Optional[str] = Field(default=None)
    equipment_name: Optional[str] = Field(default=None)
    brand: Optional[str] = Field(default=None)
    model: Optional[str] = Field(default=None)
    serial_number: Optional[str] = Field(default=None)
    purchase_date: Optional[datetime] = Field(default=None)

    # Operator
    operator_id: Optional[str] = Field(default=None)          # FK → hrm_employees.id
    operator_name: Optional[str] = Field(default=None)
    required_skill_level: Optional[str] = Field(default=None)

    # Maintenance
    last_maintenance_date: Optional[datetime] = Field(default=None)
    next_maintenance_date: Optional[datetime] = Field(default=None)
    maintenance_interval_days: int = Field(default=30)

    # Notes
    notes: Optional[str] = Field(default=None)
