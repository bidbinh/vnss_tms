"""
Worker Connections API

API cho việc kết nối giữa Dispatcher và Driver.
Cho phép:
- Dispatcher mời Driver vào mạng lưới
- Driver xin gia nhập mạng lưới của Dispatcher
- Quản lý kết nối và cài đặt thanh toán
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, and_, or_

from app.db.session import get_session
from app.models.worker import Worker
from app.models.worker_connection import (
    WorkerConnection, ConnectionStatus, ConnectionInitiator,
)
from app.api.v1.routes.worker_auth import get_current_worker

router = APIRouter(prefix="/worker-connections", tags=["Worker Connections"])


# ==================== SCHEMAS ====================

class SendConnectionRequest(BaseModel):
    """Gửi lời mời kết nối"""
    target_worker_id: Optional[str] = None    # ID của worker muốn kết nối
    target_username: Optional[str] = None     # Hoặc username
    message: Optional[str] = None
    enable_payment_tracking: bool = False
    default_payment_per_order: Optional[float] = None


class RespondConnectionRequest(BaseModel):
    """Phản hồi lời mời"""
    accept: bool
    decline_reason: Optional[str] = None


class UpdateConnectionSettings(BaseModel):
    """Cập nhật cài đặt kết nối"""
    enable_payment_tracking: Optional[bool] = None
    default_payment_per_order: Optional[float] = None


# ==================== HELPER ====================

def get_worker_summary(worker: Worker) -> dict:
    """Trả về thông tin tóm tắt của worker"""
    return {
        "id": worker.id,
        "username": worker.username,
        "full_name": worker.full_name,
        "avatar_url": worker.avatar_url,
        "phone": worker.phone,
        "job_title": worker.job_title,
        "license_class": worker.license_class,
        "city": worker.city,
        "is_available": worker.is_available,
    }


def format_connection(conn: WorkerConnection, dispatcher: Worker, driver: Worker) -> dict:
    """Format connection response"""
    return {
        "id": conn.id,
        "dispatcher": get_worker_summary(dispatcher),
        "driver": get_worker_summary(driver),
        "initiated_by": conn.initiated_by,
        "status": conn.status,
        "message": conn.message,
        "enable_payment_tracking": conn.enable_payment_tracking,
        "default_payment_per_order": conn.default_payment_per_order,
        "total_orders_completed": conn.total_orders_completed,
        "total_amount_paid": conn.total_amount_paid,
        "total_amount_pending": conn.total_amount_pending,
        "rating": conn.rating,
        "responded_at": conn.responded_at,
        "created_at": conn.created_at.isoformat() if conn.created_at else None,
    }


# ==================== DISPATCHER ENDPOINTS ====================

@router.post("/invite-driver")
def invite_driver_to_network(
    data: SendConnectionRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Dispatcher mời một Driver vào mạng lưới.

    Dispatcher có thể mời bằng worker_id hoặc username.
    """
    # Tìm driver
    target = None
    if data.target_worker_id:
        target = session.get(Worker, data.target_worker_id)
    elif data.target_username:
        target = session.exec(
            select(Worker).where(Worker.username == data.target_username.lower())
        ).first()

    if not target:
        raise HTTPException(404, "Không tìm thấy tài xế")

    if target.id == worker.id:
        raise HTTPException(400, "Không thể tự kết nối với chính mình")

    # Kiểm tra đã có kết nối chưa
    existing = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.dispatcher_id == worker.id,
                WorkerConnection.driver_id == target.id,
            )
        )
    ).first()

    if existing:
        if existing.status == ConnectionStatus.ACCEPTED.value:
            raise HTTPException(400, "Đã kết nối với tài xế này")
        if existing.status == ConnectionStatus.PENDING.value:
            raise HTTPException(400, "Đã gửi lời mời cho tài xế này")
        if existing.status == ConnectionStatus.BLOCKED.value:
            raise HTTPException(400, "Kết nối đã bị chặn")
        # Nếu DECLINED, cho phép gửi lại
        existing.status = ConnectionStatus.PENDING.value
        existing.initiated_by = ConnectionInitiator.DISPATCHER.value
        existing.message = data.message
        existing.responded_at = None
        existing.decline_reason = None
        existing.enable_payment_tracking = data.enable_payment_tracking
        existing.default_payment_per_order = data.default_payment_per_order
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return {
            "message": f"Đã gửi lại lời mời cho {target.full_name or target.username}",
            "connection": format_connection(existing, worker, target),
        }

    # Tạo kết nối mới
    connection = WorkerConnection(
        dispatcher_id=worker.id,
        driver_id=target.id,
        initiated_by=ConnectionInitiator.DISPATCHER.value,
        status=ConnectionStatus.PENDING.value,
        message=data.message,
        enable_payment_tracking=data.enable_payment_tracking,
        default_payment_per_order=data.default_payment_per_order,
    )

    session.add(connection)
    session.commit()
    session.refresh(connection)

    return {
        "message": f"Đã gửi lời mời cho {target.full_name or target.username}",
        "connection": format_connection(connection, worker, target),
    }


@router.get("/my-drivers")
def list_my_connected_drivers(
    status: Optional[str] = Query(None, description="Filter by status: ACCEPTED, PENDING"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Danh sách các Driver đã kết nối với Dispatcher này.
    """
    query = select(WorkerConnection).where(
        WorkerConnection.dispatcher_id == worker.id
    )

    if status:
        query = query.where(WorkerConnection.status == status)
    else:
        # Mặc định chỉ hiển thị ACCEPTED
        query = query.where(WorkerConnection.status == ConnectionStatus.ACCEPTED.value)

    query = query.order_by(WorkerConnection.created_at.desc())
    connections = session.exec(query).all()

    result = []
    for conn in connections:
        driver = session.get(Worker, conn.driver_id)
        if driver:
            result.append(format_connection(conn, worker, driver))

    return {"connections": result, "total": len(result)}


@router.get("/pending-driver-requests")
def list_pending_driver_requests(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Danh sách các Driver đang xin gia nhập mạng lưới của Dispatcher này.
    (Driver khởi tạo, chờ Dispatcher chấp nhận)
    """
    connections = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.dispatcher_id == worker.id,
                WorkerConnection.initiated_by == ConnectionInitiator.DRIVER.value,
                WorkerConnection.status == ConnectionStatus.PENDING.value,
            )
        ).order_by(WorkerConnection.created_at.desc())
    ).all()

    result = []
    for conn in connections:
        driver = session.get(Worker, conn.driver_id)
        if driver:
            result.append(format_connection(conn, worker, driver))

    return {"requests": result, "total": len(result)}


# ==================== DRIVER ENDPOINTS ====================

@router.post("/request-join")
def request_to_join_dispatcher(
    data: SendConnectionRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Driver xin gia nhập mạng lưới của một Dispatcher.
    """
    # Tìm dispatcher
    target = None
    if data.target_worker_id:
        target = session.get(Worker, data.target_worker_id)
    elif data.target_username:
        target = session.exec(
            select(Worker).where(Worker.username == data.target_username.lower())
        ).first()

    if not target:
        raise HTTPException(404, "Không tìm thấy điều phối viên")

    if target.id == worker.id:
        raise HTTPException(400, "Không thể tự kết nối với chính mình")

    # Kiểm tra đã có kết nối chưa
    existing = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.dispatcher_id == target.id,
                WorkerConnection.driver_id == worker.id,
            )
        )
    ).first()

    if existing:
        if existing.status == ConnectionStatus.ACCEPTED.value:
            raise HTTPException(400, "Đã kết nối với điều phối viên này")
        if existing.status == ConnectionStatus.PENDING.value:
            raise HTTPException(400, "Đã có yêu cầu đang chờ xử lý")
        if existing.status == ConnectionStatus.BLOCKED.value:
            raise HTTPException(400, "Kết nối đã bị chặn")
        # Nếu DECLINED, cho phép gửi lại
        existing.status = ConnectionStatus.PENDING.value
        existing.initiated_by = ConnectionInitiator.DRIVER.value
        existing.message = data.message
        existing.responded_at = None
        existing.decline_reason = None
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return {
            "message": f"Đã gửi lại yêu cầu cho {target.full_name or target.username}",
            "connection": format_connection(existing, target, worker),
        }

    # Tạo kết nối mới
    connection = WorkerConnection(
        dispatcher_id=target.id,
        driver_id=worker.id,
        initiated_by=ConnectionInitiator.DRIVER.value,
        status=ConnectionStatus.PENDING.value,
        message=data.message,
    )

    session.add(connection)
    session.commit()
    session.refresh(connection)

    return {
        "message": f"Đã gửi yêu cầu cho {target.full_name or target.username}",
        "connection": format_connection(connection, target, worker),
    }


@router.get("/my-dispatchers")
def list_my_dispatchers(
    status: Optional[str] = Query(None, description="Filter by status: ACCEPTED, PENDING"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Danh sách các Dispatcher mà Driver này đã kết nối.
    """
    query = select(WorkerConnection).where(
        WorkerConnection.driver_id == worker.id
    )

    if status:
        query = query.where(WorkerConnection.status == status)
    else:
        query = query.where(WorkerConnection.status == ConnectionStatus.ACCEPTED.value)

    query = query.order_by(WorkerConnection.created_at.desc())
    connections = session.exec(query).all()

    result = []
    for conn in connections:
        dispatcher = session.get(Worker, conn.dispatcher_id)
        if dispatcher:
            result.append(format_connection(conn, dispatcher, worker))

    return {"connections": result, "total": len(result)}


@router.get("/pending-invitations")
def list_pending_dispatcher_invitations(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Danh sách lời mời từ các Dispatcher đang chờ Driver chấp nhận.
    (Dispatcher khởi tạo, chờ Driver chấp nhận)
    """
    connections = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.driver_id == worker.id,
                WorkerConnection.initiated_by == ConnectionInitiator.DISPATCHER.value,
                WorkerConnection.status == ConnectionStatus.PENDING.value,
            )
        ).order_by(WorkerConnection.created_at.desc())
    ).all()

    result = []
    for conn in connections:
        dispatcher = session.get(Worker, conn.dispatcher_id)
        if dispatcher:
            result.append(format_connection(conn, dispatcher, worker))

    return {"invitations": result, "total": len(result)}


# ==================== RESPOND TO CONNECTION ====================

@router.post("/{connection_id}/respond")
def respond_to_connection(
    connection_id: str,
    data: RespondConnectionRequest,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Phản hồi lời mời/yêu cầu kết nối.

    - Nếu Dispatcher gửi, Driver phản hồi
    - Nếu Driver gửi, Dispatcher phản hồi
    """
    connection = session.get(WorkerConnection, connection_id)
    if not connection:
        raise HTTPException(404, "Không tìm thấy kết nối")

    if connection.status != ConnectionStatus.PENDING.value:
        raise HTTPException(400, "Kết nối đã được xử lý")

    # Xác định ai có quyền phản hồi
    is_dispatcher = connection.dispatcher_id == worker.id
    is_driver = connection.driver_id == worker.id

    if connection.initiated_by == ConnectionInitiator.DISPATCHER.value:
        # Dispatcher gửi -> Driver phản hồi
        if not is_driver:
            raise HTTPException(403, "Bạn không có quyền phản hồi lời mời này")
    else:
        # Driver gửi -> Dispatcher phản hồi
        if not is_dispatcher:
            raise HTTPException(403, "Bạn không có quyền phản hồi yêu cầu này")

    if data.accept:
        connection.status = ConnectionStatus.ACCEPTED.value
    else:
        connection.status = ConnectionStatus.DECLINED.value
        connection.decline_reason = data.decline_reason

    connection.responded_at = datetime.utcnow().isoformat()
    session.add(connection)
    session.commit()
    session.refresh(connection)

    dispatcher = session.get(Worker, connection.dispatcher_id)
    driver = session.get(Worker, connection.driver_id)

    return {
        "message": "Đã chấp nhận kết nối" if data.accept else "Đã từ chối kết nối",
        "connection": format_connection(connection, dispatcher, driver),
    }


# ==================== MANAGE CONNECTION ====================

@router.patch("/{connection_id}/settings")
def update_connection_settings(
    connection_id: str,
    data: UpdateConnectionSettings,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Cập nhật cài đặt kết nối (chỉ Dispatcher có quyền).
    """
    connection = session.get(WorkerConnection, connection_id)
    if not connection:
        raise HTTPException(404, "Không tìm thấy kết nối")

    if connection.dispatcher_id != worker.id:
        raise HTTPException(403, "Chỉ điều phối viên mới có quyền thay đổi cài đặt")

    if connection.status != ConnectionStatus.ACCEPTED.value:
        raise HTTPException(400, "Kết nối chưa được chấp nhận")

    if data.enable_payment_tracking is not None:
        connection.enable_payment_tracking = data.enable_payment_tracking
    if data.default_payment_per_order is not None:
        connection.default_payment_per_order = data.default_payment_per_order

    session.add(connection)
    session.commit()
    session.refresh(connection)

    driver = session.get(Worker, connection.driver_id)
    return {
        "message": "Đã cập nhật cài đặt",
        "connection": format_connection(connection, worker, driver),
    }


@router.delete("/{connection_id}")
def remove_connection(
    connection_id: str,
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Hủy kết nối (cả Dispatcher và Driver đều có thể hủy).
    """
    connection = session.get(WorkerConnection, connection_id)
    if not connection:
        raise HTTPException(404, "Không tìm thấy kết nối")

    if connection.dispatcher_id != worker.id and connection.driver_id != worker.id:
        raise HTTPException(403, "Bạn không có quyền hủy kết nối này")

    # Soft delete - đổi status sang BLOCKED
    connection.status = ConnectionStatus.BLOCKED.value
    session.add(connection)
    session.commit()

    return {"message": "Đã hủy kết nối"}


# ==================== SEARCH WORKERS ====================

@router.get("/search-workers")
def search_workers_for_connection(
    q: str = Query(..., min_length=2, description="Tìm theo tên, username, SĐT hoặc email"),
    role: Optional[str] = Query(None, description="DRIVER hoặc DISPATCHER"),
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Tìm kiếm Workers để kết nối.

    - Tìm theo tên, username, số điện thoại hoặc email
    - Lọc theo role (nếu có)
    - Không hiển thị bản thân
    """
    search_term = f"%{q.lower()}%"
    # Chuẩn hóa số điện thoại (bỏ khoảng trắng, dấu -)
    phone_search = q.replace(" ", "").replace("-", "").replace(".", "")

    query = select(Worker).where(
        and_(
            Worker.id != worker.id,
            Worker.status == "ACTIVE",
            or_(
                Worker.username.ilike(search_term),
                Worker.full_name.ilike(search_term),
                Worker.phone.ilike(f"%{phone_search}%"),
                Worker.email.ilike(search_term),
            )
        )
    ).limit(20)

    workers = session.exec(query).all()

    # Lấy danh sách connections hiện tại
    existing_connections = session.exec(
        select(WorkerConnection).where(
            or_(
                WorkerConnection.dispatcher_id == worker.id,
                WorkerConnection.driver_id == worker.id,
            )
        )
    ).all()

    connection_map = {}
    for conn in existing_connections:
        other_id = conn.driver_id if conn.dispatcher_id == worker.id else conn.dispatcher_id
        connection_map[other_id] = conn.status

    result = []
    for w in workers:
        result.append({
            **get_worker_summary(w),
            "connection_status": connection_map.get(w.id, None),
        })

    return {"workers": result, "total": len(result)}


# ==================== STATS ====================

@router.get("/stats")
def get_connection_stats(
    worker: Worker = Depends(get_current_worker),
    session: Session = Depends(get_session),
):
    """
    Thống kê kết nối của worker.
    """
    # Đếm số driver đã kết nối (với tư cách dispatcher)
    connected_drivers = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.dispatcher_id == worker.id,
                WorkerConnection.status == ConnectionStatus.ACCEPTED.value,
            )
        )
    ).all()

    # Đếm số dispatcher đã kết nối (với tư cách driver)
    connected_dispatchers = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.driver_id == worker.id,
                WorkerConnection.status == ConnectionStatus.ACCEPTED.value,
            )
        )
    ).all()

    # Đếm pending invitations (driver chờ chấp nhận)
    pending_invitations = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.driver_id == worker.id,
                WorkerConnection.initiated_by == ConnectionInitiator.DISPATCHER.value,
                WorkerConnection.status == ConnectionStatus.PENDING.value,
            )
        )
    ).all()

    # Đếm pending requests (dispatcher chờ driver xin vào)
    pending_requests = session.exec(
        select(WorkerConnection).where(
            and_(
                WorkerConnection.dispatcher_id == worker.id,
                WorkerConnection.initiated_by == ConnectionInitiator.DRIVER.value,
                WorkerConnection.status == ConnectionStatus.PENDING.value,
            )
        )
    ).all()

    # Tổng doanh thu
    total_paid = sum(c.total_amount_paid for c in connected_drivers)
    total_pending = sum(c.total_amount_pending for c in connected_drivers)
    total_orders = sum(c.total_orders_completed for c in connected_drivers)

    return {
        "connected_drivers": len(connected_drivers),
        "connected_dispatchers": len(connected_dispatchers),
        "pending_invitations": len(pending_invitations),
        "pending_requests": len(pending_requests),
        "total_orders_completed": total_orders,
        "total_amount_paid": total_paid,
        "total_amount_pending": total_pending,
    }
