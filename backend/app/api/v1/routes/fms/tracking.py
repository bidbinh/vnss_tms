"""
FMS Tracking API Routes
Quản lý tracking sự kiện lô hàng
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import ShipmentTracking, TrackingEvent, FMSShipment
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/tracking", tags=["FMS Tracking"])


class TrackingEventCreate(BaseModel):
    shipment_id: str
    event_type: str
    event_datetime: datetime
    location: Optional[str] = None
    location_code: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_no: Optional[str] = None
    container_no: Optional[str] = None
    description: Optional[str] = None
    remarks: Optional[str] = None
    is_milestone: bool = False


class TrackingEventResponse(BaseModel):
    id: str
    shipment_id: str
    event_type: str
    event_datetime: datetime
    location: Optional[str]
    location_code: Optional[str]
    vessel_name: Optional[str]
    voyage_no: Optional[str]
    container_no: Optional[str]
    description: Optional[str]
    remarks: Optional[str]
    is_milestone: bool
    created_at: datetime
    created_by: Optional[str]


class TrackingListResponse(BaseModel):
    items: List[TrackingEventResponse]
    total: int


@router.get("/shipment/{shipment_id}", response_model=TrackingListResponse)
def get_shipment_tracking(
    shipment_id: str,
    event_type: Optional[str] = None,
    container_no: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get tracking events for a shipment"""
    tenant_id = str(current_user.tenant_id)

    # Verify shipment belongs to tenant
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    query = select(ShipmentTracking).where(
        ShipmentTracking.shipment_id == shipment_id,
        ShipmentTracking.is_deleted == False,
    )

    if event_type:
        query = query.where(ShipmentTracking.event_type == event_type)
    if container_no:
        query = query.where(ShipmentTracking.container_no == container_no)

    query = query.order_by(ShipmentTracking.event_datetime.desc())
    events = session.exec(query).all()

    return TrackingListResponse(
        items=[TrackingEventResponse(
            id=e.id,
            shipment_id=e.shipment_id,
            event_type=e.event_type,
            event_datetime=e.event_datetime,
            location=e.location,
            location_code=e.location_code,
            vessel_name=e.vessel_name,
            voyage_no=e.voyage_no,
            container_no=e.container_no,
            description=e.description,
            remarks=e.remarks,
            is_milestone=e.is_milestone,
            created_at=e.created_at,
            created_by=e.created_by,
        ) for e in events],
        total=len(events),
    )


@router.post("", response_model=TrackingEventResponse)
def create_tracking_event(
    payload: TrackingEventCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a tracking event"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Verify shipment belongs to tenant
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == payload.shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    event = ShipmentTracking(
        tenant_id=tenant_id,
        created_by=user_id,
        **payload.model_dump()
    )

    session.add(event)
    session.commit()
    session.refresh(event)

    return TrackingEventResponse(
        id=event.id,
        shipment_id=event.shipment_id,
        event_type=event.event_type,
        event_datetime=event.event_datetime,
        location=event.location,
        location_code=event.location_code,
        vessel_name=event.vessel_name,
        voyage_no=event.voyage_no,
        container_no=event.container_no,
        description=event.description,
        remarks=event.remarks,
        is_milestone=event.is_milestone,
        created_at=event.created_at,
        created_by=event.created_by,
    )


@router.post("/bulk", response_model=List[TrackingEventResponse])
def create_bulk_tracking_events(
    events: List[TrackingEventCreate],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create multiple tracking events"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Verify all shipments
    shipment_ids = list(set(e.shipment_id for e in events))
    shipments = session.exec(
        select(FMSShipment).where(
            FMSShipment.id.in_(shipment_ids),
            FMSShipment.tenant_id == tenant_id,
        )
    ).all()

    valid_ids = {s.id for s in shipments}
    for e in events:
        if e.shipment_id not in valid_ids:
            raise HTTPException(status_code=404, detail=f"Shipment {e.shipment_id} not found")

    created_events = []
    for event_data in events:
        event = ShipmentTracking(
            tenant_id=tenant_id,
            created_by=user_id,
            **event_data.model_dump()
        )
        session.add(event)
        created_events.append(event)

    session.commit()

    for event in created_events:
        session.refresh(event)

    return [TrackingEventResponse(
        id=e.id,
        shipment_id=e.shipment_id,
        event_type=e.event_type,
        event_datetime=e.event_datetime,
        location=e.location,
        location_code=e.location_code,
        vessel_name=e.vessel_name,
        voyage_no=e.voyage_no,
        container_no=e.container_no,
        description=e.description,
        remarks=e.remarks,
        is_milestone=e.is_milestone,
        created_at=e.created_at,
        created_by=e.created_by,
    ) for e in created_events]


@router.delete("/{event_id}")
def delete_tracking_event(
    event_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a tracking event"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    event = session.exec(
        select(ShipmentTracking).where(
            ShipmentTracking.id == event_id,
            ShipmentTracking.tenant_id == tenant_id,
            ShipmentTracking.is_deleted == False,
        )
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Tracking event not found")

    event.is_deleted = True
    event.deleted_at = datetime.utcnow()
    event.deleted_by = user_id

    session.add(event)
    session.commit()

    return {"message": "Tracking event deleted"}


@router.get("/event-types")
def get_event_types():
    """Get list of tracking event types"""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in TrackingEvent]


@router.get("/milestones/{shipment_id}")
def get_shipment_milestones(
    shipment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get milestone events for a shipment"""
    tenant_id = str(current_user.tenant_id)

    # Verify shipment
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    events = session.exec(
        select(ShipmentTracking).where(
            ShipmentTracking.shipment_id == shipment_id,
            ShipmentTracking.is_milestone == True,
            ShipmentTracking.is_deleted == False,
        ).order_by(ShipmentTracking.event_datetime)
    ).all()

    return [TrackingEventResponse(
        id=e.id,
        shipment_id=e.shipment_id,
        event_type=e.event_type,
        event_datetime=e.event_datetime,
        location=e.location,
        location_code=e.location_code,
        vessel_name=e.vessel_name,
        voyage_no=e.voyage_no,
        container_no=e.container_no,
        description=e.description,
        remarks=e.remarks,
        is_milestone=e.is_milestone,
        created_at=e.created_at,
        created_by=e.created_by,
    ) for e in events]
