"""
OMS Shipment Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from decimal import Decimal

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ShipmentType(str, Enum):
    """Shipment type"""
    INTERNAL = "INTERNAL"  # Via TMS
    EXTERNAL = "EXTERNAL"  # External carrier
    OTHER = "OTHER"


class ShipmentStatus(str, Enum):
    """Shipment status"""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class OMSShipment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """OMS Shipment - Shipment/delivery record"""
    __tablename__ = "oms_shipments"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'shipment_number', name='uq_oms_shipment_number'),
    )

    # Relations
    order_id: str = Field(
        nullable=False,
        foreign_key="oms_orders.id",
        index=True
    )

    # Identifiers
    shipment_number: str = Field(nullable=False, index=True, max_length=50)
    tms_order_id: Optional[str] = Field(default=None, index=True)

    # Type
    shipment_type: str = Field(nullable=False, max_length=50)

    # Status
    status: str = Field(
        default=ShipmentStatus.PENDING.value,
        nullable=False,
        max_length=50,
        index=True
    )

    # Pickup
    pickup_location_id: Optional[str] = Field(default=None)
    pickup_location_name: Optional[str] = Field(default=None, max_length=255)
    pickup_address: Optional[str] = Field(default=None)
    pickup_date: Optional[datetime] = Field(default=None)

    # Delivery
    delivery_address_id: Optional[str] = Field(default=None)
    delivery_address: Optional[str] = Field(default=None)
    delivery_contact_name: Optional[str] = Field(default=None, max_length=255)
    delivery_contact_phone: Optional[str] = Field(default=None, max_length=50)
    planned_delivery_date: Optional[datetime] = Field(default=None)
    actual_delivery_date: Optional[datetime] = Field(default=None)

    # Carrier (for EXTERNAL shipments)
    carrier_name: Optional[str] = Field(default=None, max_length=255)
    carrier_contact: Optional[str] = Field(default=None, max_length=100)
    tracking_number: Optional[str] = Field(default=None, max_length=100)

    # Notes
    notes: Optional[str] = Field(default=None)

    # Audit
    created_by_id: str = Field(nullable=False, foreign_key="users.id")


class OMSShipmentItem(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """OMS Shipment Item - Products in a shipment"""
    __tablename__ = "oms_shipment_items"

    # Relations
    shipment_id: str = Field(
        nullable=False,
        foreign_key="oms_shipments.id",
        index=True
    )
    order_item_id: str = Field(
        nullable=False,
        foreign_key="oms_order_items.id",
        index=True
    )
    allocation_id: Optional[str] = Field(
        default=None,
        foreign_key="oms_allocations.id",
        index=True
    )

    # Quantity
    quantity: Decimal = Field(nullable=False, max_digits=15, decimal_places=3)
    delivered_quantity: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=3
    )

    # Product (cached)
    product_id: str = Field(nullable=False)
    product_code: str = Field(nullable=False, max_length=50)
    product_name: str = Field(nullable=False, max_length=255)
    product_unit: str = Field(nullable=False, max_length=20)

    # Notes
    notes: Optional[str] = Field(default=None)
