from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_current_user, get_current_user_optional
from app.db.session import get_session
from app.models import Order, OrderDocument, User

router = APIRouter(prefix="/orders", tags=["order_documents"])

# Allowed document types
ALLOWED_DOC_TYPES = {
    "CONTAINER_RECEIPT",  # Phiếu giao nhận container
    "DO",                 # Delivery Order
    "HANDOVER_REPORT",    # Biên bản bàn giao hàng
    "SEAL_PHOTO",         # Ảnh seal
    "OTHER",              # Khác
}


@router.post("/{order_id}/documents")
def upload_order_document(
    order_id: str,
    doc_type: str = Form(...),
    note: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Upload document for an order"""
    doc_type = doc_type.strip().upper()
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(400, f"doc_type must be one of: {', '.join(ALLOWED_DOC_TYPES)}")

    order = session.exec(
        select(Order).where(
            Order.id == order_id,
            Order.tenant_id == current_user.tenant_id
        )
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")

    # Validate file size (max 10MB)
    content = file.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 10MB")
    if not content:
        raise HTTPException(400, "Empty file")

    # storage path: storage/<tenant>/orders/<order_id>/<doc_type>/
    base_dir = Path(settings.STORAGE_DIR) / current_user.tenant_id / "orders" / order_id / doc_type
    base_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    safe_name = f"{uuid.uuid4().hex}{ext}"
    save_path = base_dir / safe_name

    with open(save_path, "wb") as f:
        f.write(content)

    rel_path = str(save_path).replace("\\", "/")  # normalize path

    doc = OrderDocument(
        tenant_id=current_user.tenant_id,
        order_id=order_id,
        doc_type=doc_type,
        original_name=file.filename or safe_name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        file_path=rel_path,
        uploaded_by=current_user.id,
        note=note,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    return {
        "id": doc.id,
        "order_id": doc.order_id,
        "doc_type": doc.doc_type,
        "original_name": doc.original_name,
        "content_type": doc.content_type,
        "size_bytes": doc.size_bytes,
        "uploaded_at": doc.uploaded_at,
        "note": doc.note,
    }


@router.get("/{order_id}/documents")
def list_order_documents(
    order_id: str,
    doc_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all documents for an order"""
    order = session.exec(
        select(Order).where(
            Order.id == order_id,
            Order.tenant_id == current_user.tenant_id
        )
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")

    query = select(OrderDocument).where(
        OrderDocument.tenant_id == current_user.tenant_id,
        OrderDocument.order_id == order_id
    )
    if doc_type:
        query = query.where(OrderDocument.doc_type == doc_type.upper())

    docs = session.exec(query.order_by(OrderDocument.uploaded_at.desc())).all()

    return [
        {
            "id": d.id,
            "doc_type": d.doc_type,
            "original_name": d.original_name,
            "content_type": d.content_type,
            "size_bytes": d.size_bytes,
            "uploaded_at": d.uploaded_at,
            "note": d.note,
        }
        for d in docs
    ]


def get_user_from_token(token: str, session: Session) -> Optional[User]:
    """Verify token and return user (for query param auth)"""
    from app.core.security import decode_token
    try:
        payload = decode_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = session.get(User, user_id)
        return user
    except Exception:
        return None


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: str,
    token: Optional[str] = None,  # Allow token in query param for mobile
    current_user: Optional[User] = Depends(get_current_user_optional),
    session: Session = Depends(get_session),
):
    """Download a document by ID. Supports token in query param for mobile apps."""
    # Try query param token if header auth failed
    user = current_user
    if user is None and token:
        user = get_user_from_token(token, session)

    if user is None:
        raise HTTPException(401, "Not authenticated")

    doc = session.exec(
        select(OrderDocument).where(
            OrderDocument.id == doc_id,
            OrderDocument.tenant_id == user.tenant_id
        )
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    path = Path(doc.file_path)
    if not path.exists():
        raise HTTPException(404, "File missing on disk")

    return FileResponse(
        path=str(path),
        media_type=doc.content_type,
        filename=doc.original_name,
    )


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete a document"""
    doc = session.exec(
        select(OrderDocument).where(
            OrderDocument.id == doc_id,
            OrderDocument.tenant_id == current_user.tenant_id
        )
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete file from disk
    path = Path(doc.file_path)
    if path.exists():
        path.unlink()

    session.delete(doc)
    session.commit()

    return {"message": "Document deleted successfully"}
