"""
WMS - Outbound Models
Quy trình xuất kho
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class DeliveryType(str, Enum):
    """Loại phiếu xuất"""
    SALES = "SALES"                 # Xuất bán hàng
    TRANSFER = "TRANSFER"           # Xuất chuyển kho
    RETURN = "RETURN"               # Xuất trả hàng NCC
    PRODUCTION = "PRODUCTION"       # Xuất sản xuất
    SCRAP = "SCRAP"                 # Xuất hủy
    SAMPLE = "SAMPLE"               # Xuất mẫu
    OTHER = "OTHER"                 # Khác


class DeliveryStatus(str, Enum):
    """Trạng thái phiếu xuất"""
    DRAFT = "DRAFT"                 # Nháp
    CONFIRMED = "CONFIRMED"         # Đã xác nhận
    PICKING = "PICKING"             # Đang lấy hàng
    PACKING = "PACKING"             # Đang đóng gói
    READY = "READY"                 # Sẵn sàng giao
    IN_TRANSIT = "IN_TRANSIT"       # Đang vận chuyển
    DELIVERED = "DELIVERED"         # Đã giao
    CANCELLED = "CANCELLED"         # Đã hủy


class DeliveryOrder(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu xuất kho / Delivery Order
    Ghi nhận hàng hóa xuất khỏi kho
    """
    __tablename__ = "wms_delivery_orders"

    delivery_number: str = Field(index=True, nullable=False)  # DO-2024-000001
    delivery_date: datetime = Field(nullable=False, index=True)
    delivery_type: str = Field(default=DeliveryType.SALES.value, index=True)
    status: str = Field(default=DeliveryStatus.DRAFT.value, index=True)

    # Warehouse
    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    shipping_zone_id: Optional[str] = Field(default=None, foreign_key="wms_warehouse_zones.id")

    # Source document
    source_document_type: Optional[str] = Field(default=None)  # SALES_ORDER, TRANSFER_ORDER
    source_document_id: Optional[str] = Field(default=None)
    source_document_number: Optional[str] = Field(default=None)

    # Customer
    customer_id: Optional[str] = Field(default=None, index=True)
    customer_name: Optional[str] = Field(default=None)

    # Shipping address
    ship_to_name: Optional[str] = Field(default=None)
    ship_to_address: Optional[str] = Field(default=None)
    ship_to_city: Optional[str] = Field(default=None)
    ship_to_phone: Optional[str] = Field(default=None)

    # Carrier
    carrier_id: Optional[str] = Field(default=None)
    carrier_name: Optional[str] = Field(default=None)
    shipping_method: Optional[str] = Field(default=None)
    tracking_number: Optional[str] = Field(default=None)

    # Scheduling
    expected_delivery_date: Optional[datetime] = Field(default=None)
    actual_delivery_date: Optional[datetime] = Field(default=None)

    # Quantities (summary)
    total_lines: int = Field(default=0)
    total_ordered_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_picked_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_shipped_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Weight & Volume
    total_weight_kg: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    total_volume_cbm: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=6)

    # Value
    total_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    currency: str = Field(default="VND")

    # Processing
    picker_id: Optional[str] = Field(default=None)  # Employee who picked
    packer_id: Optional[str] = Field(default=None)  # Employee who packed
    shipped_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)

    # Proof of delivery
    pod_signature: Optional[str] = Field(default=None)  # URL to signature image
    pod_photo: Optional[str] = Field(default=None)      # URL to delivery photo

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class DeliveryOrderLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết phiếu xuất
    Từng dòng sản phẩm xuất kho
    """
    __tablename__ = "wms_delivery_order_lines"

    delivery_id: str = Field(foreign_key="wms_delivery_orders.id", nullable=False, index=True)
    line_number: int = Field(default=1)

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    product_code: str = Field(nullable=False)
    product_name: str = Field(nullable=False)
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")
    unit_name: Optional[str] = Field(default=None)

    # Quantity
    ordered_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    picked_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    packed_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    shipped_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Lot/Serial
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")
    lot_number: Optional[str] = Field(default=None)
    serial_numbers: Optional[str] = Field(default=None)  # JSON array

    # Location
    source_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")

    # Value
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_price: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Weight & Volume
    weight_kg: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)
    volume_cbm: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=6)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class PickingTask(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Công việc lấy hàng
    Nhiệm vụ lấy hàng từ vị trí lưu trữ
    """
    __tablename__ = "wms_picking_tasks"

    task_number: str = Field(index=True, nullable=False)     # PICK-2024-000001
    status: str = Field(default="PENDING", index=True)

    # Source
    delivery_id: str = Field(foreign_key="wms_delivery_orders.id", nullable=False, index=True)
    delivery_line_id: Optional[str] = Field(default=None, foreign_key="wms_delivery_order_lines.id")

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")

    # Location
    source_location_id: str = Field(foreign_key="wms_storage_locations.id", nullable=False)
    dest_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")  # Staging area

    # Quantity
    quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_done: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Assignment
    assigned_to: Optional[str] = Field(default=None, index=True)  # Employee ID
    assigned_at: Optional[datetime] = Field(default=None)

    # Priority
    priority: int = Field(default=0)

    # Wave picking
    wave_id: Optional[str] = Field(default=None, index=True)

    # Processing
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class PackingTask(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Công việc đóng gói
    Nhiệm vụ đóng gói hàng hóa trước khi giao
    """
    __tablename__ = "wms_packing_tasks"

    task_number: str = Field(index=True, nullable=False)     # PACK-2024-000001
    status: str = Field(default="PENDING", index=True)

    # Source
    delivery_id: str = Field(foreign_key="wms_delivery_orders.id", nullable=False, index=True)

    # Package info
    package_number: Optional[str] = Field(default=None, index=True)  # Carton/box number
    package_type: Optional[str] = Field(default=None)  # BOX, PALLET, ENVELOPE

    # Dimensions
    length_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    width_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    height_cm: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    weight_kg: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=4)

    # Contents
    items: Optional[str] = Field(default=None)  # JSON: [{product_id, qty, ...}, ...]

    # Assignment
    assigned_to: Optional[str] = Field(default=None, index=True)
    assigned_at: Optional[datetime] = Field(default=None)

    # Processing
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
