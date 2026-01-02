"""
WMS - Inbound Models
Quy trình nhập kho
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ReceiptType(str, Enum):
    """Loại phiếu nhập"""
    PURCHASE = "PURCHASE"           # Nhập mua hàng
    RETURN = "RETURN"               # Nhập hàng trả về
    TRANSFER = "TRANSFER"           # Nhập chuyển kho
    PRODUCTION = "PRODUCTION"       # Nhập từ sản xuất
    ADJUSTMENT = "ADJUSTMENT"       # Nhập điều chỉnh
    CONSIGNMENT = "CONSIGNMENT"     # Nhập ký gửi
    OTHER = "OTHER"                 # Khác


class ReceiptStatus(str, Enum):
    """Trạng thái phiếu nhập"""
    DRAFT = "DRAFT"                 # Nháp
    SCHEDULED = "SCHEDULED"         # Đã lên lịch
    ARRIVED = "ARRIVED"             # Đã đến
    IN_PROGRESS = "IN_PROGRESS"     # Đang nhập
    COMPLETED = "COMPLETED"         # Hoàn thành
    CANCELLED = "CANCELLED"         # Đã hủy


class TaskStatus(str, Enum):
    """Trạng thái công việc"""
    PENDING = "PENDING"             # Chờ thực hiện
    IN_PROGRESS = "IN_PROGRESS"     # Đang thực hiện
    COMPLETED = "COMPLETED"         # Hoàn thành
    CANCELLED = "CANCELLED"         # Đã hủy


class GoodsReceipt(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu nhập kho
    Ghi nhận hàng hóa nhập vào kho
    """
    __tablename__ = "wms_goods_receipts"

    receipt_number: str = Field(index=True, nullable=False)  # GR-2024-000001
    receipt_date: datetime = Field(nullable=False, index=True)
    receipt_type: str = Field(default=ReceiptType.PURCHASE.value, index=True)
    status: str = Field(default=ReceiptStatus.DRAFT.value, index=True)

    # Warehouse
    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    receiving_zone_id: Optional[str] = Field(default=None, foreign_key="wms_warehouse_zones.id")

    # Source document
    source_document_type: Optional[str] = Field(default=None)  # PURCHASE_ORDER, RETURN_ORDER
    source_document_id: Optional[str] = Field(default=None)
    source_document_number: Optional[str] = Field(default=None)

    # Supplier
    supplier_id: Optional[str] = Field(default=None, index=True)
    supplier_name: Optional[str] = Field(default=None)
    supplier_delivery_note: Optional[str] = Field(default=None)

    # Carrier
    carrier_name: Optional[str] = Field(default=None)
    vehicle_number: Optional[str] = Field(default=None)
    driver_name: Optional[str] = Field(default=None)

    # Scheduling
    expected_arrival_date: Optional[datetime] = Field(default=None)
    actual_arrival_date: Optional[datetime] = Field(default=None)

    # Quantities (summary)
    total_lines: int = Field(default=0)
    total_expected_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_received_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_rejected_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Value
    total_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    currency: str = Field(default="VND")

    # Processing
    receiver_id: Optional[str] = Field(default=None)  # Employee who received
    received_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class GoodsReceiptLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết phiếu nhập
    Từng dòng sản phẩm nhập kho
    """
    __tablename__ = "wms_goods_receipt_lines"

    receipt_id: str = Field(foreign_key="wms_goods_receipts.id", nullable=False, index=True)
    line_number: int = Field(default=1)

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    product_code: str = Field(nullable=False)
    product_name: str = Field(nullable=False)
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")
    unit_name: Optional[str] = Field(default=None)

    # Quantity
    expected_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    received_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    rejected_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Lot/Serial
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")
    lot_number: Optional[str] = Field(default=None)
    serial_numbers: Optional[str] = Field(default=None)  # JSON array
    production_date: Optional[datetime] = Field(default=None)
    expiry_date: Optional[datetime] = Field(default=None)

    # Location
    dest_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")

    # Value
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Quality
    quality_status: Optional[str] = Field(default=None)  # PASSED, FAILED, PENDING
    rejection_reason: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class PutawayTask(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Công việc cất hàng
    Nhiệm vụ đưa hàng từ khu nhận vào vị trí lưu trữ
    """
    __tablename__ = "wms_putaway_tasks"

    task_number: str = Field(index=True, nullable=False)     # PUT-2024-000001
    status: str = Field(default=TaskStatus.PENDING.value, index=True)

    # Source
    receipt_id: str = Field(foreign_key="wms_goods_receipts.id", nullable=False, index=True)
    receipt_line_id: Optional[str] = Field(default=None, foreign_key="wms_goods_receipt_lines.id")

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")

    # Locations
    source_location_id: str = Field(foreign_key="wms_storage_locations.id", nullable=False)
    dest_location_id: str = Field(foreign_key="wms_storage_locations.id", nullable=False)

    # Quantity
    quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_done: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Assignment
    assigned_to: Optional[str] = Field(default=None, index=True)  # Employee ID
    assigned_at: Optional[datetime] = Field(default=None)

    # Priority
    priority: int = Field(default=0)  # Higher = more urgent

    # Processing
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
