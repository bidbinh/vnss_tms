"""
OMS Price Approval Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel, Column, JSON

from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class PriceApprovalStatus(str, Enum):
    """Price approval status"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class OMSPriceApproval(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """OMS Price Approval - Price approval requests"""
    __tablename__ = "oms_price_approvals"

    # Relations
    order_id: str = Field(
        nullable=False,
        foreign_key="oms_orders.id",
        index=True
    )

    # Request
    requested_by_id: str = Field(nullable=False, foreign_key="users.id")
    requested_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False
    )
    request_notes: Optional[str] = Field(default=None)

    # Price Comparison (JSON for each item)
    price_comparison: dict = Field(default={}, sa_column=Column(JSON))
    # Format:
    # [
    #   {
    #     "order_item_id": "xxx",
    #     "product_code": "PP-001",
    #     "cs_unit_price": 25000,
    #     "quoted_unit_price": 23500,
    #     "difference": -1500,
    #     "difference_percent": -6.0,
    #     "reason": "Khách hàng VIP"
    #   }
    # ]

    # Approval
    status: str = Field(
        default=PriceApprovalStatus.PENDING.value,
        nullable=False,
        max_length=50,
        index=True
    )
    reviewed_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    reviewed_at: Optional[datetime] = Field(default=None)
    review_notes: Optional[str] = Field(default=None)
