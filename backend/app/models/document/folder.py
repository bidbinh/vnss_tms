"""
Document Management - Folder Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class FolderType(str, Enum):
    """Folder type"""
    PERSONAL = "PERSONAL"
    SHARED = "SHARED"
    DEPARTMENT = "DEPARTMENT"
    PROJECT = "PROJECT"
    ARCHIVE = "ARCHIVE"
    SYSTEM = "SYSTEM"


class PermissionLevel(str, Enum):
    """Permission level"""
    NONE = "NONE"
    VIEW = "VIEW"
    COMMENT = "COMMENT"
    EDIT = "EDIT"
    MANAGE = "MANAGE"
    OWNER = "OWNER"


class Folder(SQLModel, table=True):
    """Folder - Document folder/directory"""
    __tablename__ = "dms_folders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    name: str
    description: Optional[str] = None
    folder_type: str = Field(default=FolderType.PERSONAL.value)
    color: Optional[str] = None
    icon: Optional[str] = None

    # Hierarchy
    parent_id: Optional[str] = None
    path: Optional[str] = None  # /root/folder1/folder2
    level: int = Field(default=0)

    # Owner
    owner_id: str
    owner_name: Optional[str] = None

    # Department/Project
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None

    # Stats
    document_count: int = Field(default=0)
    subfolder_count: int = Field(default=0)
    total_size: int = Field(default=0)  # bytes

    # Settings
    is_public: bool = Field(default=False)
    is_system: bool = Field(default=False)
    allow_upload: bool = Field(default=True)
    max_file_size: Optional[int] = None  # bytes
    allowed_extensions: Optional[str] = None  # JSON array

    # Archival
    is_archived: bool = Field(default=False)
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class FolderPermission(SQLModel, table=True):
    """Folder Permission - Access control"""
    __tablename__ = "dms_folder_permissions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    folder_id: str = Field(index=True)

    # Grantee
    grantee_type: str  # USER, ROLE, DEPARTMENT
    grantee_id: str = Field(index=True)
    grantee_name: Optional[str] = None

    # Permission
    permission_level: str = Field(default=PermissionLevel.VIEW.value)

    # Inheritance
    is_inherited: bool = Field(default=False)
    inherited_from: Optional[str] = None

    # Validity
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    granted_by_name: Optional[str] = None
