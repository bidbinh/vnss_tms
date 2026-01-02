"""
Equipment Maintenance Models
Bảo trì thiết bị sản xuất
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class MaintenanceType(str, Enum):
    """Loại bảo trì"""
    PREVENTIVE = "PREVENTIVE"        # Bảo trì phòng ngừa
    CORRECTIVE = "CORRECTIVE"        # Bảo trì sửa chữa
    PREDICTIVE = "PREDICTIVE"        # Bảo trì dự đoán
    BREAKDOWN = "BREAKDOWN"          # Sửa chữa khi hỏng
    CALIBRATION = "CALIBRATION"      # Hiệu chuẩn


class MaintenanceStatus(str, Enum):
    """Trạng thái bảo trì"""
    SCHEDULED = "SCHEDULED"          # Đã lên lịch
    IN_PROGRESS = "IN_PROGRESS"      # Đang thực hiện
    COMPLETED = "COMPLETED"          # Hoàn thành
    CANCELLED = "CANCELLED"          # Đã hủy
    OVERDUE = "OVERDUE"              # Quá hạn


class EquipmentMaintenance(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Bảo trì thiết bị sản xuất"""
    __tablename__ = "mes_equipment_maintenance"

    # Maintenance Info
    maintenance_number: str = Field(index=True)   # Số phiếu bảo trì
    description: Optional[str] = Field(default=None)

    # Type & Status
    maintenance_type: MaintenanceType = Field(default=MaintenanceType.PREVENTIVE)
    status: MaintenanceStatus = Field(default=MaintenanceStatus.SCHEDULED)
    priority: int = Field(default=5)

    # Equipment / Workstation
    workstation_id: str = Field(index=True)       # FK → mes_workstations.id
    workstation_code: Optional[str] = Field(default=None)
    workstation_name: Optional[str] = Field(default=None)
    equipment_name: Optional[str] = Field(default=None)
    serial_number: Optional[str] = Field(default=None)

    # Schedule
    scheduled_date: datetime
    scheduled_duration_hours: Decimal = Field(default=Decimal("1"))
    actual_start: Optional[datetime] = Field(default=None)
    actual_end: Optional[datetime] = Field(default=None)
    actual_duration_hours: Decimal = Field(default=Decimal("0"))

    # Downtime
    downtime_start: Optional[datetime] = Field(default=None)
    downtime_end: Optional[datetime] = Field(default=None)
    downtime_hours: Decimal = Field(default=Decimal("0"))

    # Technician
    technician_id: Optional[str] = Field(default=None)  # FK → hrm_employees.id
    technician_name: Optional[str] = Field(default=None)
    external_vendor: Optional[str] = Field(default=None)  # Nhà thầu bên ngoài

    # Problem & Solution
    problem_description: Optional[str] = Field(default=None)
    root_cause: Optional[str] = Field(default=None)
    actions_taken: Optional[str] = Field(default=None)
    solution: Optional[str] = Field(default=None)

    # Parts Used
    parts_used: Optional[str] = Field(default=None)  # JSON list of parts
    parts_cost: Decimal = Field(default=Decimal("0"))

    # Cost
    labor_cost: Decimal = Field(default=Decimal("0"))
    material_cost: Decimal = Field(default=Decimal("0"))
    external_cost: Decimal = Field(default=Decimal("0"))
    total_cost: Decimal = Field(default=Decimal("0"))

    # Next Maintenance
    next_maintenance_date: Optional[datetime] = Field(default=None)
    maintenance_interval_days: Optional[int] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
    completed_by: Optional[str] = Field(default=None)
