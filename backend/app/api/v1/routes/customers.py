from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.models.customer import Customer
from app.models.crm.account import Account
from app.models import User, CustomerAddress, CustomerBankAccount, CustomerContact
from app.core.security import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])


class SyncFromCRMRequest(BaseModel):
    """Request to sync a CRM Account to TMS Customer"""
    crm_account_id: str


# ============================================================================
# SPECIFIC ROUTES FIRST (before /{customer_id} to avoid route conflicts)
# ============================================================================

@router.get("/unified")
def list_unified_customers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by code or name"),
    include_crm: bool = Query(True, description="Include CRM accounts not yet synced"),
):
    """
    List unified customers from both TMS Customers and CRM Accounts.

    Returns:
    - TMS Customers (already linked or standalone)
    - CRM Accounts that haven't been synced to TMS yet (if include_crm=True)

    Each item has:
    - source: "TMS" or "CRM"
    - id: TMS customer_id or CRM account_id
    - code, name, etc.
    """
    tenant_id = str(current_user.tenant_id)
    results = []

    # 1. Get all TMS Customers
    tms_customers = session.exec(
        select(Customer).where(Customer.tenant_id == tenant_id)
    ).all()

    # Track which CRM accounts are already linked
    linked_crm_ids = set()

    for c in tms_customers:
        if c.crm_account_id:
            linked_crm_ids.add(c.crm_account_id)

        results.append({
            "source": "TMS",
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "tax_code": c.tax_code,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "city": c.city,
            "crm_account_id": c.crm_account_id,
            "is_active": c.is_active,
        })

    # 2. Get CRM Accounts not yet synced (if requested)
    if include_crm:
        crm_accounts = session.exec(
            select(Account).where(
                Account.tenant_id == tenant_id,
                Account.status == "ACTIVE",
            )
        ).all()

        for acc in crm_accounts:
            # Skip if already linked to a TMS customer
            if acc.id in linked_crm_ids or acc.tms_customer_id:
                continue

            results.append({
                "source": "CRM",
                "id": acc.id,
                "code": acc.code,
                "name": acc.name,
                "tax_code": acc.tax_code,
                "phone": acc.phone,
                "email": acc.email,
                "address": acc.address,
                "city": acc.city,
                "crm_account_id": acc.id,
                "account_type": acc.account_type,
                "is_active": True,
            })

    # 3. Apply search filter
    if search:
        search_lower = search.lower()
        results = [
            r for r in results
            if (r.get("code") and search_lower in r["code"].lower()) or
               (r.get("name") and search_lower in r["name"].lower())
        ]

    # Sort: TMS customers first, then by code
    results.sort(key=lambda x: (0 if x["source"] == "TMS" else 1, x.get("code", "")))

    return results


@router.post("/sync-from-crm")
def sync_from_crm(
    payload: SyncFromCRMRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Sync a CRM Account to TMS Customer.

    If the CRM Account is already synced, returns the existing TMS Customer.
    Otherwise, creates a new TMS Customer from CRM Account data.
    """
    tenant_id = str(current_user.tenant_id)

    # Get CRM Account
    crm_account = session.exec(
        select(Account).where(
            Account.id == payload.crm_account_id,
            Account.tenant_id == tenant_id
        )
    ).first()

    if not crm_account:
        raise HTTPException(404, "CRM Account not found")

    # Check if already synced
    if crm_account.tms_customer_id:
        existing = session.get(Customer, crm_account.tms_customer_id)
        if existing:
            return {
                "success": True,
                "message": "CRM Account already synced",
                "customer": existing,
                "created": False,
            }

    # Check if TMS customer with same code exists
    existing_by_code = session.exec(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.code == crm_account.code
        )
    ).first()

    if existing_by_code:
        # Link existing customer to CRM account
        existing_by_code.crm_account_id = crm_account.id
        crm_account.tms_customer_id = existing_by_code.id
        crm_account.synced_to_tms = True
        crm_account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        session.add(existing_by_code)
        session.add(crm_account)
        session.commit()
        session.refresh(existing_by_code)

        return {
            "success": True,
            "message": "Linked to existing TMS Customer",
            "customer": existing_by_code,
            "created": False,
        }

    # Create new TMS Customer from CRM Account
    new_customer = Customer(
        tenant_id=tenant_id,
        code=crm_account.code,
        name=crm_account.name,
        tax_code=crm_account.tax_code,
        phone=crm_account.phone,
        fax=crm_account.fax,
        email=crm_account.email,
        website=crm_account.website,
        address=crm_account.address,
        city=crm_account.city,
        country=crm_account.country or "Việt Nam",
        payment_terms=crm_account.payment_terms,
        credit_limit=crm_account.credit_limit,
        credit_days=crm_account.credit_days,
        bank_name=crm_account.bank_name,
        bank_branch=crm_account.bank_branch,
        bank_account=crm_account.bank_account,
        bank_account_name=crm_account.bank_account_name,
        industry=crm_account.industry,
        source=crm_account.source,
        assigned_to=crm_account.assigned_to,
        shipping_address=crm_account.default_delivery_address,
        crm_account_id=crm_account.id,
        is_active=True,
    )

    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)

    # Update CRM Account with TMS link
    crm_account.tms_customer_id = new_customer.id
    crm_account.synced_to_tms = True
    crm_account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    session.add(crm_account)
    session.commit()

    return {
        "success": True,
        "message": "Created new TMS Customer from CRM Account",
        "customer": new_customer,
        "created": True,
    }


@router.get("/by-crm/{crm_account_id}")
def get_or_create_from_crm(
    crm_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get TMS Customer by CRM Account ID.
    If not exists, automatically sync from CRM.

    This is used when creating orders - select CRM Account, get TMS Customer ID.
    """
    tenant_id = str(current_user.tenant_id)

    # Check if CRM account exists
    crm_account = session.exec(
        select(Account).where(
            Account.id == crm_account_id,
            Account.tenant_id == tenant_id
        )
    ).first()

    if not crm_account:
        raise HTTPException(404, "CRM Account not found")

    # If already synced, return existing customer
    if crm_account.tms_customer_id:
        customer = session.get(Customer, crm_account.tms_customer_id)
        if customer:
            return customer

    # Check by code
    existing = session.exec(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.code == crm_account.code
        )
    ).first()

    if existing:
        # Link and return
        existing.crm_account_id = crm_account.id
        crm_account.tms_customer_id = existing.id
        crm_account.synced_to_tms = True
        crm_account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        session.add(existing)
        session.add(crm_account)
        session.commit()
        session.refresh(existing)
        return existing

    # Auto-create from CRM
    new_customer = Customer(
        tenant_id=tenant_id,
        code=crm_account.code,
        name=crm_account.name,
        tax_code=crm_account.tax_code,
        phone=crm_account.phone,
        email=crm_account.email,
        address=crm_account.address,
        city=crm_account.city,
        country=crm_account.country or "Việt Nam",
        payment_terms=crm_account.payment_terms,
        credit_limit=crm_account.credit_limit,
        credit_days=crm_account.credit_days,
        crm_account_id=crm_account.id,
        is_active=True,
    )

    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)

    # Update CRM
    crm_account.tms_customer_id = new_customer.id
    crm_account.synced_to_tms = True
    crm_account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    session.add(crm_account)
    session.commit()

    return new_customer


class LinkCRMRequest(BaseModel):
    """Request to link TMS Customer with CRM Account"""
    crm_account_id: str


@router.post("/{customer_id}/link-crm")
def link_customer_to_crm(
    customer_id: str,
    payload: LinkCRMRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Link an existing TMS Customer to a CRM Account.
    This enables auto-sync of addresses, bank accounts, and contacts.
    """
    tenant_id = str(current_user.tenant_id)

    # 1. Verify TMS Customer exists
    customer = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not customer:
        raise HTTPException(404, "Customer not found")

    # 2. Verify CRM Account exists
    crm_account = session.exec(
        select(Account).where(
            Account.id == payload.crm_account_id,
            Account.tenant_id == tenant_id
        )
    ).first()

    if not crm_account:
        raise HTTPException(404, "CRM Account not found")

    # 3. Check if already linked
    if customer.crm_account_id:
        raise HTTPException(400, f"Customer already linked to CRM Account {customer.crm_account_id}")

    if crm_account.tms_customer_id:
        raise HTTPException(400, f"CRM Account already linked to TMS Customer {crm_account.tms_customer_id}")

    # 4. Create the link
    customer.crm_account_id = crm_account.id
    crm_account.tms_customer_id = customer.id
    crm_account.synced_to_tms = True
    crm_account.synced_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    session.add(customer)
    session.add(crm_account)
    session.commit()
    session.refresh(customer)

    # 5. Trigger initial sync of addresses, bank_accounts, contacts to CRM
    from app.services.customer_sync_service import sync_customer_to_crm
    sync_customer_to_crm(customer_id, session)

    return {
        "message": "Customer linked to CRM Account successfully",
        "customer_id": customer.id,
        "crm_account_id": crm_account.id,
    }


@router.delete("/{customer_id}/unlink-crm")
def unlink_customer_from_crm(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Unlink a TMS Customer from its CRM Account.
    """
    tenant_id = str(current_user.tenant_id)

    customer = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not customer:
        raise HTTPException(404, "Customer not found")

    if not customer.crm_account_id:
        raise HTTPException(400, "Customer is not linked to any CRM Account")

    # Update CRM Account
    crm_account = session.get(Account, customer.crm_account_id)
    if crm_account:
        crm_account.tms_customer_id = None
        crm_account.synced_to_tms = False
        session.add(crm_account)

    # Clear customer link
    customer.crm_account_id = None
    session.add(customer)
    session.commit()

    return {"message": "Customer unlinked from CRM Account successfully"}


# ============================================================================
# GENERIC ROUTES (with path parameters - must come AFTER specific routes)
# ============================================================================

@router.get("")
def list_customers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by code or name"),
    include_inactive: bool = Query(False, description="Include soft-deleted customers"),
):
    """List all customers for current tenant"""
    tenant_id = str(current_user.tenant_id)

    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id
    )

    # By default, only show active customers
    if not include_inactive:
        stmt = stmt.where(Customer.is_active == True)

    stmt = stmt.order_by(Customer.updated_at.desc())

    customers = session.exec(stmt).all()

    # Filter by search if provided
    if search:
        search_lower = search.lower()
        customers = [
            c for c in customers
            if (c.code and search_lower in c.code.lower()) or
               (c.name and search_lower in c.name.lower())
        ]

    return customers


@router.get("/{customer_id}")
def get_customer(
    customer_id: str,
    include_relations: bool = Query(True, description="Include addresses, bank_accounts, contacts"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific customer by ID with nested data (must belong to current tenant)"""
    tenant_id = str(current_user.tenant_id)

    customer = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Return basic customer data if relations not requested
    if not include_relations:
        return customer

    # Get account_id for unified query (prefer account_id if linked)
    account_id = customer.crm_account_id

    # Fetch related data using BOTH account_id and customer_id for backward compatibility
    from sqlmodel import or_

    addr_filters = [
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.is_active == True
    ]
    if account_id:
        addr_filters.append(or_(
            CustomerAddress.account_id == account_id,
            CustomerAddress.customer_id == customer_id
        ))
    else:
        addr_filters.append(CustomerAddress.customer_id == customer_id)

    addresses = session.exec(
        select(CustomerAddress).where(*addr_filters)
        .order_by(CustomerAddress.address_type, CustomerAddress.is_default.desc())
    ).all()

    bank_filters = [
        CustomerBankAccount.tenant_id == tenant_id,
        CustomerBankAccount.is_active == True
    ]
    if account_id:
        bank_filters.append(or_(
            CustomerBankAccount.account_id == account_id,
            CustomerBankAccount.customer_id == customer_id
        ))
    else:
        bank_filters.append(CustomerBankAccount.customer_id == customer_id)

    bank_accounts = session.exec(
        select(CustomerBankAccount).where(*bank_filters)
        .order_by(CustomerBankAccount.is_primary.desc())
    ).all()

    contact_filters = [
        CustomerContact.tenant_id == tenant_id,
        CustomerContact.is_active == True
    ]
    if account_id:
        contact_filters.append(or_(
            CustomerContact.account_id == account_id,
            CustomerContact.customer_id == customer_id
        ))
    else:
        contact_filters.append(CustomerContact.customer_id == customer_id)

    contacts = session.exec(
        select(CustomerContact).where(*contact_filters)
        .order_by(CustomerContact.is_primary.desc(), CustomerContact.name)
    ).all()

    # Return customer with nested data
    result = customer.model_dump()
    result["addresses"] = [addr.model_dump() for addr in addresses]
    result["bank_accounts"] = [acc.model_dump() for acc in bank_accounts]
    result["contacts"] = [c.model_dump() for c in contacts]
    result["account_id"] = account_id  # Include for frontend reference

    return result


@router.post("")
def create_customer(
    payload: Customer,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new customer for current tenant and auto-create CRM Account"""
    tenant_id = str(current_user.tenant_id)

    # Always set tenant_id from current user
    payload.tenant_id = tenant_id

    session.add(payload)
    session.commit()
    session.refresh(payload)

    # Auto-create CRM Account
    try:
        crm_account = Account(
            tenant_id=tenant_id,
            code=payload.code,
            name=payload.name,
            account_type="CUSTOMER",
            status="ACTIVE",
            tax_code=payload.tax_code,
            phone=payload.phone,
            fax=payload.fax,
            email=payload.email,
            website=payload.website,
            address=payload.address,
            city=payload.city,
            country=payload.country or "VN",
            payment_terms=payload.payment_terms,
            credit_limit=payload.credit_limit or 0,
            credit_days=payload.credit_days or 30,
            bank_name=payload.bank_name,
            bank_branch=payload.bank_branch,
            bank_account=payload.bank_account,
            bank_account_name=payload.bank_account_name,
            industry=payload.industry,
            source=payload.source,
            tms_customer_id=payload.id,
            synced_to_tms=True,
            synced_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            notes=payload.notes,
        )
        session.add(crm_account)
        session.commit()
        session.refresh(crm_account)

        # Link back to customer
        payload.crm_account_id = crm_account.id
        session.add(payload)
        session.commit()
        session.refresh(payload)
    except Exception as e:
        import logging
        logging.warning(f"Failed to auto-create CRM Account for customer {payload.id}: {str(e)}")

    return payload


@router.put("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: dict = Body(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a customer (must belong to current tenant)"""
    tenant_id = str(current_user.tenant_id)

    # Verify customer belongs to current tenant
    db_obj = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not db_obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Fields that should not be updated
    protected_fields = {'id', 'tenant_id', 'created_at', 'addresses', 'bank_accounts', 'contacts'}

    # Update all fields from payload
    for key, value in payload.items():
        if key in protected_fields:
            continue
        if hasattr(db_obj, key):
            setattr(db_obj, key, value)

    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a customer (must belong to current tenant)"""
    tenant_id = str(current_user.tenant_id)

    # Verify customer belongs to current tenant
    db_obj = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not db_obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Soft delete - set is_active = False
    db_obj.is_active = False
    session.add(db_obj)
    session.commit()
    return {"message": "Customer deleted successfully"}


@router.patch("/{customer_id}/restore")
def restore_customer(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Restore a soft-deleted customer"""
    tenant_id = str(current_user.tenant_id)

    db_obj = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not db_obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    db_obj.is_active = True
    session.add(db_obj)
    session.commit()
    return {"message": "Customer restored successfully"}


# ============================================================================
# NESTED ROUTES FOR ADDRESSES, BANK ACCOUNTS, CONTACTS
# These redirect to CRM Account APIs using the linked account_id
# ============================================================================

def get_customer_and_account(customer_id: str, tenant_id: str, session: Session) -> tuple:
    """Helper to get customer and ensure it has a linked CRM account"""
    customer = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not customer:
        raise HTTPException(404, "Customer not found")

    # Auto-create CRM account if not linked
    if not customer.crm_account_id:
        crm_account = Account(
            tenant_id=tenant_id,
            code=customer.code,
            name=customer.name,
            account_type="CUSTOMER",
            status="ACTIVE",
            tax_code=customer.tax_code,
            phone=customer.phone,
            email=customer.email,
            address=customer.address,
            city=customer.city,
            tms_customer_id=customer.id,
            synced_to_tms=True,
            synced_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        )
        session.add(crm_account)
        session.commit()
        session.refresh(crm_account)

        customer.crm_account_id = crm_account.id
        session.add(customer)
        session.commit()
        session.refresh(customer)

    return customer, customer.crm_account_id


# ---- ADDRESSES ----

from pydantic import BaseModel as PydanticBaseModel
from app.models.customer_address import AddressType


class CustomerAddressCreate(PydanticBaseModel):
    address_type: str = AddressType.SHIPPING.value
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


class CustomerAddressUpdate(PydanticBaseModel):
    address_type: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_default: Optional[bool] = None
    is_same_as_operating: Optional[bool] = None
    notes: Optional[str] = None


@router.get("/{customer_id}/addresses")
def list_customer_addresses(
    customer_id: str,
    address_type: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all addresses for a customer (via linked CRM Account)"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    query = select(CustomerAddress).where(
        or_(
            CustomerAddress.account_id == account_id,
            CustomerAddress.customer_id == customer_id
        ),
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.is_active == True
    )

    if address_type:
        query = query.where(CustomerAddress.address_type == address_type)

    query = query.order_by(CustomerAddress.address_type, CustomerAddress.is_default.desc())
    return session.exec(query).all()


@router.post("/{customer_id}/addresses")
def create_customer_address(
    customer_id: str,
    payload: CustomerAddressCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create address for customer (stored with account_id)"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    # Unset existing defaults if this is default
    if payload.is_default:
        existing = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.account_id == account_id,
                CustomerAddress.address_type == payload.address_type,
                CustomerAddress.is_default == True
            )
        ).all()
        for addr in existing:
            addr.is_default = False
            session.add(addr)

    address = CustomerAddress(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=customer_id,  # Backward compatibility
        **payload.model_dump()
    )

    session.add(address)
    session.commit()
    session.refresh(address)
    return address


@router.put("/{customer_id}/addresses/{address_id}")
def update_customer_address(
    customer_id: str,
    address_id: str,
    payload: CustomerAddressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update address"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            or_(
                CustomerAddress.account_id == account_id,
                CustomerAddress.customer_id == customer_id
            ),
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    # Handle default flag
    if payload.is_default is True and not address.is_default:
        addr_type = payload.address_type or address.address_type
        existing = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.account_id == account_id,
                CustomerAddress.address_type == addr_type,
                CustomerAddress.is_default == True,
                CustomerAddress.id != address_id
            )
        ).all()
        for a in existing:
            a.is_default = False
            session.add(a)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(address, key, value)

    session.add(address)
    session.commit()
    session.refresh(address)
    return address


@router.delete("/{customer_id}/addresses/{address_id}")
def delete_customer_address(
    customer_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete address"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            or_(
                CustomerAddress.account_id == account_id,
                CustomerAddress.customer_id == customer_id
            ),
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    address.is_active = False
    session.add(address)
    session.commit()
    return {"message": "Address deleted successfully"}


# ---- BANK ACCOUNTS ----

class CustomerBankAccountCreate(PydanticBaseModel):
    bank_name: str
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: str
    account_holder: str
    is_primary: bool = False
    notes: Optional[str] = None


class CustomerBankAccountUpdate(PydanticBaseModel):
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    bank_bin: Optional[str] = None
    bank_branch: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


@router.get("/{customer_id}/bank-accounts")
def list_customer_bank_accounts(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all bank accounts for a customer"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    return session.exec(
        select(CustomerBankAccount).where(
            or_(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.customer_id == customer_id
            ),
            CustomerBankAccount.tenant_id == tenant_id,
            CustomerBankAccount.is_active == True
        ).order_by(CustomerBankAccount.is_primary.desc())
    ).all()


@router.post("/{customer_id}/bank-accounts")
def create_customer_bank_account(
    customer_id: str,
    payload: CustomerBankAccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create bank account for customer"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    if payload.is_primary:
        existing = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.is_primary == True
            )
        ).all()
        for ba in existing:
            ba.is_primary = False
            session.add(ba)

    bank_account = CustomerBankAccount(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=customer_id,
        **payload.model_dump()
    )

    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)
    return bank_account


@router.put("/{customer_id}/bank-accounts/{bank_account_id}")
def update_customer_bank_account(
    customer_id: str,
    bank_account_id: str,
    payload: CustomerBankAccountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update bank account"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    bank_account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            or_(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.customer_id == customer_id
            ),
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not bank_account:
        raise HTTPException(404, "Bank account not found")

    if payload.is_primary is True and not bank_account.is_primary:
        existing = session.exec(
            select(CustomerBankAccount).where(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.is_primary == True,
                CustomerBankAccount.id != bank_account_id
            )
        ).all()
        for ba in existing:
            ba.is_primary = False
            session.add(ba)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(bank_account, key, value)

    session.add(bank_account)
    session.commit()
    session.refresh(bank_account)
    return bank_account


@router.delete("/{customer_id}/bank-accounts/{bank_account_id}")
def delete_customer_bank_account(
    customer_id: str,
    bank_account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete bank account"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    bank_account = session.exec(
        select(CustomerBankAccount).where(
            CustomerBankAccount.id == bank_account_id,
            or_(
                CustomerBankAccount.account_id == account_id,
                CustomerBankAccount.customer_id == customer_id
            ),
            CustomerBankAccount.tenant_id == tenant_id
        )
    ).first()

    if not bank_account:
        raise HTTPException(404, "Bank account not found")

    bank_account.is_active = False
    session.add(bank_account)
    session.commit()
    return {"message": "Bank account deleted successfully"}


# ---- CONTACTS ----

from app.models.customer_contact import ContactType


class CustomerContactCreate(PydanticBaseModel):
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


class CustomerContactUpdate(PydanticBaseModel):
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


@router.get("/{customer_id}/contacts")
def list_customer_contacts(
    customer_id: str,
    contact_type: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for a customer"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    query = select(CustomerContact).where(
        or_(
            CustomerContact.account_id == account_id,
            CustomerContact.customer_id == customer_id
        ),
        CustomerContact.tenant_id == tenant_id,
        CustomerContact.is_active == True
    )

    if contact_type:
        query = query.where(CustomerContact.contact_type == contact_type)

    query = query.order_by(CustomerContact.is_primary.desc(), CustomerContact.name)
    return session.exec(query).all()


@router.post("/{customer_id}/contacts")
def create_customer_contact(
    customer_id: str,
    payload: CustomerContactCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create contact for customer"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    if payload.is_primary:
        existing = session.exec(
            select(CustomerContact).where(
                CustomerContact.account_id == account_id,
                CustomerContact.contact_type == payload.contact_type,
                CustomerContact.is_primary == True
            )
        ).all()
        for c in existing:
            c.is_primary = False
            session.add(c)

    contact = CustomerContact(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=customer_id,
        **payload.model_dump()
    )

    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.put("/{customer_id}/contacts/{contact_id}")
def update_customer_contact(
    customer_id: str,
    contact_id: str,
    payload: CustomerContactUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update contact"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            or_(
                CustomerContact.account_id == account_id,
                CustomerContact.customer_id == customer_id
            ),
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    if payload.is_primary is True and not contact.is_primary:
        ctype = payload.contact_type or contact.contact_type
        existing = session.exec(
            select(CustomerContact).where(
                CustomerContact.account_id == account_id,
                CustomerContact.contact_type == ctype,
                CustomerContact.is_primary == True,
                CustomerContact.id != contact_id
            )
        ).all()
        for c in existing:
            c.is_primary = False
            session.add(c)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)

    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.delete("/{customer_id}/contacts/{contact_id}")
def delete_customer_contact(
    customer_id: str,
    contact_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete contact"""
    tenant_id = str(current_user.tenant_id)
    customer, account_id = get_customer_and_account(customer_id, tenant_id, session)

    from sqlmodel import or_
    contact = session.exec(
        select(CustomerContact).where(
            CustomerContact.id == contact_id,
            or_(
                CustomerContact.account_id == account_id,
                CustomerContact.customer_id == customer_id
            ),
            CustomerContact.tenant_id == tenant_id
        )
    ).first()

    if not contact:
        raise HTTPException(404, "Contact not found")

    contact.is_active = False
    session.add(contact)
    session.commit()
    return {"message": "Contact deleted successfully"}
