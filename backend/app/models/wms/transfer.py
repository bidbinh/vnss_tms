"""
WMS - Transfer Models
Chuyển kho nội bộ
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class TransferType(str, Enum):
    """Loại chuyển kho"""
    INTER_WAREHOUSE = "INTER_WAREHOUSE"       # Giữa các kho
    INTRA_WAREHOUSE = "INTRA_WAREHOUSE"       # Trong cùng kho (đổi vị trí)
    REPLENISHMENT = "REPLENISHMENT"           # Bổ sung cho khu picking
    CONSOLIDATION = "CONSOLIDATION"           # Gom hàng


class TransferStatus(str, Enum):
    """Trạng thái chuyển kho"""
    DRAFT = "DRAFT"                 # Nháp
    CONFIRMED = "CONFIRMED"         # Đã xác nhận
    IN_TRANSIT = "IN_TRANSIT"       # Đang vận chuyển
    RECEIVED = "RECEIVED"           # Đã nhận
    COMPLETED = "COMPLETED"         # Hoàn thành
    CANCELLED = "CANCELLED"         # Đã hủy


class StockTransfer(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu chuyển kho
    Chuyển hàng hóa giữa các kho hoặc vị trí
    """
    __tablename__ = "wms_stock_transfers"

    transfer_number: str = Field(index=True, nullable=False)  # TR-2024-000001
    transfer_date: datetime = Field(nullable=False, index=True)
    transfer_type: str = Field(default=TransferType.INTER_WAREHOUSE.value, index=True)
    status: str = Field(default=TransferStatus.DRAFT.value, index=True)

    # Source
    source_warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    source_zone_id: Optional[str] = Field(default=None, foreign_key="wms_warehouse_zones.id")

    # Destination
    dest_warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    dest_zone_id: Optional[str] = Field(default=None, foreign_key="wms_warehouse_zones.id")

    # Reason
    reason: Optional[str] = Field(default=None)

    # Quantities (summary)
    total_lines: int = Field(default=0)
    total_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_received_qty: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Value
    total_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    currency: str = Field(default="VND")

    # Shipping (for inter-warehouse)
    carrier_name: Optional[str] = Field(default=None)
    vehicle_number: Optional[str] = Field(default=None)
    driver_name: Optional[str] = Field(default=None)

    # Scheduling
    expected_arrival_date: Optional[datetime] = Field(default=None)
    actual_arrival_date: Optional[datetime] = Field(default=None)

    # Processing
    shipped_at: Optional[datetime] = Field(default=None)
    shipped_by: Optional[str] = Field(default=None)
    received_at: Optional[datetime] = Field(default=None)
    received_by: Optional[str] = Field(default=None)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)


class StockTransferLine(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Chi tiết phiếu chuyển kho
    Từng dòng sản phẩm chuyển
    """
    __tablename__ = "wms_stock_transfer_lines"

    transfer_id: str = Field(foreign_key="wms_stock_transfers.id", nullable=False, index=True)
    line_number: int = Field(default=1)

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    product_code: str = Field(nullable=False)
    product_name: str = Field(nullable=False)
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")
    unit_name: Optional[str] = Field(default=None)

    # Quantity
    transfer_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    received_quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Lot/Serial
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")
    lot_number: Optional[str] = Field(default=None)
    serial_numbers: Optional[str] = Field(default=None)  # JSON array

    # Locations
    source_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")
    dest_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")

    # Value
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
