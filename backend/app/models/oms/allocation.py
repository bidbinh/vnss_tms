"""
OMS Allocation Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from decimal import Decimal

from sqlmodel import Field, SQLModel

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class AllocationSourceType(str, Enum):
    """Source type for allocation"""
    WAREHOUSE = "WAREHOUSE"
    PORT = "PORT"
    IN_TRANSIT = "IN_TRANSIT"


class AllocationStatus(str, Enum):
    """Allocation status"""
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    PICKED = "PICKED"
    SHIPPED = "SHIPPED"
    CANCELLED = "CANCELLED"


class OMSAllocation(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """OMS Allocation - Stock allocation for order items"""
    __tablename__ = "oms_allocations"

    # Relations
    order_id: str = Field(
        nullable=False,
        foreign_key="oms_orders.id",
        index=True
    )
    order_item_id: str = Field(
        nullable=False,
        foreign_key="oms_order_items.id",
        index=True
    )

    # Source (from WMS)
    source_type: str = Field(nullable=False, max_length=50, index=True)
    source_id: str = Field(nullable=False, index=True)
    source_name: str = Field(nullable=False, max_length=255)
    source_location: Optional[str] = Field(default=None)

    # Allocation
    allocated_quantity: Decimal = Field(
        nullable=False,
        max_digits=15,
        decimal_places=3
    )
    allocated_date: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False
    )
    allocated_by_id: str = Field(nullable=False, foreign_key="users.id")

    # Status
    status: str = Field(
        default=AllocationStatus.ALLOCATED.value,
        nullable=False,
        max_length=50,
        index=True
    )

    # Notes
    notes: Optional[str] = Field(default=None)
