from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class CostNorm(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    __tablename__ = "cost_norms"

    # FUEL / DRIVER / TOLL / FIXED
    type: str = Field(index=True, nullable=False)

    # VEHICLE / ROUTE / TRIP (mức áp dụng)
    apply_level: str = Field(index=True, nullable=False)

    # lọc theo xe / tuyến (tuỳ loại)
    vehicle_id: Optional[str] = Field(default=None, index=True)
    route_code: Optional[str] = Field(default=None, index=True)

    # VND theo đơn vị
    unit_cost: float = Field(nullable=False)

    # KM / TRIP / ROUTE
    unit: str = Field(index=True, nullable=False)

    note: Optional[str] = Field(default=None)
