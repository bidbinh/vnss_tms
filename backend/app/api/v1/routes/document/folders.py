"""
Document Management - Folder API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.document import Folder, FolderPermission, PermissionLevel
from app.core.security import get_current_user

router = APIRouter()


# =================== FOLDERS ===================

@router.get("/folders")
def get_folders(
    parent_id: Optional[str] = Query(None),
    folder_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get folders with filters"""
    query = select(Folder).where(
        Folder.tenant_id == str(current_user.tenant_id),
        Folder.is_deleted == False
    )

    if parent_id:
        query = query.where(Folder.parent_id == parent_id)
    else:
        query = query.where(Folder.parent_id == None)  # Root folders

    if folder_type:
        query = query.where(Folder.folder_type == folder_type)

    if search:
        query = query.where(Folder.name.ilike(f"%{search}%"))

    query = query.order_by(Folder.name)
    query = query.offset(skip).limit(limit)
    folders = session.exec(query).all()

    return {"items": folders, "total": len(folders)}


@router.get("/folders/{folder_id}")
def get_folder(
    folder_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get folder by ID"""
    folder = session.exec(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return folder


@router.post("/folders")
def create_folder(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new folder"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Build path
    path = "/" + data.get("name", "")
    if data.get("parent_id"):
        parent = session.get(Folder, data["parent_id"])
        if parent:
            path = parent.path + "/" + data.get("name", "")

    folder = Folder(
        tenant_id=tenant_id,
        parent_id=data.get("parent_id"),
        name=data.get("name"),
        description=data.get("description"),
        folder_type=data.get("folder_type", "GENERAL"),
        path=path,
        owner_id=user_id,
        created_by=user_id,
    )
    session.add(folder)
    session.commit()
    session.refresh(folder)

    return folder


@router.put("/folders/{folder_id}")
def update_folder(
    folder_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update folder"""
    folder = session.exec(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    for key, value in data.items():
        if hasattr(folder, key) and key not in ["id", "tenant_id", "created_at"]:
            setattr(folder, key, value)

    folder.updated_at = datetime.utcnow()
    folder.updated_by = str(current_user.id)

    session.add(folder)
    session.commit()
    session.refresh(folder)

    return folder


@router.delete("/folders/{folder_id}")
def delete_folder(
    folder_id: str,
    permanent: bool = Query(False),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete folder (soft or permanent)"""
    folder = session.exec(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if permanent:
        session.delete(folder)
    else:
        folder.is_deleted = True
        folder.deleted_at = datetime.utcnow()
        folder.deleted_by = str(current_user.id)
        session.add(folder)

    session.commit()

    return {"success": True, "message": "Folder deleted"}


# =================== FOLDER PERMISSIONS ===================

@router.get("/folders/{folder_id}/permissions")
def get_folder_permissions(
    folder_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get folder permissions"""
    permissions = session.exec(
        select(FolderPermission).where(
            FolderPermission.folder_id == folder_id,
            FolderPermission.tenant_id == str(current_user.tenant_id)
        )
    ).all()

    return {"items": permissions}


@router.post("/folders/{folder_id}/permissions")
def add_folder_permission(
    folder_id: str,
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add permission to folder"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    permission = FolderPermission(
        tenant_id=tenant_id,
        folder_id=folder_id,
        user_id=data.get("user_id"),
        role_id=data.get("role_id"),
        permission_level=data.get("permission_level", PermissionLevel.VIEW.value),
        granted_by=user_id,
    )
    session.add(permission)
    session.commit()
    session.refresh(permission)

    return permission


@router.delete("/folders/{folder_id}/permissions/{permission_id}")
def remove_folder_permission(
    folder_id: str,
    permission_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove folder permission"""
    permission = session.exec(
        select(FolderPermission).where(
            FolderPermission.id == permission_id,
            FolderPermission.folder_id == folder_id,
            FolderPermission.tenant_id == str(current_user.tenant_id)
        )
    ).first()

    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    session.delete(permission)
    session.commit()

    return {"success": True, "message": "Permission removed"}


# =================== FOLDER TREE ===================

@router.get("/folders/tree")
def get_folder_tree(
    root_id: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get folder tree structure"""
    tenant_id = str(current_user.tenant_id)

    def build_tree(parent_id: Optional[str] = None) -> List[dict]:
        folders = session.exec(
            select(Folder).where(
                Folder.tenant_id == tenant_id,
                Folder.parent_id == parent_id,
                Folder.is_deleted == False
            ).order_by(Folder.name)
        ).all()

        tree = []
        for folder in folders:
            node = {
                "id": folder.id,
                "name": folder.name,
                "path": folder.path,
                "folder_type": folder.folder_type,
                "children": build_tree(folder.id)
            }
            tree.append(node)
        return tree

    return {"tree": build_tree(root_id)}
