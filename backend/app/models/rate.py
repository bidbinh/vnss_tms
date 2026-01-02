from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date
from .base import BaseUUIDModel, TimestampMixin, TenantScoped

class Rate(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """
    Rate = Bảng giá cước theo Location (KCN/Phường)
    Không tính theo Site cụ thể
    """
    __tablename__ = "rates"

    # Route - Link to Locations
    pickup_location_id: str = Field(foreign_key="locations.id", index=True, nullable=False)
    delivery_location_id: str = Field(foreign_key="locations.id", index=True, nullable=False)

    # Route characteristics
    distance_km: Optional[int] = Field(default=None)  # Số KM
    toll_stations: Optional[int] = Field(default=None)  # Số trạm thu phí

    # Pricing type and values
    pricing_type: str = Field(default="CONTAINER", index=True)  # CONTAINER (hàng cảng) or TRIP (hàng kho)

    # Container-based pricing (for PORT/ICD cargo)
    price_cont_20: Optional[int] = Field(default=None)  # Giá cont 20
    price_cont_40: Optional[int] = Field(default=None)  # Giá cont 40

    # Trip-based pricing (for warehouse/depot cargo)
    price_per_trip: Optional[int] = Field(default=None)  # Giá theo chuyến

    # Effective period
    effective_date: date = Field(nullable=False, index=True)
    end_date: Optional[date] = Field(default=None)  # NULL = no end date

    # Status
    status: str = Field(default="ACTIVE")  # ACTIVE, INACTIVE

    # Note: Customer assignment is handled via rate_customers junction table
    # If no customers assigned = applies to ALL customers
    # If customers assigned = applies only to those specific customers
