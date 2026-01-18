"""
TMS Automation API
Endpoints to trigger and monitor automation jobs
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from typing import Dict
from app.db.session import get_session
from app.models import User
from app.core.security import get_current_user
from app.services.automation_jobs import get_automation_jobs

router = APIRouter(prefix="/automation", tags=["TMS Automation"])


@router.post("/auto-accept-orders")
def trigger_auto_accept_orders(
    background_tasks: BackgroundTasks,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger auto-acceptance job for NEW orders

    Args:
        limit: Maximum number of orders to process
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can trigger automation")

    tenant_id = str(current_user.tenant_id)
    automation = get_automation_jobs()

    # Run in background
    background_tasks.add_task(
        automation.auto_accept_orders,
        session=session,
        tenant_id=tenant_id,
        limit=limit
    )

    return {
        "message": "Auto-acceptance job started",
        "limit": limit
    }


@router.post("/auto-assign-drivers")
def trigger_auto_assign_drivers(
    background_tasks: BackgroundTasks,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger auto-assignment job for ACCEPTED orders

    Args:
        limit: Maximum number of orders to process
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can trigger automation")

    tenant_id = str(current_user.tenant_id)
    automation = get_automation_jobs()

    # Run in background
    background_tasks.add_task(
        automation.auto_assign_drivers,
        session=session,
        tenant_id=tenant_id,
        limit=limit
    )

    return {
        "message": "Auto-assignment job started",
        "limit": limit
    }


@router.post("/detect-gps-status")
def trigger_gps_status_detection(
    background_tasks: BackgroundTasks,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger GPS-based status detection for active orders

    Args:
        limit: Maximum number of orders to check
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can trigger automation")

    tenant_id = str(current_user.tenant_id)
    automation = get_automation_jobs()

    # Run in background
    background_tasks.add_task(
        automation.detect_gps_status,
        session=session,
        tenant_id=tenant_id,
        limit=limit
    )

    return {
        "message": "GPS status detection job started",
        "limit": limit
    }


@router.post("/recalculate-etas")
def trigger_eta_recalculation(
    background_tasks: BackgroundTasks,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger ETA recalculation for active orders

    Args:
        limit: Maximum number of orders to process
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can trigger automation")

    tenant_id = str(current_user.tenant_id)
    automation = get_automation_jobs()

    # Run in background
    background_tasks.add_task(
        automation.recalculate_etas,
        session=session,
        tenant_id=tenant_id,
        limit=limit
    )

    return {
        "message": "ETA recalculation job started",
        "limit": limit
    }


@router.post("/run-all")
def run_all_automation_jobs(
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Run all automation jobs in sequence

    This endpoint runs:
    1. Auto-accept orders
    2. Auto-assign drivers
    3. GPS status detection
    4. ETA recalculation
    """
    if current_user.role not in ("ADMIN", "DISPATCHER"):
        raise HTTPException(403, "Only ADMIN or DISPATCHER can trigger automation")

    tenant_id = str(current_user.tenant_id)
    automation = get_automation_jobs()

    # Run all jobs in background
    background_tasks.add_task(
        automation.auto_accept_orders,
        session=session,
        tenant_id=tenant_id,
        limit=50
    )
    background_tasks.add_task(
        automation.auto_assign_drivers,
        session=session,
        tenant_id=tenant_id,
        limit=50
    )
    background_tasks.add_task(
        automation.detect_gps_status,
        session=session,
        tenant_id=tenant_id,
        limit=100
    )
    background_tasks.add_task(
        automation.recalculate_etas,
        session=session,
        tenant_id=tenant_id,
        limit=100
    )

    return {
        "message": "All automation jobs started",
        "jobs": [
            "auto-accept-orders",
            "auto-assign-drivers",
            "detect-gps-status",
            "recalculate-etas"
        ]
    }
