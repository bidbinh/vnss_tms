"""
WMS - Stock API Routes
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
    StockLevel, StockMove, MoveType, MoveStatus,
    StockReservation, ReservationStatus,
    Product, Warehouse, StorageLocation, ProductLot
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class StockMoveCreate(BaseModel):
    move_type: str
    product_id: str
    lot_id: Optional[str] = None
    unit_id: Optional[str] = None
    source_warehouse_id: Optional[str] = None
    source_location_id: Optional[str] = None
    dest_warehouse_id: Optional[str] = None
    dest_location_id: Optional[str] = None
    quantity: Decimal
    unit_cost: Decimal = Decimal("0")
    source_document: Optional[str] = None
    source_document_type: Optional[str] = None
    source_document_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class ReservationCreate(BaseModel):
    product_id: str
    warehouse_id: str
    location_id: Optional[str] = None
    lot_id: Optional[str] = None
    quantity_reserved: Decimal
    source_document_type: str
    source_document_id: str
    source_document_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


# =====================
# STOCK LEVELS
# =====================

@router.get("/stock-levels")
def list_stock_levels(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List stock levels"""
    tenant_id = str(current_user.tenant_id)

    query = select(StockLevel).where(StockLevel.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(StockLevel.warehouse_id == warehouse_id)

    if product_id:
        query = query.where(StockLevel.product_id == product_id)

    if location_id:
        query = query.where(StockLevel.location_id == location_id)

    if low_stock:
        # Join with product to check reorder point
        query = query.join(Product, StockLevel.product_id == Product.id)
        query = query.where(StockLevel.quantity_available <= Product.reorder_point)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    # Enrich with product info
    result_items = []
    for item in items:
        item_dict = item.model_dump()
        product = session.get(Product, item.product_id)
        if product:
            item_dict["product_code"] = product.code
            item_dict["product_name"] = product.name
        result_items.append(item_dict)

    return {
        "items": result_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.get("/stock-levels/by-product/{product_id}")
def get_stock_by_product(
    product_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get stock levels for a product across all warehouses"""
    tenant_id = str(current_user.tenant_id)

    levels = session.exec(
        select(StockLevel).where(
            StockLevel.tenant_id == tenant_id,
            StockLevel.product_id == product_id
        )
    ).all()

    total_on_hand = sum(level.quantity_on_hand for level in levels)
    total_reserved = sum(level.quantity_reserved for level in levels)
    total_available = sum(level.quantity_available for level in levels)

    return {
        "product_id": product_id,
        "levels": [level.model_dump() for level in levels],
        "totals": {
            "on_hand": float(total_on_hand),
            "reserved": float(total_reserved),
            "available": float(total_available),
        }
    }


# =====================
# STOCK MOVES
# =====================

@router.get("/stock-moves")
def list_stock_moves(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    move_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List stock moves"""
    tenant_id = str(current_user.tenant_id)

    query = select(StockMove).where(StockMove.tenant_id == tenant_id)

    if move_type:
        query = query.where(StockMove.move_type == move_type)

    if status:
        query = query.where(StockMove.status == status)

    if product_id:
        query = query.where(StockMove.product_id == product_id)

    if date_from:
        query = query.where(StockMove.move_date >= date_from)

    if date_to:
        query = query.where(StockMove.move_date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(StockMove.move_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/stock-moves")
def create_stock_move(
    payload: StockMoveCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a stock move"""
    tenant_id = str(current_user.tenant_id)

    # Generate move number
    count = session.exec(
        select(func.count(StockMove.id)).where(
            StockMove.tenant_id == tenant_id
        )
    ).one() or 0

    move = StockMove(
        tenant_id=tenant_id,
        move_number=f"SM-{datetime.now().year}-{count + 1:06d}",
        move_date=datetime.utcnow(),
        **payload.model_dump(),
        total_cost=payload.quantity * payload.unit_cost,
        status=MoveStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(move)
    session.commit()
    session.refresh(move)

    return move.model_dump()


@router.post("/stock-moves/{move_id}/confirm")
def confirm_stock_move(
    move_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Confirm a stock move"""
    tenant_id = str(current_user.tenant_id)

    move = session.get(StockMove, move_id)
    if not move or str(move.tenant_id) != tenant_id:
        raise HTTPException(404, "Stock move not found")

    if move.status != MoveStatus.DRAFT.value:
        raise HTTPException(400, "Only draft moves can be confirmed")

    move.status = MoveStatus.CONFIRMED.value
    move.confirmed_at = datetime.utcnow()
    move.confirmed_by = str(current_user.id)

    session.add(move)
    session.commit()
    session.refresh(move)

    return {"success": True, "move": move.model_dump()}


@router.post("/stock-moves/{move_id}/complete")
def complete_stock_move(
    move_id: str,
    quantity_done: Decimal,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a stock move and update stock levels"""
    tenant_id = str(current_user.tenant_id)

    move = session.get(StockMove, move_id)
    if not move or str(move.tenant_id) != tenant_id:
        raise HTTPException(404, "Stock move not found")

    if move.status not in [MoveStatus.DRAFT.value, MoveStatus.CONFIRMED.value, MoveStatus.IN_PROGRESS.value]:
        raise HTTPException(400, "Move cannot be completed in current status")

    move.quantity_done = quantity_done
    move.status = MoveStatus.DONE.value
    move.done_at = datetime.utcnow()
    move.done_by = str(current_user.id)

    # Update stock levels
    if move.move_type == MoveType.IN.value:
        # Increase destination stock
        _update_stock_level(
            session, tenant_id, move.product_id, move.dest_warehouse_id,
            move.dest_location_id, move.lot_id, quantity_done, move.unit_cost
        )
    elif move.move_type == MoveType.OUT.value:
        # Decrease source stock
        _update_stock_level(
            session, tenant_id, move.product_id, move.source_warehouse_id,
            move.source_location_id, move.lot_id, -quantity_done, move.unit_cost
        )
    elif move.move_type == MoveType.INTERNAL.value:
        # Decrease source, increase destination
        _update_stock_level(
            session, tenant_id, move.product_id, move.source_warehouse_id,
            move.source_location_id, move.lot_id, -quantity_done, move.unit_cost
        )
        _update_stock_level(
            session, tenant_id, move.product_id, move.dest_warehouse_id,
            move.dest_location_id, move.lot_id, quantity_done, move.unit_cost
        )

    session.add(move)
    session.commit()
    session.refresh(move)

    return {"success": True, "move": move.model_dump()}


def _update_stock_level(
    session: Session,
    tenant_id: str,
    product_id: str,
    warehouse_id: str,
    location_id: Optional[str],
    lot_id: Optional[str],
    quantity_change: Decimal,
    unit_cost: Decimal,
):
    """Helper to update stock level"""
    # Find or create stock level
    query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.product_id == product_id,
        StockLevel.warehouse_id == warehouse_id,
    )

    if location_id:
        query = query.where(StockLevel.location_id == location_id)
    else:
        query = query.where(StockLevel.location_id == None)

    if lot_id:
        query = query.where(StockLevel.lot_id == lot_id)
    else:
        query = query.where(StockLevel.lot_id == None)

    stock_level = session.exec(query).first()

    if not stock_level:
        stock_level = StockLevel(
            tenant_id=tenant_id,
            product_id=product_id,
            warehouse_id=warehouse_id,
            location_id=location_id,
            lot_id=lot_id,
            quantity_on_hand=Decimal("0"),
            quantity_reserved=Decimal("0"),
            quantity_available=Decimal("0"),
            unit_cost=unit_cost,
        )

    stock_level.quantity_on_hand += quantity_change
    stock_level.quantity_available = stock_level.quantity_on_hand - stock_level.quantity_reserved
    stock_level.total_value = stock_level.quantity_on_hand * stock_level.unit_cost
    stock_level.last_move_date = datetime.utcnow()

    session.add(stock_level)


# =====================
# RESERVATIONS
# =====================

@router.get("/reservations")
def list_reservations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    product_id: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List stock reservations"""
    tenant_id = str(current_user.tenant_id)

    query = select(StockReservation).where(StockReservation.tenant_id == tenant_id)

    if product_id:
        query = query.where(StockReservation.product_id == product_id)

    if warehouse_id:
        query = query.where(StockReservation.warehouse_id == warehouse_id)

    if status:
        query = query.where(StockReservation.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(StockReservation.reservation_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/reservations")
def create_reservation(
    payload: ReservationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a stock reservation"""
    tenant_id = str(current_user.tenant_id)

    # Check available stock
    stock_query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.product_id == payload.product_id,
        StockLevel.warehouse_id == payload.warehouse_id,
    )

    if payload.location_id:
        stock_query = stock_query.where(StockLevel.location_id == payload.location_id)

    if payload.lot_id:
        stock_query = stock_query.where(StockLevel.lot_id == payload.lot_id)

    stock_level = session.exec(stock_query).first()

    if not stock_level or stock_level.quantity_available < payload.quantity_reserved:
        raise HTTPException(400, "Insufficient available stock")

    # Generate reservation number
    count = session.exec(
        select(func.count(StockReservation.id)).where(
            StockReservation.tenant_id == tenant_id
        )
    ).one() or 0

    reservation = StockReservation(
        tenant_id=tenant_id,
        reservation_number=f"RES-{datetime.now().year}-{count + 1:06d}",
        reservation_date=datetime.utcnow(),
        **payload.model_dump(),
        status=ReservationStatus.ACTIVE.value,
        created_by=str(current_user.id),
    )

    session.add(reservation)

    # Update stock level
    stock_level.quantity_reserved += payload.quantity_reserved
    stock_level.quantity_available = stock_level.quantity_on_hand - stock_level.quantity_reserved
    session.add(stock_level)

    session.commit()
    session.refresh(reservation)

    return reservation.model_dump()


@router.post("/reservations/{reservation_id}/fulfill")
def fulfill_reservation(
    reservation_id: str,
    quantity_fulfilled: Decimal,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Fulfill a reservation"""
    tenant_id = str(current_user.tenant_id)

    reservation = session.get(StockReservation, reservation_id)
    if not reservation or str(reservation.tenant_id) != tenant_id:
        raise HTTPException(404, "Reservation not found")

    if reservation.status != ReservationStatus.ACTIVE.value:
        raise HTTPException(400, "Reservation is not active")

    reservation.quantity_fulfilled += quantity_fulfilled

    if reservation.quantity_fulfilled >= reservation.quantity_reserved:
        reservation.status = ReservationStatus.FULFILLED.value
        reservation.fulfillment_date = datetime.utcnow()

    # Update stock level
    stock_query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.product_id == reservation.product_id,
        StockLevel.warehouse_id == reservation.warehouse_id,
    )
    stock_level = session.exec(stock_query).first()

    if stock_level:
        stock_level.quantity_reserved -= quantity_fulfilled
        stock_level.quantity_available = stock_level.quantity_on_hand - stock_level.quantity_reserved
        session.add(stock_level)

    session.add(reservation)
    session.commit()
    session.refresh(reservation)

    return {"success": True, "reservation": reservation.model_dump()}


@router.post("/reservations/{reservation_id}/cancel")
def cancel_reservation(
    reservation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel a reservation"""
    tenant_id = str(current_user.tenant_id)

    reservation = session.get(StockReservation, reservation_id)
    if not reservation or str(reservation.tenant_id) != tenant_id:
        raise HTTPException(404, "Reservation not found")

    if reservation.status != ReservationStatus.ACTIVE.value:
        raise HTTPException(400, "Reservation is not active")

    remaining = reservation.quantity_reserved - reservation.quantity_fulfilled
    reservation.status = ReservationStatus.CANCELLED.value

    # Release stock
    stock_query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.product_id == reservation.product_id,
        StockLevel.warehouse_id == reservation.warehouse_id,
    )
    stock_level = session.exec(stock_query).first()

    if stock_level:
        stock_level.quantity_reserved -= remaining
        stock_level.quantity_available = stock_level.quantity_on_hand - stock_level.quantity_reserved
        session.add(stock_level)

    session.add(reservation)
    session.commit()

    return {"success": True, "message": "Reservation cancelled"}
