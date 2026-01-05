"""
Dispatcher Orders API

API cho Dispatcher quản lý đơn hàng riêng.
Dispatcher tạo đơn và giao cho Driver trong mạng lưới.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, and_, func

from app.db.session import get_session
from app.models.worker import Worker
from app.models.worker_connection import WorkerConnection, ConnectionStatus
from app.models.dispatcher_order import (
    DispatcherOrder, DispatcherOrderStatus, PaymentStatus,
    DispatcherOrderSequence,
)
from app.api.v1.routes.worker_auth import get_current_worker

router = APIRouter(prefix="/dispatcher-orders", tags=["Dispatcher Orders"])


# ==================== SCHEMAS ====================

class DispatcherOrderCreate(BaseModel):
    """Tạo đơn hàng mới"""
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_company: Optional[str] = None

    pickup_address: Optional[str] = None
    pickup_contact: Optional[str] = None
    pickup_phone: Optional[str] = None
    pickup_time: Optional[str] = None

    delivery_address: Optional[str] = None
    delivery_contact: Optional[str] = None
    delivery_phone: Optional[str] = None
    delivery_time: Optional[str] = None

    equipment: Optional[str] = None
    container_code: Optional[str] = None
    cargo_description: Optional[str] = None
    weight_kg: Optional[float] = None

    freight_charge: Optional[float] = None
    driver_payment: Optional[float] = None

    dispatcher_notes: Optional[str] = None


class AssignDriverRequest(BaseModel):
    """Giao đơn cho driver"""
    driver_id: str
    driver_payment: Optional[float] = None


class UpdateOrderStatusRequest(BaseModel):
    """Cập nhật trạng thái"""
    notes: Optional[str] = None


class MarkAsPaidRequest(BaseModel):
    """Đánh dấu đã thanh toán"""
    paid_at: Optional[str] = None


# ==================== HELPERS ====================

def get_worker_summary(worker: Worker) -> dict:
    """Trả về thông tin tóm tắt của worker"""
    return {
        "id": worker.id,
        "username": worker.username,
        "full_name": worker.full_name,
        "avatar_url": worker.avatar_url,
        "phone": worker.phone,
    }


def format_order(order: DispatcherOrder, dispatcher: Worker, driver: Optional[Worker]) -> dict:
    """Format order response"""
    return {
        "id": order.id,
        "order_code": order.order_code,
        "status": order.status,

        "dispatcher": get_worker_summary(dispatcher),
        "driver": get_worker_summary(driver) if driver else None,

        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "customer_company": order.customer_company,

        "pickup_address": order.pickup_address,
        "pickup_contact": order.pickup_contact,
        "pickup_phone": order.pickup_phone,
        "pickup_time": order.pickup_time,

        "delivery_address": order.delivery_address,
        "delivery_contact": order.delivery_contact,
        "delivery_phone": order.delivery_phone,
        "delivery_time": order.delivery_time,

        "equipment": order.equipment,
        "container_code": order.container_code,
        "cargo_description": order.cargo_description,
        "weight_kg": order.weight_kg,

        "freight_charge": order.freight_charge,
        "driver_payment": order.driver_payment,
        "payment_status": order.payment_status,
        "paid_at": order.paid_at,

        "dispatcher_notes": order.dispatcher_notes,
        "driver_notes": order.driver_notes,

        "assigned_at": order.assigned_at,
        "accepted_at": order.accepted_at,
        "started_at": order.started_at,
        "completed_at": order.completed_at,

        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


def generate_order_code(session: Session, dispatcher_id: str) -> str:
    """Tạo mã đơn hàng cho dispatcher"""
    seq = session.exec(
        select(DispatcherOrderSequence).where(
            DispatcherOrderSequence.dispatcher_id == dispatcher_id
        )
    ).first()

    if not seq:
        seq = DispatcherOrderSequence(dispatcher_id=dispatcher_id, last_seq=0)
        session.add(seq)

    seq.last_seq += 1
    session.add(seq)

    return f"{seq.prefix}-{seq.last_seq:04d}"


# ==================== DISPATCHER ENDPOINTS ====================

@router.post("")
def create_dispatcher_order(
    data: DispatcherOrderCreate,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Tạo đơn hàng mới (chỉ Dispatcher).
    """
    order_code = generate_order_code(session, worker.id)

    order = DispatcherOrder(
        dispatcher_id=worker.id,
        order_code=order_code,
        status=DispatcherOrderStatus.DRAFT.value,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_company=data.customer_company,
        pickup_address=data.pickup_address,
        pickup_contact=data.pickup_contact,
        pickup_phone=data.pickup_phone,
        pickup_time=data.pickup_time,
        delivery_address=data.delivery_address,
        delivery_contact=data.delivery_contact,
        delivery_phone=data.delivery_phone,
        delivery_time=data.delivery_time,
        equipment=data.equipment,
        container_code=data.container_code,
        cargo_description=data.cargo_description,
        weight_kg=data.weight_kg,
        freight_charge=data.freight_charge,
        driver_payment=data.driver_payment,
        dispatcher_notes=data.dispatcher_notes,
    )

    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "message": f"Đã tạo đơn hàng {order_code}",
        "order": format_order(order, worker, None),
    }


@router.get("")
def list_dispatcher_orders(
    status: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Danh sách đơn hàng của Dispatcher.
    """
    query = select(DispatcherOrder).where(
        DispatcherOrder.dispatcher_id == worker.id
    )

    if status:
        query = query.where(DispatcherOrder.status == status)
    if driver_id:
        query = query.where(DispatcherOrder.driver_id == driver_id)
    if payment_status:
        query = query.where(DispatcherOrder.payment_status == payment_status)

    # Count total
    total = len(session.exec(query).all())

    # Paginate
    query = query.order_by(DispatcherOrder.created_at.desc()).offset(offset).limit(limit)
    orders = session.exec(query).all()

    result = []
    for order in orders:
        driver = session.get(Worker, order.driver_id) if order.driver_id else None
        result.append(format_order(order, worker, driver))

    return {"orders": result, "total": total}


@router.get("/{order_id}")
def get_dispatcher_order(
    order_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Chi tiết đơn hàng.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    # Cho phép cả dispatcher và driver xem
    if order.dispatcher_id != worker.id and order.driver_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền xem đơn hàng này")

    dispatcher = session.get(Worker, order.dispatcher_id)
    driver = session.get(Worker, order.driver_id) if order.driver_id else None

    return format_order(order, dispatcher, driver)


@router.patch("/{order_id}")
def update_dispatcher_order(
    order_id: str,
    data: DispatcherOrderCreate,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Cập nhật đơn hàng (chỉ khi DRAFT hoặc PENDING).
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.dispatcher_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền sửa đơn hàng này")

    if order.status not in [DispatcherOrderStatus.DRAFT.value, DispatcherOrderStatus.PENDING.value]:
        raise HTTPException(400, "Không thể sửa đơn hàng đã được xử lý")

    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(order, field, value)

    session.add(order)
    session.commit()
    session.refresh(order)

    driver = session.get(Worker, order.driver_id) if order.driver_id else None
    return {
        "message": "Đã cập nhật đơn hàng",
        "order": format_order(order, worker, driver),
    }


@router.post("/{order_id}/assign")
def assign_order_to_driver(
    order_id: str,
    data: AssignDriverRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Giao đơn cho Driver.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.dispatcher_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền giao đơn hàng này")

    if order.status not in [DispatcherOrderStatus.DRAFT.value, DispatcherOrderStatus.PENDING.value]:
        raise HTTPException(400, "Đơn hàng đã được giao hoặc đang xử lý")

    # Kiểm tra driver có trong mạng lưới không
    connection = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.dispatcher_id == worker.id,
                WorkerConnection.driver_id == data.driver_id,
                WorkerConnection.status == ConnectionStatus.ACCEPTED.value,
            )
        )
    ).first()

    if not connection:
        raise HTTPException(400, "Tài xế không có trong mạng lưới của bạn")

    driver = session.get(Worker, data.driver_id)
    if not driver:
        raise HTTPException(404, "Không tìm thấy tài xế")

    order.driver_id = data.driver_id
    order.connection_id = connection.id
    order.status = DispatcherOrderStatus.PENDING.value
    order.assigned_at = datetime.utcnow().isoformat()

    if data.driver_payment is not None:
        order.driver_payment = data.driver_payment
    elif connection.default_payment_per_order:
        order.driver_payment = connection.default_payment_per_order

    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "message": f"Đã giao đơn cho {driver.full_name or driver.username}",
        "order": format_order(order, worker, driver),
    }


@router.post("/{order_id}/unassign")
def unassign_order(
    order_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Hủy giao đơn (chỉ khi PENDING).
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.dispatcher_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền hủy giao đơn hàng này")

    if order.status != DispatcherOrderStatus.PENDING.value:
        raise HTTPException(400, "Chỉ có thể hủy giao khi đơn đang chờ xác nhận")

    order.driver_id = None
    order.connection_id = None
    order.status = DispatcherOrderStatus.DRAFT.value
    order.assigned_at = None

    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "message": "Đã hủy giao đơn",
        "order": format_order(order, worker, None),
    }


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Hủy đơn hàng.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.dispatcher_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền hủy đơn hàng này")

    if order.status in [DispatcherOrderStatus.COMPLETED.value, DispatcherOrderStatus.CANCELLED.value]:
        raise HTTPException(400, "Đơn hàng đã hoàn thành hoặc đã hủy")

    order.status = DispatcherOrderStatus.CANCELLED.value
    session.add(order)
    session.commit()

    return {"message": "Đã hủy đơn hàng"}


@router.post("/{order_id}/mark-paid")
def mark_driver_paid(
    order_id: str,
    data: MarkAsPaidRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Đánh dấu đã thanh toán cho Driver.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.dispatcher_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền thao tác đơn hàng này")

    if order.status not in [DispatcherOrderStatus.DELIVERED.value, DispatcherOrderStatus.COMPLETED.value]:
        raise HTTPException(400, "Đơn hàng chưa hoàn thành")

    if order.payment_status == PaymentStatus.PAID.value:
        raise HTTPException(400, "Đơn hàng đã được thanh toán")

    order.payment_status = PaymentStatus.PAID.value
    order.paid_at = data.paid_at or datetime.utcnow().isoformat()

    # Cập nhật thống kê connection
    if order.connection_id:
        connection = session.get(WorkerConnection, order.connection_id)
        if connection and order.driver_payment:
            connection.total_amount_paid += order.driver_payment
            connection.total_amount_pending -= order.driver_payment
            session.add(connection)

    session.add(order)
    session.commit()

    driver = session.get(Worker, order.driver_id) if order.driver_id else None
    return {
        "message": "Đã thanh toán cho tài xế",
        "order": format_order(order, worker, driver),
    }


# ==================== DRIVER ENDPOINTS ====================

@router.get("/assigned-to-me")
def list_orders_assigned_to_me(
    status: Optional[str] = Query(None),
    dispatcher_id: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Danh sách đơn hàng được giao cho Driver từ các Dispatcher.
    """
    query = select(DispatcherOrder).where(
        DispatcherOrder.driver_id == worker.id
    )

    if status:
        query = query.where(DispatcherOrder.status == status)
    if dispatcher_id:
        query = query.where(DispatcherOrder.dispatcher_id == dispatcher_id)

    # Exclude DRAFT (chưa giao)
    query = query.where(DispatcherOrder.status != DispatcherOrderStatus.DRAFT.value)

    total = len(session.exec(query).all())

    query = query.order_by(DispatcherOrder.assigned_at.desc()).offset(offset).limit(limit)
    orders = session.exec(query).all()

    result = []
    for order in orders:
        dispatcher = session.get(Worker, order.dispatcher_id)
        result.append(format_order(order, dispatcher, worker))

    return {"orders": result, "total": total}


@router.post("/{order_id}/accept")
def accept_assigned_order(
    order_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Driver nhận đơn hàng.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.driver_id != worker.id:
        raise HTTPException(403, "Đơn hàng không được giao cho bạn")

    if order.status != DispatcherOrderStatus.PENDING.value:
        raise HTTPException(400, "Đơn hàng không ở trạng thái chờ xác nhận")

    order.status = DispatcherOrderStatus.ACCEPTED.value
    order.accepted_at = datetime.utcnow().isoformat()

    session.add(order)
    session.commit()
    session.refresh(order)

    dispatcher = session.get(Worker, order.dispatcher_id)
    return {
        "message": "Đã nhận đơn hàng",
        "order": format_order(order, dispatcher, worker),
    }


@router.post("/{order_id}/decline")
def decline_assigned_order(
    order_id: str,
    data: UpdateOrderStatusRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Driver từ chối đơn hàng.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.driver_id != worker.id:
        raise HTTPException(403, "Đơn hàng không được giao cho bạn")

    if order.status != DispatcherOrderStatus.PENDING.value:
        raise HTTPException(400, "Không thể từ chối đơn hàng ở trạng thái này")

    # Reset về DRAFT cho dispatcher
    order.driver_id = None
    order.connection_id = None
    order.status = DispatcherOrderStatus.DRAFT.value
    order.assigned_at = None
    if data.notes:
        order.driver_notes = data.notes

    session.add(order)
    session.commit()

    return {"message": "Đã từ chối đơn hàng"}


@router.post("/{order_id}/start")
def start_order(
    order_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Driver bắt đầu thực hiện đơn hàng.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.driver_id != worker.id:
        raise HTTPException(403, "Đơn hàng không được giao cho bạn")

    if order.status != DispatcherOrderStatus.ACCEPTED.value:
        raise HTTPException(400, "Đơn hàng chưa được xác nhận")

    order.status = DispatcherOrderStatus.IN_TRANSIT.value
    order.started_at = datetime.utcnow().isoformat()

    session.add(order)
    session.commit()
    session.refresh(order)

    dispatcher = session.get(Worker, order.dispatcher_id)
    return {
        "message": "Đã bắt đầu thực hiện đơn hàng",
        "order": format_order(order, dispatcher, worker),
    }


@router.post("/{order_id}/deliver")
def deliver_order(
    order_id: str,
    data: UpdateOrderStatusRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Driver đánh dấu đã giao hàng.
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.driver_id != worker.id:
        raise HTTPException(403, "Đơn hàng không được giao cho bạn")

    if order.status != DispatcherOrderStatus.IN_TRANSIT.value:
        raise HTTPException(400, "Đơn hàng chưa bắt đầu vận chuyển")

    order.status = DispatcherOrderStatus.DELIVERED.value
    order.completed_at = datetime.utcnow().isoformat()
    if data.notes:
        order.driver_notes = data.notes

    # Cập nhật thống kê connection
    if order.connection_id:
        connection = session.get(WorkerConnection, order.connection_id)
        if connection:
            connection.total_orders_completed += 1
            if order.driver_payment:
                connection.total_amount_pending += order.driver_payment
            session.add(connection)

    session.add(order)
    session.commit()
    session.refresh(order)

    dispatcher = session.get(Worker, order.dispatcher_id)
    return {
        "message": "Đã giao hàng thành công",
        "order": format_order(order, dispatcher, worker),
    }


@router.post("/{order_id}/complete")
def complete_order(
    order_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Dispatcher đánh dấu hoàn thành (sau khi đã giao).
    """
    order = session.get(DispatcherOrder, order_id)
    if not order:
        raise HTTPException(404, "Không tìm thấy đơn hàng")

    if order.dispatcher_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền thao tác đơn hàng này")

    if order.status != DispatcherOrderStatus.DELIVERED.value:
        raise HTTPException(400, "Đơn hàng chưa được giao")

    order.status = DispatcherOrderStatus.COMPLETED.value
    session.add(order)
    session.commit()

    driver = session.get(Worker, order.driver_id) if order.driver_id else None
    return {
        "message": "Đã hoàn thành đơn hàng",
        "order": format_order(order, worker, driver),
    }


# ==================== PAYMENT SUMMARY ====================

@router.get("/payment-summary")
def get_payment_summary(
    driver_id: Optional[str] = Query(None, description="Filter by driver (for dispatcher)"),
    dispatcher_id: Optional[str] = Query(None, description="Filter by dispatcher (for driver)"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Tổng hợp thanh toán.
    """
    # Xác định role
    is_dispatcher = driver_id is not None or dispatcher_id is None
    is_driver = dispatcher_id is not None

    if is_dispatcher and driver_id is None:
        # Dispatcher xem tổng hợp tất cả
        orders = session.exec(
            select(DispatcherOrder).where(
                and_(
                    DispatcherOrder.dispatcher_id == worker.id,
                    DispatcherOrder.status.in_([
                        DispatcherOrderStatus.DELIVERED.value,
                        DispatcherOrderStatus.COMPLETED.value,
                    ])
                )
            )
        ).all()
    elif is_dispatcher:
        # Dispatcher xem theo driver cụ thể
        orders = session.exec(
            select(DispatcherOrder).where(
                and_(
                    DispatcherOrder.dispatcher_id == worker.id,
                    DispatcherOrder.driver_id == driver_id,
                    DispatcherOrder.status.in_([
                        DispatcherOrderStatus.DELIVERED.value,
                        DispatcherOrderStatus.COMPLETED.value,
                    ])
                )
            )
        ).all()
    else:
        # Driver xem theo dispatcher cụ thể
        orders = session.exec(
            select(DispatcherOrder).where(
                and_(
                    DispatcherOrder.driver_id == worker.id,
                    DispatcherOrder.dispatcher_id == dispatcher_id,
                    DispatcherOrder.status.in_([
                        DispatcherOrderStatus.DELIVERED.value,
                        DispatcherOrderStatus.COMPLETED.value,
                    ])
                )
            )
        ).all()

    total_orders = len(orders)
    total_revenue = sum(o.freight_charge or 0 for o in orders)
    total_driver_payment = sum(o.driver_payment or 0 for o in orders)
    total_paid = sum(o.driver_payment or 0 for o in orders if o.payment_status == PaymentStatus.PAID.value)
    total_pending = total_driver_payment - total_paid

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_driver_payment": total_driver_payment,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "profit": total_revenue - total_driver_payment,
    }
