"""
Mobile Warehouse API - Endpoints dành cho app mobile warehouse
Sử dụng JWT authentication
"""
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, Customer
from app.core.security import get_current_user

router = APIRouter(prefix="/mobile-warehouse", tags=["mobile_warehouse"])


# ==================== MODELS ====================

class GoodsReceiptItem(BaseModel):
    """Item trong phiếu nhập kho"""
    product_code: str
    product_name: str
    expected_qty: float
    received_qty: float = 0
    unit: str
    lot_number: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class GoodsReceiptCreate(BaseModel):
    """Request tạo phiếu nhập kho"""
    supplier_id: Optional[str] = None
    po_number: Optional[str] = None
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    items: List[GoodsReceiptItem]


class ReceiveItemRequest(BaseModel):
    """Request nhận hàng"""
    item_id: str
    received_qty: float
    lot_number: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class StockTransferCreate(BaseModel):
    """Request tạo phiếu chuyển kho"""
    from_warehouse_id: str
    to_warehouse_id: str
    notes: Optional[str] = None
    items: List[dict]


class StockAdjustmentCreate(BaseModel):
    """Request điều chỉnh tồn kho"""
    product_id: str
    location: str
    adjustment_qty: float
    reason: str
    notes: Optional[str] = None


class ScanResult(BaseModel):
    """Kết quả scan barcode/QR"""
    code: str
    type: Optional[str] = None  # PRODUCT, LOCATION, ORDER, etc.


# ==================== HELPER FUNCTIONS ====================

def validate_warehouse_user(user: User, session: Session) -> dict:
    """Validate user có quyền warehouse và trả về warehouse info"""
    # Check if user has warehouse role
    if user.role not in ["ADMIN", "WAREHOUSE", "WAREHOUSE_MANAGER"]:
        raise HTTPException(403, "Bạn không có quyền truy cập chức năng kho")

    return {
        "user_id": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
    }


# ==================== DASHBOARD ====================

@router.get("/dashboard")
def get_warehouse_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Dashboard tổng quan kho
    """
    wh_info = validate_warehouse_user(current_user, session)
    tenant_id = str(current_user.tenant_id)
    today = date.today()

    # Mock data - In real implementation, query from database
    return {
        "summary": {
            "pending_receipts": 5,
            "pending_transfers": 3,
            "low_stock_items": 12,
            "expiring_items": 8,
        },
        "today_tasks": {
            "receipts_to_process": 3,
            "transfers_to_process": 2,
            "picks_to_complete": 15,
        },
        "recent_activity": [
            {
                "type": "receipt",
                "code": "GRN-2024-001",
                "description": "Nhập kho từ ABC Supplier",
                "time": "10 phút trước",
            },
            {
                "type": "transfer",
                "code": "STR-2024-002",
                "description": "Chuyển kho A → B",
                "time": "30 phút trước",
            },
        ],
    }


# ==================== GOODS RECEIPT ====================

@router.get("/goods-receipts")
def list_goods_receipts(
    status: Optional[str] = Query(None, description="pending, in_progress, complete"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách phiếu nhập kho
    """
    wh_info = validate_warehouse_user(current_user, session)
    tenant_id = str(current_user.tenant_id)

    # Mock data
    items = [
        {
            "id": "1",
            "receipt_no": "GRN-2024-001",
            "supplier_name": "ABC Supplier",
            "po_number": "PO-2024-100",
            "expected_date": "2024-12-30",
            "status": "pending",
            "items_count": 5,
            "received_count": 0,
        },
        {
            "id": "2",
            "receipt_no": "GRN-2024-002",
            "supplier_name": "XYZ Trading",
            "expected_date": "2024-12-31",
            "status": "in_progress",
            "items_count": 3,
            "received_count": 2,
        },
    ]

    if status:
        items = [i for i in items if i["status"] == status]

    return {
        "items": items,
        "total": len(items),
        "page": page,
        "size": size,
    }


@router.get("/goods-receipts/{receipt_id}")
def get_goods_receipt_detail(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Chi tiết phiếu nhập kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    # Mock data
    return {
        "id": receipt_id,
        "receipt_no": "GRN-2024-001",
        "supplier_name": "ABC Supplier",
        "po_number": "PO-2024-100",
        "expected_date": "2024-12-30",
        "status": "in_progress",
        "items": [
            {
                "id": "1-1",
                "product_code": "PRD-001",
                "product_name": "Widget A",
                "expected_qty": 100,
                "received_qty": 50,
                "unit": "PCS",
                "status": "partial",
            },
            {
                "id": "1-2",
                "product_code": "PRD-002",
                "product_name": "Widget B",
                "expected_qty": 50,
                "received_qty": 0,
                "unit": "BOX",
                "status": "pending",
            },
        ],
        "notes": "",
    }


@router.post("/goods-receipts/{receipt_id}/receive-item")
def receive_goods_item(
    receipt_id: str,
    data: ReceiveItemRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Nhận hàng cho một item trong phiếu nhập
    """
    wh_info = validate_warehouse_user(current_user, session)

    # Mock response
    return {
        "success": True,
        "item_id": data.item_id,
        "received_qty": data.received_qty,
        "message": f"Đã nhận {data.received_qty} sản phẩm",
    }


@router.post("/goods-receipts/{receipt_id}/complete")
def complete_goods_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Hoàn thành phiếu nhập kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    return {
        "success": True,
        "receipt_id": receipt_id,
        "status": "complete",
        "message": "Đã hoàn thành phiếu nhập kho",
    }


# ==================== INVENTORY ====================

@router.get("/inventory")
def get_inventory(
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    low_stock: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách tồn kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    # Mock data
    items = [
        {
            "id": "1",
            "product_code": "PRD-001",
            "product_name": "Widget A",
            "category": "Electronics",
            "location": "A-01-01",
            "qty_on_hand": 150,
            "qty_reserved": 20,
            "qty_available": 130,
            "unit": "PCS",
            "min_qty": 50,
            "max_qty": 500,
            "status": "normal",
        },
        {
            "id": "2",
            "product_code": "PRD-002",
            "product_name": "Widget B",
            "category": "Electronics",
            "location": "A-01-02",
            "qty_on_hand": 30,
            "qty_reserved": 10,
            "qty_available": 20,
            "unit": "BOX",
            "min_qty": 50,
            "max_qty": 200,
            "status": "low_stock",
        },
    ]

    if search:
        items = [i for i in items if search.lower() in i["product_name"].lower()
                 or search.lower() in i["product_code"].lower()]

    if low_stock:
        items = [i for i in items if i["status"] == "low_stock"]

    return {
        "items": items,
        "total": len(items),
        "page": page,
        "size": size,
    }


@router.get("/inventory/{product_id}")
def get_inventory_detail(
    product_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Chi tiết tồn kho sản phẩm
    """
    wh_info = validate_warehouse_user(current_user, session)

    return {
        "id": product_id,
        "product_code": "PRD-001",
        "product_name": "Widget A",
        "category": "Electronics",
        "total_qty": 150,
        "locations": [
            {"location": "A-01-01", "qty": 100, "lot_number": "LOT001"},
            {"location": "A-01-02", "qty": 50, "lot_number": "LOT002"},
        ],
        "movements": [
            {"date": "2024-12-30", "type": "IN", "qty": 50, "reference": "GRN-001"},
            {"date": "2024-12-29", "type": "OUT", "qty": 20, "reference": "DO-001"},
        ],
    }


@router.post("/inventory/adjust")
def adjust_inventory(
    data: StockAdjustmentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Điều chỉnh tồn kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    return {
        "success": True,
        "adjustment_id": "ADJ-2024-001",
        "message": f"Đã điều chỉnh {data.adjustment_qty} tại {data.location}",
    }


# ==================== STOCK TRANSFER ====================

@router.get("/stock-transfers")
def list_stock_transfers(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách phiếu chuyển kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    items = [
        {
            "id": "1",
            "transfer_no": "STR-2024-001",
            "from_warehouse": "Kho A",
            "to_warehouse": "Kho B",
            "status": "pending",
            "items_count": 5,
            "created_at": "2024-12-30 08:00",
        },
        {
            "id": "2",
            "transfer_no": "STR-2024-002",
            "from_warehouse": "Kho A",
            "to_warehouse": "Kho C",
            "status": "in_progress",
            "items_count": 3,
            "created_at": "2024-12-30 09:30",
        },
    ]

    if status:
        items = [i for i in items if i["status"] == status]

    return {
        "items": items,
        "total": len(items),
        "page": page,
        "size": size,
    }


@router.get("/stock-transfers/{transfer_id}")
def get_stock_transfer_detail(
    transfer_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Chi tiết phiếu chuyển kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    return {
        "id": transfer_id,
        "transfer_no": "STR-2024-001",
        "from_warehouse": "Kho A",
        "to_warehouse": "Kho B",
        "status": "in_progress",
        "items": [
            {
                "id": "1-1",
                "product_code": "PRD-001",
                "product_name": "Widget A",
                "qty_to_transfer": 50,
                "qty_transferred": 30,
                "from_bin": "A-01-01",
                "to_bin": "B-02-01",
            },
        ],
        "created_at": "2024-12-30 08:00",
        "created_by": "Nguyen Van A",
    }


@router.post("/stock-transfers/{transfer_id}/transfer-item")
def transfer_stock_item(
    transfer_id: str,
    item_id: str = Query(...),
    qty: float = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Chuyển một item trong phiếu
    """
    wh_info = validate_warehouse_user(current_user, session)

    return {
        "success": True,
        "item_id": item_id,
        "qty_transferred": qty,
        "message": f"Đã chuyển {qty} sản phẩm",
    }


@router.post("/stock-transfers/{transfer_id}/complete")
def complete_stock_transfer(
    transfer_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Hoàn thành phiếu chuyển kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    return {
        "success": True,
        "transfer_id": transfer_id,
        "status": "completed",
        "message": "Đã hoàn thành chuyển kho",
    }


# ==================== BARCODE SCANNING ====================

@router.post("/scan")
def process_scan(
    data: ScanResult,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Xử lý kết quả scan barcode/QR
    """
    wh_info = validate_warehouse_user(current_user, session)

    code = data.code

    # Detect code type based on prefix
    if code.startswith("PRD-"):
        code_type = "PRODUCT"
        # Look up product
        product_info = {
            "id": "1",
            "product_code": code,
            "product_name": "Widget A",
            "qty_on_hand": 150,
            "location": "A-01-01",
        }
        return {
            "type": code_type,
            "found": True,
            "data": product_info,
        }

    elif code.startswith("LOC-") or "-" in code and len(code.split("-")) == 3:
        code_type = "LOCATION"
        return {
            "type": code_type,
            "found": True,
            "data": {
                "location_code": code,
                "warehouse": "Kho A",
                "zone": "A",
                "aisle": "01",
                "bin": "01",
            },
        }

    elif code.startswith("GRN-"):
        code_type = "GOODS_RECEIPT"
        return {
            "type": code_type,
            "found": True,
            "data": {
                "receipt_no": code,
                "supplier": "ABC Supplier",
                "status": "pending",
            },
        }

    elif code.startswith("STR-"):
        code_type = "STOCK_TRANSFER"
        return {
            "type": code_type,
            "found": True,
            "data": {
                "transfer_no": code,
                "from_warehouse": "Kho A",
                "to_warehouse": "Kho B",
                "status": "in_progress",
            },
        }

    return {
        "type": "UNKNOWN",
        "found": False,
        "code": code,
        "message": "Không tìm thấy thông tin cho mã này",
    }


# ==================== LOCATIONS ====================

@router.get("/locations")
def list_locations(
    warehouse_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách vị trí kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    locations = [
        {"code": "A-01-01", "warehouse": "Kho A", "zone": "A", "capacity": 100, "used": 80},
        {"code": "A-01-02", "warehouse": "Kho A", "zone": "A", "capacity": 100, "used": 50},
        {"code": "B-01-01", "warehouse": "Kho B", "zone": "B", "capacity": 150, "used": 100},
    ]

    return locations


@router.get("/warehouses")
def list_warehouses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Danh sách kho
    """
    wh_info = validate_warehouse_user(current_user, session)

    warehouses = [
        {"id": "1", "code": "WH-A", "name": "Kho A", "address": "123 ABC Street"},
        {"id": "2", "code": "WH-B", "name": "Kho B", "address": "456 XYZ Street"},
        {"id": "3", "code": "WH-C", "name": "Kho C", "address": "789 DEF Street"},
    ]

    return warehouses
