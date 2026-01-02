"""
Equipment Maintenance API Routes
Bảo trì thiết bị sản xuất
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
from app.models.mes import EquipmentMaintenance, MaintenanceType, MaintenanceStatus, Workstation, WorkstationStatus

router = APIRouter()


# ============== Schemas ==============
class MaintenanceCreate(BaseModel):
    maintenance_number: Optional[str] = None
    description: Optional[str] = None
    maintenance_type: MaintenanceType = MaintenanceType.PREVENTIVE
    priority: int = 5
    workstation_id: str
    workstation_code: Optional[str] = None
    workstation_name: Optional[str] = None
    equipment_name: Optional[str] = None
    serial_number: Optional[str] = None
    scheduled_date: datetime
    scheduled_duration_hours: Decimal = Decimal("1")
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    external_vendor: Optional[str] = None
    problem_description: Optional[str] = None
    maintenance_interval_days: Optional[int] = None
    notes: Optional[str] = None


class MaintenanceUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    scheduled_duration_hours: Optional[Decimal] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    external_vendor: Optional[str] = None
    problem_description: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceComplete(BaseModel):
    root_cause: Optional[str] = None
    actions_taken: Optional[str] = None
    solution: Optional[str] = None
    parts_used: Optional[str] = None
    parts_cost: Decimal = Decimal("0")
    labor_cost: Decimal = Decimal("0")
    material_cost: Decimal = Decimal("0")
    external_cost: Decimal = Decimal("0")
    next_maintenance_date: Optional[datetime] = None
    notes: Optional[str] = None


# ============== Helper Functions ==============
async def generate_maintenance_number(session: Session, tenant_id: str) -> str:
    """Tạo số phiếu bảo trì"""
    from datetime import date
    today = date.today()
    prefix = f"MT{today.strftime('%y%m')}"

    count = session.exec(
        select(func.count()).where(
            EquipmentMaintenance.tenant_id == tenant_id,
            EquipmentMaintenance.maintenance_number.like(f"{prefix}%")
        )
    ).one()

    return f"{prefix}{str(count + 1).zfill(4)}"


# ============== Endpoints ==============
@router.get("")
async def list_maintenance(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[MaintenanceStatus] = None,
    maintenance_type: Optional[MaintenanceType] = None,
    workstation_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách phiếu bảo trì"""
    query = select(EquipmentMaintenance).where(
        EquipmentMaintenance.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(EquipmentMaintenance.status == status)
    if maintenance_type:
        query = query.where(EquipmentMaintenance.maintenance_type == maintenance_type)
    if workstation_id:
        query = query.where(EquipmentMaintenance.workstation_id == workstation_id)
    if search:
        query = query.where(
            (EquipmentMaintenance.maintenance_number.ilike(f"%{search}%")) |
            (EquipmentMaintenance.workstation_name.ilike(f"%{search}%")) |
            (EquipmentMaintenance.equipment_name.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(EquipmentMaintenance.scheduled_date.desc())
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
async def create_maintenance(
    data: MaintenanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo phiếu bảo trì"""
    maintenance_number = data.maintenance_number
    if not maintenance_number:
        maintenance_number = await generate_maintenance_number(session, current_user.tenant_id)

    maintenance = EquipmentMaintenance(
        tenant_id=current_user.tenant_id,
        maintenance_number=maintenance_number,
        created_by=str(current_user.id),
        **data.model_dump(exclude={"maintenance_number"})
    )
    session.add(maintenance)
    session.commit()
    session.refresh(maintenance)

    return maintenance


@router.get("/{maintenance_id}")
async def get_maintenance(
    maintenance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết phiếu bảo trì"""
    maintenance = session.exec(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == maintenance_id,
            EquipmentMaintenance.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not maintenance:
        raise HTTPException(404, "Không tìm thấy phiếu bảo trì")

    return maintenance


@router.put("/{maintenance_id}")
async def update_maintenance(
    maintenance_id: str,
    data: MaintenanceUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật phiếu bảo trì"""
    maintenance = session.exec(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == maintenance_id,
            EquipmentMaintenance.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not maintenance:
        raise HTTPException(404, "Không tìm thấy phiếu bảo trì")

    if maintenance.status == MaintenanceStatus.COMPLETED:
        raise HTTPException(400, "Không thể sửa phiếu đã hoàn thành")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(maintenance, key, value)

    session.add(maintenance)
    session.commit()
    session.refresh(maintenance)

    return maintenance


@router.post("/{maintenance_id}/start")
async def start_maintenance(
    maintenance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bắt đầu bảo trì"""
    maintenance = session.exec(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == maintenance_id,
            EquipmentMaintenance.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not maintenance:
        raise HTTPException(404, "Không tìm thấy phiếu bảo trì")

    if maintenance.status != MaintenanceStatus.SCHEDULED:
        raise HTTPException(400, "Chỉ có thể bắt đầu phiếu đã lên lịch")

    maintenance.status = MaintenanceStatus.IN_PROGRESS
    maintenance.actual_start = datetime.utcnow()
    maintenance.downtime_start = datetime.utcnow()

    # Update workstation status
    workstation = session.exec(
        select(Workstation).where(Workstation.id == maintenance.workstation_id)
    ).first()
    if workstation:
        workstation.status = WorkstationStatus.MAINTENANCE
        session.add(workstation)

    session.add(maintenance)
    session.commit()
    session.refresh(maintenance)

    return maintenance


@router.post("/{maintenance_id}/complete")
async def complete_maintenance(
    maintenance_id: str,
    data: MaintenanceComplete,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hoàn thành bảo trì"""
    maintenance = session.exec(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == maintenance_id,
            EquipmentMaintenance.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not maintenance:
        raise HTTPException(404, "Không tìm thấy phiếu bảo trì")

    if maintenance.status != MaintenanceStatus.IN_PROGRESS:
        raise HTTPException(400, "Chỉ có thể hoàn thành phiếu đang thực hiện")

    now = datetime.utcnow()
    maintenance.status = MaintenanceStatus.COMPLETED
    maintenance.actual_end = now
    maintenance.downtime_end = now
    maintenance.completed_by = str(current_user.id)

    # Calculate downtime
    if maintenance.downtime_start:
        downtime_seconds = (now - maintenance.downtime_start).total_seconds()
        maintenance.downtime_hours = Decimal(str(round(downtime_seconds / 3600, 2)))

    # Calculate actual duration
    if maintenance.actual_start:
        duration_seconds = (now - maintenance.actual_start).total_seconds()
        maintenance.actual_duration_hours = Decimal(str(round(duration_seconds / 3600, 2)))

    # Update costs and details
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(maintenance, key, value)

    # Calculate total cost
    maintenance.total_cost = (
        maintenance.parts_cost +
        maintenance.labor_cost +
        maintenance.material_cost +
        maintenance.external_cost
    )

    # Update workstation
    workstation = session.exec(
        select(Workstation).where(Workstation.id == maintenance.workstation_id)
    ).first()
    if workstation:
        workstation.status = WorkstationStatus.ACTIVE
        workstation.last_maintenance_date = now
        if data.next_maintenance_date:
            workstation.next_maintenance_date = data.next_maintenance_date
        session.add(workstation)

    session.add(maintenance)
    session.commit()
    session.refresh(maintenance)

    return maintenance


@router.post("/{maintenance_id}/cancel")
async def cancel_maintenance(
    maintenance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hủy phiếu bảo trì"""
    maintenance = session.exec(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == maintenance_id,
            EquipmentMaintenance.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not maintenance:
        raise HTTPException(404, "Không tìm thấy phiếu bảo trì")

    if maintenance.status == MaintenanceStatus.COMPLETED:
        raise HTTPException(400, "Không thể hủy phiếu đã hoàn thành")

    maintenance.status = MaintenanceStatus.CANCELLED

    # Restore workstation status if was in maintenance
    workstation = session.exec(
        select(Workstation).where(Workstation.id == maintenance.workstation_id)
    ).first()
    if workstation and workstation.status == WorkstationStatus.MAINTENANCE:
        workstation.status = WorkstationStatus.ACTIVE
        session.add(workstation)

    session.add(maintenance)
    session.commit()
    session.refresh(maintenance)

    return maintenance


@router.delete("/{maintenance_id}")
async def delete_maintenance(
    maintenance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa phiếu bảo trì"""
    maintenance = session.exec(
        select(EquipmentMaintenance).where(
            EquipmentMaintenance.id == maintenance_id,
            EquipmentMaintenance.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not maintenance:
        raise HTTPException(404, "Không tìm thấy phiếu bảo trì")

    if maintenance.status not in [MaintenanceStatus.SCHEDULED, MaintenanceStatus.CANCELLED]:
        raise HTTPException(400, "Chỉ có thể xóa phiếu đã lên lịch hoặc đã hủy")

    session.delete(maintenance)
    session.commit()

    return {"message": "Đã xóa phiếu bảo trì"}
