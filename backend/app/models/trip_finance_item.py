from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class TripFinanceItem(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "trip_finance_items"

    trip_id: str = Field(index=True, nullable=False)

    direction: str = Field(index=True, nullable=False)   # INCOME / EXPENSE
    category: str = Field(index=True, nullable=False)    # FUEL / TOLL / SALARY / FREIGHT ...

    amount: float = Field(nullable=False)
    currency: str = Field(default="VND", index=True)

    is_cod: bool = Field(default=False, index=True)
    payer: Optional[str] = Field(default=None)
    note: Optional[str] = Field(default=None)
