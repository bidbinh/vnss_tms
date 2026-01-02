from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime
from .base import BaseUUIDModel, TimestampMixin, TenantScoped


class AdvancePayment(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "advance_payments"

    # Foreign keys
    driver_id: str = Field(nullable=False, index=True)  # Driver who received advance

    # Payment details
    amount: int = Field(nullable=False)  # Amount in VND
    payment_date: date = Field(nullable=False, index=True)  # When payment was made

    # Deduction tracking
    is_deducted: bool = Field(default=False)  # Whether this has been deducted from salary
    deducted_month: Optional[int] = Field(default=None)  # Month when deducted (1-12)
    deducted_year: Optional[int] = Field(default=None)  # Year when deducted

    # Notes
    note: Optional[str] = Field(default=None)  # Optional note about the advance

    # Approval tracking
    approved_by: Optional[str] = Field(default=None)  # User ID who approved
    approved_at: Optional[datetime] = Field(default=None)  # When approved
