"""
Routing API Routes
Quy trình sản xuất
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.core.security import get_current_user
from app.models import User
from app.models.mes import Routing, RoutingStep, RoutingStatus

router = APIRouter()


# ============== Schemas ==============
class RoutingStepCreate(BaseModel):
    step_number: int = 10
    operation_code: str
    operation_name: str
    description: Optional[str] = None
    workstation_id: Optional[str] = None
    workstation_code: Optional[str] = None
    workstation_name: Optional[str] = None
    setup_time: Decimal = Decimal("0")
    run_time: Decimal = Decimal("0")
    wait_time: Decimal = Decimal("0")
    move_time: Decimal = Decimal("0")
    queue_time: Decimal = Decimal("0")
    base_quantity: Decimal = Decimal("1")
    scrap_rate: Decimal = Decimal("0")
    labor_cost: Decimal = Decimal("0")
    machine_cost: Decimal = Decimal("0")
    overhead_cost: Decimal = Decimal("0")
    is_outsourced: bool = False
    supplier_id: Optional[str] = None
    is_quality_check: bool = False
    predecessor_step_id: Optional[str] = None
    is_parallel: bool = False
    instructions: Optional[str] = None
    notes: Optional[str] = None


class RoutingCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    version: str = "1.0"
    product_id: Optional[str] = None
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    notes: Optional[str] = None
    steps: Optional[List[RoutingStepCreate]] = None


class RoutingUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    status: Optional[RoutingStatus] = None
    product_id: Optional[str] = None
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    notes: Optional[str] = None


# ============== Routing Endpoints ==============
@router.get("")
async def list_routings(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[RoutingStatus] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách quy trình sản xuất"""
    query = select(Routing).where(
        Routing.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(Routing.status == status)
    if product_id:
        query = query.where(Routing.product_id == product_id)
    if search:
        query = query.where(
            (Routing.code.ilike(f"%{search}%")) |
            (Routing.name.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(Routing.created_at.desc())
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
async def create_routing(
    data: RoutingCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo quy trình mới"""
    # Check duplicate code
    existing = session.exec(
        select(Routing).where(
            Routing.tenant_id == current_user.tenant_id,
            Routing.code == data.code,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Mã quy trình {data.code} đã tồn tại")

    routing = Routing(
        tenant_id=current_user.tenant_id,
        created_by=str(current_user.id),
        **data.model_dump(exclude={"steps"})
    )
    session.add(routing)
    session.flush()

    # Add steps
    total_time = Decimal("0")
    total_setup = Decimal("0")
    total_cost = Decimal("0")

    if data.steps:
        for step_data in data.steps:
            step = RoutingStep(
                tenant_id=current_user.tenant_id,
                routing_id=routing.id,
                **step_data.model_dump()
            )
            total_time += step.setup_time + step.run_time + step.wait_time + step.move_time
            total_setup += step.setup_time
            total_cost += step.labor_cost + step.machine_cost + step.overhead_cost
            session.add(step)

    routing.total_time_minutes = total_time
    routing.total_setup_time = total_setup
    routing.total_cost = total_cost

    session.commit()
    session.refresh(routing)

    return routing


@router.get("/{routing_id}")
async def get_routing(
    routing_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết quy trình"""
    routing = session.exec(
        select(Routing).where(
            Routing.id == routing_id,
            Routing.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not routing:
        raise HTTPException(404, "Không tìm thấy quy trình")

    # Get steps
    steps = session.exec(
        select(RoutingStep).where(RoutingStep.routing_id == routing_id)
        .order_by(RoutingStep.step_number)
    ).all()

    return {
        **routing.model_dump(),
        "steps": [step.model_dump() for step in steps],
    }


@router.put("/{routing_id}")
async def update_routing(
    routing_id: str,
    data: RoutingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật quy trình"""
    routing = session.exec(
        select(Routing).where(
            Routing.id == routing_id,
            Routing.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not routing:
        raise HTTPException(404, "Không tìm thấy quy trình")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(routing, key, value)

    session.add(routing)
    session.commit()
    session.refresh(routing)

    return routing


@router.delete("/{routing_id}")
async def delete_routing(
    routing_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa quy trình"""
    routing = session.exec(
        select(Routing).where(
            Routing.id == routing_id,
            Routing.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not routing:
        raise HTTPException(404, "Không tìm thấy quy trình")

    # Delete steps
    steps = session.exec(select(RoutingStep).where(RoutingStep.routing_id == routing_id)).all()
    for step in steps:
        session.delete(step)

    session.delete(routing)
    session.commit()

    return {"message": "Đã xóa quy trình"}


# ============== Routing Step Endpoints ==============
@router.post("/{routing_id}/steps")
async def add_routing_step(
    routing_id: str,
    data: RoutingStepCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Thêm công đoạn vào quy trình"""
    routing = session.exec(
        select(Routing).where(
            Routing.id == routing_id,
            Routing.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not routing:
        raise HTTPException(404, "Không tìm thấy quy trình")

    step = RoutingStep(
        tenant_id=current_user.tenant_id,
        routing_id=routing_id,
        **data.model_dump()
    )
    session.add(step)

    # Update routing totals
    routing.total_time_minutes += step.setup_time + step.run_time + step.wait_time + step.move_time
    routing.total_setup_time += step.setup_time
    routing.total_cost += step.labor_cost + step.machine_cost + step.overhead_cost
    session.add(routing)

    session.commit()
    session.refresh(step)

    return step


@router.delete("/{routing_id}/steps/{step_id}")
async def delete_routing_step(
    routing_id: str,
    step_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa công đoạn khỏi quy trình"""
    step = session.exec(
        select(RoutingStep).where(
            RoutingStep.id == step_id,
            RoutingStep.routing_id == routing_id,
            RoutingStep.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not step:
        raise HTTPException(404, "Không tìm thấy công đoạn")

    # Update routing totals
    routing = session.exec(select(Routing).where(Routing.id == routing_id)).first()
    if routing:
        routing.total_time_minutes -= (step.setup_time + step.run_time + step.wait_time + step.move_time)
        routing.total_setup_time -= step.setup_time
        routing.total_cost -= (step.labor_cost + step.machine_cost + step.overhead_cost)
        session.add(routing)

    session.delete(step)
    session.commit()

    return {"message": "Đã xóa công đoạn"}
