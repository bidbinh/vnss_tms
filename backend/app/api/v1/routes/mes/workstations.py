"""
Workstation API Routes
Trạm làm việc / Máy móc thiết bị
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.core.security import get_current_user
from app.models import User
from app.models.mes import Workstation, WorkstationType, WorkstationStatus

router = APIRouter()


# ============== Schemas ==============
class WorkstationCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    workstation_type: WorkstationType = WorkstationType.MACHINE
    warehouse_id: Optional[str] = None
    location_code: Optional[str] = None
    zone_id: Optional[str] = None
    capacity_per_hour: Decimal = Decimal("1")
    max_capacity: Decimal = Decimal("100")
    efficiency_rate: Decimal = Decimal("100")
    setup_time_minutes: int = 0
    cleanup_time_minutes: int = 0
    working_hours_per_day: Decimal = Decimal("8")
    days_per_week: int = 6
    hourly_cost: Decimal = Decimal("0")
    overhead_cost: Decimal = Decimal("0")
    equipment_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    required_skill_level: Optional[str] = None
    maintenance_interval_days: int = 30
    notes: Optional[str] = None


class WorkstationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workstation_type: Optional[WorkstationType] = None
    status: Optional[WorkstationStatus] = None
    warehouse_id: Optional[str] = None
    location_code: Optional[str] = None
    capacity_per_hour: Optional[Decimal] = None
    max_capacity: Optional[Decimal] = None
    efficiency_rate: Optional[Decimal] = None
    setup_time_minutes: Optional[int] = None
    cleanup_time_minutes: Optional[int] = None
    working_hours_per_day: Optional[Decimal] = None
    days_per_week: Optional[int] = None
    hourly_cost: Optional[Decimal] = None
    overhead_cost: Optional[Decimal] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    maintenance_interval_days: Optional[int] = None
    notes: Optional[str] = None


# ============== Endpoints ==============
@router.get("")
async def list_workstations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[WorkstationStatus] = None,
    workstation_type: Optional[WorkstationType] = None,
    warehouse_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách trạm làm việc"""
    query = select(Workstation).where(
        Workstation.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(Workstation.status == status)
    if workstation_type:
        query = query.where(Workstation.workstation_type == workstation_type)
    if warehouse_id:
        query = query.where(Workstation.warehouse_id == warehouse_id)
    if search:
        query = query.where(
            (Workstation.code.ilike(f"%{search}%")) |
            (Workstation.name.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(Workstation.code)
    query = query.offset((page - 1) * size).limit(size)
    items = session.exec(query).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("")
async def create_workstation(
    data: WorkstationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo trạm làm việc mới"""
    # Check duplicate code
    existing = session.exec(
        select(Workstation).where(
            Workstation.tenant_id == current_user.tenant_id,
            Workstation.code == data.code,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Mã trạm {data.code} đã tồn tại")

    workstation = Workstation(
        tenant_id=current_user.tenant_id,
        **data.model_dump()
    )
    session.add(workstation)
    session.commit()
    session.refresh(workstation)

    return workstation


@router.get("/{workstation_id}")
async def get_workstation(
    workstation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết trạm làm việc"""
    workstation = session.exec(
        select(Workstation).where(
            Workstation.id == workstation_id,
            Workstation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not workstation:
        raise HTTPException(404, "Không tìm thấy trạm làm việc")

    return workstation


@router.put("/{workstation_id}")
async def update_workstation(
    workstation_id: str,
    data: WorkstationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật trạm làm việc"""
    workstation = session.exec(
        select(Workstation).where(
            Workstation.id == workstation_id,
            Workstation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not workstation:
        raise HTTPException(404, "Không tìm thấy trạm làm việc")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(workstation, key, value)

    session.add(workstation)
    session.commit()
    session.refresh(workstation)

    return workstation


@router.delete("/{workstation_id}")
async def delete_workstation(
    workstation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa trạm làm việc"""
    workstation = session.exec(
        select(Workstation).where(
            Workstation.id == workstation_id,
            Workstation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not workstation:
        raise HTTPException(404, "Không tìm thấy trạm làm việc")

    session.delete(workstation)
    session.commit()

    return {"message": "Đã xóa trạm làm việc"}


@router.post("/{workstation_id}/maintenance")
async def start_maintenance(
    workstation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Đưa trạm vào chế độ bảo trì"""
    workstation = session.exec(
        select(Workstation).where(
            Workstation.id == workstation_id,
            Workstation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not workstation:
        raise HTTPException(404, "Không tìm thấy trạm làm việc")

    workstation.status = WorkstationStatus.MAINTENANCE
    session.add(workstation)
    session.commit()
    session.refresh(workstation)

    return workstation


@router.post("/{workstation_id}/activate")
async def activate_workstation(
    workstation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Kích hoạt trạm làm việc"""
    workstation = session.exec(
        select(Workstation).where(
            Workstation.id == workstation_id,
            Workstation.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not workstation:
        raise HTTPException(404, "Không tìm thấy trạm làm việc")

    workstation.status = WorkstationStatus.ACTIVE
    workstation.last_maintenance_date = datetime.utcnow()
    session.add(workstation)
    session.commit()
    session.refresh(workstation)

    return workstation
