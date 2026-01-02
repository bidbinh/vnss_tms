from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.session import get_session
from app.models import Vehicle, User
from app.core.security import get_current_user

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("")
def list_vehicles(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all vehicles for current tenant"""
    tenant_id = str(current_user.tenant_id)
    return session.exec(
        select(Vehicle).where(Vehicle.tenant_id == tenant_id).order_by(Vehicle.created_at.desc())
    ).all()


@router.post("")
def create_vehicle(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new vehicle (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can create vehicles")

    tenant_id = str(current_user.tenant_id)
    vehicle = Vehicle(
        tenant_id=tenant_id,
        code=payload.get("code"),
        plate_no=payload["plate_no"],
        type=payload.get("type", "TRACTOR"),
        vehicle_type_name=payload.get("vehicle_type_name"),
        manufacturer=payload.get("manufacturer"),
        model=payload.get("model"),
        country_of_origin=payload.get("country_of_origin"),
        year_of_manufacture=payload.get("year_of_manufacture"),
        chassis_number=payload.get("chassis_number"),
        engine_number=payload.get("engine_number"),
        curb_weight=payload.get("curb_weight"),
        payload_capacity=payload.get("payload_capacity"),
        gross_weight=payload.get("gross_weight"),
        dimensions=payload.get("dimensions"),
        registration_expiry=payload.get("registration_expiry"),
        status=payload.get("status", "ACTIVE"),
        inactive_reason=payload.get("inactive_reason"),
    )
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@router.put("/{vehicle_id}")
def update_vehicle(
    vehicle_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update vehicle (ADMIN/DISPATCHER only)"""
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can update vehicles")

    tenant_id = str(current_user.tenant_id)
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    if str(vehicle.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Update all fields
    if "code" in payload:
        vehicle.code = payload["code"]
    if "plate_no" in payload:
        vehicle.plate_no = payload["plate_no"]
    if "type" in payload:
        vehicle.type = payload["type"]
    if "vehicle_type_name" in payload:
        vehicle.vehicle_type_name = payload["vehicle_type_name"]
    if "manufacturer" in payload:
        vehicle.manufacturer = payload["manufacturer"]
    if "model" in payload:
        vehicle.model = payload["model"]
    if "country_of_origin" in payload:
        vehicle.country_of_origin = payload["country_of_origin"]
    if "year_of_manufacture" in payload:
        vehicle.year_of_manufacture = payload["year_of_manufacture"]
    if "chassis_number" in payload:
        vehicle.chassis_number = payload["chassis_number"]
    if "engine_number" in payload:
        vehicle.engine_number = payload["engine_number"]
    if "curb_weight" in payload:
        vehicle.curb_weight = payload["curb_weight"]
    if "payload_capacity" in payload:
        vehicle.payload_capacity = payload["payload_capacity"]
    if "gross_weight" in payload:
        vehicle.gross_weight = payload["gross_weight"]
    if "dimensions" in payload:
        vehicle.dimensions = payload["dimensions"]
    if "registration_expiry" in payload:
        vehicle.registration_expiry = payload["registration_expiry"]
    if "status" in payload:
        vehicle.status = payload["status"]
    if "inactive_reason" in payload:
        vehicle.inactive_reason = payload["inactive_reason"]

    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle
