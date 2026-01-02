"""
WMS - Inventory API Routes
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
    InventoryCount, InventoryCountLine, CountType, CountStatus,
    StockAdjustment, AdjustmentType, StockLevel, Product
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class InventoryCountCreate(BaseModel):
    count_type: str = CountType.FULL.value
    warehouse_id: str
    zone_id: Optional[str] = None
    location_id: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class CountLineUpdate(BaseModel):
    counted_quantity: Decimal
    variance_reason: Optional[str] = None
    notes: Optional[str] = None


class AdjustmentCreate(BaseModel):
    adjustment_type: str = AdjustmentType.PHYSICAL_COUNT.value
    warehouse_id: str
    product_id: str
    product_code: str
    product_name: str
    unit_id: Optional[str] = None
    location_id: Optional[str] = None
    lot_id: Optional[str] = None
    lot_number: Optional[str] = None
    adjustment_quantity: Decimal
    unit_cost: Decimal = Decimal("0")
    reason: str
    notes: Optional[str] = None


# =====================
# INVENTORY COUNTS
# =====================

@router.get("/inventory-counts")
def list_inventory_counts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    count_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List inventory counts"""
    tenant_id = str(current_user.tenant_id)

    query = select(InventoryCount).where(InventoryCount.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(InventoryCount.warehouse_id == warehouse_id)

    if count_type:
        query = query.where(InventoryCount.count_type == count_type)

    if status:
        query = query.where(InventoryCount.status == status)

    if date_from:
        query = query.where(InventoryCount.count_date >= date_from)

    if date_to:
        query = query.where(InventoryCount.count_date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(InventoryCount.count_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/inventory-counts")
def create_inventory_count(
    payload: InventoryCountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an inventory count"""
    tenant_id = str(current_user.tenant_id)

    # Generate count number
    count = session.exec(
        select(func.count(InventoryCount.id)).where(
            InventoryCount.tenant_id == tenant_id
        )
    ).one() or 0

    inventory_count = InventoryCount(
        tenant_id=tenant_id,
        count_number=f"IC-{datetime.now().year}-{count + 1:06d}",
        count_date=datetime.utcnow(),
        **payload.model_dump(),
        status=CountStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(inventory_count)
    session.commit()
    session.refresh(inventory_count)

    return inventory_count.model_dump()


@router.get("/inventory-counts/{count_id}")
def get_inventory_count(
    count_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get inventory count with lines"""
    tenant_id = str(current_user.tenant_id)

    inv_count = session.get(InventoryCount, count_id)
    if not inv_count or str(inv_count.tenant_id) != tenant_id:
        raise HTTPException(404, "Inventory count not found")

    lines = session.exec(
        select(InventoryCountLine).where(
            InventoryCountLine.tenant_id == tenant_id,
            InventoryCountLine.count_id == count_id
        ).order_by(InventoryCountLine.line_number)
    ).all()

    result = inv_count.model_dump()
    result["lines"] = [line.model_dump() for line in lines]

    return result


@router.post("/inventory-counts/{count_id}/generate-lines")
def generate_count_lines(
    count_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate count lines from current stock levels"""
    tenant_id = str(current_user.tenant_id)

    inv_count = session.get(InventoryCount, count_id)
    if not inv_count or str(inv_count.tenant_id) != tenant_id:
        raise HTTPException(404, "Inventory count not found")

    if inv_count.status != CountStatus.DRAFT.value:
        raise HTTPException(400, "Can only generate lines for draft counts")

    # Get stock levels based on count scope
    stock_query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.warehouse_id == inv_count.warehouse_id,
        StockLevel.quantity_on_hand > 0
    )

    if inv_count.location_id:
        stock_query = stock_query.where(StockLevel.location_id == inv_count.location_id)

    stocks = session.exec(stock_query).all()

    line_number = 0
    for stock in stocks:
        product = session.get(Product, stock.product_id)
        if not product:
            continue

        # Filter by category if specified
        if inv_count.category_id and product.category_id != inv_count.category_id:
            continue

        line_number += 1
        line = InventoryCountLine(
            tenant_id=tenant_id,
            count_id=count_id,
            line_number=line_number,
            product_id=stock.product_id,
            product_code=product.code,
            product_name=product.name,
            location_id=stock.location_id,
            lot_id=stock.lot_id,
            system_quantity=stock.quantity_on_hand,
            unit_cost=stock.unit_cost,
            system_value=stock.total_value,
            created_by=str(current_user.id),
        )
        session.add(line)

    inv_count.total_lines = line_number
    inv_count.total_system_value = sum(stock.total_value for stock in stocks)
    session.add(inv_count)

    session.commit()
    session.refresh(inv_count)

    return {"success": True, "lines_generated": line_number}


@router.post("/inventory-counts/{count_id}/start")
def start_count(
    count_id: str,
    freeze_stock: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start the counting process"""
    tenant_id = str(current_user.tenant_id)

    inv_count = session.get(InventoryCount, count_id)
    if not inv_count or str(inv_count.tenant_id) != tenant_id:
        raise HTTPException(404, "Inventory count not found")

    if inv_count.status != CountStatus.DRAFT.value:
        raise HTTPException(400, "Only draft counts can be started")

    inv_count.status = CountStatus.IN_PROGRESS.value
    inv_count.started_at = datetime.utcnow()
    inv_count.counter_id = str(current_user.id)

    if freeze_stock:
        inv_count.is_stock_frozen = True
        inv_count.frozen_at = datetime.utcnow()

    session.add(inv_count)
    session.commit()
    session.refresh(inv_count)

    return {"success": True, "count": inv_count.model_dump()}


@router.put("/inventory-counts/{count_id}/lines/{line_id}")
def update_count_line(
    count_id: str,
    line_id: str,
    payload: CountLineUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a count line with actual count"""
    tenant_id = str(current_user.tenant_id)

    inv_count = session.get(InventoryCount, count_id)
    if not inv_count or str(inv_count.tenant_id) != tenant_id:
        raise HTTPException(404, "Inventory count not found")

    if inv_count.status != CountStatus.IN_PROGRESS.value:
        raise HTTPException(400, "Count must be in progress")

    line = session.get(InventoryCountLine, line_id)
    if not line or str(line.tenant_id) != tenant_id or line.count_id != count_id:
        raise HTTPException(404, "Count line not found")

    line.counted_quantity = payload.counted_quantity
    line.variance_quantity = payload.counted_quantity - line.system_quantity
    line.counted_value = payload.counted_quantity * line.unit_cost
    line.variance_value = line.counted_value - line.system_value
    line.variance_reason = payload.variance_reason
    line.notes = payload.notes
    line.counted_by = str(current_user.id)
    line.counted_at = datetime.utcnow()

    session.add(line)
    session.commit()
    session.refresh(line)

    return line.model_dump()


@router.post("/inventory-counts/{count_id}/complete")
def complete_count(
    count_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete the counting process"""
    tenant_id = str(current_user.tenant_id)

    inv_count = session.get(InventoryCount, count_id)
    if not inv_count or str(inv_count.tenant_id) != tenant_id:
        raise HTTPException(404, "Inventory count not found")

    if inv_count.status != CountStatus.IN_PROGRESS.value:
        raise HTTPException(400, "Only in-progress counts can be completed")

    # Calculate totals
    lines = session.exec(
        select(InventoryCountLine).where(
            InventoryCountLine.count_id == count_id
        )
    ).all()

    lines_counted = sum(1 for line in lines if line.counted_quantity is not None)
    lines_with_variance = sum(1 for line in lines if line.variance_quantity != 0)
    total_counted_value = sum(line.counted_value or Decimal("0") for line in lines)
    total_variance_value = sum(line.variance_value or Decimal("0") for line in lines)

    inv_count.lines_counted = lines_counted
    inv_count.lines_with_variance = lines_with_variance
    inv_count.total_counted_value = total_counted_value
    inv_count.total_variance_value = total_variance_value
    inv_count.status = CountStatus.COMPLETED.value
    inv_count.completed_at = datetime.utcnow()

    session.add(inv_count)
    session.commit()
    session.refresh(inv_count)

    return {"success": True, "count": inv_count.model_dump()}


@router.post("/inventory-counts/{count_id}/approve")
def approve_count(
    count_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve the count and create adjustments"""
    tenant_id = str(current_user.tenant_id)

    inv_count = session.get(InventoryCount, count_id)
    if not inv_count or str(inv_count.tenant_id) != tenant_id:
        raise HTTPException(404, "Inventory count not found")

    if inv_count.status != CountStatus.COMPLETED.value:
        raise HTTPException(400, "Only completed counts can be approved")

    # Create adjustments for lines with variance
    lines = session.exec(
        select(InventoryCountLine).where(
            InventoryCountLine.count_id == count_id,
            InventoryCountLine.variance_quantity != 0
        )
    ).all()

    adj_count = session.exec(
        select(func.count(StockAdjustment.id)).where(
            StockAdjustment.tenant_id == tenant_id
        )
    ).one() or 0

    for line in lines:
        adj_count += 1
        adjustment = StockAdjustment(
            tenant_id=tenant_id,
            adjustment_number=f"ADJ-{datetime.now().year}-{adj_count:06d}",
            adjustment_date=datetime.utcnow(),
            adjustment_type=AdjustmentType.PHYSICAL_COUNT.value,
            status="APPROVED",
            warehouse_id=inv_count.warehouse_id,
            source_document_type="INVENTORY_COUNT",
            source_document_id=count_id,
            source_document_number=inv_count.count_number,
            product_id=line.product_id,
            product_code=line.product_code,
            product_name=line.product_name,
            location_id=line.location_id,
            lot_id=line.lot_id,
            quantity_before=line.system_quantity,
            adjustment_quantity=line.variance_quantity,
            quantity_after=line.counted_quantity,
            unit_cost=line.unit_cost,
            adjustment_value=line.variance_value,
            reason=line.variance_reason or "Physical count adjustment",
            approved_at=datetime.utcnow(),
            approved_by=str(current_user.id),
            created_by=str(current_user.id),
        )
        session.add(adjustment)

        # Update stock level
        stock_query = select(StockLevel).where(
            StockLevel.tenant_id == tenant_id,
            StockLevel.product_id == line.product_id,
            StockLevel.warehouse_id == inv_count.warehouse_id
        )
        if line.location_id:
            stock_query = stock_query.where(StockLevel.location_id == line.location_id)
        if line.lot_id:
            stock_query = stock_query.where(StockLevel.lot_id == line.lot_id)

        stock = session.exec(stock_query).first()
        if stock:
            stock.quantity_on_hand = line.counted_quantity
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
            stock.total_value = stock.quantity_on_hand * stock.unit_cost
            stock.last_count_date = datetime.utcnow()
            session.add(stock)

    inv_count.status = CountStatus.ADJUSTED.value
    inv_count.approved_at = datetime.utcnow()
    inv_count.approved_by = str(current_user.id)
    inv_count.is_stock_frozen = False

    session.add(inv_count)
    session.commit()
    session.refresh(inv_count)

    return {"success": True, "count": inv_count.model_dump(), "adjustments_created": len(lines)}


# =====================
# STOCK ADJUSTMENTS
# =====================

@router.get("/adjustments")
def list_adjustments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    adjustment_type: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List stock adjustments"""
    tenant_id = str(current_user.tenant_id)

    query = select(StockAdjustment).where(StockAdjustment.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(StockAdjustment.warehouse_id == warehouse_id)

    if adjustment_type:
        query = query.where(StockAdjustment.adjustment_type == adjustment_type)

    if product_id:
        query = query.where(StockAdjustment.product_id == product_id)

    if date_from:
        query = query.where(StockAdjustment.adjustment_date >= date_from)

    if date_to:
        query = query.where(StockAdjustment.adjustment_date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(StockAdjustment.adjustment_date.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/adjustments")
def create_adjustment(
    payload: AdjustmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a stock adjustment"""
    tenant_id = str(current_user.tenant_id)

    # Get current stock
    stock_query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.product_id == payload.product_id,
        StockLevel.warehouse_id == payload.warehouse_id
    )
    if payload.location_id:
        stock_query = stock_query.where(StockLevel.location_id == payload.location_id)
    if payload.lot_id:
        stock_query = stock_query.where(StockLevel.lot_id == payload.lot_id)

    stock = session.exec(stock_query).first()
    quantity_before = stock.quantity_on_hand if stock else Decimal("0")

    # Generate adjustment number
    count = session.exec(
        select(func.count(StockAdjustment.id)).where(
            StockAdjustment.tenant_id == tenant_id
        )
    ).one() or 0

    adjustment = StockAdjustment(
        tenant_id=tenant_id,
        adjustment_number=f"ADJ-{datetime.now().year}-{count + 1:06d}",
        adjustment_date=datetime.utcnow(),
        **payload.model_dump(),
        status="DRAFT",
        quantity_before=quantity_before,
        quantity_after=quantity_before + payload.adjustment_quantity,
        adjustment_value=payload.adjustment_quantity * payload.unit_cost,
        created_by=str(current_user.id),
    )

    session.add(adjustment)
    session.commit()
    session.refresh(adjustment)

    return adjustment.model_dump()


@router.post("/adjustments/{adjustment_id}/approve")
def approve_adjustment(
    adjustment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve and apply a stock adjustment"""
    tenant_id = str(current_user.tenant_id)

    adjustment = session.get(StockAdjustment, adjustment_id)
    if not adjustment or str(adjustment.tenant_id) != tenant_id:
        raise HTTPException(404, "Adjustment not found")

    if adjustment.status != "DRAFT":
        raise HTTPException(400, "Only draft adjustments can be approved")

    # Update stock level
    stock_query = select(StockLevel).where(
        StockLevel.tenant_id == tenant_id,
        StockLevel.product_id == adjustment.product_id,
        StockLevel.warehouse_id == adjustment.warehouse_id
    )
    if adjustment.location_id:
        stock_query = stock_query.where(StockLevel.location_id == adjustment.location_id)
    if adjustment.lot_id:
        stock_query = stock_query.where(StockLevel.lot_id == adjustment.lot_id)

    stock = session.exec(stock_query).first()

    if not stock:
        stock = StockLevel(
            tenant_id=tenant_id,
            product_id=adjustment.product_id,
            warehouse_id=adjustment.warehouse_id,
            location_id=adjustment.location_id,
            lot_id=adjustment.lot_id,
            quantity_on_hand=Decimal("0"),
            quantity_reserved=Decimal("0"),
            quantity_available=Decimal("0"),
            unit_cost=adjustment.unit_cost,
        )

    stock.quantity_on_hand += adjustment.adjustment_quantity
    stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
    stock.total_value = stock.quantity_on_hand * stock.unit_cost
    stock.last_move_date = datetime.utcnow()
    session.add(stock)

    adjustment.status = "APPROVED"
    adjustment.approved_at = datetime.utcnow()
    adjustment.approved_by = str(current_user.id)
    session.add(adjustment)

    session.commit()
    session.refresh(adjustment)

    return {"success": True, "adjustment": adjustment.model_dump()}
