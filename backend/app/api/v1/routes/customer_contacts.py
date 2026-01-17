from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Customer, CustomerContact, ContactType, User
from app.core.security import get_current_user
from app.services.customer_sync_service import sync_customer_to_crm

router = APIRouter(prefix="/customers/{customer_id}/contacts", tags=["Customer Contacts"])


# ============ Pydantic Schemas ============

class CustomerContactCreate(BaseModel):
    name: str
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    zalo: Optional[str] = None
    contact_type: str = ContactType.GENERAL.value
    is_primary: bool = False
    is_decision_maker: bool = False
    notes: Optional[str] = None


class CustomerContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    zalo: Optional[str] = None
    contact_type: Optional[str] = None
    is_primary: Optional[bool] = None
    is_decision_maker: Optional[bool] = None
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
def list_contacts(
    customer_id: str,
    contact_type: Optional[str] = Query(None, description="Filter by contact type"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for a customer"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    query = select(CustomerContact).where(
        CustomerContact.customer_id == customer_id,
        CustomerContact.tenant_id == tenant_id,
        CustomerContact.is_active == True
    )

    if contact_type:
        query = query.where(CustomerContact.contact_type == contact_type)

    query = query.order_by(CustomerContact.is_primary.desc(), CustomerContact.name)

    return session.exec(query).all()


@router.get("/{contact_id}")
def get_contact(
    customer_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single contact"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.customer_id == customer_id,
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    return contact


@router.post("")
def create_contact(
    customer_id: str,
    payload: CustomerContactCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new contact for a customer"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    # If this is marked as primary, unset other primaries
    if payload.is_primary:
        existing_primaries = session.exec(
            select(CustomerContact).where(
                CustomerContact.customer_id == customer_id,
                CustomerContact.tenant_id == tenant_id,
                CustomerContact.is_primary == True
            )
        ).all()
        for c in existing_primaries:
            c.is_primary = False
            session.add(c)

    # If this is the first contact, make it primary
    existing_count = session.exec(
        select(CustomerContact).where(
            CustomerContact.customer_id == customer_id,
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_active == True
        )
    ).all()

    if len(existing_count) == 0:
        payload_dict = payload.model_dump()
        payload_dict['is_primary'] = True
    else:
        payload_dict = payload.model_dump()

    contact = CustomerContact(
        tenant_id=tenant_id,
        customer_id=customer_id,
        **payload_dict
    )

    session.add(contact)
    session.commit()
    session.refresh(contact)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return contact


@router.put("/{contact_id}")
def update_contact(
    customer_id: str,
    contact_id: str,
    payload: CustomerContactUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a contact"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.customer_id == customer_id,
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    # Handle primary flag changes
    if payload.is_primary is True and not contact.is_primary:
        existing_primaries = session.exec(
            select(CustomerContact).where(
                CustomerContact.customer_id == customer_id,
                CustomerContact.tenant_id == tenant_id,
                CustomerContact.is_primary == True,
                CustomerContact.id != contact_id
            )
        ).all()
        for c in existing_primaries:
            c.is_primary = False
            session.add(c)

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)

    session.add(contact)
    session.commit()
    session.refresh(contact)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return contact


@router.delete("/{contact_id}")
def delete_contact(
    customer_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a contact"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.customer_id == customer_id,
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    contact.is_active = False
    session.add(contact)
    session.commit()

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return {"message": "Contact deleted successfully"}


@router.patch("/{contact_id}/set-primary")
def set_primary_contact(
    customer_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set a contact as primary"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            CustomerContact.customer_id == customer_id,
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_active == True
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    # Unset other primaries
    existing_primaries = session.exec(
        select(CustomerContact).where(
            CustomerContact.customer_id == customer_id,
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_primary == True,
            CustomerContact.id != contact_id
        )
    ).all()

    for c in existing_primaries:
        c.is_primary = False
        session.add(c)

    contact.is_primary = True
    session.add(contact)
    session.commit()
    session.refresh(contact)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return contact
