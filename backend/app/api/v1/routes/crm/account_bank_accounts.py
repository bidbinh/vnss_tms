"""
CRM Account Bank Accounts API
Unified bank account management for CRM Accounts (used by both TMS and CRM)
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account
from app.models.customer_bank_account import CustomerBankAccount
from app.core.security import get_current_user

router = APIRouter(prefix="/accounts/{account_id}/bank-accounts", tags=["CRM - Account Bank Accounts"])


# ============ Pydantic Schemas ============

class BankAccountCreate(BaseModel):
    bank_name: str
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: str
    account_holder: str
    is_primary: bool = False
    notes: Optional[str] = None


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


# ============ Helper Functions ============

def verify_account_access(session: Session, account_id: str, tenant_id: str) -> Account:
    """Verify account exists and belongs to tenant"""
    account = session.exec(
        select(Account).where(
            Account.id == account_id,
            Account.tenant_id == tenant_id
        )
    ).first()
    if not account:
        raise HTTPException(404, "Account not found")
    return account


# ============ API Endpoints ============

@router.get("")
def list_bank_accounts(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all bank accounts for an account"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    query = select(CustomerBankAccount).where(
        CustomerBankAccount.account_id == account_id,
        CustomerBankAccount.tenant_id == tenant_id,
        CustomerBankAccount.is_active == True
    ).order_by(CustomerBankAccount.is_primary.desc())

    return session.exec(query).all()


@router.get("/{bank_account_id}")
def get_bank_account(
    account_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single bank account"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    bank_account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not bank_account:
        raise HTTPException(404, "Bank account not found")

    return bank_account


@router.post("")
def create_bank_account(
    account_id: str,
    payload: BankAccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new bank account for an account"""
    tenant_id = str(current_user.tenant_id)
    account = verify_account_access(session, account_id, tenant_id)

    # If this is marked as primary, unset other primary accounts
    if payload.is_primary:
        existing_primary = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.tenant_id == tenant_id,
                CustomerBankAccount.is_primary == True
            )
        ).all()
        for ba in existing_primary:
            ba.is_primary = False
            session.add(ba)

    bank_account = CustomerBankAccount(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=account.tms_customer_id,  # Also set customer_id for backward compatibility
        **payload.model_dump()
    )

    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)

    return bank_account


@router.put("/{bank_account_id}")
def update_bank_account(
    account_id: str,
    bank_account_id: str,
    payload: BankAccountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a bank account"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    bank_account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not bank_account:
        raise HTTPException(404, "Bank account not found")

    # Handle primary flag changes
    if payload.is_primary is True and not bank_account.is_primary:
        existing_primary = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.tenant_id == tenant_id,
                CustomerBankAccount.is_primary == True,
                CustomerBankAccount.id != bank_account_id
            )
        ).all()
        for ba in existing_primary:
            ba.is_primary = False
            session.add(ba)

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bank_account, key, value)

    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)

    return bank_account


@router.delete("/{bank_account_id}")
def delete_bank_account(
    account_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a bank account"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    bank_account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not bank_account:
        raise HTTPException(404, "Bank account not found")

    bank_account.is_active = False
    session.add(bank_account)
    session.commit()

    return {"message": "Bank account deleted successfully"}


@router.patch("/{bank_account_id}/set-primary")
def set_primary_bank_account(
    account_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set a bank account as primary"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    bank_account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True
        )
    ).first()

    if not bank_account:
        raise HTTPException(404, "Bank account not found")

    # Unset other primary accounts
    existing_primary = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_primary == True,
            CustomerBankAccount.id != bank_account_id
        )
    ).all()

    for ba in existing_primary:
        ba.is_primary = False
        session.add(ba)

    bank_account.is_primary = True
    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)

    return bank_account
