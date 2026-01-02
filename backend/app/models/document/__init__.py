"""
Document Management System Module Models
Quản lý tài liệu: Documents, Folders, Versions, Sharing, Archive
"""

from app.models.document.folder import (
    Folder, FolderType,
    FolderPermission, PermissionLevel,
)

from app.models.document.document import (
    Document, DocumentStatus, DocumentType,
    DocumentVersion,
    DocumentTag,
    DocumentComment,
)

from app.models.document.share import (
    DocumentShare, ShareType, ShareAccess,
    ShareLink,
)

from app.models.document.archive import (
    ArchivePolicy, ArchiveAction,
    ArchivedDocument,
    DocumentRetention,
)

from app.models.document.template import (
    DocumentTemplate, TemplateCategory,
    TemplateField, FieldType,
    GeneratedDocument,
)

__all__ = [
    # Folder
    "Folder", "FolderType",
    "FolderPermission", "PermissionLevel",
    # Document
    "Document", "DocumentStatus", "DocumentType",
    "DocumentVersion",
    "DocumentTag",
    "DocumentComment",
    # Share
    "DocumentShare", "ShareType", "ShareAccess",
    "ShareLink",
    # Archive
    "ArchivePolicy", "ArchiveAction",
    "ArchivedDocument",
    "DocumentRetention",
    # Template
    "DocumentTemplate", "TemplateCategory",
    "TemplateField", "FieldType",
    "GeneratedDocument",
]
