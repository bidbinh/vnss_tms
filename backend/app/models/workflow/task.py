"""
Workflow Engine - Task Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class WorkflowTaskStatus(str, Enum):
    """Workflow task status"""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"


class WorkflowTaskPriority(str, Enum):
    """Workflow task priority"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class WorkflowTask(SQLModel, table=True):
    """Workflow Task - Human task in workflow"""
    __tablename__ = "wf_tasks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Reference
    workflow_instance_id: Optional[str] = None
    step_instance_id: Optional[str] = None
    approval_request_id: Optional[str] = None

    # Basic Info
    task_number: str = Field(index=True)  # TASK-2024-00001
    title: str
    description: Optional[str] = None
    task_type: str = Field(default="MANUAL")  # MANUAL, APPROVAL, REVIEW
    status: str = Field(default=WorkflowTaskStatus.PENDING.value)
    priority: str = Field(default=WorkflowTaskPriority.NORMAL.value)

    # Assignment
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    assigned_at: Optional[datetime] = None

    # Delegation
    delegated_from_id: Optional[str] = None
    delegated_from_name: Optional[str] = None

    # Claimed (for group tasks)
    claimed_by_id: Optional[str] = None
    claimed_by_name: Optional[str] = None
    claimed_at: Optional[datetime] = None

    # Timeline
    due_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # SLA
    sla_hours: Optional[int] = None
    is_overdue: bool = Field(default=False)

    # Result
    result: Optional[str] = None
    result_data: Optional[str] = None  # JSON
    comments: Optional[str] = None

    # Form
    form_id: Optional[str] = None
    form_data: Optional[str] = None  # JSON

    # Actions
    allowed_actions: Optional[str] = None  # JSON array

    # URL
    task_url: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    completed_by: Optional[str] = None


class TaskReminder(SQLModel, table=True):
    """Task Reminder - Reminders for tasks"""
    __tablename__ = "wf_task_reminders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    task_id: str = Field(index=True)

    # Reminder Info
    reminder_type: str = Field(default="BEFORE_DUE")  # BEFORE_DUE, OVERDUE, PERIODIC
    reminder_hours: int = Field(default=24)

    # Schedule
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    is_sent: bool = Field(default=False)

    # Recipient
    recipient_id: str
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None

    # Channel
    channel: str = Field(default="EMAIL")  # EMAIL, SMS, PUSH, IN_APP

    # Message
    subject: Optional[str] = None
    message: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TaskEscalation(SQLModel, table=True):
    """Task Escalation - Escalation history"""
    __tablename__ = "wf_task_escalations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    task_id: str = Field(index=True)

    # Escalation Info
    escalation_level: int = Field(default=1)
    escalation_reason: str = Field(default="OVERDUE")  # OVERDUE, MANUAL, SLA_BREACH

    # From/To
    escalated_from_id: Optional[str] = None
    escalated_from_name: Optional[str] = None
    escalated_to_id: str
    escalated_to_name: Optional[str] = None

    # Action
    action_taken: Optional[str] = None
    comments: Optional[str] = None

    # Timing
    escalated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
