"""
CRM - Contracts API Routes
Manage customer contracts
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account
from app.models.crm.contract import Contract, ContractStatus
from app.core.security import get_current_user

router = APIRouter(prefix="/contracts", tags=["CRM - Contracts"])


class ContractCreate(BaseModel):
    code: str
    name: str
    account_id: str
    opportunity_id: Optional[str] = None
    quote_id: Optional[str] = None
    contract_type: str = "SERVICE"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_value: float = 0
    currency: str = "VND"
    payment_terms: Optional[str] = None
    billing_frequency: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None


class ContractUpdate(BaseModel):
    name: Optional[str] = None
    contract_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_value: Optional[float] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    billing_frequency: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None
    signed_by: Optional[str] = None
    signed_date: Optional[str] = None


@router.get("")
def list_contracts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all contracts"""
    tenant_id = str(current_user.tenant_id)

    query = select(Contract).where(Contract.tenant_id == tenant_id)

    if account_id:
        query = query.where(Contract.account_id == account_id)

    if status:
        query = query.where(Contract.status == status)

    if contract_type:
        query = query.where(Contract.contract_type == contract_type)

    if search:
        search_filter = or_(
            Contract.name.ilike(f"%{search}%"),
            Contract.code.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Contract.created_at.desc()).offset(offset).limit(page_size)

    contracts = session.exec(query).all()

    items = []
    for contract in contracts:
        items.append({
            "id": contract.id,
            "code": contract.code,
            "name": contract.name,
            "account_id": contract.account_id,
            "opportunity_id": contract.opportunity_id,
            "quote_id": contract.quote_id,
            "contract_type": contract.contract_type,
            "status": contract.status,
            "start_date": contract.start_date,
            "end_date": contract.end_date,
            "total_value": contract.total_value,
            "currency": contract.currency,
            "payment_terms": contract.payment_terms,
            "created_at": str(contract.created_at) if contract.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_contract(
    payload: ContractCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new contract"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(Contract).where(
            Contract.tenant_id == tenant_id,
            Contract.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Contract code '{payload.code}' already exists")

    # Validate account
    account = session.get(Account, payload.account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid account_id")

    contract = Contract(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=ContractStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(contract)
    session.commit()
    session.refresh(contract)

    return contract


@router.get("/{contract_id}")
def get_contract(
    contract_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get contract by ID"""
    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract or str(contract.tenant_id) != tenant_id:
        raise HTTPException(404, "Contract not found")

    account = session.get(Account, contract.account_id)

    return {
        **contract.model_dump(),
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "created_at": str(contract.created_at) if contract.created_at else None,
        "updated_at": str(contract.updated_at) if contract.updated_at else None,
    }


@router.put("/{contract_id}")
def update_contract(
    contract_id: str,
    payload: ContractUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a contract"""
    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract or str(contract.tenant_id) != tenant_id:
        raise HTTPException(404, "Contract not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)

    contract.updated_at = datetime.utcnow()

    session.add(contract)
    session.commit()
    session.refresh(contract)

    return contract


@router.delete("/{contract_id}")
def delete_contract(
    contract_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a contract"""
    tenant_id = str(current_user.tenant_id)

    contract = session.get(Contract, contract_id)
    if not contract or str(contract.tenant_id) != tenant_id:
        raise HTTPException(404, "Contract not found")

    if contract.status == ContractStatus.ACTIVE.value:
        raise HTTPException(400, "Cannot delete an active contract")

    session.delete(contract)
    session.commit()

    return {"success": True, "message": "Contract deleted"}
