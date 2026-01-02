"""
WMS - Inbound API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.wms import (
    GoodsReceipt, GoodsReceiptLine, ReceiptType, ReceiptStatus,
    PutawayTask, TaskStatus, Product, StockLevel
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class GoodsReceiptCreate(BaseModel):
    receipt_type: str = ReceiptType.PURCHASE.value
    warehouse_id: str
    receiving_zone_id: Optional[str] = None
    source_document_type: Optional[str] = None
    source_document_id: Optional[str] = None
    source_document_number: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_delivery_note: Optional[str] = None
    expected_arrival_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReceiptLineCreate(BaseModel):
    receipt_id: str
    product_id: str
    product_code: str
    product_name: str
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    expected_quantity: Decimal
    lot_number: Optional[str] = None
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    dest_location_id: Optional[str] = None
    unit_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class ReceiveLinePayload(BaseModel):
    received_quantity: Decimal
    rejected_quantity: Decimal = Decimal("0")
    lot_number: Optional[str] = None
    serial_numbers: Optional[str] = None
    production_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    dest_location_id: Optional[str] = None
    quality_status: Optional[str] = None
    rejection_reason: Optional[str] = None


# =====================
# GOODS RECEIPTS
# =====================

@router.get("/goods-receipts")
def list_goods_receipts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    receipt_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List goods receipts"""
    tenant_id = str(current_user.tenant_id)

    query = select(GoodsReceipt).where(GoodsReceipt.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(GoodsReceipt.warehouse_id == warehouse_id)

    if receipt_type:
        query = query.where(GoodsReceipt.receipt_type == receipt_type)

    if status:
        query = query.where(GoodsReceipt.status == status)

    if date_from:
        query = query.where(GoodsReceipt.receipt_date >= date_from)

    if date_to:
        query = query.where(GoodsReceipt.receipt_date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(GoodsReceipt.receipt_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/goods-receipts")
def create_goods_receipt(
    payload: GoodsReceiptCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a goods receipt"""
    tenant_id = str(current_user.tenant_id)

    # Generate receipt number
    count = session.exec(
        select(func.count(GoodsReceipt.id)).where(
            GoodsReceipt.tenant_id == tenant_id
        )
    ).one() or 0

    receipt = GoodsReceipt(
        tenant_id=tenant_id,
        receipt_number=f"GR-{datetime.now().year}-{count + 1:06d}",
        receipt_date=datetime.utcnow(),
        **payload.model_dump(),
        status=ReceiptStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(receipt)
    session.commit()
    session.refresh(receipt)

    return receipt.model_dump()


@router.get("/goods-receipts/{receipt_id}")
def get_goods_receipt(
    receipt_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get goods receipt with lines"""
    tenant_id = str(current_user.tenant_id)

    receipt = session.get(GoodsReceipt, receipt_id)
    if not receipt or str(receipt.tenant_id) != tenant_id:
        raise HTTPException(404, "Goods receipt not found")

    lines = session.exec(
        select(GoodsReceiptLine).where(
            GoodsReceiptLine.tenant_id == tenant_id,
            GoodsReceiptLine.receipt_id == receipt_id
        ).order_by(GoodsReceiptLine.line_number)
    ).all()

    result = receipt.model_dump()
    result["lines"] = [line.model_dump() for line in lines]

    return result


@router.post("/goods-receipts/{receipt_id}/lines")
def add_receipt_line(
    receipt_id: str,
    payload: ReceiptLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a line to goods receipt"""
    tenant_id = str(current_user.tenant_id)

    receipt = session.get(GoodsReceipt, receipt_id)
    if not receipt or str(receipt.tenant_id) != tenant_id:
        raise HTTPException(404, "Goods receipt not found")

    if receipt.status not in [ReceiptStatus.DRAFT.value, ReceiptStatus.SCHEDULED.value]:
        raise HTTPException(400, "Cannot add lines in current status")

    # Get line number
    max_line = session.exec(
        select(func.max(GoodsReceiptLine.line_number)).where(
            GoodsReceiptLine.tenant_id == tenant_id,
            GoodsReceiptLine.receipt_id == receipt_id
        )
    ).one() or 0

    line = GoodsReceiptLine(
        tenant_id=tenant_id,
        receipt_id=receipt_id,
        line_number=max_line + 1,
        product_id=payload.product_id,
        product_code=payload.product_code,
        product_name=payload.product_name,
        unit_id=payload.unit_id,
        unit_name=payload.unit_name,
        expected_quantity=payload.expected_quantity,
        lot_number=payload.lot_number,
        production_date=payload.production_date,
        expiry_date=payload.expiry_date,
        dest_location_id=payload.dest_location_id,
        unit_cost=payload.unit_cost,
        total_cost=payload.expected_quantity * payload.unit_cost,
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(line)

    # Update receipt totals
    receipt.total_lines += 1
    receipt.total_expected_qty += payload.expected_quantity
    receipt.total_value += payload.expected_quantity * payload.unit_cost
    session.add(receipt)

    session.commit()
    session.refresh(line)

    return line.model_dump()


@router.post("/goods-receipts/{receipt_id}/arrive")
def mark_arrived(
    receipt_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark goods as arrived"""
    tenant_id = str(current_user.tenant_id)

    receipt = session.get(GoodsReceipt, receipt_id)
    if not receipt or str(receipt.tenant_id) != tenant_id:
        raise HTTPException(404, "Goods receipt not found")

    receipt.status = ReceiptStatus.ARRIVED.value
    receipt.actual_arrival_date = datetime.utcnow()

    session.add(receipt)
    session.commit()
    session.refresh(receipt)

    return {"success": True, "receipt": receipt.model_dump()}


@router.post("/goods-receipts/{receipt_id}/lines/{line_id}/receive")
def receive_line(
    receipt_id: str,
    line_id: str,
    payload: ReceiveLinePayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Receive items for a line"""
    tenant_id = str(current_user.tenant_id)

    receipt = session.get(GoodsReceipt, receipt_id)
    if not receipt or str(receipt.tenant_id) != tenant_id:
        raise HTTPException(404, "Goods receipt not found")

    if receipt.status not in [ReceiptStatus.ARRIVED.value, ReceiptStatus.IN_PROGRESS.value]:
        raise HTTPException(400, "Receipt must be in ARRIVED or IN_PROGRESS status")

    line = session.get(GoodsReceiptLine, line_id)
    if not line or str(line.tenant_id) != tenant_id or line.receipt_id != receipt_id:
        raise HTTPException(404, "Receipt line not found")

    # Update line
    line.received_quantity = payload.received_quantity
    line.rejected_quantity = payload.rejected_quantity
    line.lot_number = payload.lot_number
    line.serial_numbers = payload.serial_numbers
    line.production_date = payload.production_date
    line.expiry_date = payload.expiry_date
    line.dest_location_id = payload.dest_location_id
    line.quality_status = payload.quality_status
    line.rejection_reason = payload.rejection_reason
    line.total_cost = payload.received_quantity * line.unit_cost

    session.add(line)

    # Update receipt
    receipt.status = ReceiptStatus.IN_PROGRESS.value
    receipt.total_received_qty = session.exec(
        select(func.sum(GoodsReceiptLine.received_quantity)).where(
            GoodsReceiptLine.receipt_id == receipt_id
        )
    ).one() or Decimal("0")
    receipt.total_rejected_qty = session.exec(
        select(func.sum(GoodsReceiptLine.rejected_quantity)).where(
            GoodsReceiptLine.receipt_id == receipt_id
        )
    ).one() or Decimal("0")

    session.add(receipt)
    session.commit()
    session.refresh(line)

    return {"success": True, "line": line.model_dump()}


@router.post("/goods-receipts/{receipt_id}/complete")
def complete_receipt(
    receipt_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete the goods receipt and update stock"""
    tenant_id = str(current_user.tenant_id)

    receipt = session.get(GoodsReceipt, receipt_id)
    if not receipt or str(receipt.tenant_id) != tenant_id:
        raise HTTPException(404, "Goods receipt not found")

    if receipt.status != ReceiptStatus.IN_PROGRESS.value:
        raise HTTPException(400, "Receipt must be IN_PROGRESS to complete")

    # Get lines and update stock
    lines = session.exec(
        select(GoodsReceiptLine).where(
            GoodsReceiptLine.receipt_id == receipt_id,
            GoodsReceiptLine.received_quantity > 0
        )
    ).all()

    for line in lines:
        # Update or create stock level
        stock_query = select(StockLevel).where(
            StockLevel.tenant_id == tenant_id,
            StockLevel.product_id == line.product_id,
            StockLevel.warehouse_id == receipt.warehouse_id,
        )
        if line.dest_location_id:
            stock_query = stock_query.where(StockLevel.location_id == line.dest_location_id)
        if line.lot_id:
            stock_query = stock_query.where(StockLevel.lot_id == line.lot_id)

        stock = session.exec(stock_query).first()
        if not stock:
            stock = StockLevel(
                tenant_id=tenant_id,
                product_id=line.product_id,
                warehouse_id=receipt.warehouse_id,
                location_id=line.dest_location_id,
                lot_id=line.lot_id,
                quantity_on_hand=Decimal("0"),
                quantity_reserved=Decimal("0"),
                quantity_available=Decimal("0"),
                unit_cost=line.unit_cost,
            )

        stock.quantity_on_hand += line.received_quantity
        stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
        stock.total_value = stock.quantity_on_hand * stock.unit_cost
        stock.last_move_date = datetime.utcnow()
        session.add(stock)

    # Update receipt
    receipt.status = ReceiptStatus.COMPLETED.value
    receipt.completed_at = datetime.utcnow()
    receipt.receiver_id = str(current_user.id)
    receipt.received_at = datetime.utcnow()

    session.add(receipt)
    session.commit()
    session.refresh(receipt)

    return {"success": True, "receipt": receipt.model_dump()}


# =====================
# PUTAWAY TASKS
# =====================

@router.get("/putaway-tasks")
def list_putaway_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List putaway tasks"""
    tenant_id = str(current_user.tenant_id)

    query = select(PutawayTask).where(PutawayTask.tenant_id == tenant_id)

    if status:
        query = query.where(PutawayTask.status == status)

    if assigned_to:
        query = query.where(PutawayTask.assigned_to == assigned_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(PutawayTask.priority.desc(), PutawayTask.created_at)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/putaway-tasks/{task_id}/complete")
def complete_putaway_task(
    task_id: str,
    quantity_done: Decimal,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a putaway task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(PutawayTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Putaway task not found")

    task.quantity_done = quantity_done
    task.status = TaskStatus.COMPLETED.value
    task.completed_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}
