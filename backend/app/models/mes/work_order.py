"""
Work Order Models
Lệnh công việc - Chi tiết công đoạn sản xuất
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class WorkOrderStatus(str, Enum):
    """Trạng thái lệnh công việc"""
    PENDING = "PENDING"              # Chờ thực hiện
    READY = "READY"                  # Sẵn sàng
    IN_PROGRESS = "IN_PROGRESS"      # Đang thực hiện
    PAUSED = "PAUSED"                # Tạm dừng
    COMPLETED = "COMPLETED"          # Hoàn thành
    CANCELLED = "CANCELLED"          # Đã hủy


class WorkOrderType(str, Enum):
    """Loại lệnh công việc"""
    PRODUCTION = "PRODUCTION"        # Sản xuất
    QUALITY = "QUALITY"              # Kiểm tra chất lượng
    SETUP = "SETUP"                  # Chuẩn bị
    MAINTENANCE = "MAINTENANCE"      # Bảo trì
    REWORK = "REWORK"                # Làm lại


class WorkOrder(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Lệnh công việc - Chi tiết từng công đoạn"""
    __tablename__ = "mes_work_orders"

    # Work Order Info
    work_order_number: str = Field(index=True)    # Số lệnh công việc
    description: Optional[str] = Field(default=None)

    # Type & Status
    work_order_type: WorkOrderType = Field(default=WorkOrderType.PRODUCTION)
    status: WorkOrderStatus = Field(default=WorkOrderStatus.PENDING)
    priority: int = Field(default=5)

    # Parent Production Order
    production_order_id: str = Field(index=True)  # FK → mes_production_orders.id
    production_order_number: Optional[str] = Field(default=None)

    # Routing Step
    routing_step_id: Optional[str] = Field(default=None)  # FK → mes_routing_steps.id
    step_number: int = Field(default=10)
    operation_code: Optional[str] = Field(default=None)
    operation_name: Optional[str] = Field(default=None)

    # Workstation
    workstation_id: Optional[str] = Field(default=None)  # FK → mes_workstations.id
    workstation_code: Optional[str] = Field(default=None)
    workstation_name: Optional[str] = Field(default=None)

    # Product (inherited from Production Order)
    product_id: Optional[str] = Field(default=None)
    product_code: Optional[str] = Field(default=None)
    product_name: Optional[str] = Field(default=None)

    # Quantity
    planned_quantity: Decimal = Field(default=Decimal("1"))
    completed_quantity: Decimal = Field(default=Decimal("0"))
    scrapped_quantity: Decimal = Field(default=Decimal("0"))
    unit_name: Optional[str] = Field(default=None)

    # Time Planned (minutes)
    planned_setup_time: Decimal = Field(default=Decimal("0"))
    planned_run_time: Decimal = Field(default=Decimal("0"))
    planned_total_time: Decimal = Field(default=Decimal("0"))

    # Time Actual (minutes)
    actual_setup_time: Decimal = Field(default=Decimal("0"))
    actual_run_time: Decimal = Field(default=Decimal("0"))
    actual_total_time: Decimal = Field(default=Decimal("0"))

    # Schedule
    scheduled_start: Optional[datetime] = Field(default=None)
    scheduled_end: Optional[datetime] = Field(default=None)
    actual_start: Optional[datetime] = Field(default=None)
    actual_end: Optional[datetime] = Field(default=None)

    # Operator
    operator_id: Optional[str] = Field(default=None)  # FK → hrm_employees.id
    operator_name: Optional[str] = Field(default=None)

    # Cost
    labor_cost: Decimal = Field(default=Decimal("0"))
    machine_cost: Decimal = Field(default=Decimal("0"))
    overhead_cost: Decimal = Field(default=Decimal("0"))
    total_cost: Decimal = Field(default=Decimal("0"))

    # Sequence Control
    predecessor_work_order_id: Optional[str] = Field(default=None)
    can_start: bool = Field(default=False)        # Có thể bắt đầu

    # Quality
    requires_qc: bool = Field(default=False)
    qc_passed: Optional[bool] = Field(default=None)

    # Notes
    instructions: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    started_by: Optional[str] = Field(default=None)
    completed_by: Optional[str] = Field(default=None)
