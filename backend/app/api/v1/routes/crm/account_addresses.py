"""
CRM Account Addresses API
Unified address management for CRM Accounts (used by both TMS and CRM)
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.crm.account import Account
from app.models.customer_address import CustomerAddress, AddressType
from app.core.security import get_current_user

router = APIRouter(prefix="/accounts/{account_id}/addresses", tags=["CRM - Account Addresses"])


# ============ Pydantic Schemas ============

class AddressCreate(BaseModel):
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


class AddressUpdate(BaseModel):
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
def list_addresses(
    account_id: str,
    address_type: Optional[str] = Query(None, description="Filter by address type"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all addresses for an account"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    query = select(CustomerAddress).where(
        CustomerAddress.account_id == account_id,
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.is_active == True
    )

    if address_type:
        query = query.where(CustomerAddress.address_type == address_type)

    query = query.order_by(CustomerAddress.address_type, CustomerAddress.is_default.desc())

    return session.exec(query).all()


@router.get("/{address_id}")
def get_address(
    account_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single address"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.account_id == account_id,
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    return address


@router.post("")
def create_address(
    account_id: str,
    payload: AddressCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new address for an account"""
    tenant_id = str(current_user.tenant_id)
    account = verify_account_access(session, account_id, tenant_id)

    # If this is marked as default, unset other defaults of same type
    if payload.is_default:
        existing_defaults = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.account_id == account_id,
                CustomerAddress.tenant_id == tenant_id,
                CustomerAddress.address_type == payload.address_type,
                CustomerAddress.is_default == True
            )
        ).all()
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)

    address = CustomerAddress(
        tenant_id=tenant_id,
        account_id=account_id,
        customer_id=account.tms_customer_id,  # Also set customer_id for backward compatibility
        **payload.model_dump()
    )

    session.add(address)
    session.commit()
    session.refresh(address)

    return address


@router.put("/{address_id}")
def update_address(
    account_id: str,
    address_id: str,
    payload: AddressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an address"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.account_id == account_id,
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    # Handle default flag changes
    if payload.is_default is True and not address.is_default:
        address_type = payload.address_type or address.address_type
        existing_defaults = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.account_id == account_id,
                CustomerAddress.tenant_id == tenant_id,
                CustomerAddress.address_type == address_type,
                CustomerAddress.is_default == True,
                CustomerAddress.id != address_id
            )
        ).all()
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(address, key, value)

    session.add(address)
    session.commit()
    session.refresh(address)

    return address


@router.delete("/{address_id}")
def delete_address(
    account_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete an address"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.account_id == account_id,
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    address.is_active = False
    session.add(address)
    session.commit()

    return {"message": "Address deleted successfully"}


@router.patch("/{address_id}/set-default")
def set_default_address(
    account_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set an address as default for its type"""
    tenant_id = str(current_user.tenant_id)
    verify_account_access(session, account_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.account_id == account_id,
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.is_active == True
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    # Unset other defaults of same type
    existing_defaults = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.account_id == account_id,
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.address_type == address.address_type,
            CustomerAddress.is_default == True,
            CustomerAddress.id != address_id
        )
    ).all()

    for addr in existing_defaults:
        addr.is_default = False
        session.add(addr)

    address.is_default = True
    session.add(address)
    session.commit()
    session.refresh(address)

    return address
