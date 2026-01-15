"""
OMS - Allocations API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.oms import (
    OMSAllocation, AllocationSourceType, AllocationStatus,
    OMSOrder, OMSOrderItem
)
from app.services.oms.status_logger import log_status_change
from app.core.security import get_current_user

router = APIRouter(prefix="/allocations", tags=["OMS - Allocations"])


# ============================================
# Schemas
# ============================================

class AllocationCreate(BaseModel):
    order_id: str
    order_item_id: str
    source_type: str
    source_id: str
    source_name: str
    source_location: Optional[str] = None
    allocated_quantity: Decimal
    notes: Optional[str] = None


class AllocationUpdate(BaseModel):
    allocated_quantity: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ============================================
# List
# ============================================

@router.get("")
def list_allocations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    order_id: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List allocations with filtering"""
    tenant_id = str(current_user.tenant_id)

    query = select(OMSAllocation).where(OMSAllocation.tenant_id == tenant_id)

    if order_id:
        query = query.where(OMSAllocation.order_id == order_id)

    if source_type:
        query = query.where(OMSAllocation.source_type == source_type)

    if status:
        query = query.where(OMSAllocation.status == status)

    total = session.exec(
        select(func.count(OMSAllocation.id)).where(OMSAllocation.tenant_id == tenant_id)
    ).one()

    allocations = session.exec(
        query.order_by(OMSAllocation.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "data": [alloc.model_dump() for alloc in allocations],
        "total": total,
        "skip": skip,
        "limit": limit
    }


# ============================================
# Get Detail
# ============================================

@router.get("/{allocation_id}")
def get_allocation(
    allocation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get allocation detail"""
    tenant_id = str(current_user.tenant_id)

    allocation = session.get(OMSAllocation, allocation_id)
    if not allocation or str(allocation.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Allocation not found")

    return allocation.model_dump()


# ============================================
# Create
# ============================================

@router.post("")
def create_allocation(
    payload: AllocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create allocation"""
    tenant_id = str(current_user.tenant_id)

    # Verify order exists
    order = session.get(OMSOrder, payload.order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify order item exists
    order_item = session.get(OMSOrderItem, payload.order_item_id)
    if not order_item or str(order_item.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Order item not found")

    # Check if quantity is valid
    if payload.allocated_quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")

    # Check if over-allocating
    existing_allocations = session.exec(
        select(func.sum(OMSAllocation.allocated_quantity))
        .where(OMSAllocation.order_item_id == payload.order_item_id)
    ).one()

    total_allocated = (existing_allocations or Decimal(0)) + payload.allocated_quantity
    if total_allocated > order_item.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Total allocated ({total_allocated}) exceeds order quantity ({order_item.quantity})"
        )

    # Create allocation
    allocation = OMSAllocation(
        tenant_id=tenant_id,
        order_id=payload.order_id,
        order_item_id=payload.order_item_id,
        source_type=payload.source_type,
        source_id=payload.source_id,
        source_name=payload.source_name,
        source_location=payload.source_location,
        allocated_quantity=payload.allocated_quantity,
        allocated_date=datetime.utcnow(),
        allocated_by_id=str(current_user.id),
        status=AllocationStatus.ALLOCATED.value,
        notes=payload.notes
    )

    session.add(allocation)

    # Update order item allocated quantity
    order_item.quantity_allocated = total_allocated

    session.commit()
    session.refresh(allocation)

    return allocation.model_dump()


# ============================================
# Update
# ============================================

@router.put("/{allocation_id}")
def update_allocation(
    allocation_id: str,
    payload: AllocationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update allocation"""
    tenant_id = str(current_user.tenant_id)

    allocation = session.get(OMSAllocation, allocation_id)
    if not allocation or str(allocation.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Allocation not found")

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(allocation, field, value)

    allocation.updated_at = datetime.utcnow()

    session.add(allocation)
    session.commit()
    session.refresh(allocation)

    return allocation.model_dump()


# ============================================
# Delete
# ============================================

@router.delete("/{allocation_id}")
def delete_allocation(
    allocation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete allocation"""
    tenant_id = str(current_user.tenant_id)

    allocation = session.get(OMSAllocation, allocation_id)
    if not allocation or str(allocation.tenant_id) != tenant_id:
        raise HTTPException(status_code=404, detail="Allocation not found")

    # Update order item allocated quantity
    order_item = session.get(OMSOrderItem, allocation.order_item_id)
    if order_item:
        order_item.quantity_allocated -= allocation.allocated_quantity

    session.delete(allocation)
    session.commit()

    return {"success": True}
