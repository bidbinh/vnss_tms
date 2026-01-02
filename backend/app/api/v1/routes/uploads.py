"""
General file upload API
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.security import get_current_user, get_current_user_optional
from app.db.session import get_session
from app.models import User
from sqlmodel import Session

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Max file sizes
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed image types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
}

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Allowed document types for general file upload
ALLOWED_DOCUMENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",  # Images
    ".pdf",  # PDF
    ".doc", ".docx",  # Word
    ".xls", ".xlsx",  # Excel
}


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = "general",
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image file.
    Returns URL to access the image.

    Parameters:
    - file: The image file to upload
    - folder: Subfolder to store the image (default: "general")

    Returns:
    - url: The URL to access the uploaded image
    - file_path: The relative file path
    """
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            400,
            f"Invalid image type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file extension. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(400, f"Image too large. Maximum size is {MAX_IMAGE_SIZE // (1024 * 1024)}MB")
    if not content:
        raise HTTPException(400, "Empty file")

    # Create storage directory
    # storage/<tenant>/<folder>/
    base_dir = Path(settings.STORAGE_DIR) / str(current_user.tenant_id) / folder
    base_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    safe_name = f"{uuid.uuid4().hex}{ext}"
    save_path = base_dir / safe_name

    # Save file
    with open(save_path, "wb") as f:
        f.write(content)

    # Generate URL
    # URL format: /api/v1/uploads/file/<tenant>/<folder>/<filename>
    rel_path = f"{current_user.tenant_id}/{folder}/{safe_name}"
    url = f"{settings.API_BASE_URL}/uploads/file/{rel_path}"

    return {
        "url": url,
        "file_path": rel_path,
        "original_name": file.filename,
        "size_bytes": len(content),
        "content_type": content_type,
    }


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    folder: str = "documents",
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document file (images, PDF, Word, Excel).
    Returns URL to access the file.

    Parameters:
    - file: The file to upload
    - folder: Subfolder to store the file (default: "documents")

    Returns:
    - url: The URL to access the uploaded file
    - file_path: The relative file path
    """
    # Validate extension first (more reliable than content_type for Office files)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file type. Allowed: Images, PDF, Word (.doc, .docx), Excel (.xls, .xlsx)"
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB")
    if not content:
        raise HTTPException(400, "Empty file")

    # Create storage directory
    # storage/<tenant>/<folder>/
    base_dir = Path(settings.STORAGE_DIR) / str(current_user.tenant_id) / folder
    base_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    safe_name = f"{uuid.uuid4().hex}{ext}"
    save_path = base_dir / safe_name

    # Save file
    with open(save_path, "wb") as f:
        f.write(content)

    # Generate URL
    # URL format: /api/v1/uploads/file/<tenant>/<folder>/<filename>
    rel_path = f"{current_user.tenant_id}/{folder}/{safe_name}"
    url = f"{settings.API_BASE_URL}/uploads/file/{rel_path}"

    return {
        "url": url,
        "file_path": rel_path,
        "original_name": file.filename,
        "size_bytes": len(content),
        "content_type": file.content_type,
    }


@router.get("/file/{tenant_id}/{folder}/{filename}")
async def get_file(
    tenant_id: str,
    folder: str,
    filename: str,
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    session: Session = Depends(get_session),
):
    """
    Download/view a file.
    Supports token in query param for mobile apps.
    """
    # Try query param token if header auth failed
    user = current_user
    if user is None and token:
        from app.core.security import decode_token
        try:
            payload = decode_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    user = session.get(User, user_id)
        except Exception:
            pass

    # For public files or authenticated users
    if user is None:
        raise HTTPException(401, "Not authenticated")

    # Validate tenant access
    if str(user.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Build file path
    file_path = Path(settings.STORAGE_DIR) / tenant_id / folder / filename

    if not file_path.exists():
        raise HTTPException(404, "File not found")

    # Determine content type based on extension
    ext = file_path.suffix.lower()
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    content_type = content_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=filename,
    )


@router.delete("/file/{tenant_id}/{folder}/{filename}")
async def delete_file(
    tenant_id: str,
    folder: str,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an uploaded file"""
    # Validate tenant access
    if str(current_user.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Build file path
    file_path = Path(settings.STORAGE_DIR) / tenant_id / folder / filename

    if not file_path.exists():
        raise HTTPException(404, "File not found")

    # Delete file
    file_path.unlink()

    return {"message": "File deleted successfully"}
