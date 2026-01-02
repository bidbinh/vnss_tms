"""
WMS - Transfers API Routes
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
    StockTransfer, StockTransferLine, TransferType, TransferStatus, StockLevel
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class TransferCreate(BaseModel):
    transfer_type: str = TransferType.INTER_WAREHOUSE.value
    source_warehouse_id: str
    source_zone_id: Optional[str] = None
    dest_warehouse_id: str
    dest_zone_id: Optional[str] = None
    reason: Optional[str] = None
    carrier_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    expected_arrival_date: Optional[datetime] = None
    notes: Optional[str] = None


class TransferLineCreate(BaseModel):
    transfer_id: str
    product_id: str
    product_code: str
    product_name: str
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    transfer_quantity: Decimal
    lot_id: Optional[str] = None
    lot_number: Optional[str] = None
    source_location_id: Optional[str] = None
    dest_location_id: Optional[str] = None
    unit_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


# =====================
# STOCK TRANSFERS
# =====================

@router.get("/transfers")
def list_transfers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    source_warehouse_id: Optional[str] = Query(None),
    dest_warehouse_id: Optional[str] = Query(None),
    transfer_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List stock transfers"""
    tenant_id = str(current_user.tenant_id)

    query = select(StockTransfer).where(StockTransfer.tenant_id == tenant_id)

    if source_warehouse_id:
        query = query.where(StockTransfer.source_warehouse_id == source_warehouse_id)

    if dest_warehouse_id:
        query = query.where(StockTransfer.dest_warehouse_id == dest_warehouse_id)

    if transfer_type:
        query = query.where(StockTransfer.transfer_type == transfer_type)

    if status:
        query = query.where(StockTransfer.status == status)

    if date_from:
        query = query.where(StockTransfer.transfer_date >= date_from)

    if date_to:
        query = query.where(StockTransfer.transfer_date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(StockTransfer.transfer_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/transfers")
def create_transfer(
    payload: TransferCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a stock transfer"""
    tenant_id = str(current_user.tenant_id)

    # Generate transfer number
    count = session.exec(
        select(func.count(StockTransfer.id)).where(
            StockTransfer.tenant_id == tenant_id
        )
    ).one() or 0

    transfer = StockTransfer(
        tenant_id=tenant_id,
        transfer_number=f"TR-{datetime.now().year}-{count + 1:06d}",
        transfer_date=datetime.utcnow(),
        **payload.model_dump(),
        status=TransferStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return transfer.model_dump()


@router.get("/transfers/{transfer_id}")
def get_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get transfer with lines"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    lines = session.exec(
        select(StockTransferLine).where(
            StockTransferLine.tenant_id == tenant_id,
            StockTransferLine.transfer_id == transfer_id
        ).order_by(StockTransferLine.line_number)
    ).all()

    result = transfer.model_dump()
    result["lines"] = [line.model_dump() for line in lines]

    return result


@router.post("/transfers/{transfer_id}/lines")
def add_transfer_line(
    transfer_id: str,
    payload: TransferLineCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a line to transfer"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != TransferStatus.DRAFT.value:
        raise HTTPException(400, "Cannot add lines in current status")

    # Get line number
    max_line = session.exec(
        select(func.max(StockTransferLine.line_number)).where(
            StockTransferLine.tenant_id == tenant_id,
            StockTransferLine.transfer_id == transfer_id
        )
    ).one() or 0

    line = StockTransferLine(
        tenant_id=tenant_id,
        transfer_id=transfer_id,
        line_number=max_line + 1,
        **payload.model_dump(exclude={"transfer_id"}),
        total_cost=payload.transfer_quantity * payload.unit_cost,
        created_by=str(current_user.id),
    )

    session.add(line)

    # Update transfer totals
    transfer.total_lines += 1
    transfer.total_quantity += payload.transfer_quantity
    transfer.total_value += payload.transfer_quantity * payload.unit_cost
    session.add(transfer)

    session.commit()
    session.refresh(line)

    return line.model_dump()


@router.post("/transfers/{transfer_id}/confirm")
def confirm_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Confirm transfer and reserve stock at source"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != TransferStatus.DRAFT.value:
        raise HTTPException(400, "Only draft transfers can be confirmed")

    # Check stock availability at source
    lines = session.exec(
        select(StockTransferLine).where(
            StockTransferLine.transfer_id == transfer_id
        )
    ).all()

    for line in lines:
        stock = session.exec(
            select(StockLevel).where(
                StockLevel.tenant_id == tenant_id,
                StockLevel.product_id == line.product_id,
                StockLevel.warehouse_id == transfer.source_warehouse_id
            )
        ).first()

        if not stock or stock.quantity_available < line.transfer_quantity:
            raise HTTPException(
                400,
                f"Insufficient stock for {line.product_code}. Available: {stock.quantity_available if stock else 0}"
            )

    # Reserve stock at source
    for line in lines:
        stock = session.exec(
            select(StockLevel).where(
                StockLevel.tenant_id == tenant_id,
                StockLevel.product_id == line.product_id,
                StockLevel.warehouse_id == transfer.source_warehouse_id
            )
        ).first()

        if stock:
            stock.quantity_reserved += line.transfer_quantity
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
            session.add(stock)

    transfer.status = TransferStatus.CONFIRMED.value
    session.add(transfer)

    session.commit()
    session.refresh(transfer)

    return {"success": True, "transfer": transfer.model_dump()}


@router.post("/transfers/{transfer_id}/ship")
def ship_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Ship transfer (deduct from source warehouse)"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != TransferStatus.CONFIRMED.value:
        raise HTTPException(400, "Only confirmed transfers can be shipped")

    # Deduct stock from source
    lines = session.exec(
        select(StockTransferLine).where(
            StockTransferLine.transfer_id == transfer_id
        )
    ).all()

    for line in lines:
        stock = session.exec(
            select(StockLevel).where(
                StockLevel.tenant_id == tenant_id,
                StockLevel.product_id == line.product_id,
                StockLevel.warehouse_id == transfer.source_warehouse_id
            )
        ).first()

        if stock:
            stock.quantity_on_hand -= line.transfer_quantity
            stock.quantity_reserved -= line.transfer_quantity
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
            stock.total_value = stock.quantity_on_hand * stock.unit_cost
            stock.last_move_date = datetime.utcnow()
            session.add(stock)

    transfer.status = TransferStatus.IN_TRANSIT.value
    transfer.shipped_at = datetime.utcnow()
    transfer.shipped_by = str(current_user.id)

    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return {"success": True, "transfer": transfer.model_dump()}


@router.post("/transfers/{transfer_id}/receive")
def receive_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Receive transfer at destination warehouse"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != TransferStatus.IN_TRANSIT.value:
        raise HTTPException(400, "Only in-transit transfers can be received")

    # Add stock to destination
    lines = session.exec(
        select(StockTransferLine).where(
            StockTransferLine.transfer_id == transfer_id
        )
    ).all()

    for line in lines:
        # Find or create stock level at destination
        stock_query = select(StockLevel).where(
            StockLevel.tenant_id == tenant_id,
            StockLevel.product_id == line.product_id,
            StockLevel.warehouse_id == transfer.dest_warehouse_id
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
                warehouse_id=transfer.dest_warehouse_id,
                location_id=line.dest_location_id,
                lot_id=line.lot_id,
                quantity_on_hand=Decimal("0"),
                quantity_reserved=Decimal("0"),
                quantity_available=Decimal("0"),
                unit_cost=line.unit_cost,
            )

        stock.quantity_on_hand += line.transfer_quantity
        stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
        stock.total_value = stock.quantity_on_hand * stock.unit_cost
        stock.last_move_date = datetime.utcnow()
        session.add(stock)

        # Update line received quantity
        line.received_quantity = line.transfer_quantity
        session.add(line)

    transfer.status = TransferStatus.RECEIVED.value
    transfer.actual_arrival_date = datetime.utcnow()
    transfer.received_at = datetime.utcnow()
    transfer.received_by = str(current_user.id)
    transfer.total_received_qty = sum(line.transfer_quantity for line in lines)

    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return {"success": True, "transfer": transfer.model_dump()}


@router.post("/transfers/{transfer_id}/complete")
def complete_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark transfer as completed"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(StockTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != TransferStatus.RECEIVED.value:
        raise HTTPException(400, "Only received transfers can be completed")

    transfer.status = TransferStatus.COMPLETED.value
    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return {"success": True, "transfer": transfer.model_dump()}
