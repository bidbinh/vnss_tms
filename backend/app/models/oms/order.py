"""
OMS Order Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from decimal import Decimal

from sqlmodel import Field, SQLModel, Column, JSON, UniqueConstraint
from sqlalchemy import text

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class OMSOrderStatus(str, Enum):
    """Order status enum"""
    DRAFT = "DRAFT"
    PENDING_PRICE_APPROVAL = "PENDING_PRICE_APPROVAL"
    PRICE_APPROVED = "PRICE_APPROVED"
    PRICE_REJECTED = "PRICE_REJECTED"
    PENDING_ALLOCATION = "PENDING_ALLOCATION"
    ALLOCATION_CONFIRMED = "ALLOCATION_CONFIRMED"
    READY_TO_SHIP = "READY_TO_SHIP"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OMSOrder(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """OMS Order - Main order entity"""
    __tablename__ = "oms_orders"
    __table_args__ = (
        UniqueConstraint('tenant_id', 'order_number', name='uq_oms_order_number'),
    )

    # Identifiers
    order_number: str = Field(nullable=False, index=True, max_length=50)
    external_reference: Optional[str] = Field(default=None, max_length=100)

    # Status & Workflow
    status: str = Field(
        default=OMSOrderStatus.DRAFT.value,
        index=True,
        max_length=50
    )
    workflow_instance_id: Optional[str] = Field(default=None, index=True)
    previous_status: Optional[str] = Field(default=None, max_length=50)

    # Customer (from CRM)
    customer_id: str = Field(nullable=False, index=True)
    customer_name: Optional[str] = Field(default=None, max_length=255)
    delivery_address_id: Optional[str] = Field(default=None)
    delivery_address_text: Optional[str] = Field(default=None)
    delivery_contact_name: Optional[str] = Field(default=None, max_length=255)
    delivery_contact_phone: Optional[str] = Field(default=None, max_length=50)

    # Dates
    order_date: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        index=True
    )
    required_delivery_date: Optional[datetime] = Field(default=None, index=True)
    confirmed_date: Optional[datetime] = Field(default=None)
    completed_date: Optional[datetime] = Field(default=None)

    # Pricing
    base_price_type: Optional[str] = Field(default="CS_PRICE", max_length=50)
    total_product_amount: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    total_shipping_cost: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    total_tax: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    total_discount: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    grand_total: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    currency: str = Field(default="VND", max_length=10)

    # Notes
    sales_notes: Optional[str] = Field(default=None)
    internal_notes: Optional[str] = Field(default=None)
    customer_notes: Optional[str] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None)

    # Audit
    created_by_id: str = Field(nullable=False, foreign_key="users.id")
    confirmed_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    confirmed_at: Optional[datetime] = Field(default=None)


class OMSOrderItem(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """OMS Order Item - Product line items in an order"""
    __tablename__ = "oms_order_items"

    # Relations
    order_id: str = Field(
        nullable=False,
        foreign_key="oms_orders.id",
        index=True
    )

    # Product (from WMS/Product Catalog)
    product_id: str = Field(nullable=False, index=True)
    product_code: str = Field(nullable=False, max_length=50)
    product_name: str = Field(nullable=False, max_length=255)
    product_unit: str = Field(nullable=False, max_length=20)

    # Quantity
    quantity: Decimal = Field(nullable=False, max_digits=15, decimal_places=3)
    quantity_allocated: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=3
    )
    quantity_shipped: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=3
    )
    quantity_delivered: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=3
    )

    # Pricing (VND/kg or VND/unit)
    cs_unit_price: Decimal = Field(
        nullable=False,
        max_digits=15,
        decimal_places=2
    )
    quoted_unit_price: Decimal = Field(
        nullable=False,
        max_digits=15,
        decimal_places=2
    )
    approved_unit_price: Optional[Decimal] = Field(
        default=None,
        max_digits=15,
        decimal_places=2
    )
    shipping_unit_cost: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )

    # Calculated
    line_total: Optional[Decimal] = Field(
        default=None,
        max_digits=15,
        decimal_places=2
    )
    tax_amount: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    discount_amount: Decimal = Field(
        default=Decimal("0"),
        max_digits=15,
        decimal_places=2
    )
    net_amount: Optional[Decimal] = Field(
        default=None,
        max_digits=15,
        decimal_places=2
    )

    # Notes
    notes: Optional[str] = Field(default=None)
