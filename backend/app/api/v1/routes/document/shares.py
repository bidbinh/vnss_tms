"""
Document Management - Sharing API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime
import secrets

from app.db.session import get_session
from app.models import User
from app.models.document import (
    DocumentShare, ShareType, ShareAccess,
    ShareLink,
    Document,
)
from app.core.security import get_current_user

router = APIRouter()


# =================== DOCUMENT SHARES ===================

@router.get("/shares")
def get_shares(
    document_id: Optional[str] = Query(None),
    share_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document shares"""
    query = select(DocumentShare).where(
        DocumentShare.tenant_id == str(current_user.tenant_id),
        DocumentShare.is_active == True
    )

    if document_id:
        query = query.where(DocumentShare.document_id == document_id)

    if share_type:
        query = query.where(DocumentShare.share_type == share_type)

    query = query.order_by(DocumentShare.created_at.desc())
    query = query.offset(skip).limit(limit)
    shares = session.exec(query).all()

    return {"items": shares, "total": len(shares)}


@router.get("/shares/{share_id}")
def get_share(
    share_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get share by ID"""
    share = session.exec(
        select(DocumentShare).where(
            DocumentShare.id == share_id,
            DocumentShare.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    return share


@router.post("/shares")
def create_share(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create document share"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    share = DocumentShare(
        tenant_id=tenant_id,
        document_id=data.get("document_id"),
        folder_id=data.get("folder_id"),
        share_type=data.get("share_type", ShareType.USER.value),
        shared_with_user_id=data.get("shared_with_user_id"),
        shared_with_role_id=data.get("shared_with_role_id"),
        shared_with_email=data.get("shared_with_email"),
        access_level=data.get("access_level", ShareAccess.VIEW.value),
        expires_at=data.get("expires_at"),
        message=data.get("message"),
        shared_by=user_id,
    )
    session.add(share)
    session.commit()
    session.refresh(share)

    return share


@router.put("/shares/{share_id}")
def update_share(
    share_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update share"""
    share = session.exec(
        select(DocumentShare).where(
            DocumentShare.id == share_id,
            DocumentShare.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    for key, value in data.items():
        if hasattr(share, key) and key not in ["id", "tenant_id", "created_at"]:
            setattr(share, key, value)

    share.updated_at = datetime.utcnow()

    session.add(share)
    session.commit()
    session.refresh(share)

    return share


@router.delete("/shares/{share_id}")
def delete_share(
    share_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Revoke share"""
    share = session.exec(
        select(DocumentShare).where(
            DocumentShare.id == share_id,
            DocumentShare.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    share.is_active = False
    share.revoked_at = datetime.utcnow()
    share.revoked_by = str(current_user.id)

    session.add(share)
    session.commit()

    return {"success": True, "message": "Share revoked"}


# =================== SHARE LINKS ===================

@router.get("/share-links")
def get_share_links(
    document_id: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get share links"""
    query = select(ShareLink).where(
        ShareLink.tenant_id == str(current_user.tenant_id),
        ShareLink.is_active == True
    )

    if document_id:
        query = query.where(ShareLink.document_id == document_id)

    links = session.exec(query.order_by(ShareLink.created_at.desc())).all()

    return {"items": links}


@router.post("/share-links")
def create_share_link(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create share link"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Generate unique token
    token = secrets.token_urlsafe(32)

    link = ShareLink(
        tenant_id=tenant_id,
        document_id=data.get("document_id"),
        folder_id=data.get("folder_id"),
        link_token=token,
        link_name=data.get("link_name"),
        access_level=data.get("access_level", ShareAccess.VIEW.value),
        password_hash=data.get("password"),  # Should be hashed in real app
        require_password=bool(data.get("password")),
        expires_at=data.get("expires_at"),
        max_access_count=data.get("max_access_count"),
        allow_download=data.get("allow_download", True),
        created_by=user_id,
    )
    session.add(link)
    session.commit()
    session.refresh(link)

    return {
        "link": link,
        "share_url": f"/share/{token}"
    }


@router.get("/share-links/{link_id}")
def get_share_link(
    link_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get share link by ID"""
    link = session.exec(
        select(ShareLink).where(
            ShareLink.id == link_id,
            ShareLink.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    return link


@router.delete("/share-links/{link_id}")
def delete_share_link(
    link_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate share link"""
    link = session.exec(
        select(ShareLink).where(
            ShareLink.id == link_id,
            ShareLink.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    link.is_active = False
    session.add(link)
    session.commit()

    return {"success": True, "message": "Share link deactivated"}


# =================== PUBLIC ACCESS ===================

@router.get("/public/{token}")
def access_share_link(
    token: str,
    password: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    """Access shared document via public link"""
    link = session.exec(
        select(ShareLink).where(
            ShareLink.link_token == token,
            ShareLink.is_active == True
        )
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    # Check expiry
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Check max access
    if link.max_access_count and link.access_count >= link.max_access_count:
        raise HTTPException(status_code=410, detail="Share link access limit reached")

    # Check password
    if link.require_password:
        if not password or password != link.password_hash:
            raise HTTPException(status_code=401, detail="Invalid password")

    # Update access count
    link.access_count += 1
    link.last_accessed_at = datetime.utcnow()
    session.add(link)
    session.commit()

    # Get document/folder
    if link.document_id:
        document = session.get(Document, link.document_id)
        return {
            "type": "document",
            "document": document,
            "allow_download": link.allow_download
        }
    else:
        # Return folder contents (simplified)
        return {
            "type": "folder",
            "folder_id": link.folder_id,
            "allow_download": link.allow_download
        }
