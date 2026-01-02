"""
CRM - Accounts API Routes
Manage customer/vendor accounts
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account, AccountStatus, AccountType, CustomerGroup
from app.models.crm.contact import Contact
from app.models.crm.opportunity import Opportunity
from app.models.crm.quote import Quote
from app.models.customer import Customer
from app.core.security import get_current_user
from app.api.v1.routes.crm.activity_logs import log_activity
import json

router = APIRouter(prefix="/accounts", tags=["CRM - Accounts"])


class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str = "CUSTOMER"
    industry: Optional[str] = None
    customer_group_id: Optional[str] = None
    tax_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: str = "VN"
    payment_terms: Optional[str] = None
    credit_limit: float = 0
    credit_days: int = 30
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    assigned_to: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    status: Optional[str] = None
    industry: Optional[str] = None
    customer_group_id: Optional[str] = None
    tax_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[float] = None
    credit_days: Optional[int] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    assigned_to: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_accounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    account_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_group_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
):
    """List all accounts"""
    tenant_id = str(current_user.tenant_id)

    query = select(Account).where(Account.tenant_id == tenant_id)

    if account_type:
        query = query.where(Account.account_type == account_type)

    if status:
        query = query.where(Account.status == status)

    if customer_group_id:
        query = query.where(Account.customer_group_id == customer_group_id)

    if search:
        search_filter = or_(
            Account.name.ilike(f"%{search}%"),
            Account.code.ilike(f"%{search}%"),
            Account.phone.ilike(f"%{search}%"),
            Account.email.ilike(f"%{search}%"),
            Account.tax_code.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sorting
    sort_fields = {
        "code": Account.code,
        "name": Account.name,
        "account_type": Account.account_type,
        "status": Account.status,
        "industry": Account.industry,
        "city": Account.city,
        "created_at": Account.created_at,
    }
    sort_column = sort_fields.get(sort_by, Account.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    accounts = session.exec(query).all()

    # Enrich with customer group and contact count
    items = []
    for acc in accounts:
        group = session.get(CustomerGroup, acc.customer_group_id) if acc.customer_group_id else None
        contact_count = session.exec(
            select(func.count()).where(Contact.account_id == acc.id)
        ).one()

        items.append({
            "id": acc.id,
            "code": acc.code,
            "name": acc.name,
            "account_type": acc.account_type,
            "status": acc.status,
            "industry": acc.industry,
            "customer_group": {
                "id": group.id,
                "name": group.name,
            } if group else None,
            "tax_code": acc.tax_code,
            "phone": acc.phone,
            "email": acc.email,
            "address": acc.address,
            "city": acc.city,
            "credit_limit": acc.credit_limit,
            "credit_days": acc.credit_days,
            "contact_count": contact_count,
            "assigned_to": acc.assigned_to,
            "created_at": str(acc.created_at) if acc.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("")
def create_account(
    payload: AccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new account"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(Account).where(
            Account.tenant_id == tenant_id,
            Account.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Account code '{payload.code}' already exists")

    account = Account(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@router.get("/{account_id}")
def get_account(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get account by ID"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # Get customer group
    group = session.get(CustomerGroup, account.customer_group_id) if account.customer_group_id else None

    # Get contacts
    contacts = session.exec(
        select(Contact).where(Contact.account_id == account_id)
    ).all()

    return {
        **account.model_dump(),
        "customer_group": {
            "id": group.id,
            "name": group.name,
        } if group else None,
        "contacts": [
            {
                "id": c.id,
                "full_name": c.full_name or f"{c.first_name} {c.last_name or ''}".strip(),
                "title": c.title,
                "phone": c.phone,
                "mobile": c.mobile,
                "email": c.email,
                "is_primary": c.is_primary,
            }
            for c in contacts
        ],
        "created_at": str(account.created_at) if account.created_at else None,
        "updated_at": str(account.updated_at) if account.updated_at else None,
    }


@router.put("/{account_id}")
def update_account(
    account_id: str,
    payload: AccountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    account.updated_at = datetime.utcnow()

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@router.delete("/{account_id}")
def delete_account(
    account_id: str,
    force: bool = Query(False, description="Force delete with all related entities"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # Count related entities
    contact_count = session.exec(
        select(func.count()).where(Contact.account_id == account_id)
    ).one()

    opportunity_count = session.exec(
        select(func.count()).where(Opportunity.account_id == account_id)
    ).one()

    quote_count = session.exec(
        select(func.count()).where(Quote.account_id == account_id)
    ).one()

    # Collect error messages
    errors = []
    if contact_count > 0:
        errors.append(f"{contact_count} contact(s)")
    if opportunity_count > 0:
        errors.append(f"{opportunity_count} opportunity(ies)")
    if quote_count > 0:
        errors.append(f"{quote_count} quote(s)")

    if errors and not force:
        raise HTTPException(
            400,
            f"Cannot delete account with related entities: {', '.join(errors)}. "
            f"Use force=true to delete all related data."
        )

    # Force delete: remove all related entities first
    if force and errors:
        # Delete quotes first (may reference opportunities)
        quotes = session.exec(select(Quote).where(Quote.account_id == account_id)).all()
        for quote in quotes:
            session.delete(quote)

        # Delete opportunities
        opportunities = session.exec(select(Opportunity).where(Opportunity.account_id == account_id)).all()
        for opp in opportunities:
            session.delete(opp)

        # Delete contacts
        contacts = session.exec(select(Contact).where(Contact.account_id == account_id)).all()
        for contact in contacts:
            session.delete(contact)

        session.commit()

    session.delete(account)
    session.commit()

    return {
        "success": True,
        "message": "Account deleted" + (" with all related entities" if force and errors else "")
    }


@router.post("/{account_id}/sync-to-tms")
def sync_account_to_tms(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Sync account to TMS Customer"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    if account.synced_to_tms and account.tms_customer_id:
        # Already synced, return existing info
        customer = session.get(Customer, account.tms_customer_id)
        return {
            "success": True,
            "message": "Account already synced to TMS",
            "tms_customer_id": account.tms_customer_id,
            "tms_customer": {
                "id": customer.id,
                "code": customer.code,
                "name": customer.name,
            } if customer else None,
            "synced_at": account.synced_at
        }

    # Check if TMS customer with same code already exists
    existing_customer = session.exec(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.code == account.code
        )
    ).first()

    tms_customer_id = None
    if existing_customer:
        # Link to existing customer
        tms_customer_id = existing_customer.id
    else:
        # Create new TMS customer
        # Get primary contact info for contacts_json
        contacts_data = []
        primary_contact = session.exec(
            select(Contact).where(
                Contact.account_id == account.id,
                Contact.is_primary == True
            )
        ).first()
        if primary_contact:
            contacts_data.append({
                "name": primary_contact.full_name,
                "phone": primary_contact.phone or primary_contact.mobile,
                "email": primary_contact.email,
                "is_primary": True
            })

        customer = Customer(
            tenant_id=tenant_id,
            code=account.code,
            name=account.name,
            tax_code=account.tax_code,
            contacts_json=json.dumps(contacts_data) if contacts_data else None,
        )
        session.add(customer)
        session.commit()
        session.refresh(customer)
        tms_customer_id = customer.id
        existing_customer = customer

    # Update account with TMS link
    account.tms_customer_id = tms_customer_id
    account.synced_to_tms = True
    account.synced_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    session.add(account)

    # Log activity
    user_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    log_activity(
        session=session,
        tenant_id=tenant_id,
        user_id=str(current_user.id),
        user_name=user_name,
        entity_type="ACCOUNT",
        entity_id=account_id,
        entity_code=account.code,
        entity_name=account.name,
        action="SYNC",
        description=f"Synced to TMS Customer: {existing_customer.code} - {existing_customer.name}",
        new_values={
            "tms_customer_id": tms_customer_id,
            "synced_at": account.synced_at,
        },
    )

    session.commit()
    session.refresh(account)

    return {
        "success": True,
        "message": "Account synced to TMS successfully",
        "tms_customer_id": tms_customer_id,
        "tms_customer": {
            "id": existing_customer.id,
            "code": existing_customer.code,
            "name": existing_customer.name,
        },
        "synced_at": account.synced_at
    }


@router.get("/{account_id}/tms-info")
def get_account_tms_info(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get TMS integration info for account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    tms_customer = None
    if account.tms_customer_id:
        customer = session.get(Customer, account.tms_customer_id)
        if customer:
            tms_customer = {
                "id": customer.id,
                "code": customer.code,
                "name": customer.name,
                "tax_code": customer.tax_code,
            }

    return {
        "account_id": account.id,
        "account_code": account.code,
        "synced_to_tms": account.synced_to_tms,
        "tms_customer_id": account.tms_customer_id,
        "tms_customer": tms_customer,
        "synced_at": account.synced_at
    }
