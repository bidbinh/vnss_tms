"""
Workflow Engine - Instance Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class InstanceStatus(str, Enum):
    """Workflow instance status"""
    DRAFT = "DRAFT"
    RUNNING = "RUNNING"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    SUSPENDED = "SUSPENDED"
    ERROR = "ERROR"


class StepInstanceStatus(str, Enum):
    """Step instance status"""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    REJECTED = "REJECTED"
    ESCALATED = "ESCALATED"
    TIMEOUT = "TIMEOUT"
    ERROR = "ERROR"


class WorkflowInstance(SQLModel, table=True):
    """Workflow Instance - Running workflow"""
    __tablename__ = "wf_instances"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    workflow_id: str = Field(index=True)
    workflow_code: Optional[str] = None
    workflow_name: Optional[str] = None
    workflow_version: int = Field(default=1)

    # Basic Info
    instance_number: str = Field(index=True)  # WF-2024-00001
    title: str
    description: Optional[str] = None
    status: str = Field(default=InstanceStatus.DRAFT.value)

    # Entity Reference
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_reference: Optional[str] = None  # Display reference like "Order #123"

    # Initiator
    initiator_id: str
    initiator_name: Optional[str] = None
    initiator_department: Optional[str] = None

    # Current Step
    current_step_id: Optional[str] = None
    current_step_name: Optional[str] = None

    # Priority
    priority: int = Field(default=5)  # 1=Highest, 10=Lowest

    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    sla_deadline: Optional[datetime] = None

    # Result
    final_action: Optional[str] = None  # APPROVED, REJECTED
    final_comments: Optional[str] = None

    # Data
    form_data: Optional[str] = None  # JSON of form data
    extra_data: Optional[str] = None  # JSON of additional metadata

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class WorkflowStepInstance(SQLModel, table=True):
    """Workflow Step Instance - Step in running workflow"""
    __tablename__ = "wf_step_instances"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    instance_id: str = Field(index=True)
    step_id: str = Field(index=True)
    step_order: int = Field(default=1)

    # Step Info (denormalized)
    step_code: Optional[str] = None
    step_name: Optional[str] = None
    step_type: Optional[str] = None

    # Status
    status: str = Field(default=StepInstanceStatus.PENDING.value)

    # Assignment
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    delegated_from_id: Optional[str] = None

    # Action
    action_taken: Optional[str] = None  # APPROVE, REJECT, etc.
    action_by_id: Optional[str] = None
    action_by_name: Optional[str] = None
    action_comments: Optional[str] = None

    # Timing
    activated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # SLA
    sla_hours: Optional[int] = None
    is_overdue: bool = Field(default=False)
    escalated_at: Optional[datetime] = None
    escalated_to: Optional[str] = None

    # Reminders
    reminder_sent_count: int = Field(default=0)
    last_reminder_at: Optional[datetime] = None

    # Data
    step_data: Optional[str] = None  # JSON of step-specific data

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowHistory(SQLModel, table=True):
    """Workflow History - Audit trail"""
    __tablename__ = "wf_history"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    instance_id: str = Field(index=True)
    step_instance_id: Optional[str] = None

    # Event
    event_type: str  # CREATED, STARTED, STEP_ACTIVATED, ACTION_TAKEN, COMPLETED, etc.
    event_description: str

    # Actor
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None

    # Before/After
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    from_step: Optional[str] = None
    to_step: Optional[str] = None

    # Action Details
    action: Optional[str] = None
    comments: Optional[str] = None

    # Data Changes
    old_data: Optional[str] = None  # JSON
    new_data: Optional[str] = None  # JSON

    # Metadata
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowVariable(SQLModel, table=True):
    """Workflow Variable - Instance variables"""
    __tablename__ = "wf_variables"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    instance_id: str = Field(index=True)
    step_instance_id: Optional[str] = None

    # Variable
    variable_name: str
    variable_type: str = Field(default="STRING")  # STRING, NUMBER, DATE, BOOLEAN, JSON
    variable_value: Optional[str] = None

    # Scope
    scope: str = Field(default="INSTANCE")  # INSTANCE, STEP

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
