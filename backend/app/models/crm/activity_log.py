"""
CRM - Activity Log Models
Track all changes/actions on CRM entities
"""
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum
from app.models.base import BaseUUIDModel, TimestampMixin, TenantScoped


class ActivityLogAction(str, Enum):
    """Loại hành động"""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    STATUS_CHANGE = "STATUS_CHANGE"
    CONVERT = "CONVERT"  # Lead convert
    ACCEPT = "ACCEPT"  # Quote accept
    REJECT = "REJECT"  # Quote reject
    SEND = "SEND"  # Quote send
    SYNC = "SYNC"  # TMS sync
    ASSIGN = "ASSIGN"  # Assign to user
    UNASSIGN = "UNASSIGN"


class ActivityLogEntityType(str, Enum):
    """Loại entity"""
    LEAD = "LEAD"
    ACCOUNT = "ACCOUNT"
    CONTACT = "CONTACT"
    OPPORTUNITY = "OPPORTUNITY"
    QUOTE = "QUOTE"
    ACTIVITY = "ACTIVITY"


class ActivityLog(BaseUUIDModel, TimestampMixin, TenantScoped, SQLModel, table=True):
    """Nhật ký hoạt động CRM"""
    __tablename__ = "crm_activity_logs"

    # Entity reference
    entity_type: str = Field(index=True, nullable=False)  # LEAD, ACCOUNT, etc.
    entity_id: str = Field(index=True, nullable=False)  # ID of the entity
    entity_code: Optional[str] = Field(default=None)  # Code for quick reference
    entity_name: Optional[str] = Field(default=None)  # Name for display

    # Action
    action: str = Field(index=True, nullable=False)  # CREATE, UPDATE, DELETE, etc.
    action_label: Optional[str] = Field(default=None)  # Human-readable action label

    # Changes (for UPDATE actions)
    old_values: Optional[str] = Field(default=None)  # JSON of old values
    new_values: Optional[str] = Field(default=None)  # JSON of new values
    changed_fields: Optional[str] = Field(default=None)  # JSON array of field names

    # Description
    description: Optional[str] = Field(default=None)  # Human-readable description

    # Related entities
    related_entity_type: Optional[str] = Field(default=None)
    related_entity_id: Optional[str] = Field(default=None)

    # User who performed the action
    user_id: str = Field(index=True, nullable=False)
    user_name: Optional[str] = Field(default=None)

    # IP and User Agent (for security audit)
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)
