"""
CRM Account Contacts API
Unified contact management for CRM Accounts (used by both TMS and CRM)
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account
from app.models.customer_contact import CustomerContact, ContactType
from app.core.security import get_current_user

router = APIRouter(prefix="/accounts/{account_id}/contacts", tags=["CRM - Account Contacts"])


# ============ Pydantic Schemas ============

class ContactCreate(BaseModel):
    contact_type: str = ContactType.GENERAL.value
    name: str
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    is_primary: bool = False
    is_decision_maker: bool = False
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    contact_type: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    is_primary: Optional[bool] = None
    is_decision_maker: Optional[bool] = None
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
def list_contacts(
    account_id: str,
    contact_type: Optional[str] = Query(None, description="Filter by contact type"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for an account"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    query = select(CustomerContact).where(
        CustomerContact.account_id == account_id,
        CustomerContact.tenant_id == tenant_id,
        CustomerContact.is_active == True
    )

    if contact_type:
        query = query.where(CustomerContact.contact_type == contact_type)

    query = query.order_by(CustomerContact.contact_type, CustomerContact.is_primary.desc())

    return session.exec(query).all()


@router.get("/{contact_id}")
def get_contact(
    account_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single contact"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.account_id == account_id,
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    return contact


@router.post("")
def create_contact(
    account_id: str,
    payload: ContactCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new contact for an account"""
    tenant_id = str(current_user.tenant_id)
    account = verify_account_access(session, account_id, tenant_id)

    # If this is marked as primary, unset other primary contacts of same type
    if payload.is_primary:
        existing_primary = session.exec(
            select(CustomerContact).where(
                CustomerContact.account_id == account_id,
                CustomerContact.tenant_id == tenant_id,
                CustomerContact.contact_type == payload.contact_type,
                CustomerContact.is_primary == True
            )
        ).all()
        for c in existing_primary:
            c.is_primary = False
            session.add(c)

    contact = CustomerContact(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=account.tms_customer_id,  # Also set customer_id for backward compatibility
        **payload.model_dump()
    )

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact


@router.put("/{contact_id}")
def update_contact(
    account_id: str,
    contact_id: str,
    payload: ContactUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a contact"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.account_id == account_id,
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    # Handle primary flag changes
    if payload.is_primary is True and not contact.is_primary:
        contact_type = payload.contact_type or contact.contact_type
        existing_primary = session.exec(
            select(CustomerContact).where(
                CustomerContact.account_id == account_id,
                CustomerContact.tenant_id == tenant_id,
                CustomerContact.contact_type == contact_type,
                CustomerContact.is_primary == True,
                CustomerContact.id != contact_id
            )
        ).all()
        for c in existing_primary:
            c.is_primary = False
            session.add(c)

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact


@router.delete("/{contact_id}")
def delete_contact(
    account_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a contact"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.account_id == account_id,
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    contact.is_active = False
    session.add(contact)
    session.commit()

    return {"message": "Contact deleted successfully"}


@router.patch("/{contact_id}/set-primary")
def set_primary_contact(
    account_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set a contact as primary for its type"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.account_id == account_id,
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_active == True
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    # Unset other primary contacts of same type
    existing_primary = session.exec(
        select(CustomerContact).where(
            CustomerContact.account_id == account_id,
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.contact_type == contact.contact_type,
            CustomerContact.is_primary == True,
            CustomerContact.id != contact_id
        )
    ).all()

    for c in existing_primary:
        c.is_primary = False
        session.add(c)

    contact.is_primary = True
    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact
