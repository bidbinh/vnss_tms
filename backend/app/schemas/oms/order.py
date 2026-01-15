"""
OMS Order Schemas
"""
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


# ============================================
# Order Schemas
# ============================================

class OMSOrderBase(BaseModel):
    """Base order schema"""
    external_reference: Optional[str] = None
    customer_id: str
    delivery_address_id: Optional[str] = None
    delivery_contact_name: Optional[str] = None
    delivery_contact_phone: Optional[str] = None
    required_delivery_date: Optional[datetime] = None
    sales_notes: Optional[str] = None
    customer_notes: Optional[str] = None


class OMSOrderCreate(OMSOrderBase):
    """Create order schema"""
    pass


class OMSOrderUpdate(BaseModel):
    """Update order schema"""
    external_reference: Optional[str] = None
    delivery_address_id: Optional[str] = None
    delivery_contact_name: Optional[str] = None
    delivery_contact_phone: Optional[str] = None
    required_delivery_date: Optional[datetime] = None
    sales_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    customer_notes: Optional[str] = None


class OMSOrderRead(OMSOrderBase):
    """Read order schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_number: str
    status: str
    customer_name: Optional[str] = None
    delivery_address_text: Optional[str] = None
    order_date: datetime
    confirmed_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None

    # Pricing
    total_product_amount: Decimal
    total_shipping_cost: Decimal
    total_tax: Decimal
    total_discount: Decimal
    grand_total: Decimal
    currency: str

    # Audit
    created_by_id: str
    created_at: datetime
    updated_at: datetime
    confirmed_by_id: Optional[str] = None
    confirmed_at: Optional[datetime] = None


class OMSOrderDetail(OMSOrderRead):
    """Detailed order schema with items"""
    items: List["OMSOrderItemRead"] = []
    internal_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


# ============================================
# Order Item Schemas
# ============================================

class OMSOrderItemBase(BaseModel):
    """Base order item schema"""
    product_id: str
    product_code: str
    product_name: str
    product_unit: str
    quantity: Decimal
    cs_unit_price: Decimal
    quoted_unit_price: Decimal
    shipping_unit_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class OMSOrderItemCreate(OMSOrderItemBase):
    """Create order item schema"""
    pass


class OMSOrderItemUpdate(BaseModel):
    """Update order item schema"""
    quantity: Optional[Decimal] = None
    quoted_unit_price: Optional[Decimal] = None
    shipping_unit_cost: Optional[Decimal] = None
    notes: Optional[str] = None


class OMSOrderItemRead(OMSOrderItemBase):
    """Read order item schema"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    quantity_allocated: Decimal
    quantity_shipped: Decimal
    quantity_delivered: Decimal
    approved_unit_price: Optional[Decimal] = None
    line_total: Optional[Decimal] = None
    tax_amount: Decimal
    discount_amount: Decimal
    net_amount: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime


# ============================================
# Order with Items (for creation)
# ============================================

class OMSOrderWithItemsCreate(OMSOrderBase):
    """Create order with items"""
    items: List[OMSOrderItemCreate]


# ============================================
# List Response
# ============================================

class OMSOrderListResponse(BaseModel):
    """List response schema"""
    data: List[OMSOrderRead]
    total: int
    skip: int
    limit: int
