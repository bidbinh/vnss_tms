"""
Work Order API Routes
Lệnh công việc - Chi tiết từng công đoạn sản xuất
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
from app.models.mes import WorkOrder, WorkOrderStatus, WorkOrderType

router = APIRouter()


# ============== Schemas ==============
class WorkOrderCreate(BaseModel):
    work_order_number: Optional[str] = None
    description: Optional[str] = None
    work_order_type: WorkOrderType = WorkOrderType.PRODUCTION
    priority: int = 5
    production_order_id: str
    production_order_number: Optional[str] = None
    routing_step_id: Optional[str] = None
    step_number: int = 10
    operation_code: Optional[str] = None
    operation_name: Optional[str] = None
    workstation_id: Optional[str] = None
    workstation_code: Optional[str] = None
    workstation_name: Optional[str] = None
    product_id: Optional[str] = None
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    planned_quantity: Decimal = Decimal("1")
    unit_name: Optional[str] = None
    planned_setup_time: Decimal = Decimal("0")
    planned_run_time: Decimal = Decimal("0")
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    predecessor_work_order_id: Optional[str] = None
    requires_qc: bool = False
    instructions: Optional[str] = None
    notes: Optional[str] = None


class WorkOrderUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[int] = None
    workstation_id: Optional[str] = None
    workstation_code: Optional[str] = None
    workstation_name: Optional[str] = None
    planned_quantity: Optional[Decimal] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    operator_id: Optional[str] = None
    operator_name: Optional[str] = None
    instructions: Optional[str] = None
    notes: Optional[str] = None


class WorkOrderComplete(BaseModel):
    completed_quantity: Decimal
    scrapped_quantity: Decimal = Decimal("0")
    actual_setup_time: Optional[Decimal] = None
    actual_run_time: Optional[Decimal] = None
    notes: Optional[str] = None


# ============== Helper Functions ==============
async def generate_work_order_number(session: Session, tenant_id: str, production_order_number: str, step: int) -> str:
    """Tạo số lệnh công việc"""
    return f"{production_order_number}-{str(step).zfill(3)}"


# ============== Endpoints ==============
@router.get("")
async def list_work_orders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[WorkOrderStatus] = None,
    work_order_type: Optional[WorkOrderType] = None,
    production_order_id: Optional[str] = None,
    workstation_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách lệnh công việc"""
    query = select(WorkOrder).where(
        WorkOrder.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(WorkOrder.status == status)
    if work_order_type:
        query = query.where(WorkOrder.work_order_type == work_order_type)
    if production_order_id:
        query = query.where(WorkOrder.production_order_id == production_order_id)
    if workstation_id:
        query = query.where(WorkOrder.workstation_id == workstation_id)
    if operator_id:
        query = query.where(WorkOrder.operator_id == operator_id)
    if search:
        query = query.where(
            (WorkOrder.work_order_number.ilike(f"%{search}%")) |
            (WorkOrder.operation_name.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(WorkOrder.created_at.desc())
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
async def create_work_order(
    data: WorkOrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo lệnh công việc mới"""
    work_order_number = data.work_order_number
    if not work_order_number:
        work_order_number = await generate_work_order_number(
            session, current_user.tenant_id,
            data.production_order_number or "MO", data.step_number
        )

    # Calculate planned total time
    planned_total_time = data.planned_setup_time + (data.planned_run_time * data.planned_quantity)

    work_order = WorkOrder(
        tenant_id=current_user.tenant_id,
        work_order_number=work_order_number,
        planned_total_time=planned_total_time,
        **data.model_dump(exclude={"work_order_number"})
    )
    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.get("/{work_order_id}")
async def get_work_order(
    work_order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết lệnh công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    return work_order


@router.put("/{work_order_id}")
async def update_work_order(
    work_order_id: str,
    data: WorkOrderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật lệnh công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status in [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED]:
        raise HTTPException(400, "Không thể sửa lệnh đã hoàn thành hoặc đã hủy")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(work_order, key, value)

    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.post("/{work_order_id}/start")
async def start_work_order(
    work_order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bắt đầu thực hiện công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status not in [WorkOrderStatus.PENDING, WorkOrderStatus.READY]:
        raise HTTPException(400, "Chỉ có thể bắt đầu công việc chờ thực hiện")

    work_order.status = WorkOrderStatus.IN_PROGRESS
    work_order.actual_start = datetime.utcnow()
    work_order.started_by = str(current_user.id)
    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.post("/{work_order_id}/pause")
async def pause_work_order(
    work_order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạm dừng công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status != WorkOrderStatus.IN_PROGRESS:
        raise HTTPException(400, "Chỉ có thể tạm dừng công việc đang thực hiện")

    work_order.status = WorkOrderStatus.PAUSED
    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.post("/{work_order_id}/resume")
async def resume_work_order(
    work_order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tiếp tục công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status != WorkOrderStatus.PAUSED:
        raise HTTPException(400, "Chỉ có thể tiếp tục công việc đang tạm dừng")

    work_order.status = WorkOrderStatus.IN_PROGRESS
    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.post("/{work_order_id}/complete")
async def complete_work_order(
    work_order_id: str,
    data: WorkOrderComplete,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hoàn thành công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status != WorkOrderStatus.IN_PROGRESS:
        raise HTTPException(400, "Chỉ có thể hoàn thành công việc đang thực hiện")

    work_order.status = WorkOrderStatus.COMPLETED
    work_order.completed_quantity = data.completed_quantity
    work_order.scrapped_quantity = data.scrapped_quantity
    work_order.actual_end = datetime.utcnow()
    work_order.completed_by = str(current_user.id)

    if data.actual_setup_time is not None:
        work_order.actual_setup_time = data.actual_setup_time
    if data.actual_run_time is not None:
        work_order.actual_run_time = data.actual_run_time

    # Calculate actual total time
    if work_order.actual_start:
        duration = (datetime.utcnow() - work_order.actual_start).total_seconds() / 60
        work_order.actual_total_time = Decimal(str(round(duration, 2)))

    if data.notes:
        work_order.notes = data.notes

    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.post("/{work_order_id}/cancel")
async def cancel_work_order(
    work_order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hủy công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status == WorkOrderStatus.COMPLETED:
        raise HTTPException(400, "Không thể hủy công việc đã hoàn thành")

    work_order.status = WorkOrderStatus.CANCELLED
    session.add(work_order)
    session.commit()
    session.refresh(work_order)

    return work_order


@router.delete("/{work_order_id}")
async def delete_work_order(
    work_order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa lệnh công việc"""
    work_order = session.exec(
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not work_order:
        raise HTTPException(404, "Không tìm thấy lệnh công việc")

    if work_order.status not in [WorkOrderStatus.PENDING, WorkOrderStatus.CANCELLED]:
        raise HTTPException(400, "Chỉ có thể xóa công việc chờ thực hiện hoặc đã hủy")

    session.delete(work_order)
    session.commit()

    return {"message": "Đã xóa lệnh công việc"}
