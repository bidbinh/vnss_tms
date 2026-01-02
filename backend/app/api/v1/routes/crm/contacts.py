"""
CRM - Contacts API Routes
Manage contacts associated with accounts
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account
from app.models.crm.contact import Contact, ContactStatus
from app.models.crm.opportunity import Opportunity
from app.models.crm.quote import Quote
from app.core.security import get_current_user

router = APIRouter(prefix="/contacts", tags=["CRM - Contacts"])


class ContactCreate(BaseModel):
    account_id: str
    first_name: str
    last_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_primary: bool = False
    is_billing_contact: bool = False
    is_shipping_contact: bool = False
    decision_maker: bool = False
    birthday: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_primary: Optional[bool] = None
    is_billing_contact: Optional[bool] = None
    is_shipping_contact: Optional[bool] = None
    decision_maker: Optional[bool] = None
    birthday: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_contacts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
):
    """List all contacts"""
    tenant_id = str(current_user.tenant_id)

    query = select(Contact).where(Contact.tenant_id == tenant_id)

    if account_id:
        query = query.where(Contact.account_id == account_id)

    if status:
        query = query.where(Contact.status == status)

    if search:
        search_filter = or_(
            Contact.first_name.ilike(f"%{search}%"),
            Contact.last_name.ilike(f"%{search}%"),
            Contact.full_name.ilike(f"%{search}%"),
            Contact.email.ilike(f"%{search}%"),
            Contact.phone.ilike(f"%{search}%"),
            Contact.mobile.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sorting
    sort_fields = {
        "full_name": Contact.full_name,
        "first_name": Contact.first_name,
        "last_name": Contact.last_name,
        "title": Contact.title,
        "email": Contact.email,
        "phone": Contact.phone,
        "mobile": Contact.mobile,
        "status": Contact.status,
        "created_at": Contact.created_at,
    }
    sort_column = sort_fields.get(sort_by, Contact.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    contacts = session.exec(query).all()

    # Enrich with account info
    items = []
    for contact in contacts:
        account = session.get(Account, contact.account_id)
        items.append({
            "id": contact.id,
            "account_id": contact.account_id,
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
            } if account else None,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "full_name": contact.full_name or f"{contact.first_name} {contact.last_name or ''}".strip(),
            "title": contact.title,
            "department": contact.department,
            "phone": contact.phone,
            "mobile": contact.mobile,
            "email": contact.email,
            "is_primary": contact.is_primary,
            "is_billing_contact": contact.is_billing_contact,
            "decision_maker": contact.decision_maker,
            "status": contact.status,
            "created_at": str(contact.created_at) if contact.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_contact(
    payload: ContactCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new contact"""
    tenant_id = str(current_user.tenant_id)

    # Validate account
    account = session.get(Account, payload.account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid account_id")

    # Compute full_name
    full_name = f"{payload.first_name} {payload.last_name or ''}".strip()

    contact = Contact(
        tenant_id=tenant_id,
        **payload.model_dump(),
        full_name=full_name,
        created_by=str(current_user.id),
    )

    # If this is primary contact, unset other primary contacts
    if payload.is_primary:
        existing_primary = session.exec(
            select(Contact).where(
                Contact.account_id == payload.account_id,
                Contact.is_primary == True
            )
        ).all()
        for ep in existing_primary:
            ep.is_primary = False
            session.add(ep)

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact


@router.get("/{contact_id}")
def get_contact(
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get contact by ID"""
    tenant_id = str(current_user.tenant_id)

    contact = session.get(Contact, contact_id)
    if not contact or str(contact.tenant_id) != tenant_id:
        raise HTTPException(404, "Contact not found")

    account = session.get(Account, contact.account_id)

    return {
        **contact.model_dump(),
        "full_name": contact.full_name or f"{contact.first_name} {contact.last_name or ''}".strip(),
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "created_at": str(contact.created_at) if contact.created_at else None,
        "updated_at": str(contact.updated_at) if contact.updated_at else None,
    }


@router.put("/{contact_id}")
def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a contact"""
    tenant_id = str(current_user.tenant_id)

    contact = session.get(Contact, contact_id)
    if not contact or str(contact.tenant_id) != tenant_id:
        raise HTTPException(404, "Contact not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Handle is_primary
    if update_data.get("is_primary"):
        existing_primary = session.exec(
            select(Contact).where(
                Contact.account_id == contact.account_id,
                Contact.is_primary == True,
                Contact.id != contact_id
            )
        ).all()
        for ep in existing_primary:
            ep.is_primary = False
            session.add(ep)

    for key, value in update_data.items():
        setattr(contact, key, value)

    # Update full_name
    first_name = update_data.get("first_name", contact.first_name)
    last_name = update_data.get("last_name", contact.last_name)
    contact.full_name = f"{first_name} {last_name or ''}".strip()

    contact.updated_at = datetime.utcnow()

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: str,
    force: bool = Query(False, description="Force delete and reassign primary contact"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a contact"""
    tenant_id = str(current_user.tenant_id)

    contact = session.get(Contact, contact_id)
    if not contact or str(contact.tenant_id) != tenant_id:
        raise HTTPException(404, "Contact not found")

    # Check if contact is linked to opportunities
    opp_count = session.exec(
        select(func.count()).where(Opportunity.contact_id == contact_id)
    ).one()

    # Check if contact is linked to quotes
    quote_count = session.exec(
        select(func.count()).where(Quote.contact_id == contact_id)
    ).one()

    # Collect warnings
    warnings = []
    if opp_count > 0:
        warnings.append(f"{opp_count} opportunity(ies)")
    if quote_count > 0:
        warnings.append(f"{quote_count} quote(s)")

    if warnings and not force:
        raise HTTPException(
            400,
            f"Cannot delete contact linked to: {', '.join(warnings)}. "
            f"Use force=true to unlink and delete."
        )

    # Handle force delete - unlink from opportunities and quotes
    if force and warnings:
        # Unlink from opportunities
        opps = session.exec(
            select(Opportunity).where(Opportunity.contact_id == contact_id)
        ).all()
        for opp in opps:
            opp.contact_id = None
            session.add(opp)

        # Unlink from quotes
        quotes = session.exec(
            select(Quote).where(Quote.contact_id == contact_id)
        ).all()
        for quote in quotes:
            quote.contact_id = None
            session.add(quote)

    # Check if this is primary contact
    if contact.is_primary:
        # Count other contacts in the same account
        other_contacts = session.exec(
            select(Contact).where(
                Contact.account_id == contact.account_id,
                Contact.id != contact_id
            )
        ).all()

        if other_contacts:
            if not force:
                raise HTTPException(
                    400,
                    f"Cannot delete primary contact when account has {len(other_contacts)} other contact(s). "
                    f"Use force=true to auto-assign new primary contact, or manually set another contact as primary first."
                )
            # Auto-assign first other contact as primary
            new_primary = other_contacts[0]
            new_primary.is_primary = True
            session.add(new_primary)

    session.delete(contact)
    session.commit()

    return {"success": True, "message": "Contact deleted"}
