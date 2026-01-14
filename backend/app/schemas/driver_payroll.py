"""
Driver Payroll Schemas
Request/Response schemas for driver payroll API endpoints
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DriverPayrollCreate(BaseModel):
    """Schema for creating a new driver payroll"""
    driver_id: str
    year: int
    month: int  # 1-12
    notes: Optional[str] = None


class DriverPayrollUpdate(BaseModel):
    """Schema for updating driver payroll"""
    notes: Optional[str] = None
    hr_notes: Optional[str] = None


class DriverPayrollAction(BaseModel):
    """Schema for HR review or driver confirmation actions"""
    action: str  # "approve", "reject", "confirm"
    notes: Optional[str] = None


class TripSummary(BaseModel):
    """Summary of a trip in the payroll snapshot"""
    order_id: str
    order_code: str
    customer_requested_date: Optional[str] = None
    delivered_date: Optional[str] = None
    pickup_site_name: Optional[str] = None
    delivery_site_name: Optional[str] = None
    container_code: Optional[str] = None
    distance_km: Optional[int] = None
    is_from_port: Optional[bool] = None
    is_flatbed: Optional[bool] = None
    is_internal_cargo: Optional[bool] = None
    is_holiday: Optional[bool] = None
    trips_per_day: Optional[int] = None
    calculated_salary: Optional[int] = None
    salary_breakdown: Optional[Dict[str, Any]] = None


class DriverPayrollRead(BaseModel):
    """Schema for reading driver payroll details"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    driver_id: str
    driver_name: Optional[str] = None  # Resolved from driver
    year: int
    month: int
    status: str
    workflow_instance_id: Optional[str] = None

    # Trip snapshot
    trip_snapshot: Dict[str, Any] = {}

    # Totals
    total_trips: int = 0
    total_distance_km: int = 0
    total_salary: int = 0
    total_bonuses: int = 0
    total_deductions: int = 0
    net_salary: int = 0

    # Workflow timestamps
    created_by_id: str
    created_by_name: Optional[str] = None  # Resolved from user
    confirmed_by_driver_at: Optional[datetime] = None
    confirmed_by_hr_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    # Notes
    notes: Optional[str] = None
    driver_notes: Optional[str] = None
    hr_notes: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime


class DriverPayrollListItem(BaseModel):
    """Schema for payroll list view (lighter than full read)"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    driver_id: str
    driver_name: Optional[str] = None
    year: int
    month: int
    status: str
    total_trips: int
    total_distance_km: int
    net_salary: int
    created_at: datetime
    confirmed_by_driver_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
