"""
Document Management - Archive Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class ArchiveAction(str, Enum):
    """Archive action"""
    ARCHIVE = "ARCHIVE"
    DELETE = "DELETE"
    MOVE = "MOVE"
    NOTIFY = "NOTIFY"


class ArchivePolicy(SQLModel, table=True):
    """Archive Policy - Retention policies"""
    __tablename__ = "dms_archive_policies"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    name: str
    description: Optional[str] = None
    is_active: bool = Field(default=True)

    # Scope
    apply_to_all: bool = Field(default=False)
    folder_ids: Optional[str] = None  # JSON array
    document_types: Optional[str] = None  # JSON array
    categories: Optional[str] = None  # JSON array

    # Retention Period
    retention_days: int = Field(default=365)
    retention_based_on: str = Field(default="CREATED")  # CREATED, MODIFIED, ACCESSED

    # Action
    action: str = Field(default=ArchiveAction.ARCHIVE.value)
    archive_folder_id: Optional[str] = None  # For MOVE action
    notify_before_days: int = Field(default=30)
    notify_users: Optional[str] = None  # JSON array of user IDs

    # Schedule
    run_schedule: Optional[str] = None  # Cron expression
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ArchivedDocument(SQLModel, table=True):
    """Archived Document - Archived document record"""
    __tablename__ = "dms_archived_documents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Original Document
    original_document_id: str = Field(index=True)
    document_name: str
    original_folder_id: Optional[str] = None
    original_folder_path: Optional[str] = None

    # Archive Info
    archive_policy_id: Optional[str] = None
    archive_reason: str = Field(default="POLICY")  # POLICY, MANUAL, EXPIRED
    archive_location: Optional[str] = None

    # File Info
    file_path: str
    file_size: int = Field(default=0)
    content_hash: Optional[str] = None

    # Document Details (snapshot)
    document_snapshot: Optional[str] = None  # JSON of document at archive time

    # Restoration
    is_restorable: bool = Field(default=True)
    restored_at: Optional[datetime] = None
    restored_by: Optional[str] = None
    restored_to: Optional[str] = None

    # Deletion
    scheduled_delete_at: Optional[datetime] = None
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None

    # Audit
    archived_at: datetime = Field(default_factory=datetime.utcnow)
    archived_by: Optional[str] = None
    archived_by_name: Optional[str] = None


class DocumentRetention(SQLModel, table=True):
    """Document Retention - Retention tracking"""
    __tablename__ = "dms_document_retention"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    document_id: str = Field(index=True)
    policy_id: Optional[str] = None

    # Dates
    retention_start_date: datetime
    retention_end_date: datetime

    # Status
    status: str = Field(default="ACTIVE")  # ACTIVE, EXPIRING, EXPIRED, ARCHIVED
    notification_sent: bool = Field(default=False)
    notification_sent_at: Optional[datetime] = None

    # Legal Hold
    is_legal_hold: bool = Field(default=False)
    legal_hold_reason: Optional[str] = None
    legal_hold_by: Optional[str] = None
    legal_hold_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
