"""
WMS (Warehouse Management System) Module Models
Hệ thống quản lý kho: Sản phẩm, Kho, Nhập/Xuất kho, Kiểm kê
"""

from app.models.wms.warehouse import (
    Warehouse,
    WarehouseType,
    WarehouseZone,
    ZoneType,
    StorageLocation,
    LocationType,
)

from app.models.wms.product import (
    ProductCategory,
    Product,
    ProductUnit,
    ProductBarcode,
    ProductLot,
    LotStatus,
)

from app.models.wms.stock import (
    StockLevel,
    StockMove,
    MoveType,
    MoveStatus,
    StockReservation,
    ReservationStatus,
)

from app.models.wms.inbound import (
    GoodsReceipt,
    GoodsReceiptLine,
    ReceiptType,
    ReceiptStatus,
    PutawayTask,
    TaskStatus,
)

from app.models.wms.outbound import (
    DeliveryOrder,
    DeliveryOrderLine,
    DeliveryType,
    DeliveryStatus,
    PickingTask,
    PackingTask,
)

from app.models.wms.transfer import (
    StockTransfer,
    StockTransferLine,
    TransferType,
    TransferStatus,
)

from app.models.wms.inventory import (
    InventoryCount,
    InventoryCountLine,
    CountType,
    CountStatus,
    StockAdjustment,
    AdjustmentType,
)

__all__ = [
    # Warehouse
    "Warehouse", "WarehouseType", "WarehouseZone", "ZoneType", "StorageLocation", "LocationType",
    # Product
    "ProductCategory", "Product", "ProductUnit", "ProductBarcode", "ProductLot", "LotStatus",
    # Stock
    "StockLevel", "StockMove", "MoveType", "MoveStatus", "StockReservation", "ReservationStatus",
    # Inbound
    "GoodsReceipt", "GoodsReceiptLine", "ReceiptType", "ReceiptStatus", "PutawayTask", "TaskStatus",
    # Outbound
    "DeliveryOrder", "DeliveryOrderLine", "DeliveryType", "DeliveryStatus", "PickingTask", "PackingTask",
    # Transfer
    "StockTransfer", "StockTransferLine", "TransferType", "TransferStatus",
    # Inventory
    "InventoryCount", "InventoryCountLine", "CountType", "CountStatus", "StockAdjustment", "AdjustmentType",
]
