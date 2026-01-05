"""
Driver Availability Model
Manages driver schedules across multiple companies (tenants)
Workers declare their availability, companies see when drivers are free
"""

from sqlmodel import SQLModel, Field
from typing import Optional
import datetime as dt
from .base import BaseUUIDModel, TimestampMixin


class AvailabilityStatus:
    """Availability status types"""
    AVAILABLE = "AVAILABLE"      # Free to work
    BUSY = "BUSY"                # Assigned to a task/order
    BLOCKED = "BLOCKED"          # Manually blocked by driver
    UNAVAILABLE = "UNAVAILABLE"  # Not working (day off, sick, etc.)


class RecurrenceType:
    """Recurrence types for availability patterns"""
    NONE = "NONE"          # One-time
    DAILY = "DAILY"        # Every day
    WEEKLY = "WEEKLY"      # Every week on specific days
    MONTHLY = "MONTHLY"    # Every month on specific dates


class DriverAvailability(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Driver availability schedule
    - Can be per-tenant (specific company) or global (all companies)
    - Workers manage this from their Personal Workspace
    - Companies see availability when assigning orders
    """
    __tablename__ = "driver_availability"

    # Worker identification (from workers table - 9log platform)
    worker_id: str = Field(index=True, nullable=False)

    # Optional: specific tenant. NULL means applies to all tenants
    tenant_id: Optional[str] = Field(default=None, index=True)

    # Schedule details
    availability_date: dt.date = Field(index=True, nullable=False)  # Specific date
    start_time: dt.time = Field(nullable=False)  # Start time (e.g., 06:00)
    end_time: dt.time = Field(nullable=False)    # End time (e.g., 18:00)

    # Status
    status: str = Field(default=AvailabilityStatus.AVAILABLE, index=True)

    # If BUSY, link to the task/order
    task_id: Optional[str] = Field(default=None, index=True)  # Link to worker_tasks
    order_id: Optional[str] = Field(default=None, index=True)  # Link to orders

    # Notes
    note: Optional[str] = Field(default=None)

    # Recurrence (for patterns like "every Monday 6am-6pm")
    recurrence_type: str = Field(default=RecurrenceType.NONE)
    recurrence_end_date: Optional[dt.date] = Field(default=None)  # When recurrence ends
    parent_availability_id: Optional[str] = Field(default=None, index=True)  # Link to parent recurring record


class DriverAvailabilityTemplate(BaseUUIDModel, TimestampMixin, SQLModel, table=True):
    """
    Default weekly schedule template for a worker
    E.g., "I work Mon-Fri 6am-6pm, Sat 6am-12pm"
    """
    __tablename__ = "driver_availability_templates"

    worker_id: str = Field(index=True, nullable=False)

    # Day of week (0=Monday, 6=Sunday)
    day_of_week: int = Field(nullable=False)

    # Time range
    start_time: dt.time = Field(nullable=False)
    end_time: dt.time = Field(nullable=False)

    # Optional: only for specific tenant
    tenant_id: Optional[str] = Field(default=None, index=True)

    # Active flag
    is_active: bool = Field(default=True)
