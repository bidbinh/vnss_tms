"""
Document Management - Archive API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.document import (
    ArchivePolicy, ArchiveAction,
    ArchivedDocument,
    DocumentRetention,
    Document,
)
from app.core.security import get_current_user

router = APIRouter()


# =================== ARCHIVE POLICIES ===================

@router.get("/archive-policies")
def get_archive_policies(
    is_active: Optional[bool] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get archive policies"""
    query = select(ArchivePolicy).where(
        ArchivePolicy.tenant_id == str(current_user.tenant_id)
    )

    if is_active is not None:
        query = query.where(ArchivePolicy.is_active == is_active)

    policies = session.exec(query.order_by(ArchivePolicy.name)).all()

    return {"items": policies}


@router.get("/archive-policies/{policy_id}")
def get_archive_policy(
    policy_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get archive policy by ID"""
    policy = session.exec(
        select(ArchivePolicy).where(
            ArchivePolicy.id == policy_id,
            ArchivePolicy.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not policy:
        raise HTTPException(status_code=404, detail="Archive policy not found")

    return policy


@router.post("/archive-policies")
def create_archive_policy(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create archive policy"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    policy = ArchivePolicy(
        tenant_id=tenant_id,
        name=data.get("name"),
        description=data.get("description"),
        is_active=data.get("is_active", True),
        apply_to_all=data.get("apply_to_all", False),
        folder_ids=data.get("folder_ids"),
        document_types=data.get("document_types"),
        categories=data.get("categories"),
        retention_days=data.get("retention_days", 365),
        retention_based_on=data.get("retention_based_on", "CREATED"),
        action=data.get("action", ArchiveAction.ARCHIVE.value),
        archive_folder_id=data.get("archive_folder_id"),
        notify_before_days=data.get("notify_before_days", 30),
        notify_users=data.get("notify_users"),
        run_schedule=data.get("run_schedule"),
        notes=data.get("notes"),
        created_by=user_id,
    )
    session.add(policy)
    session.commit()
    session.refresh(policy)

    return policy


@router.put("/archive-policies/{policy_id}")
def update_archive_policy(
    policy_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update archive policy"""
    policy = session.exec(
        select(ArchivePolicy).where(
            ArchivePolicy.id == policy_id,
            ArchivePolicy.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not policy:
        raise HTTPException(status_code=404, detail="Archive policy not found")

    for key, value in data.items():
        if hasattr(policy, key) and key not in ["id", "tenant_id", "created_at"]:
            setattr(policy, key, value)

    policy.updated_at = datetime.utcnow()

    session.add(policy)
    session.commit()
    session.refresh(policy)

    return policy


@router.delete("/archive-policies/{policy_id}")
def delete_archive_policy(
    policy_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete archive policy"""
    policy = session.exec(
        select(ArchivePolicy).where(
            ArchivePolicy.id == policy_id,
            ArchivePolicy.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not policy:
        raise HTTPException(status_code=404, detail="Archive policy not found")

    session.delete(policy)
    session.commit()

    return {"success": True, "message": "Archive policy deleted"}


# =================== ARCHIVED DOCUMENTS ===================

@router.get("/archived-documents")
def get_archived_documents(
    search: Optional[str] = Query(None),
    is_restorable: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get archived documents"""
    query = select(ArchivedDocument).where(
        ArchivedDocument.tenant_id == str(current_user.tenant_id),
        ArchivedDocument.is_deleted == False
    )

    if search:
        query = query.where(ArchivedDocument.document_name.ilike(f"%{search}%"))

    if is_restorable is not None:
        query = query.where(ArchivedDocument.is_restorable == is_restorable)

    query = query.order_by(ArchivedDocument.archived_at.desc())
    query = query.offset(skip).limit(limit)
    documents = session.exec(query).all()

    return {"items": documents, "total": len(documents)}


@router.get("/archived-documents/{archive_id}")
def get_archived_document(
    archive_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get archived document by ID"""
    document = session.exec(
        select(ArchivedDocument).where(
            ArchivedDocument.id == archive_id,
            ArchivedDocument.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Archived document not found")

    return document


@router.post("/archived-documents/{archive_id}/restore")
def restore_document(
    archive_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Restore archived document"""
    archived = session.exec(
        select(ArchivedDocument).where(
            ArchivedDocument.id == archive_id,
            ArchivedDocument.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not archived:
        raise HTTPException(status_code=404, detail="Archived document not found")

    if not archived.is_restorable:
        raise HTTPException(status_code=400, detail="Document cannot be restored")

    user_id = str(current_user.id)

    # Mark as restored
    archived.restored_at = datetime.utcnow()
    archived.restored_by = user_id
    archived.restored_to = data.get("restore_to_folder_id", archived.original_folder_id)

    session.add(archived)
    session.commit()

    return {"success": True, "message": "Document restored", "restored_to": archived.restored_to}


@router.delete("/archived-documents/{archive_id}")
def permanently_delete_archived(
    archive_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete archived document"""
    archived = session.exec(
        select(ArchivedDocument).where(
            ArchivedDocument.id == archive_id,
            ArchivedDocument.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not archived:
        raise HTTPException(status_code=404, detail="Archived document not found")

    archived.is_deleted = True
    archived.deleted_at = datetime.utcnow()

    session.add(archived)
    session.commit()

    return {"success": True, "message": "Archived document permanently deleted"}


# =================== DOCUMENT RETENTION ===================

@router.get("/retention")
def get_retention_records(
    document_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get retention records"""
    query = select(DocumentRetention).where(
        DocumentRetention.tenant_id == str(current_user.tenant_id)
    )

    if document_id:
        query = query.where(DocumentRetention.document_id == document_id)

    if status:
        query = query.where(DocumentRetention.status == status)

    records = session.exec(query.order_by(DocumentRetention.retention_end_date)).all()

    return {"items": records}


@router.post("/retention/{retention_id}/legal-hold")
def set_legal_hold(
    retention_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set legal hold on document"""
    retention = session.exec(
        select(DocumentRetention).where(
            DocumentRetention.id == retention_id,
            DocumentRetention.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not retention:
        raise HTTPException(status_code=404, detail="Retention record not found")

    user_id = str(current_user.id)

    retention.is_legal_hold = True
    retention.legal_hold_reason = data.get("reason")
    retention.legal_hold_by = user_id
    retention.legal_hold_at = datetime.utcnow()
    retention.updated_at = datetime.utcnow()

    session.add(retention)
    session.commit()
    session.refresh(retention)

    return retention


@router.delete("/retention/{retention_id}/legal-hold")
def remove_legal_hold(
    retention_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove legal hold from document"""
    retention = session.exec(
        select(DocumentRetention).where(
            DocumentRetention.id == retention_id,
            DocumentRetention.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not retention:
        raise HTTPException(status_code=404, detail="Retention record not found")

    retention.is_legal_hold = False
    retention.legal_hold_reason = None
    retention.legal_hold_by = None
    retention.legal_hold_at = None
    retention.updated_at = datetime.utcnow()

    session.add(retention)
    session.commit()

    return {"success": True, "message": "Legal hold removed"}
