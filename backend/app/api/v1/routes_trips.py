from fastapi import APIRouter, HTTPException
from typing import List
from sqlmodel import select
from app.models.trip import Trip
from app.core.db import get_session

router = APIRouter()

@router.get("/", response_model=List[Trip])
def list_trips():
    with get_session() as s:
        return list(s.exec(select(Trip)))

@router.post("/", response_model=Trip)
def create_trip(trip: Trip):
    with get_session() as s:
        if s.get(Trip, trip.id):
            raise HTTPException(400, "trip exists")
        s.add(trip)
        s.commit()
        s.refresh(trip)
        return trip
