from fastapi import APIRouter, HTTPException
from typing import List
from sqlmodel import select
from app.core.db import get_session
from app.models.trip import Trip
from app.models.trip_event import TripEvent

router = APIRouter()

@router.get("/{trip_id}/events", response_model=List[TripEvent])
def list_events(trip_id: str):
    with get_session() as s:
        return list(s.exec(select(TripEvent).where(TripEvent.trip_id == trip_id)))

@router.post("/{trip_id}/events", response_model=TripEvent)
def create_event(trip_id: str, ev: TripEvent):
    with get_session() as s:
        if not s.get(Trip, trip_id):
            raise HTTPException(404, "trip not found")
        ev.trip_id = trip_id
        s.add(ev); s.commit(); s.refresh(ev)
        return ev
