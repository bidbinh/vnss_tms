"""
Project Management - Timesheet Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class TimesheetStatus(str, Enum):
    """Timesheet status"""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    LOCKED = "LOCKED"


class Timesheet(SQLModel, table=True):
    """Timesheet - Weekly/Periodic timesheet"""
    __tablename__ = "prj_timesheets"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Employee/User
    user_id: str = Field(index=True)
    user_name: Optional[str] = None
    employee_id: Optional[str] = None

    # Period
    period_start: date = Field(index=True)
    period_end: date
    period_type: str = Field(default="WEEKLY")  # WEEKLY, BIWEEKLY, MONTHLY

    # Status
    status: str = Field(default=TimesheetStatus.DRAFT.value)

    # Hours Summary
    total_regular_hours: Decimal = Field(default=Decimal("0"))
    total_overtime_hours: Decimal = Field(default=Decimal("0"))
    total_billable_hours: Decimal = Field(default=Decimal("0"))
    total_non_billable_hours: Decimal = Field(default=Decimal("0"))

    # Cost Summary
    total_cost: Decimal = Field(default=Decimal("0"))
    total_billable_amount: Decimal = Field(default=Decimal("0"))

    # Submission
    submitted_at: Optional[datetime] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class TimesheetEntry(SQLModel, table=True):
    """Timesheet Entry - Individual time entry"""
    __tablename__ = "prj_timesheet_entries"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    timesheet_id: str = Field(index=True)
    user_id: str = Field(index=True)

    # Project/Task
    project_id: str = Field(index=True)
    project_name: Optional[str] = None
    task_id: Optional[str] = None
    task_name: Optional[str] = None

    # Date/Time
    work_date: date = Field(index=True)
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None

    # Hours
    hours: Decimal = Field(default=Decimal("0"))
    overtime_hours: Decimal = Field(default=Decimal("0"))

    # Billing
    is_billable: bool = Field(default=True)
    billing_rate: Decimal = Field(default=Decimal("0"))
    billable_amount: Decimal = Field(default=Decimal("0"))

    # Cost
    cost_rate: Decimal = Field(default=Decimal("0"))
    cost_amount: Decimal = Field(default=Decimal("0"))

    # Work Type
    work_type: Optional[str] = None  # Development, Meeting, Support, etc.
    activity_code: Optional[str] = None

    # Description
    description: str
    internal_notes: Optional[str] = None

    # Approval
    is_approved: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class TimesheetApproval(SQLModel, table=True):
    """Timesheet Approval - Approval history"""
    __tablename__ = "prj_timesheet_approvals"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    timesheet_id: str = Field(index=True)

    # Approver
    approver_id: str
    approver_name: Optional[str] = None
    approver_level: int = Field(default=1)

    # Action
    action: str  # APPROVED, REJECTED
    action_date: datetime = Field(default_factory=datetime.utcnow)

    # Comments
    comments: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
