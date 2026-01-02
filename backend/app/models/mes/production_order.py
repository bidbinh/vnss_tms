"""
Production Order Models
Lệnh sản xuất
"""

from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ProductionOrderStatus(str, Enum):
    """Trạng thái lệnh sản xuất"""
    DRAFT = "DRAFT"                  # Bản nháp
    PLANNED = "PLANNED"              # Đã lên kế hoạch
    CONFIRMED = "CONFIRMED"          # Đã xác nhận
    RELEASED = "RELEASED"            # Đã phát hành (bắt đầu SX)
    IN_PROGRESS = "IN_PROGRESS"      # Đang sản xuất
    ON_HOLD = "ON_HOLD"              # Tạm dừng
    COMPLETED = "COMPLETED"          # Hoàn thành
    CLOSED = "CLOSED"                # Đã đóng
    CANCELLED = "CANCELLED"          # Đã hủy


class ProductionOrderType(str, Enum):
    """Loại lệnh sản xuất"""
    STANDARD = "STANDARD"            # Sản xuất tiêu chuẩn
    REWORK = "REWORK"                # Sản xuất lại
    SAMPLE = "SAMPLE"                # Sản xuất mẫu
    MAINTENANCE = "MAINTENANCE"      # Bảo trì


class ProductionOrder(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Lệnh sản xuất"""
    __tablename__ = "mes_production_orders"

    # Order Info
    order_number: str = Field(index=True)         # Số lệnh sản xuất
    order_date: date = Field(default_factory=date.today)
    description: Optional[str] = Field(default=None)

    # Type & Status
    order_type: ProductionOrderType = Field(default=ProductionOrderType.STANDARD)
    status: ProductionOrderStatus = Field(default=ProductionOrderStatus.DRAFT)
    priority: int = Field(default=5)              # 1-10 (10 = cao nhất)

    # Product (Thành phẩm)
    product_id: str = Field(index=True)           # FK → wms_products.id
    product_code: Optional[str] = Field(default=None)
    product_name: Optional[str] = Field(default=None)

    # BOM & Routing
    bom_id: Optional[str] = Field(default=None)   # FK → mes_bill_of_materials.id
    routing_id: Optional[str] = Field(default=None)  # FK → mes_routings.id

    # Quantity
    planned_quantity: Decimal = Field(default=Decimal("1"))  # Số lượng kế hoạch
    unit_id: Optional[str] = Field(default=None)
    unit_name: Optional[str] = Field(default=None)

    # Actual Quantity
    started_quantity: Decimal = Field(default=Decimal("0"))   # Đã bắt đầu
    completed_quantity: Decimal = Field(default=Decimal("0")) # Đã hoàn thành
    scrapped_quantity: Decimal = Field(default=Decimal("0"))  # Phế phẩm

    # Schedule
    planned_start_date: Optional[datetime] = Field(default=None)
    planned_end_date: Optional[datetime] = Field(default=None)
    actual_start_date: Optional[datetime] = Field(default=None)
    actual_end_date: Optional[datetime] = Field(default=None)

    # Source Document
    source_type: Optional[str] = Field(default=None)  # SALES_ORDER, FORECAST, MANUAL
    source_id: Optional[str] = Field(default=None)
    source_number: Optional[str] = Field(default=None)

    # Customer (nếu sản xuất theo đơn)
    customer_id: Optional[str] = Field(default=None)
    customer_name: Optional[str] = Field(default=None)

    # Warehouse
    warehouse_id: Optional[str] = Field(default=None)  # Kho xuất NVL
    output_warehouse_id: Optional[str] = Field(default=None)  # Kho nhập thành phẩm
    output_location_id: Optional[str] = Field(default=None)

    # Cost
    planned_cost: Decimal = Field(default=Decimal("0"))
    actual_cost: Decimal = Field(default=Decimal("0"))

    # Responsible
    responsible_id: Optional[str] = Field(default=None)  # Người phụ trách
    responsible_name: Optional[str] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
    released_by: Optional[str] = Field(default=None)
    released_at: Optional[datetime] = Field(default=None)
    completed_by: Optional[str] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)


class ProductionOrderLine(BaseUUIDModel, TimestampMixin, TenantScoped, table=True):
    """Chi tiết nguyên vật liệu cho lệnh sản xuất"""
    __tablename__ = "mes_production_order_lines"

    # Parent Order
    production_order_id: str = Field(index=True)  # FK → mes_production_orders.id

    # Line Number
    line_number: int = Field(default=1)

    # Component (Material)
    component_id: str = Field(index=True)         # FK → wms_products.id
    component_code: Optional[str] = Field(default=None)
    component_name: Optional[str] = Field(default=None)

    # Quantity
    required_quantity: Decimal = Field(default=Decimal("1"))  # Cần
    issued_quantity: Decimal = Field(default=Decimal("0"))    # Đã xuất
    returned_quantity: Decimal = Field(default=Decimal("0"))  # Trả lại
    consumed_quantity: Decimal = Field(default=Decimal("0"))  # Đã tiêu thụ

    unit_id: Optional[str] = Field(default=None)
    unit_name: Optional[str] = Field(default=None)

    # From BOM Line
    bom_line_id: Optional[str] = Field(default=None)

    # Warehouse Location
    warehouse_id: Optional[str] = Field(default=None)
    location_id: Optional[str] = Field(default=None)
    lot_id: Optional[str] = Field(default=None)
    lot_number: Optional[str] = Field(default=None)

    # Cost
    unit_cost: Decimal = Field(default=Decimal("0"))
    total_cost: Decimal = Field(default=Decimal("0"))

    # Status
    is_issued: bool = Field(default=False)        # Đã xuất kho
    issued_at: Optional[datetime] = Field(default=None)

    # Notes
    notes: Optional[str] = Field(default=None)
