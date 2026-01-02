from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DriverSalaryTripUpdate(BaseModel):
    """Schema for updating salary calculation flags for a trip/order"""
    is_flatbed: Optional[bool] = None  # Mooc sàn
    is_internal_cargo: Optional[bool] = None  # Hàng xá
    is_holiday: Optional[bool] = None  # Ngày lễ


class SalaryBreakdown(BaseModel):
    """Salary breakdown details"""
    distance_salary: int = 0
    port_gate_fee: int = 0
    flatbed_tarp_fee: int = 0
    warehouse_bonus: int = 0
    daily_trip_bonus: int = 0
    holiday_multiplier: float = 1.0
    total: int = 0


class DriverSalaryTripRead(BaseModel):
    """Schema for reading trip data in Driver Salary Management"""
    model_config = ConfigDict(from_attributes=True)

    # Order info
    id: str
    order_code: str
    customer_id: str
    driver_id: Optional[str] = None

    # Location
    pickup_text: Optional[str] = None
    delivery_text: Optional[str] = None
    pickup_site_id: Optional[str] = None
    delivery_site_id: Optional[str] = None
    pickup_site_name: Optional[str] = None  # Site company_name
    delivery_site_name: Optional[str] = None  # Site company_name

    # Container & cargo
    equipment: Optional[str] = None
    qty: int = 1
    container_code: Optional[str] = None
    cargo_note: Optional[str] = None

    # Distance for salary calculation
    distance_km: Optional[int] = None

    # Salary calculation flags (editable)
    is_flatbed: Optional[bool] = None
    is_internal_cargo: Optional[bool] = None
    is_holiday: Optional[bool] = None

    # Dates
    customer_requested_date: Optional[datetime] = None  # Ngày KH yêu cầu giao hàng (Cust Date)

    # Auto-calculated fields (from status logs and other data)
    delivered_date: Optional[datetime] = None  # When status changed to DELIVERED
    is_from_port: Optional[bool] = None  # Auto-calculated from pickup site type
    trips_per_day: Optional[int] = None  # Count of trips on same delivered_date
    trips_per_month: Optional[int] = None  # Total trips in month

    # Calculated salary
    calculated_salary: Optional[float] = None
    salary_breakdown: Optional[SalaryBreakdown] = None  # Detailed breakdown

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
