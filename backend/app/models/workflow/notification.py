"""
Workflow Engine - Notification Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class NotificationType(str, Enum):
    """Notification type"""
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_COMPLETED = "TASK_COMPLETED"
    TASK_OVERDUE = "TASK_OVERDUE"
    APPROVAL_REQUESTED = "APPROVAL_REQUESTED"
    APPROVAL_APPROVED = "APPROVAL_APPROVED"
    APPROVAL_REJECTED = "APPROVAL_REJECTED"
    WORKFLOW_STARTED = "WORKFLOW_STARTED"
    WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED"
    REMINDER = "REMINDER"
    ESCALATION = "ESCALATION"
    CUSTOM = "CUSTOM"


class NotificationChannel(str, Enum):
    """Notification channel"""
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"
    IN_APP = "IN_APP"
    WEBHOOK = "WEBHOOK"


class WorkflowNotification(SQLModel, table=True):
    """Workflow Notification - Notification queue"""
    __tablename__ = "wf_notifications"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Reference
    workflow_instance_id: Optional[str] = None
    step_instance_id: Optional[str] = None
    task_id: Optional[str] = None
    approval_request_id: Optional[str] = None

    # Notification Info
    notification_type: str = Field(index=True)
    channel: str = Field(default=NotificationChannel.EMAIL.value)
    priority: int = Field(default=5)

    # Recipient
    recipient_id: str = Field(index=True)
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None

    # Content
    subject: str
    body: str
    body_html: Optional[str] = None

    # Template
    template_id: Optional[str] = None
    template_data: Optional[str] = None  # JSON

    # Status
    status: str = Field(default="PENDING")  # PENDING, SENT, FAILED, CANCELLED
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)

    # Timing
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    # Error
    error_message: Optional[str] = None

    # Extra Data
    extra_data: Optional[str] = None  # JSON

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationTemplate(SQLModel, table=True):
    """Notification Template - Reusable templates"""
    __tablename__ = "wf_notification_templates"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None
    notification_type: str
    channel: str = Field(default=NotificationChannel.EMAIL.value)
    is_active: bool = Field(default=True)

    # Content
    subject_template: str
    body_template: str
    body_html_template: Optional[str] = None

    # Variables
    available_variables: Optional[str] = None  # JSON array of variable names

    # Language
    language: str = Field(default="vi")

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
