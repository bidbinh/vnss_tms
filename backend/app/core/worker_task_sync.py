"""
Worker Task Sync Service

Automatically syncs tasks from tenant systems (Orders, Trips, etc.)
to Worker's workspace when assigned to external workers.

This solves the problem where:
1. Order is assigned to Driver (Driver.id)
2. Driver is external (has external_worker_id → Worker.id)
3. Worker should see this task in their workspace
4. But WorkerTask was not being created automatically

Usage:
    from app.core.worker_task_sync import sync_order_to_worker_task

    # Call when Order.driver_id is updated
    sync_order_to_worker_task(session, order, assigned_by_user_id)
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Session, select, and_

from app.models import Driver, Order, Site
from app.models.worker import Worker, WorkerTenantAccess, WorkerTask


def sync_order_to_worker_task(
    session: Session,
    order: "Order",
    assigned_by_user_id: Optional[str] = None,
    auto_commit: bool = True
) -> Optional[WorkerTask]:
    """
    Sync an Order assignment to WorkerTask for external workers.

    This should be called whenever Order.driver_id is set/changed.

    Args:
        session: Database session
        order: The Order being assigned
        assigned_by_user_id: User who made the assignment
        auto_commit: Whether to commit the session (default True)

    Returns:
        WorkerTask if created, None otherwise
    """
    if not order.driver_id:
        return None

    # Get the driver
    driver = session.get(Driver, order.driver_id)
    if not driver:
        return None

    # Only process external drivers (linked to Worker)
    if driver.source != "EXTERNAL" or not driver.external_worker_id:
        return None

    # Get the worker
    worker = session.get(Worker, driver.external_worker_id)
    if not worker:
        print(f"[WorkerTaskSync] Warning: Driver {driver.id} has external_worker_id but Worker not found")
        return None

    # Get active WorkerTenantAccess for this worker in this tenant
    access = session.exec(
        select(WorkerTenantAccess).where(
            and_(
                WorkerTenantAccess.worker_id == worker.id,
                WorkerTenantAccess.tenant_id == order.tenant_id,
                WorkerTenantAccess.is_active == True,
            )
        )
    ).first()

    if not access:
        print(f"[WorkerTaskSync] Warning: No active access for worker {worker.username} in tenant {order.tenant_id}")
        return None

    # Check if task already exists
    existing_task = session.exec(
        select(WorkerTask).where(
            and_(
                WorkerTask.task_ref_id == str(order.id),
                WorkerTask.task_type == "ORDER",
                WorkerTask.tenant_id == order.tenant_id,
            )
        )
    ).first()

    if existing_task:
        # Task exists - update if worker changed
        if existing_task.worker_id != worker.id:
            existing_task.worker_id = worker.id
            existing_task.access_id = access.id
            session.add(existing_task)
            if auto_commit:
                session.commit()
            print(f"[WorkerTaskSync] Updated task {existing_task.id} to new worker {worker.username}")
        return existing_task

    # Build task description from Sites
    pickup_name = delivery_name = "N/A"
    if order.pickup_site_id:
        pickup_site = session.get(Site, order.pickup_site_id)
        if pickup_site:
            pickup_name = pickup_site.company_name
    if order.delivery_site_id:
        delivery_site = session.get(Site, order.delivery_site_id)
        if delivery_site:
            delivery_name = delivery_site.company_name

    # Create new WorkerTask
    task = WorkerTask(
        worker_id=worker.id,
        tenant_id=str(order.tenant_id),
        access_id=access.id,
        task_type="ORDER",
        task_ref_id=str(order.id),
        task_code=order.order_code,
        role_used="DRIVER",  # Order assignments are always for DRIVER role
        title=f"Đơn hàng {order.order_code}",
        description=f"Giao hàng từ {pickup_name} đến {delivery_name}",
        assigned_at=datetime.utcnow().isoformat(),
        assigned_by_user_id=assigned_by_user_id,
        status="ASSIGNED",
    )
    session.add(task)

    if auto_commit:
        session.commit()
        session.refresh(task)

    print(f"[WorkerTaskSync] Created task {task.id} for order {order.order_code} → worker {worker.username}")
    return task


def remove_order_worker_task(
    session: Session,
    order: "Order",
    auto_commit: bool = True
) -> bool:
    """
    Remove WorkerTask when Order is unassigned from driver.

    Call this when Order.driver_id is set to None.

    Returns:
        True if task was removed, False otherwise
    """
    existing_task = session.exec(
        select(WorkerTask).where(
            and_(
                WorkerTask.task_ref_id == str(order.id),
                WorkerTask.task_type == "ORDER",
                WorkerTask.tenant_id == order.tenant_id,
            )
        )
    ).first()

    if existing_task:
        # Mark as cancelled instead of deleting (audit trail)
        existing_task.status = "CANCELLED"
        session.add(existing_task)
        if auto_commit:
            session.commit()
        print(f"[WorkerTaskSync] Cancelled task {existing_task.id} for order {order.order_code}")
        return True

    return False


def sync_all_orders_for_worker(
    session: Session,
    worker_id: str,
    tenant_id: str,
) -> list[WorkerTask]:
    """
    Sync all orders assigned to a worker in a specific tenant.

    Useful after worker accepts invitation to catch up on existing assignments.

    Returns:
        List of created WorkerTasks
    """
    # Get all drivers linked to this worker in this tenant
    drivers = session.exec(
        select(Driver).where(
            and_(
                Driver.tenant_id == tenant_id,
                Driver.external_worker_id == worker_id,
            )
        )
    ).all()

    if not drivers:
        return []

    driver_ids = [d.id for d in drivers]

    # Get all orders assigned to these drivers
    orders = session.exec(
        select(Order).where(
            and_(
                Order.tenant_id == tenant_id,
                Order.driver_id.in_(driver_ids),
            )
        )
    ).all()

    created_tasks = []
    for order in orders:
        task = sync_order_to_worker_task(session, order, auto_commit=False)
        if task:
            created_tasks.append(task)

    session.commit()
    print(f"[WorkerTaskSync] Synced {len(created_tasks)} orders for worker {worker_id} in tenant {tenant_id}")
    return created_tasks
