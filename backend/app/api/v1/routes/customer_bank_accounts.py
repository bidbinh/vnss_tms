from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Customer, CustomerBankAccount, User
from app.core.security import get_current_user
from app.services.customer_sync_service import sync_customer_to_crm

router = APIRouter(prefix="/customers/{customer_id}/bank-accounts", tags=["Customer Bank Accounts"])


# ============ Pydantic Schemas ============

class CustomerBankAccountCreate(BaseModel):
    bank_name: str
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: str
    account_holder: str
    is_primary: bool = False
    notes: Optional[str] = None


class CustomerBankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


# ============ Helper Functions ============

def verify_customer_access(session: Session, customer_id: str, tenant_id: str) -> Customer:
    """Verify customer exists and belongs to tenant"""
    customer = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


# ============ API Endpoints ============

@router.get("")
def list_bank_accounts(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all bank accounts for a customer"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    accounts = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True
        ).order_by(CustomerBankAccount.is_primary.desc())
    ).all()

    return accounts


@router.get("/{bank_account_id}")
def get_bank_account(
    customer_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single bank account"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not account:
        raise HTTPException(404, "Bank account not found")

    return account


@router.post("")
def create_bank_account(
    customer_id: str,
    payload: CustomerBankAccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new bank account for a customer"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    # If this is marked as primary, unset other primaries
    if payload.is_primary:
        existing_primaries = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.customer_id == customer_id,
                CustomerBankAccount.tenant_id == tenant_id,
                CustomerBankAccount.is_primary == True
            )
        ).all()
        for acc in existing_primaries:
            acc.is_primary = False
            session.add(acc)

    # If this is the first account, make it primary
    existing_count = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True
        )
    ).all()

    if len(existing_count) == 0:
        payload_dict = payload.model_dump()
        payload_dict['is_primary'] = True
    else:
        payload_dict = payload.model_dump()

    account = CustomerBankAccount(
        tenant_id=tenant_id,
        customer_id=customer_id,
        **payload_dict
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return account


@router.put("/{bank_account_id}")
def update_bank_account(
    customer_id: str,
    bank_account_id: str,
    payload: CustomerBankAccountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a bank account"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not account:
        raise HTTPException(404, "Bank account not found")

    # Handle primary flag changes
    if payload.is_primary is True and not account.is_primary:
        existing_primaries = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.customer_id == customer_id,
                CustomerBankAccount.tenant_id == tenant_id,
                CustomerBankAccount.is_primary == True,
                CustomerBankAccount.id != bank_account_id
            )
        ).all()
        for acc in existing_primaries:
            acc.is_primary = False
            session.add(acc)

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    session.add(account)
    session.commit()
    session.refresh(account)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return account


@router.delete("/{bank_account_id}")
def delete_bank_account(
    customer_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a bank account"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not account:
        raise HTTPException(404, "Bank account not found")

    account.is_active = False
    session.add(account)
    session.commit()

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return {"message": "Bank account deleted successfully"}


@router.patch("/{bank_account_id}/set-primary")
def set_primary_bank_account(
    customer_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set a bank account as primary"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True
        )
    ).first()

    if not account:
        raise HTTPException(404, "Bank account not found")

    # Unset other primaries
    existing_primaries = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.customer_id == customer_id,
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_primary == True,
            CustomerBankAccount.id != bank_account_id
        )
    ).all()

    for acc in existing_primaries:
        acc.is_primary = False
        session.add(acc)

    account.is_primary = True
    session.add(account)
    session.commit()
    session.refresh(account)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return account
