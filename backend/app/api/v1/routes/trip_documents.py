from __future__ import annotations

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import get_session
from app.models import Trip, TripDocument, User
from app.core.security import get_current_user

router = APIRouter(prefix="/trips", tags=["trip_documents"])

ALLOWED_DOC_TYPES = {"EIR", "POD"}


@router.post("/{trip_id}/documents")
def upload_trip_document(
    trip_id: str,
    doc_type: str = Form(...),                 # EIR / POD
    note: str | None = Form(None),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    doc_type = doc_type.strip().upper()
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(400, "doc_type must be EIR or POD")

    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
        raise HTTPException(404, "Trip not found")

    # storage path: storage/<tenant>/<trip>/<doc_type>/
    base_dir = Path(settings.STORAGE_DIR) / tenant_id / "trips" / trip_id / doc_type
    base_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix
    safe_name = f"{uuid.uuid4().hex}{ext}"
    save_path = base_dir / safe_name

    content = file.file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    with open(save_path, "wb") as f:
        f.write(content)

    rel_path = str(save_path).replace("\\", "/")  # lưu tương đối/chuẩn hóa

    doc = TripDocument(
        tenant_id=tenant_id,
        trip_id=trip_id,
        doc_type=doc_type,
        original_name=file.filename or safe_name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        file_path=rel_path,
        note=note,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    return {
        "id": doc.id,
        "trip_id": doc.trip_id,
        "doc_type": doc.doc_type,
        "original_name": doc.original_name,
        "content_type": doc.content_type,
        "size_bytes": doc.size_bytes,
        "file_path": doc.file_path,
        "uploaded_at": doc.uploaded_at,
        "note": doc.note,
    }

@router.get("/{trip_id}/documents")
def list_trip_documents(
    trip_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    trip = session.get(Trip, trip_id)
    if not trip or trip.tenant_id != tenant_id:
        raise HTTPException(404, "Trip not found")

    docs = session.exec(
        select(TripDocument)
        .where(TripDocument.tenant_id == tenant_id, TripDocument.trip_id == trip_id)
        .order_by(TripDocument.uploaded_at.desc())
    ).all()

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

@router.get("/documents/{doc_id}/download")
def download_doc(
    doc_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    doc = session.get(TripDocument, doc_id)
    if not doc or doc.tenant_id != tenant_id:
        raise HTTPException(404, "Document not found")

    path = Path(doc.file_path)
    if not path.exists():
        raise HTTPException(404, "File missing on disk")

    return FileResponse(
        path=str(path),
        media_type=doc.content_type,
        filename=doc.original_name,
    )
