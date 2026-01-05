from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from datetime import date
from pydantic import BaseModel

from app.db.session import get_session
from app.models import TractorTrailerPairing, Vehicle
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/tractor-trailer-pairings", tags=["tractor-trailer-pairings"])


class PairingCreate(BaseModel):
    tractor_id: str
    trailer_id: str
    effective_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None


class PairingUpdate(BaseModel):
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


@router.get("")
def list_pairings(
    active_only: bool = False,
    tractor_id: Optional[str] = None,
    trailer_id: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all tractor-trailer pairings"""
    query = select(TractorTrailerPairing).where(
        TractorTrailerPairing.tenant_id == current_user.tenant_id
    )

    if active_only:
        today = date.today()
        query = query.where(
            TractorTrailerPairing.effective_date <= today,
            (TractorTrailerPairing.end_date == None) | (TractorTrailerPairing.end_date >= today)
        )

    if tractor_id:
        query = query.where(TractorTrailerPairing.tractor_id == tractor_id)

    if trailer_id:
        query = query.where(TractorTrailerPairing.trailer_id == trailer_id)

    query = query.order_by(TractorTrailerPairing.effective_date.desc())

    pairings = session.exec(query).all()

    # Fetch vehicle info for each pairing
    result = []
    for p in pairings:
        tractor = session.get(Vehicle, p.tractor_id)
        trailer = session.get(Vehicle, p.trailer_id)
        result.append({
            "id": p.id,
            "tractor_id": p.tractor_id,
            "trailer_id": p.trailer_id,
            "tractor": {
                "id": tractor.id,
                "code": tractor.code,
                "plate_no": tractor.plate_no,
            } if tractor else None,
            "trailer": {
                "id": trailer.id,
                "code": trailer.code,
                "plate_no": trailer.plate_no,
            } if trailer else None,
            "effective_date": p.effective_date.isoformat() if p.effective_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "notes": p.notes,
            "is_active": p.end_date is None or p.end_date >= date.today(),
        })

    return result


@router.post("")
def create_pairing(
    data: PairingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new tractor-trailer pairing"""
    # Validate tractor exists and is TRACTOR type
    tractor = session.get(Vehicle, data.tractor_id)
    if not tractor or tractor.tenant_id != str(current_user.tenant_id):
        raise HTTPException(404, "Tractor not found")
    if tractor.type != "TRACTOR":
        raise HTTPException(400, "Vehicle is not a tractor")

    # Validate trailer exists and is TRAILER type
    trailer = session.get(Vehicle, data.trailer_id)
    if not trailer or trailer.tenant_id != str(current_user.tenant_id):
        raise HTTPException(404, "Trailer not found")
    if trailer.type != "TRAILER":
        raise HTTPException(400, "Vehicle is not a trailer")

    # Check for overlapping pairings for tractor
    existing_tractor = session.exec(
        select(TractorTrailerPairing).where(
            TractorTrailerPairing.tenant_id == current_user.tenant_id,
            TractorTrailerPairing.tractor_id == data.tractor_id,
            TractorTrailerPairing.effective_date <= (data.end_date or date(9999, 12, 31)),
            (TractorTrailerPairing.end_date == None) | (TractorTrailerPairing.end_date >= data.effective_date)
        )
    ).first()
    if existing_tractor:
        raise HTTPException(400, f"Đầu kéo {tractor.plate_no} đã được ghép cặp trong khoảng thời gian này")

    # Check for overlapping pairings for trailer
    existing_trailer = session.exec(
        select(TractorTrailerPairing).where(
            TractorTrailerPairing.tenant_id == current_user.tenant_id,
            TractorTrailerPairing.trailer_id == data.trailer_id,
            TractorTrailerPairing.effective_date <= (data.end_date or date(9999, 12, 31)),
            (TractorTrailerPairing.end_date == None) | (TractorTrailerPairing.end_date >= data.effective_date)
        )
    ).first()
    if existing_trailer:
        raise HTTPException(400, f"Rơ mooc {trailer.plate_no} đã được ghép cặp trong khoảng thời gian này")

    pairing = TractorTrailerPairing(
        tenant_id=str(current_user.tenant_id),
        tractor_id=data.tractor_id,
        trailer_id=data.trailer_id,
        effective_date=data.effective_date,
        end_date=data.end_date,
        notes=data.notes,
    )
    session.add(pairing)
    session.commit()
    session.refresh(pairing)

    return {
        "id": pairing.id,
        "tractor_id": pairing.tractor_id,
        "trailer_id": pairing.trailer_id,
        "effective_date": pairing.effective_date.isoformat(),
        "end_date": pairing.end_date.isoformat() if pairing.end_date else None,
        "notes": pairing.notes,
    }


@router.put("/{pairing_id}")
def update_pairing(
    pairing_id: str,
    data: PairingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a pairing (e.g., set end_date)"""
    pairing = session.get(TractorTrailerPairing, pairing_id)
    if not pairing or pairing.tenant_id != str(current_user.tenant_id):
        raise HTTPException(404, "Pairing not found")

    if data.effective_date is not None:
        pairing.effective_date = data.effective_date
    if data.end_date is not None:
        pairing.end_date = data.end_date
    if data.notes is not None:
        pairing.notes = data.notes

    session.add(pairing)
    session.commit()
    session.refresh(pairing)

    return {
        "id": pairing.id,
        "tractor_id": pairing.tractor_id,
        "trailer_id": pairing.trailer_id,
        "effective_date": pairing.effective_date.isoformat(),
        "end_date": pairing.end_date.isoformat() if pairing.end_date else None,
        "notes": pairing.notes,
    }


@router.delete("/{pairing_id}")
def delete_pairing(
    pairing_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a pairing"""
    pairing = session.get(TractorTrailerPairing, pairing_id)
    if not pairing or pairing.tenant_id != str(current_user.tenant_id):
        raise HTTPException(404, "Pairing not found")

    session.delete(pairing)
    session.commit()
    return {"message": "Pairing deleted"}


@router.post("/{pairing_id}/end")
def end_pairing(
    pairing_id: str,
    end_date: Optional[date] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """End an active pairing"""
    pairing = session.get(TractorTrailerPairing, pairing_id)
    if not pairing or pairing.tenant_id != str(current_user.tenant_id):
        raise HTTPException(404, "Pairing not found")

    pairing.end_date = end_date or date.today()
    session.add(pairing)
    session.commit()
    session.refresh(pairing)

    return {
        "id": pairing.id,
        "tractor_id": pairing.tractor_id,
        "trailer_id": pairing.trailer_id,
        "effective_date": pairing.effective_date.isoformat(),
        "end_date": pairing.end_date.isoformat(),
        "notes": pairing.notes,
    }
