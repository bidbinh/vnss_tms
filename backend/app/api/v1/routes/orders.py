from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from sqlalchemy import and_

from app.db.session import get_session
from app.models import Order, Customer, User, Location, Driver
from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderRead, OrderAccept, OrderReject, OrderUpdate
from app.core.security import get_current_user, get_current_user_optional, require_permission, check_permission
from app.core.activity_tracker import log_update, get_client_ip
from app.services.order_code import next_order_code
from app.services.order_parser import parse_order_text
from app.services.distance_calculator import get_distance_from_rates
from app.services.freight_calculator import get_freight_from_rates
from app.services.order_status_logger import log_status_change
from typing import Optional, List

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/preview-code/{customer_id}")
def preview_order_code(
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Preview next order code for a customer"""
    tenant_id = str(current_user.tenant_id)

    customer = session.get(Customer, customer_id)
    if not customer or str(customer.tenant_id) != tenant_id:
        raise HTTPException(404, "Customer not found")

    # Don't actually increment, just peek at what it would be
    from sqlmodel import select
    from app.models.order_sequence import OrderSequence
    from app.services.order_code import _get_max_order_number

    # Get max from actual orders (handles manual entries)
    max_from_orders = _get_max_order_number(session, tenant_id, customer.code)

    seq = session.exec(
        select(OrderSequence)
        .where(
            OrderSequence.tenant_id == tenant_id,
            OrderSequence.customer_code == customer.code,
            OrderSequence.yymm == "ALL",
        )
    ).first()

    # Use the higher of sequence tracker or actual max from orders
    current_max = max(seq.last_seq if seq else 0, max_from_orders)
    next_seq = current_max + 1
    preview_code = f"{customer.code}-{next_seq}"

    return {"order_code": preview_code}


@router.post("/batch", response_model=List[OrderRead])
def create_orders_batch(
    text: str,
    customer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create multiple orders from pasted text (CUSTOMER role).

    Text format:
    "02x20 CARGO_NOTE; PICKUP - DELIVERY"
    """
    tenant_id = str(current_user.tenant_id)

    # Verify customer access
    customer = session.get(Customer, customer_id)
    if not customer or str(customer.tenant_id) != tenant_id:
        raise HTTPException(404, "Customer not found")

    # Parse text into order data
    order_data_list = parse_order_text(text)

    if not order_data_list:
        raise HTTPException(400, "No valid orders found in text")

    # Create orders
    created_orders = []
    for order_data in order_data_list:
        # Generate order code
        order_code = next_order_code(
            session, tenant_id, customer.code, datetime.utcnow()
        )

        order = Order(
            tenant_id=tenant_id,
            customer_id=customer_id,
            created_by_user_id=str(current_user.id),
            order_code=order_code,
            status=OrderStatus.NEW,
            pickup_text=order_data.get("pickup_text"),
            delivery_text=order_data.get("delivery_text"),
            equipment=order_data.get("equipment"),
            qty=order_data.get("qty", 1),
            cargo_note=order_data.get("cargo_note"),
            empty_return_note=order_data.get("empty_return_note"),
        )

        session.add(order)
        created_orders.append(order)

    session.commit()

    # Refresh all
    for order in created_orders:
        session.refresh(order)

    return created_orders


@router.post("", response_model=OrderRead)
def create_order(
    payload: OrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create single order - requires create permission"""
    try:
        tenant_id = str(current_user.tenant_id)
        
        # Check permission for non-legacy roles
        if current_user.role not in ("ADMIN", "DISPATCHER", "CUSTOMER"):
            check_permission(session, current_user, "tms", "orders", "create")

        customer = session.get(Customer, payload.customer_id)
        if not customer or str(customer.tenant_id) != tenant_id:
            raise HTTPException(404, "Customer not found")

        # Populate location text from IDs if provided
        pickup_text = payload.pickup_text
        delivery_text = payload.delivery_text

        if payload.pickup_location_id:
            pickup_loc = session.get(Location, payload.pickup_location_id)
            if pickup_loc:
                pickup_text = f"{pickup_loc.code} - {pickup_loc.name}"

        if payload.delivery_location_id:
            delivery_loc = session.get(Location, payload.delivery_location_id)
            if delivery_loc:
                delivery_text = f"{delivery_loc.code} - {delivery_loc.name}"

        # Generate order code
        order_code = payload.order_code or next_order_code(
            session, tenant_id, customer.code, datetime.utcnow()
        )

        # Auto-calculate distance_km from Rates table
        distance_km = payload.distance_km  # Use provided value if exists
        order_date_for_rate = (payload.customer_requested_date or datetime.utcnow()).date() if payload.customer_requested_date else None
        if not distance_km:
            # Auto-calculate from Rates
            distance_km = get_distance_from_rates(
                session=session,
                pickup_location_id=payload.pickup_location_id,
                delivery_location_id=payload.delivery_location_id,
                pickup_site_id=payload.pickup_site_id,
                delivery_site_id=payload.delivery_site_id,
                tenant_id=tenant_id,
                order_date=order_date_for_rate
            )

        # Auto-calculate freight_charge from Rates table
        freight_charge, _ = get_freight_from_rates(
            session=session,
            pickup_location_id=payload.pickup_location_id,
            delivery_location_id=payload.delivery_location_id,
            pickup_site_id=payload.pickup_site_id,
            delivery_site_id=payload.delivery_site_id,
            tenant_id=tenant_id,
            customer_id=payload.customer_id,
            equipment=payload.equipment,
            order_date=order_date_for_rate
        )

        order = Order(
            tenant_id=tenant_id,
            customer_id=payload.customer_id,
            created_by_user_id=str(current_user.id),
            order_code=order_code,
            status=OrderStatus.NEW,
            pickup_text=pickup_text,
            delivery_text=delivery_text,
            pickup_location_id=payload.pickup_location_id,
            delivery_location_id=payload.delivery_location_id,
            pickup_site_id=payload.pickup_site_id,
            delivery_site_id=payload.delivery_site_id,
            port_site_id=payload.port_site_id,
            equipment=payload.equipment,
            qty=payload.qty,
            container_code=payload.container_code,
            cargo_note=payload.cargo_note,
            empty_return_note=payload.empty_return_note,
            customer_requested_date=payload.customer_requested_date,
            distance_km=distance_km,
            freight_charge=freight_charge,
        )

        session.add(order)
        session.flush()  # Flush to get order.id before logging

        # Log initial status
        log_status_change(
            session=session,
            tenant_id=tenant_id,
            order_id=order.id,
            from_status=None,
            to_status=OrderStatus.NEW,
            changed_by_user_id=str(current_user.id)
        )

        session.commit()
        session.refresh(order)
        return order
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[Orders] Error creating order: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Error creating order: {str(e)}")


@router.get("", response_model=List[OrderRead])
def list_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """
    List orders based on user role with pagination and filters:
    - CUSTOMER: only their orders
    - DRIVER: only assigned to them
    - DISPATCHER/ADMIN: all orders in tenant
    - Other roles: requires 'view' permission on 'orders' resource

    Query params:
    - limit: max results (default 50, max 500)
    - offset: skip first N results
    - status: filter by order status
    - date_from: filter orders from this date (YYYY-MM-DD)
    - date_to: filter orders until this date (YYYY-MM-DD)
    """
    tenant_id = str(current_user.tenant_id)
    
    # Check permission for non-legacy roles
    # Legacy roles (ADMIN, DISPATCHER, DRIVER, CUSTOMER) have their own access logic
    if current_user.role not in ("ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"):
        check_permission(session, current_user, "tms", "orders", "view")

    # Limit max results for performance
    limit = min(limit, 500)

    query = select(Order).where(Order.tenant_id == tenant_id)

    if current_user.role == "CUSTOMER":
        # CUSTOMER: only orders they created or for their customer account
        query = query.where(
            (Order.created_by_user_id == str(current_user.id)) |
            (Order.customer_id == str(current_user.id))
        )
    elif current_user.role == "DRIVER":
        # DRIVER: only orders assigned to them
        query = query.where(Order.driver_id == str(current_user.driver_id))

    # Apply filters
    if status:
        query = query.where(Order.status == status)

    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
            query = query.where(Order.order_date >= from_date)
        except ValueError:
            pass

    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
            query = query.where(Order.order_date <= to_date)
        except ValueError:
            pass

    # DISPATCHER/ADMIN: see all orders (no additional filter)

    query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    result = session.exec(query).all()
    return result


@router.post("/{order_id}/accept", response_model=OrderRead)
def accept_order(
    order_id: str,
    payload: OrderAccept,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Accept order and assign driver + ETAs (DISPATCHER/ADMIN only).

    Workflow: NEW -> ACCEPTED -> ASSIGNED (once driver + ETAs set)
    """
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can accept orders")

    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, f"Order {order_id} not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if order.status != OrderStatus.NEW:
        raise HTTPException(400, f"Cannot accept order in status {order.status}")

    # Update order
    old_status = order.status
    order.status = OrderStatus.ASSIGNED  # Direct to ASSIGNED once driver set
    order.dispatcher_id = str(current_user.id)
    order.driver_id = payload.driver_id
    order.eta_pickup_at = payload.eta_pickup_at
    order.eta_delivery_at = payload.eta_delivery_at

    session.add(order)

    # Log status change
    log_status_change(
        session=session,
        tenant_id=tenant_id,
        order_id=order.id,
        from_status=old_status,
        to_status=OrderStatus.ASSIGNED,
        changed_by_user_id=str(current_user.id)
    )

    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/reject", response_model=OrderRead)
def reject_order(
    order_id: str,
    payload: OrderReject,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject order with reason (DISPATCHER/ADMIN only)"""
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        raise HTTPException(403, "Only DISPATCHER or ADMIN can reject orders")

    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, f"Order {order_id} not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Allow cancel/reject for orders that are not yet delivered
    non_cancellable_statuses = [
        OrderStatus.DELIVERED,
        OrderStatus.EMPTY_RETURN,
        OrderStatus.COMPLETED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
    ]
    if order.status in non_cancellable_statuses:
        raise HTTPException(400, f"Cannot cancel order in status {order.status}")

    old_status = order.status
    # Use REJECTED for NEW orders, CANCELLED for others (ASSIGNED, IN_TRANSIT)
    new_status = OrderStatus.REJECTED if old_status == OrderStatus.NEW else OrderStatus.CANCELLED
    order.status = new_status
    order.reject_reason = payload.reason
    order.dispatcher_id = str(current_user.id)

    session.add(order)

    # Log status change
    log_status_change(
        session=session,
        tenant_id=tenant_id,
        order_id=order.id,
        from_status=old_status,
        to_status=new_status,
        changed_by_user_id=str(current_user.id),
        note=payload.reason
    )

    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/pickup", response_model=OrderRead)
def start_pickup(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start pickup (change status to IN_TRANSIT - picking up)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, f"Order {order_id} not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if order.status != OrderStatus.ASSIGNED:
        raise HTTPException(400, f"Cannot start pickup from status {order.status}")

    old_status = order.status
    order.status = OrderStatus.IN_TRANSIT
    session.add(order)

    # Log status change
    log_status_change(
        session=session,
        tenant_id=tenant_id,
        order_id=order.id,
        from_status=old_status,
        to_status=OrderStatus.IN_TRANSIT,
        changed_by_user_id=str(current_user.id)
    )

    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/delivering", response_model=OrderRead)
def start_delivery(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start delivery (status remains IN_TRANSIT but indicates delivering phase)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, f"Order {order_id} not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if order.status != OrderStatus.IN_TRANSIT:
        raise HTTPException(400, f"Cannot start delivery from status {order.status}")

    # Keep status as IN_TRANSIT, just acknowledge transition
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/delivered", response_model=OrderRead)
def mark_delivered(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark as delivered (waiting for empty return)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, f"Order {order_id} not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if order.status != OrderStatus.IN_TRANSIT:
        raise HTTPException(400, f"Cannot mark delivered from status {order.status}")

    old_status = order.status
    order.status = OrderStatus.DELIVERED
    session.add(order)

    # Log status change - CRITICAL for salary calculation (delivered_date)
    log_status_change(
        session=session,
        tenant_id=tenant_id,
        order_id=order.id,
        from_status=old_status,
        to_status=OrderStatus.DELIVERED,
        changed_by_user_id=str(current_user.id)
    )

    session.commit()
    session.refresh(order)
    return order


@router.post("/{order_id}/complete", response_model=OrderRead)
def mark_completed(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark as completed (all done including empty return)"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(404, f"Order {order_id} not found")
    if str(order.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(400, f"Cannot complete from status {order.status}")

    old_status = order.status
    order.status = OrderStatus.COMPLETED
    session.add(order)

    # Log status change
    log_status_change(
        session=session,
        tenant_id=tenant_id,
        order_id=order.id,
        from_status=old_status,
        to_status=OrderStatus.COMPLETED,
        changed_by_user_id=str(current_user.id)
    )

    session.commit()
    session.refresh(order)
    return order


@router.patch("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: str,
    payload: OrderUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update order fields - requires edit permission"""
    # Check permission: legacy roles or permission system
    if current_user.role not in ("DISPATCHER", "ADMIN"):
        check_permission(session, current_user, "tms", "orders", "edit")

    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    # Capture old data BEFORE update for change tracking
    old_data = {
        "status": order.status,
        "customer_id": str(order.customer_id) if order.customer_id else None,
        "driver_id": str(order.driver_id) if order.driver_id else None,
        "equipment": order.equipment,
        "qty": order.qty,
        "pickup_site_id": str(order.pickup_site_id) if order.pickup_site_id else None,
        "delivery_site_id": str(order.delivery_site_id) if order.delivery_site_id else None,
        "port_site_id": str(order.port_site_id) if order.port_site_id else None,
        "eta_pickup_at": str(order.eta_pickup_at) if order.eta_pickup_at else None,
        "eta_delivery_at": str(order.eta_delivery_at) if order.eta_delivery_at else None,
        "customer_requested_date": str(order.customer_requested_date) if order.customer_requested_date else None,
        "container_code": order.container_code,
        "cargo_note": order.cargo_note,
    }

    # Update allowed fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    # Auto-recalculate distance_km when pickup or delivery location changes
    location_fields = ["pickup_location_id", "delivery_location_id", "pickup_site_id", "delivery_site_id"]
    if any(field in update_data for field in location_fields):
        # Only recalculate if distance_km was not explicitly provided in update
        if "distance_km" not in update_data:
            order_date_for_rate = order.customer_requested_date.date() if order.customer_requested_date else None
            new_distance = get_distance_from_rates(
                session=session,
                pickup_location_id=order.pickup_location_id,
                delivery_location_id=order.delivery_location_id,
                pickup_site_id=order.pickup_site_id,
                delivery_site_id=order.delivery_site_id,
                tenant_id=tenant_id,
                order_date=order_date_for_rate
            )
            order.distance_km = new_distance

    session.add(order)
    session.commit()
    session.refresh(order)

    # Auto-sync WorkerTask when driver is assigned/changed (non-blocking)
    if "driver_id" in update_data:
        try:
            from app.core.worker_task_sync import sync_order_to_worker_task, remove_order_worker_task
            if order.driver_id:
                sync_order_to_worker_task(session, order, str(current_user.id))
            else:
                # Driver unassigned - cancel the task
                remove_order_worker_task(session, order)
        except Exception as e:
            print(f"[Orders] WorkerTask sync error (non-blocking): {e}")

    # Log activity with actual changes (non-blocking)
    try:
        new_data = {k: str(v) if v is not None else None for k, v in update_data.items()}
        log_update(
            tenant_id=tenant_id,
            user_id=str(current_user.id),
            user_name=current_user.full_name or current_user.username,
            user_role=current_user.role,
            user_email=current_user.email,
            module="tms",
            resource_type="orders",
            resource_id=order_id,
            resource_code=order.order_code,
            old_data=old_data,
            new_data=new_data,
            endpoint=f"/api/v1/orders/{order_id}",
            method="PATCH",
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("user-agent", ""),
        )
    except Exception as e:
        print(f"[Orders] Activity log error (non-blocking): {e}")

    return order


@router.post("/{order_id}/sync-worker-task")
def sync_worker_task(
    order_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Sync WorkerTask cho order đã assign external driver"""
    tenant_id = str(current_user.tenant_id)

    order = session.get(Order, order_id)
    if not order or str(order.tenant_id) != tenant_id:
        raise HTTPException(404, "Order not found")

    if not order.driver_id:
        raise HTTPException(400, "Order chưa có driver")

    driver = session.get(Driver, order.driver_id)
    if not driver:
        raise HTTPException(404, "Driver not found")

    if not driver.external_worker_id:
        raise HTTPException(400, "Driver không phải external worker")

    # Find worker's access
    access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == driver.external_worker_id,
                WorkerTenantAccess.tenant_id == tenant_id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).first()

    if not access:
        raise HTTPException(400, "Worker chưa kết nối với công ty")

    # Check existing task
    existing_task = session.exec(
        select(WorkerTask).where(
            and_(
                WorkerTask.task_ref_id == order_id,
                WorkerTask.task_type == "ORDER",
                WorkerTask.tenant_id == tenant_id,
            )
        )
    ).first()

    if existing_task:
        return {"message": "Task đã tồn tại", "task_id": existing_task.id}

    # Build description
    from app.models import Site
    pickup_name = "N/A"
    delivery_name = "N/A"
    if order.pickup_site_id:
        pickup_site = session.get(Site, order.pickup_site_id)
        if pickup_site:
            pickup_name = pickup_site.name
    if order.delivery_site_id:
        delivery_site = session.get(Site, order.delivery_site_id)
        if delivery_site:
            delivery_name = delivery_site.name

    # Create task
    task = WorkerTask(
        worker_id=driver.external_worker_id,
        tenant_id=tenant_id,
        access_id=access.id,
        task_type="ORDER",
        task_ref_id=order_id,
        task_code=order.order_code,
        title=f"Đơn hàng {order.order_code}",
        description=f"Giao hàng từ {pickup_name} đến {delivery_name}",
        assigned_at=datetime.utcnow().isoformat(),
        assigned_by_user_id=str(current_user.id),
        scheduled_start=str(order.eta_pickup_at) if order.eta_pickup_at else None,
        scheduled_end=str(order.eta_delivery_at) if order.eta_delivery_at else None,
        status="ASSIGNED",
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    return {"message": "Đã tạo WorkerTask", "task_id": task.id}
