"""
Document Management - Document Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class DocumentStatus(str, Enum):
    """Document status"""
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class DocumentType(str, Enum):
    """Document type"""
    FILE = "FILE"
    LINK = "LINK"
    TEMPLATE = "TEMPLATE"
    GENERATED = "GENERATED"


class Document(SQLModel, table=True):
    """Document - Main document entity"""
    __tablename__ = "dms_documents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: str = Field(default=DocumentType.FILE.value)
    status: str = Field(default=DocumentStatus.DRAFT.value)

    # Folder
    folder_id: Optional[str] = None
    folder_path: Optional[str] = None

    # File Info
    file_name: str
    file_path: str
    file_size: int = Field(default=0)  # bytes
    file_extension: Optional[str] = None
    mime_type: Optional[str] = None
    content_hash: Optional[str] = None  # MD5/SHA for duplicate detection

    # Version
    version_number: int = Field(default=1)
    is_latest: bool = Field(default=True)
    parent_version_id: Optional[str] = None

    # Owner
    owner_id: str
    owner_name: Optional[str] = None

    # Entity Reference
    entity_type: Optional[str] = None  # Order, Contract, Invoice
    entity_id: Optional[str] = None
    entity_reference: Optional[str] = None

    # Category
    category: Optional[str] = None
    subcategory: Optional[str] = None

    # Tags (searchable)
    tags: Optional[str] = None  # JSON array

    # Preview
    has_preview: bool = Field(default=False)
    preview_path: Optional[str] = None
    thumbnail_path: Optional[str] = None

    # Text Content (for search)
    extracted_text: Optional[str] = None
    is_searchable: bool = Field(default=False)

    # Dates
    document_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None

    # Approval
    requires_approval: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    # Lock
    is_locked: bool = Field(default=False)
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None

    # Stats
    view_count: int = Field(default=0)
    download_count: int = Field(default=0)
    last_accessed_at: Optional[datetime] = None

    # Archival
    is_archived: bool = Field(default=False)
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None

    # Deleted
    is_deleted: bool = Field(default=False)
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class DocumentVersion(SQLModel, table=True):
    """Document Version - Version history"""
    __tablename__ = "dms_document_versions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    document_id: str = Field(index=True)
    version_number: int
    is_latest: bool = Field(default=False)

    # File Info
    file_name: str
    file_path: str
    file_size: int = Field(default=0)
    content_hash: Optional[str] = None

    # Change Info
    change_summary: Optional[str] = None
    change_type: Optional[str] = None  # MINOR, MAJOR, REVISION

    # Uploaded By
    uploaded_by: str
    uploaded_by_name: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentTag(SQLModel, table=True):
    """Document Tag - Tags for documents"""
    __tablename__ = "dms_document_tags"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    document_id: str = Field(index=True)
    tag_name: str = Field(index=True)
    tag_color: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class DocumentComment(SQLModel, table=True):
    """Document Comment - Comments on documents"""
    __tablename__ = "dms_document_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    document_id: str = Field(index=True)
    parent_comment_id: Optional[str] = None

    # Content
    content: str

    # Position (for inline comments)
    page_number: Optional[int] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None

    # Author
    author_id: str
    author_name: Optional[str] = None

    # Resolved (for review comments)
    is_resolved: bool = Field(default=False)
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None

    # Edit
    is_edited: bool = Field(default=False)
    edited_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
