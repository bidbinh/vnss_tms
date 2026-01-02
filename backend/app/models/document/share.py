"""
Document Management - Sharing Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class ShareType(str, Enum):
    """Share type"""
    USER = "USER"
    ROLE = "ROLE"
    DEPARTMENT = "DEPARTMENT"
    PUBLIC = "PUBLIC"
    LINK = "LINK"


class ShareAccess(str, Enum):
    """Share access level"""
    VIEW = "VIEW"
    COMMENT = "COMMENT"
    EDIT = "EDIT"
    DOWNLOAD = "DOWNLOAD"


class DocumentShare(SQLModel, table=True):
    """Document Share - Share with users/roles"""
    __tablename__ = "dms_document_shares"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    document_id: str = Field(index=True)

    # Share Target
    share_type: str = Field(default=ShareType.USER.value)
    target_id: str = Field(index=True)
    target_name: Optional[str] = None
    target_email: Optional[str] = None

    # Access
    access_level: str = Field(default=ShareAccess.VIEW.value)
    can_download: bool = Field(default=True)
    can_print: bool = Field(default=True)
    can_reshare: bool = Field(default=False)

    # Validity
    expires_at: Optional[datetime] = None
    is_active: bool = Field(default=True)

    # Message
    message: Optional[str] = None

    # Notification
    notify_on_share: bool = Field(default=True)
    notified_at: Optional[datetime] = None

    # Stats
    access_count: int = Field(default=0)
    last_accessed_at: Optional[datetime] = None

    # Audit
    shared_by: str
    shared_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ShareLink(SQLModel, table=True):
    """Share Link - Public/Private share links"""
    __tablename__ = "dms_share_links"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    document_id: str = Field(index=True)

    # Link
    link_token: str = Field(index=True)  # Unique token for the link
    short_url: Optional[str] = None

    # Access
    access_level: str = Field(default=ShareAccess.VIEW.value)
    requires_password: bool = Field(default=False)
    password_hash: Optional[str] = None
    requires_login: bool = Field(default=False)

    # Permissions
    can_download: bool = Field(default=True)
    can_print: bool = Field(default=True)

    # Limits
    max_access_count: Optional[int] = None
    access_count: int = Field(default=0)
    expires_at: Optional[datetime] = None

    # Status
    is_active: bool = Field(default=True)
    disabled_at: Optional[datetime] = None
    disabled_by: Optional[str] = None
    disabled_reason: Optional[str] = None

    # Stats
    last_accessed_at: Optional[datetime] = None
    unique_visitors: int = Field(default=0)

    # Notes
    notes: Optional[str] = None

    # Audit
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
