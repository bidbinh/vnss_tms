from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Location, User
from app.core.security import get_current_user

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("")
def list_locations(
    include_inactive: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all locations for current tenant"""
    tenant_id = str(current_user.tenant_id)
    query = select(Location).where(Location.tenant_id == tenant_id)

    # By default, only show active locations
    if not include_inactive:
        query = query.where(Location.is_active == True)

    return session.exec(query.order_by(Location.created_at.desc())).all()


@router.post("")
def create_location(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new location (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create locations")

    tenant_id = str(current_user.tenant_id)

    location = Location(
        tenant_id=tenant_id,
        code=payload["code"].strip().upper(),
        name=payload["name"].strip(),
        type=payload["type"],
        ward=payload.get("ward"),
        district=payload.get("district"),
        province=payload.get("province"),
        note=payload.get("note"),
    )
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@router.put("/{location_id}")
def update_location(
    location_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update location (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update locations")

    tenant_id = str(current_user.tenant_id)
    location = session.get(Location, location_id)
    if not location:
        raise HTTPException(404, "Location not found")
    if str(location.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update fields
    if "code" in payload:
        location.code = payload["code"].strip().upper()
    if "name" in payload:
        location.name = payload["name"].strip()
    if "type" in payload:
        location.type = payload["type"]
    if "ward" in payload:
        location.ward = payload["ward"]
    if "district" in payload:
        location.district = payload["district"]
    if "province" in payload:
        location.province = payload["province"]
    if "note" in payload:
        location.note = payload["note"]

    session.add(location)
    session.commit()
    session.refresh(location)
    return location


@router.delete("/{location_id}")
def delete_location(
    location_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Soft delete location (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can delete locations")

    tenant_id = str(current_user.tenant_id)
    location = session.get(Location, location_id)
    if not location:
        raise HTTPException(404, "Location not found")
    if str(location.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Soft delete - set is_active = False
    location.is_active = False
    session.add(location)
    session.commit()
    return {"message": "Location deleted successfully"}


@router.patch("/{location_id}/restore")
def restore_location(
    location_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Restore soft-deleted location (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can restore locations")

    tenant_id = str(current_user.tenant_id)
    location = session.get(Location, location_id)
    if not location:
        raise HTTPException(404, "Location not found")
    if str(location.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    location.is_active = True
    session.add(location)
    session.commit()
    return {"message": "Location restored successfully"}
