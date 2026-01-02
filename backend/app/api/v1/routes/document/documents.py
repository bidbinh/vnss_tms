"""
Document Management - Document API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.document import (
    Document, DocumentStatus,
    DocumentVersion,
    DocumentTag,
    DocumentComment,
)
from app.core.security import get_current_user

router = APIRouter()


# =================== DOCUMENTS ===================

@router.get("/documents")
def get_documents(
    folder_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get documents with filters"""
    query = select(Document).where(
        Document.tenant_id == str(current_user.tenant_id),
        Document.is_deleted == False
    )

    if folder_id:
        query = query.where(Document.folder_id == folder_id)

    if status:
        query = query.where(Document.status == status)

    if document_type:
        query = query.where(Document.document_type == document_type)

    if search:
        query = query.where(Document.name.ilike(f"%{search}%"))

    query = query.order_by(Document.updated_at.desc())
    query = query.offset(skip).limit(limit)
    documents = session.exec(query).all()

    return {"items": documents, "total": len(documents)}


@router.get("/documents/{document_id}")
def get_document(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document by ID"""
    document = session.exec(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get versions
    versions = session.exec(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id
        ).order_by(DocumentVersion.version_number.desc())
    ).all()

    # Get tags
    tags = session.exec(
        select(DocumentTag).where(DocumentTag.document_id == document_id)
    ).all()

    return {
        "document": document,
        "versions": versions,
        "tags": tags
    }


@router.post("/documents")
def create_document(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    user_name = current_user.full_name or current_user.email

    document = Document(
        tenant_id=tenant_id,
        folder_id=data.get("folder_id"),
        name=data.get("name"),
        description=data.get("description"),
        document_type=data.get("document_type", "FILE"),
        status=DocumentStatus.DRAFT.value,
        file_path=data.get("file_path"),
        file_name=data.get("file_name"),
        file_extension=data.get("file_extension"),
        file_size=data.get("file_size", 0),
        mime_type=data.get("mime_type"),
        owner_id=user_id,
        owner_name=user_name,
        created_by=user_id,
    )
    session.add(document)
    session.flush()

    # Create initial version
    version = DocumentVersion(
        tenant_id=tenant_id,
        document_id=document.id,
        version_number=1,
        file_path=data.get("file_path"),
        file_size=data.get("file_size", 0),
        is_current=True,
        change_summary="Initial version",
        created_by=user_id,
        created_by_name=user_name,
    )
    session.add(version)

    session.commit()
    session.refresh(document)

    return document


@router.put("/documents/{document_id}")
def update_document(
    document_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update document"""
    document = session.exec(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    for key, value in data.items():
        if hasattr(document, key) and key not in ["id", "tenant_id", "created_at"]:
            setattr(document, key, value)

    document.updated_at = datetime.utcnow()
    document.updated_by = str(current_user.id)

    session.add(document)
    session.commit()
    session.refresh(document)

    return document


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    permanent: bool = Query(False),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete document (soft or permanent)"""
    document = session.exec(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if permanent:
        session.delete(document)
    else:
        document.is_deleted = True
        document.deleted_at = datetime.utcnow()
        document.deleted_by = str(current_user.id)
        session.add(document)

    session.commit()

    return {"success": True, "message": "Document deleted"}


# =================== VERSIONS ===================

@router.get("/documents/{document_id}/versions")
def get_versions(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document versions"""
    versions = session.exec(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.tenant_id == str(current_user.tenant_id)
        ).order_by(DocumentVersion.version_number.desc())
    ).all()

    return {"items": versions}


@router.post("/documents/{document_id}/versions")
def create_version(
    document_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new version"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    user_name = current_user.full_name or current_user.email

    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Unset current version
    current_versions = session.exec(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.is_current == True
        )
    ).all()
    for v in current_versions:
        v.is_current = False
        session.add(v)

    # Get next version number
    max_version = session.exec(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id
        ).order_by(DocumentVersion.version_number.desc())
    ).first()

    next_version = (max_version.version_number + 1) if max_version else 1

    version = DocumentVersion(
        tenant_id=tenant_id,
        document_id=document_id,
        version_number=next_version,
        file_path=data.get("file_path"),
        file_size=data.get("file_size", 0),
        is_current=True,
        change_summary=data.get("change_summary"),
        created_by=user_id,
        created_by_name=user_name,
    )
    session.add(version)

    # Update document
    document.current_version = next_version
    document.file_path = data.get("file_path")
    document.file_size = data.get("file_size", 0)
    document.updated_at = datetime.utcnow()
    session.add(document)

    session.commit()
    session.refresh(version)

    return version


@router.post("/documents/{document_id}/versions/{version_id}/restore")
def restore_version(
    document_id: str,
    version_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Restore a previous version as current"""
    version = session.exec(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document_id,
            DocumentVersion.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Create new version from old
    data = {
        "file_path": version.file_path,
        "file_size": version.file_size,
        "change_summary": f"Restored from version {version.version_number}"
    }
    return create_version(document_id, data, session, current_user)


# =================== TAGS ===================

@router.get("/documents/{document_id}/tags")
def get_tags(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document tags"""
    tags = session.exec(
        select(DocumentTag).where(
            DocumentTag.document_id == document_id,
            DocumentTag.tenant_id == str(current_user.tenant_id)
        )
    ).all()

    return {"items": tags}


@router.post("/documents/{document_id}/tags")
def add_tag(
    document_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add tag to document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    tag = DocumentTag(
        tenant_id=tenant_id,
        document_id=document_id,
        tag_name=data.get("tag_name"),
        tag_color=data.get("tag_color"),
        created_by=user_id,
    )
    session.add(tag)
    session.commit()
    session.refresh(tag)

    return tag


@router.delete("/documents/{document_id}/tags/{tag_id}")
def remove_tag(
    document_id: str,
    tag_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove tag from document"""
    tag = session.exec(
        select(DocumentTag).where(
            DocumentTag.id == tag_id,
            DocumentTag.document_id == document_id,
            DocumentTag.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    session.delete(tag)
    session.commit()

    return {"success": True, "message": "Tag removed"}


# =================== COMMENTS ===================

@router.get("/documents/{document_id}/comments")
def get_comments(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document comments"""
    comments = session.exec(
        select(DocumentComment).where(
            DocumentComment.document_id == document_id,
            DocumentComment.tenant_id == str(current_user.tenant_id)
        ).order_by(DocumentComment.created_at.desc())
    ).all()

    return {"items": comments}


@router.post("/documents/{document_id}/comments")
def add_comment(
    document_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add comment to document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    user_name = current_user.full_name or current_user.email

    comment = DocumentComment(
        tenant_id=tenant_id,
        document_id=document_id,
        parent_comment_id=data.get("parent_comment_id"),
        content=data.get("content"),
        user_id=user_id,
        user_name=user_name,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


@router.put("/documents/{document_id}/comments/{comment_id}")
def update_comment(
    document_id: str,
    comment_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update comment"""
    comment = session.exec(
        select(DocumentComment).where(
            DocumentComment.id == comment_id,
            DocumentComment.document_id == document_id,
            DocumentComment.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.content = data.get("content", comment.content)
    comment.is_edited = True
    comment.updated_at = datetime.utcnow()

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


@router.delete("/documents/{document_id}/comments/{comment_id}")
def delete_comment(
    document_id: str,
    comment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete comment"""
    comment = session.exec(
        select(DocumentComment).where(
            DocumentComment.id == comment_id,
            DocumentComment.document_id == document_id,
            DocumentComment.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    session.delete(comment)
    session.commit()

    return {"success": True, "message": "Comment deleted"}
