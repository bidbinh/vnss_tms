from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.models.customer import Customer
from app.models.crm.account import Account
from app.models import User
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


# ============================================================================
# GENERIC ROUTES (with path parameters - must come AFTER specific routes)
# ============================================================================

@router.get("")
def list_customers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by code or name"),
):
    """List all customers for current tenant"""
    tenant_id = str(current_user.tenant_id)

    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id
    ).order_by(Customer.updated_at.desc())

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
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific customer by ID (must belong to current tenant)"""
    tenant_id = str(current_user.tenant_id)

    customer = session.exec(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.tenant_id == tenant_id
        )
    ).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return customer


@router.post("")
def create_customer(
    payload: Customer,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new customer for current tenant"""
    # Always set tenant_id from current user
    payload.tenant_id = str(current_user.tenant_id)

    session.add(payload)
    session.commit()
    session.refresh(payload)
    return payload


@router.put("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: Customer,
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

    db_obj.code = payload.code
    db_obj.name = payload.name
    db_obj.tax_code = payload.tax_code
    db_obj.contacts_json = payload.contacts_json

    # Update additional fields if they exist
    if hasattr(payload, 'address') and payload.address is not None:
        db_obj.address = payload.address
    if hasattr(payload, 'phone') and payload.phone is not None:
        db_obj.phone = payload.phone
    if hasattr(payload, 'email') and payload.email is not None:
        db_obj.email = payload.email

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
    """Delete a customer (must belong to current tenant)"""
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

    session.delete(db_obj)
    session.commit()
    return {"message": "Customer deleted successfully"}
