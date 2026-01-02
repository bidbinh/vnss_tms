from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class OrderCreate(BaseModel):
    """Schema for creating a new order"""
    customer_id: str
    order_code: Optional[str] = None

    # Location info (can use either text or IDs)
    pickup_text: Optional[str] = None
    delivery_text: Optional[str] = None

    # Site-based pickup & delivery (preferred)
    pickup_site_id: Optional[str] = None
    delivery_site_id: Optional[str] = None

    # Legacy location IDs (for backward compatibility)
    pickup_location_id: Optional[str] = None
    delivery_location_id: Optional[str] = None

    # Container & cargo
    equipment: Optional[str] = None  # "20", "40", "45"
    qty: int = 1
    container_code: Optional[str] = None
    cargo_note: Optional[str] = None
    empty_return_note: Optional[str] = None

    # Empty return port (Site where container is returned)
    port_site_id: Optional[str] = None

    # Distance for salary calculation
    distance_km: Optional[int] = None

    # Customer requested date
    customer_requested_date: Optional[datetime] = None


class OrderAccept(BaseModel):
    """Schema for accepting an order"""
    driver_id: str
    eta_pickup_at: Optional[datetime] = None
    eta_delivery_at: Optional[datetime] = None


class OrderReject(BaseModel):
    """Schema for rejecting an order"""
    reason: str


class OrderUpdate(BaseModel):
    """Schema for updating order fields (DISPATCHER/ADMIN)"""
    order_code: Optional[str] = None
    customer_id: Optional[str] = None
    pickup_text: Optional[str] = None
    delivery_text: Optional[str] = None

    # Site-based pickup & delivery (preferred)
    pickup_site_id: Optional[str] = None
    delivery_site_id: Optional[str] = None

    # Legacy location IDs (for backward compatibility)
    pickup_location_id: Optional[str] = None
    delivery_location_id: Optional[str] = None

    equipment: Optional[str] = None
    qty: Optional[int] = None
    container_code: Optional[str] = None
    cargo_note: Optional[str] = None
    empty_return_note: Optional[str] = None

    # Empty return port (Site where container is returned)
    port_site_id: Optional[str] = None

    # Distance for salary calculation
    distance_km: Optional[int] = None

    customer_requested_date: Optional[datetime] = None
    driver_id: Optional[str] = None
    eta_pickup_at: Optional[datetime] = None
    eta_delivery_at: Optional[datetime] = None


class OrderRead(BaseModel):
    """Schema for reading order data"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    order_code: str
    customer_id: str
    created_by_user_id: Optional[str] = None

    # Status
    status: str
    order_date: Optional[datetime] = None
    customer_requested_date: Optional[datetime] = None

    # Location
    pickup_text: Optional[str] = None
    delivery_text: Optional[str] = None

    # Site-based pickup & delivery (preferred)
    pickup_site_id: Optional[str] = None
    delivery_site_id: Optional[str] = None

    # Legacy location IDs (for backward compatibility)
    pickup_location_id: Optional[str] = None
    delivery_location_id: Optional[str] = None

    # Container & cargo
    equipment: Optional[str] = None
    qty: int = 1
    container_code: Optional[str] = None
    cargo_note: Optional[str] = None
    empty_return_note: Optional[str] = None

    # Empty return port (Site where container is returned)
    port_site_id: Optional[str] = None

    # Distance for salary calculation
    distance_km: Optional[int] = None

    # Assignment
    dispatcher_id: Optional[str] = None
    driver_id: Optional[str] = None

    # ETAs
    eta_pickup_at: Optional[datetime] = None
    eta_delivery_at: Optional[datetime] = None

    # Rejection
    reject_reason: Optional[str] = None

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None