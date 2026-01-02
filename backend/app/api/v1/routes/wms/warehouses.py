"""
WMS - Warehouses API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.wms import (
    Warehouse, WarehouseType, WarehouseZone, ZoneType,
    StorageLocation, LocationType
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class WarehouseCreate(BaseModel):
    code: str
    name: str
    warehouse_type: str = WarehouseType.MAIN.value
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[str] = None
    total_area_sqm: Decimal = Decimal("0")
    storage_capacity: Decimal = Decimal("0")
    allow_negative_stock: bool = False
    use_lots: bool = True
    use_serial_numbers: bool = False
    use_expiry_dates: bool = True
    notes: Optional[str] = None


class ZoneCreate(BaseModel):
    warehouse_id: str
    code: str
    name: str
    zone_type: str = ZoneType.STORAGE.value
    area_sqm: Decimal = Decimal("0")
    storage_capacity: Decimal = Decimal("0")
    is_temperature_controlled: bool = False
    min_temperature: Optional[Decimal] = None
    max_temperature: Optional[Decimal] = None
    restricted_access: bool = False
    notes: Optional[str] = None


class LocationCreate(BaseModel):
    warehouse_id: str
    zone_id: Optional[str] = None
    code: str
    barcode: Optional[str] = None
    location_type: str = LocationType.BIN.value
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    bin: Optional[str] = None
    width_cm: Optional[Decimal] = None
    depth_cm: Optional[Decimal] = None
    height_cm: Optional[Decimal] = None
    max_weight_kg: Optional[Decimal] = None
    max_items: Optional[int] = None
    picking_priority: int = 0
    putaway_priority: int = 0
    notes: Optional[str] = None


# =====================
# WAREHOUSES
# =====================

@router.get("/warehouses")
def list_warehouses(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    warehouse_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
):
    """List all warehouses"""
    tenant_id = str(current_user.tenant_id)

    query = select(Warehouse).where(Warehouse.tenant_id == tenant_id)

    if warehouse_type:
        query = query.where(Warehouse.warehouse_type == warehouse_type)

    if is_active is not None:
        query = query.where(Warehouse.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(Warehouse.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/warehouses")
def create_warehouse(
    payload: WarehouseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new warehouse"""
    tenant_id = str(current_user.tenant_id)

    existing = session.exec(
        select(Warehouse).where(
            Warehouse.tenant_id == tenant_id,
            Warehouse.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Warehouse code '{payload.code}' already exists")

    warehouse = Warehouse(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)

    return warehouse.model_dump()


@router.get("/warehouses/{warehouse_id}")
def get_warehouse(
    warehouse_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get warehouse with zones"""
    tenant_id = str(current_user.tenant_id)

    warehouse = session.get(Warehouse, warehouse_id)
    if not warehouse or str(warehouse.tenant_id) != tenant_id:
        raise HTTPException(404, "Warehouse not found")

    zones = session.exec(
        select(WarehouseZone).where(
            WarehouseZone.tenant_id == tenant_id,
            WarehouseZone.warehouse_id == warehouse_id
        ).order_by(WarehouseZone.code)
    ).all()

    result = warehouse.model_dump()
    result["zones"] = [z.model_dump() for z in zones]

    return result


@router.put("/warehouses/{warehouse_id}")
def update_warehouse(
    warehouse_id: str,
    payload: WarehouseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a warehouse"""
    tenant_id = str(current_user.tenant_id)

    warehouse = session.get(Warehouse, warehouse_id)
    if not warehouse or str(warehouse.tenant_id) != tenant_id:
        raise HTTPException(404, "Warehouse not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(warehouse, key, value)

    warehouse.updated_at = datetime.utcnow()
    session.add(warehouse)
    session.commit()
    session.refresh(warehouse)

    return warehouse.model_dump()


# =====================
# ZONES
# =====================

@router.get("/zones")
def list_zones(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    zone_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List warehouse zones"""
    tenant_id = str(current_user.tenant_id)

    query = select(WarehouseZone).where(WarehouseZone.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(WarehouseZone.warehouse_id == warehouse_id)

    if zone_type:
        query = query.where(WarehouseZone.zone_type == zone_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(WarehouseZone.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/zones")
def create_zone(
    payload: ZoneCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a warehouse zone"""
    tenant_id = str(current_user.tenant_id)

    zone = WarehouseZone(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(zone)
    session.commit()
    session.refresh(zone)

    return zone.model_dump()


# =====================
# LOCATIONS
# =====================

@router.get("/locations")
def list_locations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    warehouse_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    location_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
):
    """List storage locations"""
    tenant_id = str(current_user.tenant_id)

    query = select(StorageLocation).where(StorageLocation.tenant_id == tenant_id)

    if warehouse_id:
        query = query.where(StorageLocation.warehouse_id == warehouse_id)

    if zone_id:
        query = query.where(StorageLocation.zone_id == zone_id)

    if location_type:
        query = query.where(StorageLocation.location_type == location_type)

    if is_active is not None:
        query = query.where(StorageLocation.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(StorageLocation.code)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/locations")
def create_location(
    payload: LocationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a storage location"""
    tenant_id = str(current_user.tenant_id)

    location = StorageLocation(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(location)
    session.commit()
    session.refresh(location)

    return location.model_dump()


@router.post("/locations/bulk")
def create_locations_bulk(
    warehouse_id: str,
    aisles: str,  # e.g., "A,B,C" or "A-C"
    racks: int,
    shelves: int,
    bins: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bulk create storage locations"""
    tenant_id = str(current_user.tenant_id)

    # Parse aisles
    aisle_list = []
    if "-" in aisles:
        start, end = aisles.split("-")
        aisle_list = [chr(c) for c in range(ord(start.strip()), ord(end.strip()) + 1)]
    else:
        aisle_list = [a.strip() for a in aisles.split(",")]

    created_count = 0
    for aisle in aisle_list:
        for rack in range(1, racks + 1):
            for shelf in range(1, shelves + 1):
                for bin_num in range(1, bins + 1):
                    code = f"{aisle}-{rack:02d}-{shelf:02d}-{bin_num:02d}"

                    existing = session.exec(
                        select(StorageLocation).where(
                            StorageLocation.tenant_id == tenant_id,
                            StorageLocation.warehouse_id == warehouse_id,
                            StorageLocation.code == code
                        )
                    ).first()

                    if not existing:
                        location = StorageLocation(
                            tenant_id=tenant_id,
                            warehouse_id=warehouse_id,
                            code=code,
                            barcode=code,
                            location_type=LocationType.BIN.value,
                            aisle=aisle,
                            rack=f"{rack:02d}",
                            shelf=f"{shelf:02d}",
                            bin=f"{bin_num:02d}",
                            created_by=str(current_user.id),
                        )
                        session.add(location)
                        created_count += 1

    session.commit()

    return {"success": True, "created_count": created_count}
