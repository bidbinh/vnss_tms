"""
WMS - Stock Models
Quản lý tồn kho và di chuyển hàng
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from decimal import Decimal
from datetime import datetime
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class MoveType(str, Enum):
    """Loại di chuyển hàng"""
    IN = "IN"                       # Nhập kho
    OUT = "OUT"                     # Xuất kho
    INTERNAL = "INTERNAL"           # Chuyển nội bộ
    ADJUSTMENT = "ADJUSTMENT"       # Điều chỉnh
    RETURN = "RETURN"               # Trả hàng
    SCRAP = "SCRAP"                 # Hủy hàng


class MoveStatus(str, Enum):
    """Trạng thái di chuyển"""
    DRAFT = "DRAFT"                 # Nháp
    CONFIRMED = "CONFIRMED"         # Đã xác nhận
    IN_PROGRESS = "IN_PROGRESS"     # Đang thực hiện
    DONE = "DONE"                   # Hoàn thành
    CANCELLED = "CANCELLED"         # Đã hủy


class ReservationStatus(str, Enum):
    """Trạng thái đặt trước"""
    ACTIVE = "ACTIVE"               # Đang có hiệu lực
    FULFILLED = "FULFILLED"         # Đã thực hiện
    CANCELLED = "CANCELLED"         # Đã hủy
    EXPIRED = "EXPIRED"             # Hết hạn


class StockLevel(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Mức tồn kho
    Số lượng tồn kho theo sản phẩm, kho, vị trí, lô
    """
    __tablename__ = "wms_stock_levels"

    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id", index=True)
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id", index=True)

    # Quantities
    quantity_on_hand: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_reserved: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_available: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)  # on_hand - reserved
    quantity_incoming: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_outgoing: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Value
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_value: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Last activity
    last_count_date: Optional[datetime] = Field(default=None)
    last_move_date: Optional[datetime] = Field(default=None)

    created_by: Optional[str] = Field(default=None)


class StockMove(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Phiếu di chuyển hàng
    Ghi nhận mọi di chuyển hàng hóa trong kho
    """
    __tablename__ = "wms_stock_moves"

    move_number: str = Field(index=True, nullable=False)     # SM-2024-000001
    move_date: datetime = Field(nullable=False, index=True)
    move_type: str = Field(default=MoveType.IN.value, index=True)
    status: str = Field(default=MoveStatus.DRAFT.value, index=True)

    # Product
    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")
    unit_id: Optional[str] = Field(default=None, foreign_key="wms_product_units.id")

    # Locations
    source_warehouse_id: Optional[str] = Field(default=None, foreign_key="wms_warehouses.id")
    source_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")
    dest_warehouse_id: Optional[str] = Field(default=None, foreign_key="wms_warehouses.id")
    dest_location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")

    # Quantity
    quantity: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_done: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Cost
    unit_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    total_cost: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Reference
    source_document: Optional[str] = Field(default=None)     # GR-xxx, DO-xxx, ...
    source_document_type: Optional[str] = Field(default=None)  # GOODS_RECEIPT, DELIVERY_ORDER, ...
    source_document_id: Optional[str] = Field(default=None)

    # Description
    reason: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    # Processing
    confirmed_at: Optional[datetime] = Field(default=None)
    confirmed_by: Optional[str] = Field(default=None)
    done_at: Optional[datetime] = Field(default=None)
    done_by: Optional[str] = Field(default=None)

    created_by: Optional[str] = Field(default=None)


class StockReservation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Đặt trước hàng
    Giữ hàng cho đơn hàng/chuyến hàng
    """
    __tablename__ = "wms_stock_reservations"

    reservation_number: str = Field(index=True, nullable=False)  # RES-2024-000001

    product_id: str = Field(foreign_key="wms_products.id", nullable=False, index=True)
    warehouse_id: str = Field(foreign_key="wms_warehouses.id", nullable=False, index=True)
    location_id: Optional[str] = Field(default=None, foreign_key="wms_storage_locations.id")
    lot_id: Optional[str] = Field(default=None, foreign_key="wms_product_lots.id")

    # Quantity
    quantity_reserved: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)
    quantity_fulfilled: Decimal = Field(default=Decimal("0"), max_digits=18, decimal_places=4)

    # Reference
    source_document_type: str = Field(nullable=False)        # SALES_ORDER, DELIVERY_ORDER
    source_document_id: str = Field(nullable=False)
    source_document_number: Optional[str] = Field(default=None)

    # Dates
    reservation_date: datetime = Field(nullable=False)
    expiry_date: Optional[datetime] = Field(default=None)
    fulfillment_date: Optional[datetime] = Field(default=None)

    # Status
    status: str = Field(default=ReservationStatus.ACTIVE.value, index=True)

    notes: Optional[str] = Field(default=None)
    created_by: Optional[str] = Field(default=None)
