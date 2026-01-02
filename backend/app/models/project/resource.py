"""
Project Management - Resource Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class ResourceType(str, Enum):
    """Resource type"""
    HUMAN = "HUMAN"
    EQUIPMENT = "EQUIPMENT"
    MATERIAL = "MATERIAL"
    FACILITY = "FACILITY"
    SOFTWARE = "SOFTWARE"
    EXTERNAL = "EXTERNAL"


class Resource(SQLModel, table=True):
    """Resource - Project resources (people, equipment, etc.)"""
    __tablename__ = "prj_resources"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    code: str = Field(index=True)
    name: str
    resource_type: str = Field(default=ResourceType.HUMAN.value)
    description: Optional[str] = None

    # Link to Employee/User (for HUMAN type)
    user_id: Optional[str] = None
    employee_id: Optional[str] = None

    # Department/Team
    department_id: Optional[str] = None
    department_name: Optional[str] = None

    # Capacity
    capacity_hours_per_day: Decimal = Field(default=Decimal("8"))
    capacity_hours_per_week: Decimal = Field(default=Decimal("40"))
    max_allocation_percent: Decimal = Field(default=Decimal("100"))

    # Cost
    cost_rate_per_hour: Decimal = Field(default=Decimal("0"))
    billing_rate_per_hour: Decimal = Field(default=Decimal("0"))
    currency: str = Field(default="VND")

    # Skills (for HUMAN type)
    skills: Optional[str] = None  # JSON array of skills

    # Availability
    is_available: bool = Field(default=True)
    available_from: Optional[date] = None
    available_to: Optional[date] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ResourceAllocation(SQLModel, table=True):
    """Resource Allocation - Resource assigned to project/task"""
    __tablename__ = "prj_resource_allocations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    resource_id: str = Field(index=True)
    project_id: str = Field(index=True)
    task_id: Optional[str] = None

    # Period
    start_date: date
    end_date: date

    # Allocation
    allocation_percent: Decimal = Field(default=Decimal("100"))
    planned_hours: Decimal = Field(default=Decimal("0"))
    actual_hours: Decimal = Field(default=Decimal("0"))

    # Cost
    planned_cost: Decimal = Field(default=Decimal("0"))
    actual_cost: Decimal = Field(default=Decimal("0"))

    # Role
    role: Optional[str] = None

    # Status
    is_confirmed: bool = Field(default=False)
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ResourceCalendar(SQLModel, table=True):
    """Resource Calendar - Working/Non-working days"""
    __tablename__ = "prj_resource_calendars"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    resource_id: Optional[str] = None  # If null, applies to all
    calendar_date: date = Field(index=True)

    # Day Type
    is_working_day: bool = Field(default=True)
    is_holiday: bool = Field(default=False)
    holiday_name: Optional[str] = None

    # Working Hours
    work_start_time: Optional[str] = None  # HH:MM
    work_end_time: Optional[str] = None
    break_hours: Decimal = Field(default=Decimal("1"))
    available_hours: Decimal = Field(default=Decimal("8"))

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
