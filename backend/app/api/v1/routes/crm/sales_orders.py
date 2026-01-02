"""
CRM - Sales Orders API Routes
Manage customer sales orders
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account
from app.models.crm.sales_order import SalesOrder, SalesOrderStatus, SalesOrderPaymentStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/sales-orders", tags=["CRM - Sales Orders"])


class SalesOrderCreate(BaseModel):
    code: str
    account_id: str
    contact_id: Optional[str] = None
    quote_id: Optional[str] = None
    contract_id: Optional[str] = None
    order_date: Optional[str] = None
    delivery_date: Optional[str] = None
    subtotal: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    currency: str = "VND"
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    payment_method: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class SalesOrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    order_date: Optional[str] = None
    delivery_date: Optional[str] = None
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    total_amount: Optional[float] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    payment_method: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None


@router.get("")
def list_sales_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all sales orders"""
    tenant_id = str(current_user.tenant_id)

    query = select(SalesOrder).where(SalesOrder.tenant_id == tenant_id)

    if account_id:
        query = query.where(SalesOrder.account_id == account_id)

    if status:
        query = query.where(SalesOrder.status == status)

    if payment_status:
        query = query.where(SalesOrder.payment_status == payment_status)

    if search:
        search_filter = or_(
            SalesOrder.code.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(SalesOrder.created_at.desc()).offset(offset).limit(page_size)

    orders = session.exec(query).all()

    items = []
    for order in orders:
        items.append({
            "id": order.id,
            "code": order.code,
            "account_id": order.account_id,
            "contact_id": order.contact_id,
            "quote_id": order.quote_id,
            "contract_id": order.contract_id,
            "order_date": order.order_date,
            "delivery_date": order.delivery_date,
            "status": order.status,
            "payment_status": order.payment_status,
            "subtotal": order.subtotal,
            "tax_amount": order.tax_amount,
            "discount_amount": order.discount_amount,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "shipping_address": order.shipping_address,
            "notes": order.notes,
            "created_at": str(order.created_at) if order.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_sales_order(
    payload: SalesOrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new sales order"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(SalesOrder).where(
            SalesOrder.tenant_id == tenant_id,
            SalesOrder.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Sales order code '{payload.code}' already exists")

    # Validate account
    account = session.get(Account, payload.account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid account_id")

    order = SalesOrder(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=SalesOrderStatus.DRAFT.value,
        payment_status=SalesOrderPaymentStatus.UNPAID.value,
        created_by=str(current_user.id),
    )

    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.get("/{order_id}")
def get_sales_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get sales order by ID"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(SalesOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Sales order not found")

    account = session.get(Account, order.account_id)

    return {
        **order.model_dump(),
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "created_at": str(order.created_at) if order.created_at else None,
        "updated_at": str(order.updated_at) if order.updated_at else None,
    }


@router.put("/{order_id}")
def update_sales_order(
    order_id: str,
    payload: SalesOrderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a sales order"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(SalesOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Sales order not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.delete("/{order_id}")
def delete_sales_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a sales order"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(SalesOrder, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Sales order not found")

    if order.status not in [SalesOrderStatus.DRAFT.value, SalesOrderStatus.CANCELLED.value]:
        raise HTTPException(400, "Can only delete draft or cancelled orders")

    session.delete(order)
    session.commit()

    return {"success": True, "message": "Sales order deleted"}
