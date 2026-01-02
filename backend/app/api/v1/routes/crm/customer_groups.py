"""
CRM - Customer Groups API Routes
Manage customer segmentation groups
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.account import CustomerGroup, Account
from app.core.security import get_current_user

router = APIRouter(prefix="/customer-groups", tags=["CRM - Customer Groups"])


class CustomerGroupCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    discount_percent: float = 0
    credit_limit_default: float = 0
    payment_terms_default: Optional[str] = None
    priority: int = 0


class CustomerGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    credit_limit_default: Optional[float] = None
    payment_terms_default: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("")
def list_customer_groups(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all customer groups"""
    tenant_id = str(current_user.tenant_id)

    query = select(CustomerGroup).where(CustomerGroup.tenant_id == tenant_id)

    if is_active is not None:
        query = query.where(CustomerGroup.is_active == is_active)

    if search:
        query = query.where(
            CustomerGroup.name.ilike(f"%{search}%") |
            CustomerGroup.code.ilike(f"%{search}%")
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(CustomerGroup.priority.desc(), CustomerGroup.name).offset(offset).limit(page_size)

    groups = session.exec(query).all()

    # Get customer count for each group
    items = []
    for group in groups:
        customer_count = session.exec(
            select(func.count()).where(
                Account.tenant_id == tenant_id,
                Account.customer_group_id == group.id
            )
        ).one()

        items.append({
            "id": group.id,
            "code": group.code,
            "name": group.name,
            "description": group.description,
            "discount_percent": group.discount_percent,
            "credit_limit_default": group.credit_limit_default,
            "payment_terms_default": group.payment_terms_default,
            "priority": group.priority,
            "is_active": group.is_active,
            "customer_count": customer_count,
            "created_at": str(group.created_at) if group.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/all")
def get_all_customer_groups(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all active customer groups (for dropdowns)"""
    tenant_id = str(current_user.tenant_id)

    groups = session.exec(
        select(CustomerGroup).where(
            CustomerGroup.tenant_id == tenant_id,
            CustomerGroup.is_active == True
        ).order_by(CustomerGroup.priority.desc(), CustomerGroup.name)
    ).all()

    return {
        "items": [
            {
                "id": g.id,
                "code": g.code,
                "name": g.name,
                "discount_percent": g.discount_percent,
            }
            for g in groups
        ]
    }


@router.post("")
def create_customer_group(
    payload: CustomerGroupCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new customer group"""
    tenant_id = str(current_user.tenant_id)

    # Check if code exists
    existing = session.exec(
        select(CustomerGroup).where(
            CustomerGroup.tenant_id == tenant_id,
            CustomerGroup.code == payload.code
        )
    ).first()

    if existing:
        raise HTTPException(400, f"Customer group with code '{payload.code}' already exists")

    group = CustomerGroup(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(group)
    session.commit()
    session.refresh(group)

    return group


@router.get("/{group_id}")
def get_customer_group(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get customer group by ID"""
    tenant_id = str(current_user.tenant_id)

    group = session.get(CustomerGroup, group_id)
    if not group or str(group.tenant_id) != tenant_id:
        raise HTTPException(404, "Customer group not found")

    # Get customer count
    customer_count = session.exec(
        select(func.count()).where(
            Account.tenant_id == tenant_id,
            Account.customer_group_id == group.id
        )
    ).one()

    return {
        **group.model_dump(),
        "customer_count": customer_count,
        "created_at": str(group.created_at) if group.created_at else None,
        "updated_at": str(group.updated_at) if group.updated_at else None,
    }


@router.get("/{group_id}/customers")
def get_group_customers(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """Get customers in a group"""
    tenant_id = str(current_user.tenant_id)

    group = session.get(CustomerGroup, group_id)
    if not group or str(group.tenant_id) != tenant_id:
        raise HTTPException(404, "Customer group not found")

    query = select(Account).where(
        Account.tenant_id == tenant_id,
        Account.customer_group_id == group_id
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Account.name).offset(offset).limit(page_size)

    accounts = session.exec(query).all()

    return {
        "items": [
            {
                "id": acc.id,
                "code": acc.code,
                "name": acc.name,
                "account_type": acc.account_type,
                "status": acc.status,
            }
            for acc in accounts
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.put("/{group_id}")
def update_customer_group(
    group_id: str,
    payload: CustomerGroupUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a customer group"""
    tenant_id = str(current_user.tenant_id)

    group = session.get(CustomerGroup, group_id)
    if not group or str(group.tenant_id) != tenant_id:
        raise HTTPException(404, "Customer group not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(group, key, value)

    group.updated_at = datetime.utcnow()

    session.add(group)
    session.commit()
    session.refresh(group)

    return group


@router.delete("/{group_id}")
def delete_customer_group(
    group_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a customer group"""
    tenant_id = str(current_user.tenant_id)

    group = session.get(CustomerGroup, group_id)
    if not group or str(group.tenant_id) != tenant_id:
        raise HTTPException(404, "Customer group not found")

    # Check if group has customers
    customer_count = session.exec(
        select(func.count()).where(
            Account.tenant_id == tenant_id,
            Account.customer_group_id == group_id
        )
    ).one()

    if customer_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete group with {customer_count} customers. Remove customers first or deactivate the group."
        )

    session.delete(group)
    session.commit()

    return {"success": True, "message": "Customer group deleted"}
