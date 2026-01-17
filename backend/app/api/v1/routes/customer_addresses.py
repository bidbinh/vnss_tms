from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Customer, CustomerAddress, AddressType, User
from app.core.security import get_current_user
from app.services.customer_sync_service import sync_customer_to_crm

router = APIRouter(prefix="/customers/{customer_id}/addresses", tags=["Customer Addresses"])


# ============ Pydantic Schemas ============

class CustomerAddressCreate(BaseModel):
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


class CustomerAddressUpdate(BaseModel):
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
def list_addresses(
    customer_id: str,
    address_type: Optional[str] = Query(None, description="Filter by address type"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all addresses for a customer"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    query = select(CustomerAddress).where(
        CustomerAddress.customer_id == customer_id,
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.is_active == True
    )

    if address_type:
        query = query.where(CustomerAddress.address_type == address_type)

    query = query.order_by(CustomerAddress.address_type, CustomerAddress.is_default.desc())

    return session.exec(query).all()


@router.get("/{address_id}")
def get_address(
    customer_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single address"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    return address


@router.post("")
def create_address(
    customer_id: str,
    payload: CustomerAddressCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new address for a customer"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    # If this is marked as default, unset other defaults of same type
    if payload.is_default:
        existing_defaults = session.exec(
            select(CustomerAddress).where(
                CustomerAddress.customer_id == customer_id,
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
        customer_id=customer_id,
        **payload.model_dump()
    )

    session.add(address)
    session.commit()
    session.refresh(address)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return address


@router.put("/{address_id}")
def update_address(
    customer_id: str,
    address_id: str,
    payload: CustomerAddressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an address"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.customer_id == customer_id,
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
                CustomerAddress.customer_id == customer_id,
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

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return address


@router.delete("/{address_id}")
def delete_address(
    customer_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete an address"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.tenant_id == tenant_id
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    address.is_active = False
    session.add(address)
    session.commit()

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return {"message": "Address deleted successfully"}


@router.patch("/{address_id}/set-default")
def set_default_address(
    customer_id: str,
    address_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set an address as default for its type"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    address = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.id == address_id,
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.is_active == True
        )
    ).first()

    if not address:
        raise HTTPException(404, "Address not found")

    # Unset other defaults of same type
    existing_defaults = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.customer_id == customer_id,
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

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return address


@router.put("/bulk")
def bulk_update_addresses(
    customer_id: str,
    payload: List[CustomerAddressCreate],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bulk create/update addresses - replaces all addresses"""
    tenant_id = str(current_user.tenant_id)
    verify_customer_access(session, customer_id, tenant_id)

    # Soft delete existing addresses
    existing = session.exec(
        select(CustomerAddress).where(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.is_active == True
        )
    ).all()

    for addr in existing:
        addr.is_active = False
        session.add(addr)

    # Create new addresses
    created = []
    for item in payload:
        address = CustomerAddress(
            tenant_id=tenant_id,
            customer_id=customer_id,
            **item.model_dump()
        )
        session.add(address)
        created.append(address)

    session.commit()

    # Refresh all
    for addr in created:
        session.refresh(addr)

    # Sync to CRM if linked
    sync_customer_to_crm(customer_id, session)

    return created
