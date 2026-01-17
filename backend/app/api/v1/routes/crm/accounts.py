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
from app.models.customer_address import CustomerAddress, AddressType
from app.models.customer_bank_account import CustomerBankAccount
from app.models.customer_contact import CustomerContact, ContactType
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
    import logging

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

    # Auto-create TMS Customer if account_type is CUSTOMER
    if payload.account_type == "CUSTOMER":
        try:
            # Check if TMS Customer with same code exists
            existing_customer = session.exec(
                select(Customer).where(
                    Customer.tenant_id == tenant_id,
                    Customer.code == payload.code
                )
            ).first()

            if existing_customer:
                # Link existing customer to this account
                existing_customer.crm_account_id = account.id
                session.add(existing_customer)
                account.tms_customer_id = existing_customer.id
            else:
                # Create new TMS Customer
                customer = Customer(
                    tenant_id=tenant_id,
                    code=payload.code,
                    name=payload.name,
                    tax_code=payload.tax_code,
                    phone=payload.phone,
                    email=payload.email,
                    website=payload.website,
                    address=payload.address,
                    city=payload.city,
                    country=payload.country or "Việt Nam",
                    payment_terms=payload.payment_terms,
                    credit_limit=payload.credit_limit,
                    credit_days=payload.credit_days,
                    bank_name=payload.bank_name,
                    bank_account=payload.bank_account,
                    industry=payload.industry,
                    source=payload.source,
                    assigned_to=payload.assigned_to,
                    notes=payload.notes,
                    is_active=True,
                    crm_account_id=account.id,
                )
                session.add(customer)
                session.commit()
                session.refresh(customer)
                account.tms_customer_id = customer.id

            # Update sync status
            account.synced_to_tms = True
            account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            session.add(account)
            session.commit()
            session.refresh(account)

            # Sync bank account and contacts to TMS
            from app.services.crm_sync_service import sync_crm_to_tms
            sync_crm_to_tms(account.id, session)
        except Exception as e:
            logging.warning(f"Failed to auto-create TMS Customer for CRM Account {account.code}: {str(e)}")

    return account


@router.post("/sync-all-to-tms")
def sync_all_accounts_to_tms(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Sync all CUSTOMER accounts to TMS.
    This will:
    1. Auto-link accounts to existing TMS customers by code
    2. Sync all data (bank accounts, contacts) to TMS
    """
    tenant_id = str(current_user.tenant_id)

    # Get all CUSTOMER accounts
    accounts = session.exec(
        select(Account).where(
            Account.tenant_id == tenant_id,
            Account.account_type == "CUSTOMER"
        )
    ).all()

    synced = 0
    linked = 0
    errors = []

    for account in accounts:
        try:
            # Auto-link if not linked
            if not account.tms_customer_id:
                existing_customer = session.exec(
                    select(Customer).where(
                        Customer.tenant_id == tenant_id,
                        Customer.code == account.code
                    )
                ).first()

                if existing_customer:
                    account.tms_customer_id = existing_customer.id
                    existing_customer.crm_account_id = account.id
                    account.synced_to_tms = True
                    account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                    session.add(existing_customer)
                    session.add(account)
                    session.commit()
                    linked += 1

            # Sync data if linked
            if account.tms_customer_id:
                from app.services.crm_sync_service import sync_crm_to_tms
                if sync_crm_to_tms(account.id, session):
                    synced += 1
        except Exception as e:
            errors.append(f"{account.code}: {str(e)}")

    return {
        "success": True,
        "total_accounts": len(accounts),
        "newly_linked": linked,
        "synced": synced,
        "errors": errors
    }


@router.get("/{account_id}")
def get_account(
    account_id: str,
    include_relations: bool = Query(True, description="Include addresses, bank_accounts, contacts"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get account by ID with nested data (addresses, bank_accounts, contacts)"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # Get customer group
    group = session.get(CustomerGroup, account.customer_group_id) if account.customer_group_id else None

    # Get CRM contacts (existing behavior)
    crm_contacts = session.exec(
        select(Contact).where(Contact.account_id == account_id)
    ).all()

    result = {
        **account.model_dump(),
        "customer_group": {
            "id": group.id,
            "name": group.name,
        } if group else None,
        "crm_contacts": [
            {
                "id": c.id,
                "full_name": c.full_name or f"{c.first_name} {c.last_name or ''}".strip(),
                "title": c.title,
                "phone": c.phone,
                "mobile": c.mobile,
                "email": c.email,
                "is_primary": c.is_primary,
            }
            for c in crm_contacts
        ],
        "created_at": str(account.created_at) if account.created_at else None,
        "updated_at": str(account.updated_at) if account.updated_at else None,
    }

    # Include nested data if requested
    if include_relations:
        # Addresses - query by account_id OR customer_id for backward compatibility
        addr_query = select(CustomerAddress).where(
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.is_active == True,
            or_(
                CustomerAddress.account_id == account_id,
                CustomerAddress.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerAddress.account_id == account_id
        ).order_by(CustomerAddress.address_type, CustomerAddress.is_default.desc())

        addresses = session.exec(addr_query).all()

        # Bank accounts
        bank_query = select(CustomerBankAccount).where(
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True,
            or_(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerBankAccount.account_id == account_id
        ).order_by(CustomerBankAccount.is_primary.desc())

        bank_accounts = session.exec(bank_query).all()

        # Customer contacts (different from CRM contacts)
        contact_query = select(CustomerContact).where(
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_active == True,
            or_(
                CustomerContact.account_id == account_id,
                CustomerContact.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerContact.account_id == account_id
        ).order_by(CustomerContact.is_primary.desc(), CustomerContact.name)

        contacts = session.exec(contact_query).all()

        result["addresses"] = [addr.model_dump() for addr in addresses]
        result["bank_accounts"] = [acc.model_dump() for acc in bank_accounts]
        result["contacts"] = [c.model_dump() for c in contacts]

    return result


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

    # Auto-link to TMS Customer if not linked yet
    if not account.tms_customer_id and account.account_type == "CUSTOMER":
        existing_customer = session.exec(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.code == account.code
            )
        ).first()
        if existing_customer:
            account.tms_customer_id = existing_customer.id
            existing_customer.crm_account_id = account.id
            account.synced_to_tms = True
            account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            session.add(existing_customer)

    session.add(account)
    session.commit()
    session.refresh(account)

    # Sync to TMS if linked
    from app.services.crm_sync_service import sync_crm_to_tms
    sync_crm_to_tms(account_id, session)

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
        # Already linked - re-sync all data
        customer = session.get(Customer, account.tms_customer_id)
        if customer:
            from app.services.crm_sync_service import sync_crm_to_tms
            sync_crm_to_tms(account_id, session)
            account.synced_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            session.add(account)
            session.commit()

        return {
            "success": True,
            "message": "Account re-synced to TMS",
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

    # Sync full data (bank accounts, contacts) to TMS
    from app.services.crm_sync_service import sync_crm_to_tms
    sync_crm_to_tms(account_id, session)

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


# ============================================================================
# ADDRESSES - CRUD for CRM Account Addresses
# ============================================================================

class AddressCreate(BaseModel):
    address_type: str = "SHIPPING"
    name: Optional[str] = None
    address: str
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    country: str = "Việt Nam"
    postal_code: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_default: bool = False
    is_same_as_operating: bool = False
    notes: Optional[str] = None


class AddressUpdate(AddressCreate):
    pass


@router.get("/{account_id}/addresses")
def list_account_addresses(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all addresses for an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # Query by account_id OR customer_id for backward compatibility
    query = select(CustomerAddress).where(
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.is_active == True,
        or_(
            CustomerAddress.account_id == account_id,
            CustomerAddress.customer_id == account.tms_customer_id
        ) if account.tms_customer_id else CustomerAddress.account_id == account_id
    ).order_by(CustomerAddress.address_type, CustomerAddress.is_default.desc())

    addresses = session.exec(query).all()
    return [addr.model_dump() for addr in addresses]


@router.post("/{account_id}/addresses")
def create_account_address(
    account_id: str,
    payload: AddressCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new address for an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # If setting as default, unset other defaults of same type
    if payload.is_default and payload.address_type == "SHIPPING":
        existing_defaults = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.tenant_id == tenant_id,
                CustomerAddress.is_active == True,
                CustomerAddress.address_type == payload.address_type,
                CustomerAddress.is_default == True,
                or_(
                    CustomerAddress.account_id == account_id,
                    CustomerAddress.customer_id == account.tms_customer_id
                ) if account.tms_customer_id else CustomerAddress.account_id == account_id
            )
        ).all()
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)

    address = CustomerAddress(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=account.tms_customer_id,  # Also link to TMS customer if exists
        **payload.model_dump(),
        is_active=True,
    )

    session.add(address)
    session.commit()
    session.refresh(address)

    return address.model_dump()


@router.put("/{account_id}/addresses/{address_id}")
def update_account_address(
    account_id: str,
    address_id: str,
    payload: AddressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an address"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    address = session.get(CustomerAddress, address_id)
    if not address or str(address.tenant_id) != tenant_id:
        raise HTTPException(404, "Address not found")

    # Verify address belongs to this account
    if address.account_id != account_id and address.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Address not found")

    # If setting as default, unset other defaults
    if payload.is_default and payload.address_type == "SHIPPING" and not address.is_default:
        existing_defaults = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.tenant_id == tenant_id,
                CustomerAddress.is_active == True,
                CustomerAddress.address_type == payload.address_type,
                CustomerAddress.is_default == True,
                CustomerAddress.id != address_id,
                or_(
                    CustomerAddress.account_id == account_id,
                    CustomerAddress.customer_id == account.tms_customer_id
                ) if account.tms_customer_id else CustomerAddress.account_id == account_id
            )
        ).all()
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(address, key, value)

    # Ensure both FKs are set
    address.account_id = account_id
    if account.tms_customer_id:
        address.customer_id = account.tms_customer_id

    session.add(address)
    session.commit()
    session.refresh(address)

    return address.model_dump()


@router.delete("/{account_id}/addresses/{address_id}")
def delete_account_address(
    account_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete (soft) an address"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    address = session.get(CustomerAddress, address_id)
    if not address or str(address.tenant_id) != tenant_id:
        raise HTTPException(404, "Address not found")

    # Verify address belongs to this account
    if address.account_id != account_id and address.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Address not found")

    address.is_active = False
    session.add(address)
    session.commit()

    return {"success": True, "message": "Address deleted"}


@router.patch("/{account_id}/addresses/{address_id}/set-default")
def set_default_address(
    account_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set an address as default"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    address = session.get(CustomerAddress, address_id)
    if not address or str(address.tenant_id) != tenant_id:
        raise HTTPException(404, "Address not found")

    # Verify address belongs to this account
    if address.account_id != account_id and address.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Address not found")

    # Unset other defaults of same type
    existing_defaults = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.is_active == True,
            CustomerAddress.address_type == address.address_type,
            CustomerAddress.is_default == True,
            CustomerAddress.id != address_id,
            or_(
                CustomerAddress.account_id == account_id,
                CustomerAddress.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerAddress.account_id == account_id
        )
    ).all()
    for addr in existing_defaults:
        addr.is_default = False
        session.add(addr)

    address.is_default = True
    session.add(address)
    session.commit()

    return {"success": True, "message": "Address set as default"}


# ============================================================================
# BANK ACCOUNTS - CRUD for CRM Account Bank Accounts
# ============================================================================

class BankAccountCreate(BaseModel):
    bank_name: str
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: str
    account_holder: str
    is_primary: bool = False
    notes: Optional[str] = None


class BankAccountUpdate(BankAccountCreate):
    pass


@router.get("/{account_id}/bank-accounts")
def list_account_bank_accounts(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all bank accounts for an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    query = select(CustomerBankAccount).where(
        CustomerBankAccount.tenant_id == tenant_id,
        CustomerBankAccount.is_active == True,
        or_(
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.customer_id == account.tms_customer_id
        ) if account.tms_customer_id else CustomerBankAccount.account_id == account_id
    ).order_by(CustomerBankAccount.is_primary.desc())

    bank_accounts = session.exec(query).all()
    return [acc.model_dump() for acc in bank_accounts]


@router.post("/{account_id}/bank-accounts")
def create_account_bank_account(
    account_id: str,
    payload: BankAccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new bank account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # If setting as primary, unset other primaries
    if payload.is_primary:
        existing_primaries = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.tenant_id == tenant_id,
                CustomerBankAccount.is_active == True,
                CustomerBankAccount.is_primary == True,
                or_(
                    CustomerBankAccount.account_id == account_id,
                    CustomerBankAccount.customer_id == account.tms_customer_id
                ) if account.tms_customer_id else CustomerBankAccount.account_id == account_id
            )
        ).all()
        for acc in existing_primaries:
            acc.is_primary = False
            session.add(acc)

    # Check if this is the first bank account
    existing_count = session.exec(
        select(func.count()).where(
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True,
            or_(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerBankAccount.account_id == account_id
        )
    ).one()

    bank_account = CustomerBankAccount(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=account.tms_customer_id,
        **payload.model_dump(),
        is_primary=payload.is_primary or existing_count == 0,  # First account is primary
        is_active=True,
    )

    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)

    return bank_account.model_dump()


@router.put("/{account_id}/bank-accounts/{bank_account_id}")
def update_account_bank_account(
    account_id: str,
    bank_account_id: str,
    payload: BankAccountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a bank account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    bank_account = session.get(CustomerBankAccount, bank_account_id)
    if not bank_account or str(bank_account.tenant_id) != tenant_id:
        raise HTTPException(404, "Bank account not found")

    # Verify bank account belongs to this account
    if bank_account.account_id != account_id and bank_account.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Bank account not found")

    # If setting as primary, unset other primaries
    if payload.is_primary and not bank_account.is_primary:
        existing_primaries = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.tenant_id == tenant_id,
                CustomerBankAccount.is_active == True,
                CustomerBankAccount.is_primary == True,
                CustomerBankAccount.id != bank_account_id,
                or_(
                    CustomerBankAccount.account_id == account_id,
                    CustomerBankAccount.customer_id == account.tms_customer_id
                ) if account.tms_customer_id else CustomerBankAccount.account_id == account_id
            )
        ).all()
        for acc in existing_primaries:
            acc.is_primary = False
            session.add(acc)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bank_account, key, value)

    # Ensure both FKs are set
    bank_account.account_id = account_id
    if account.tms_customer_id:
        bank_account.customer_id = account.tms_customer_id

    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)

    return bank_account.model_dump()


@router.delete("/{account_id}/bank-accounts/{bank_account_id}")
def delete_account_bank_account(
    account_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete (soft) a bank account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    bank_account = session.get(CustomerBankAccount, bank_account_id)
    if not bank_account or str(bank_account.tenant_id) != tenant_id:
        raise HTTPException(404, "Bank account not found")

    # Verify bank account belongs to this account
    if bank_account.account_id != account_id and bank_account.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Bank account not found")

    bank_account.is_active = False
    session.add(bank_account)
    session.commit()

    return {"success": True, "message": "Bank account deleted"}


@router.patch("/{account_id}/bank-accounts/{bank_account_id}/set-primary")
def set_primary_bank_account(
    account_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set a bank account as primary"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    bank_account = session.get(CustomerBankAccount, bank_account_id)
    if not bank_account or str(bank_account.tenant_id) != tenant_id:
        raise HTTPException(404, "Bank account not found")

    # Verify bank account belongs to this account
    if bank_account.account_id != account_id and bank_account.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Bank account not found")

    # Unset other primaries
    existing_primaries = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True,
            CustomerBankAccount.is_primary == True,
            CustomerBankAccount.id != bank_account_id,
            or_(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerBankAccount.account_id == account_id
        )
    ).all()
    for acc in existing_primaries:
        acc.is_primary = False
        session.add(acc)

    bank_account.is_primary = True
    session.add(bank_account)
    session.commit()

    return {"success": True, "message": "Bank account set as primary"}


# ============================================================================
# CONTACTS - CRUD for CRM Account Contacts (CustomerContact, not CRM Contact)
# ============================================================================

class ContactCreate(BaseModel):
    contact_type: str = "GENERAL"
    name: str
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    zalo: Optional[str] = None
    is_primary: bool = False
    is_decision_maker: bool = False
    notes: Optional[str] = None


class ContactUpdate(ContactCreate):
    pass


@router.get("/{account_id}/contacts")
def list_account_contacts(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for an account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    query = select(CustomerContact).where(
        CustomerContact.tenant_id == tenant_id,
        CustomerContact.is_active == True,
        or_(
            CustomerContact.account_id == account_id,
            CustomerContact.customer_id == account.tms_customer_id
        ) if account.tms_customer_id else CustomerContact.account_id == account_id
    ).order_by(CustomerContact.is_primary.desc(), CustomerContact.name)

    contacts = session.exec(query).all()
    return [c.model_dump() for c in contacts]


@router.post("/{account_id}/contacts")
def create_account_contact(
    account_id: str,
    payload: ContactCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new contact"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    # If setting as primary, unset other primaries
    if payload.is_primary:
        existing_primaries = session.exec(
            select(CustomerContact).where(
                CustomerContact.tenant_id == tenant_id,
                CustomerContact.is_active == True,
                CustomerContact.is_primary == True,
                or_(
                    CustomerContact.account_id == account_id,
                    CustomerContact.customer_id == account.tms_customer_id
                ) if account.tms_customer_id else CustomerContact.account_id == account_id
            )
        ).all()
        for c in existing_primaries:
            c.is_primary = False
            session.add(c)

    # Check if this is the first contact
    existing_count = session.exec(
        select(func.count()).where(
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_active == True,
            or_(
                CustomerContact.account_id == account_id,
                CustomerContact.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerContact.account_id == account_id
        )
    ).one()

    contact = CustomerContact(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=account.tms_customer_id,
        **payload.model_dump(),
        is_primary=payload.is_primary or existing_count == 0,  # First contact is primary
        is_active=True,
    )

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact.model_dump()


@router.put("/{account_id}/contacts/{contact_id}")
def update_account_contact(
    account_id: str,
    contact_id: str,
    payload: ContactUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a contact"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    contact = session.get(CustomerContact, contact_id)
    if not contact or str(contact.tenant_id) != tenant_id:
        raise HTTPException(404, "Contact not found")

    # Verify contact belongs to this account
    if contact.account_id != account_id and contact.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Contact not found")

    # If setting as primary, unset other primaries
    if payload.is_primary and not contact.is_primary:
        existing_primaries = session.exec(
            select(CustomerContact).where(
                CustomerContact.tenant_id == tenant_id,
                CustomerContact.is_active == True,
                CustomerContact.is_primary == True,
                CustomerContact.id != contact_id,
                or_(
                    CustomerContact.account_id == account_id,
                    CustomerContact.customer_id == account.tms_customer_id
                ) if account.tms_customer_id else CustomerContact.account_id == account_id
            )
        ).all()
        for c in existing_primaries:
            c.is_primary = False
            session.add(c)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)

    # Ensure both FKs are set
    contact.account_id = account_id
    if account.tms_customer_id:
        contact.customer_id = account.tms_customer_id

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return contact.model_dump()


@router.delete("/{account_id}/contacts/{contact_id}")
def delete_account_contact(
    account_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete (soft) a contact"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    contact = session.get(CustomerContact, contact_id)
    if not contact or str(contact.tenant_id) != tenant_id:
        raise HTTPException(404, "Contact not found")

    # Verify contact belongs to this account
    if contact.account_id != account_id and contact.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Contact not found")

    contact.is_active = False
    session.add(contact)
    session.commit()

    return {"success": True, "message": "Contact deleted"}


@router.patch("/{account_id}/contacts/{contact_id}/set-primary")
def set_primary_contact(
    account_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set a contact as primary"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(Account, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Account not found")

    contact = session.get(CustomerContact, contact_id)
    if not contact or str(contact.tenant_id) != tenant_id:
        raise HTTPException(404, "Contact not found")

    # Verify contact belongs to this account
    if contact.account_id != account_id and contact.customer_id != account.tms_customer_id:
        raise HTTPException(404, "Contact not found")

    # Unset other primaries
    existing_primaries = session.exec(
        select(CustomerContact).where(
            CustomerContact.tenant_id == tenant_id,
            CustomerContact.is_active == True,
            CustomerContact.is_primary == True,
            CustomerContact.id != contact_id,
            or_(
                CustomerContact.account_id == account_id,
                CustomerContact.customer_id == account.tms_customer_id
            ) if account.tms_customer_id else CustomerContact.account_id == account_id
        )
    ).all()
    for c in existing_primaries:
        c.is_primary = False
        session.add(c)

    contact.is_primary = True
    session.add(contact)
    session.commit()

    return {"success": True, "message": "Contact set as primary"}
