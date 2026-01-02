"""
Production Order API Routes
Lệnh sản xuất
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_session
from app.core.security import get_current_user
from app.models import User
from app.models.mes import (
    ProductionOrder, ProductionOrderLine, ProductionOrderStatus, ProductionOrderType,
    WorkOrder, WorkOrderStatus, WorkOrderType
)

router = APIRouter()


# ============== Schemas ==============
class ProductionOrderLineCreate(BaseModel):
    component_id: str
    component_code: Optional[str] = None
    component_name: Optional[str] = None
    required_quantity: Decimal = Decimal("1")
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    bom_line_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    location_id: Optional[str] = None
    lot_id: Optional[str] = None
    lot_number: Optional[str] = None
    unit_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


class ProductionOrderCreate(BaseModel):
    order_number: Optional[str] = None
    order_date: Optional[date] = None
    description: Optional[str] = None
    order_type: ProductionOrderType = ProductionOrderType.STANDARD
    priority: int = 5
    product_id: str
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    bom_id: Optional[str] = None
    routing_id: Optional[str] = None
    planned_quantity: Decimal = Decimal("1")
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    source_number: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    output_warehouse_id: Optional[str] = None
    output_location_id: Optional[str] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    notes: Optional[str] = None
    lines: Optional[List[ProductionOrderLineCreate]] = None


class ProductionOrderUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[int] = None
    planned_quantity: Optional[Decimal] = None
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    warehouse_id: Optional[str] = None
    output_warehouse_id: Optional[str] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    notes: Optional[str] = None


# ============== Helper Functions ==============
async def generate_order_number(session: Session, tenant_id: str) -> str:
    """Tạo số lệnh sản xuất tự động"""
    today = date.today()
    prefix = f"MO{today.strftime('%y%m')}"

    count = session.exec(
        select(func.count()).where(
            ProductionOrder.tenant_id == tenant_id,
            ProductionOrder.order_number.like(f"{prefix}%")
        )
    ).one()

    return f"{prefix}{str(count + 1).zfill(4)}"


# ============== Endpoints ==============
@router.get("")
async def list_production_orders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[ProductionOrderStatus] = None,
    order_type: Optional[ProductionOrderType] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Danh sách lệnh sản xuất"""
    query = select(ProductionOrder).where(
        ProductionOrder.tenant_id == current_user.tenant_id
    )

    if status:
        query = query.where(ProductionOrder.status == status)
    if order_type:
        query = query.where(ProductionOrder.order_type == order_type)
    if product_id:
        query = query.where(ProductionOrder.product_id == product_id)
    if search:
        query = query.where(
            (ProductionOrder.order_number.ilike(f"%{search}%")) |
            (ProductionOrder.product_code.ilike(f"%{search}%")) |
            (ProductionOrder.product_name.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    query = query.order_by(ProductionOrder.created_at.desc())
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
async def create_production_order(
    data: ProductionOrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Tạo lệnh sản xuất mới"""
    order_number = data.order_number
    if not order_number:
        order_number = await generate_order_number(session, current_user.tenant_id)

    order = ProductionOrder(
        tenant_id=current_user.tenant_id,
        order_number=order_number,
        order_date=data.order_date or date.today(),
        created_by=str(current_user.id),
        **data.model_dump(exclude={"order_number", "order_date", "lines"})
    )
    session.add(order)
    session.flush()

    # Add lines
    total_cost = Decimal("0")
    if data.lines:
        for i, line_data in enumerate(data.lines, 1):
            line = ProductionOrderLine(
                tenant_id=current_user.tenant_id,
                production_order_id=order.id,
                line_number=i,
                total_cost=line_data.required_quantity * line_data.unit_cost,
                **line_data.model_dump()
            )
            total_cost += line.total_cost
            session.add(line)

    order.planned_cost = total_cost
    session.commit()
    session.refresh(order)

    return order


@router.get("/{order_id}")
async def get_production_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết lệnh sản xuất"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    # Get lines
    lines = session.exec(
        select(ProductionOrderLine).where(ProductionOrderLine.production_order_id == order_id)
        .order_by(ProductionOrderLine.line_number)
    ).all()

    # Get work orders
    work_orders = session.exec(
        select(WorkOrder).where(WorkOrder.production_order_id == order_id)
        .order_by(WorkOrder.step_number)
    ).all()

    return {
        **order.model_dump(),
        "lines": [line.model_dump() for line in lines],
        "work_orders": [wo.model_dump() for wo in work_orders],
    }


@router.put("/{order_id}")
async def update_production_order(
    order_id: str,
    data: ProductionOrderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật lệnh sản xuất"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status not in [ProductionOrderStatus.DRAFT, ProductionOrderStatus.PLANNED]:
        raise HTTPException(400, "Không thể sửa lệnh sản xuất đã phát hành")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(order, key, value)

    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.post("/{order_id}/confirm")
async def confirm_production_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xác nhận lệnh sản xuất"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status != ProductionOrderStatus.DRAFT:
        raise HTTPException(400, "Chỉ có thể xác nhận lệnh ở trạng thái bản nháp")

    order.status = ProductionOrderStatus.CONFIRMED
    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.post("/{order_id}/release")
async def release_production_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Phát hành lệnh sản xuất (bắt đầu sản xuất)"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status not in [ProductionOrderStatus.CONFIRMED, ProductionOrderStatus.PLANNED]:
        raise HTTPException(400, "Chỉ có thể phát hành lệnh đã xác nhận")

    order.status = ProductionOrderStatus.RELEASED
    order.released_by = str(current_user.id)
    order.released_at = datetime.utcnow()
    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.post("/{order_id}/start")
async def start_production_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bắt đầu sản xuất"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status != ProductionOrderStatus.RELEASED:
        raise HTTPException(400, "Chỉ có thể bắt đầu lệnh đã phát hành")

    order.status = ProductionOrderStatus.IN_PROGRESS
    order.actual_start_date = datetime.utcnow()
    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.post("/{order_id}/complete")
async def complete_production_order(
    order_id: str,
    completed_quantity: Decimal,
    scrapped_quantity: Decimal = Decimal("0"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hoàn thành lệnh sản xuất"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status != ProductionOrderStatus.IN_PROGRESS:
        raise HTTPException(400, "Chỉ có thể hoàn thành lệnh đang sản xuất")

    order.status = ProductionOrderStatus.COMPLETED
    order.completed_quantity = completed_quantity
    order.scrapped_quantity = scrapped_quantity
    order.actual_end_date = datetime.utcnow()
    order.completed_by = str(current_user.id)
    order.completed_at = datetime.utcnow()
    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.post("/{order_id}/cancel")
async def cancel_production_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Hủy lệnh sản xuất"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status in [ProductionOrderStatus.COMPLETED, ProductionOrderStatus.CLOSED]:
        raise HTTPException(400, "Không thể hủy lệnh đã hoàn thành")

    order.status = ProductionOrderStatus.CANCELLED
    session.add(order)
    session.commit()
    session.refresh(order)

    return order


@router.delete("/{order_id}")
async def delete_production_order(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Xóa lệnh sản xuất (chỉ bản nháp)"""
    order = session.exec(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not order:
        raise HTTPException(404, "Không tìm thấy lệnh sản xuất")

    if order.status != ProductionOrderStatus.DRAFT:
        raise HTTPException(400, "Chỉ có thể xóa lệnh ở trạng thái bản nháp")

    # Delete lines
    lines = session.exec(
        select(ProductionOrderLine).where(ProductionOrderLine.production_order_id == order_id)
    ).all()
    for line in lines:
        session.delete(line)

    # Delete work orders
    work_orders = session.exec(
        select(WorkOrder).where(WorkOrder.production_order_id == order_id)
    ).all()
    for wo in work_orders:
        session.delete(wo)

    session.delete(order)
    session.commit()

    return {"message": "Đã xóa lệnh sản xuất"}
