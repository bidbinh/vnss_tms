from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


class AdvancePaymentBase(BaseModel):
    driver_id: str
    amount: int
    payment_date: date
    note: Optional[str] = None


class AdvancePaymentCreate(AdvancePaymentBase):
    pass


class AdvancePaymentUpdate(BaseModel):
    amount: Optional[int] = None
    payment_date: Optional[date] = None
    note: Optional[str] = None
    is_deducted: Optional[bool] = None
    deducted_month: Optional[int] = None
    deducted_year: Optional[int] = None


class AdvancePaymentRead(AdvancePaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_deducted: bool
    deducted_month: Optional[int]
    deducted_year: Optional[int]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class AdvancePaymentWithDriver(AdvancePaymentRead):
    """Advance payment with driver name for display"""
    driver_name: Optional[str] = None
