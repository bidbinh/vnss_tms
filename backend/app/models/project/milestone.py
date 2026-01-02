"""
Project Management - Milestone Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class MilestoneStatus(str, Enum):
    """Milestone status"""
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class Milestone(SQLModel, table=True):
    """Milestone - Project milestones/checkpoints"""
    __tablename__ = "prj_milestones"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    project_id: str = Field(index=True)
    phase_id: Optional[str] = None

    # Basic Info
    name: str
    description: Optional[str] = None
    status: str = Field(default=MilestoneStatus.NOT_STARTED.value)

    # Timeline
    due_date: Optional[date] = None
    completed_date: Optional[date] = None

    # Owner
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None

    # Progress (based on linked tasks)
    total_tasks: int = Field(default=0)
    completed_tasks: int = Field(default=0)
    progress_percent: Decimal = Field(default=Decimal("0"))

    # Deliverables
    deliverables: Optional[str] = None  # JSON array of deliverable descriptions

    # Budget (if milestone has budget checkpoint)
    budget_checkpoint: Decimal = Field(default=Decimal("0"))
    actual_cost_at_milestone: Decimal = Field(default=Decimal("0"))

    # Gate/Approval
    requires_approval: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None

    # Notification
    notify_days_before: int = Field(default=7)  # Days before due date to notify

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    completed_by: Optional[str] = None
