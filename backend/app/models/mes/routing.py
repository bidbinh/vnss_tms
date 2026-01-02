"""
Routing Models
Quy trình sản xuất - Công đoạn
"""

from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class RoutingStatus(str, Enum):
    """Trạng thái quy trình"""
    DRAFT = "DRAFT"              # Bản nháp
    ACTIVE = "ACTIVE"            # Đang sử dụng
    INACTIVE = "INACTIVE"        # Ngừng sử dụng


class Routing(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Quy trình sản xuất"""
    __tablename__ = "mes_routings"

    # Basic Info
    code: str = Field(index=True)                 # Mã quy trình
    name: str = Field(index=True)                 # Tên quy trình
    description: Optional[str] = Field(default=None)
    version: str = Field(default="1.0")

    # Product
    product_id: Optional[str] = Field(default=None, index=True)  # FK → wms_products.id
    product_code: Optional[str] = Field(default=None)
    product_name: Optional[str] = Field(default=None)

    # Status
    status: RoutingStatus = Field(default=RoutingStatus.DRAFT)

    # Validity
    valid_from: Optional[date] = Field(default=None)
    valid_to: Optional[date] = Field(default=None)

    # Time & Cost Summary
    total_time_minutes: Decimal = Field(default=Decimal("0"))   # Tổng thời gian
    total_setup_time: Decimal = Field(default=Decimal("0"))     # Tổng thời gian chuẩn bị
    total_cost: Decimal = Field(default=Decimal("0"))           # Tổng chi phí

    # Notes
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
    approved_by: Optional[str] = Field(default=None)
    approved_at: Optional[datetime] = Field(default=None)


class RoutingStep(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Công đoạn sản xuất - Bước trong quy trình"""
    __tablename__ = "mes_routing_steps"

    # Parent Routing
    routing_id: str = Field(index=True)           # FK → mes_routings.id

    # Step Info
    step_number: int = Field(default=10)          # Số thứ tự (10, 20, 30...)
    operation_code: str = Field(index=True)       # Mã công đoạn
    operation_name: str                           # Tên công đoạn
    description: Optional[str] = Field(default=None)

    # Workstation
    workstation_id: Optional[str] = Field(default=None)  # FK → mes_workstations.id
    workstation_code: Optional[str] = Field(default=None)
    workstation_name: Optional[str] = Field(default=None)

    # Time (in minutes)
    setup_time: Decimal = Field(default=Decimal("0"))     # Thời gian chuẩn bị
    run_time: Decimal = Field(default=Decimal("0"))       # Thời gian chạy / đơn vị
    wait_time: Decimal = Field(default=Decimal("0"))      # Thời gian chờ
    move_time: Decimal = Field(default=Decimal("0"))      # Thời gian di chuyển
    queue_time: Decimal = Field(default=Decimal("0"))     # Thời gian xếp hàng

    # Quantity
    base_quantity: Decimal = Field(default=Decimal("1"))  # Số lượng cơ sở
    scrap_rate: Decimal = Field(default=Decimal("0"))     # Tỷ lệ hao hụt (%)

    # Cost
    labor_cost: Decimal = Field(default=Decimal("0"))     # Chi phí nhân công
    machine_cost: Decimal = Field(default=Decimal("0"))   # Chi phí máy
    overhead_cost: Decimal = Field(default=Decimal("0"))  # Chi phí gián tiếp

    # Control
    is_outsourced: bool = Field(default=False)    # Gia công ngoài
    supplier_id: Optional[str] = Field(default=None)  # NCC gia công
    is_quality_check: bool = Field(default=False)  # Có kiểm tra CL không

    # Predecessor/Successor
    predecessor_step_id: Optional[str] = Field(default=None)  # Công đoạn trước
    is_parallel: bool = Field(default=False)      # Có thể chạy song song

    # Notes
    instructions: Optional[str] = Field(default=None)  # Hướng dẫn thực hiện
    notes: Optional[str] = Field(default=None)
