"""
Workflow Engine - Tasks API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.workflow import (
    WorkflowTask, WorkflowTaskStatus, WorkflowTaskPriority,
)
from app.core.security import get_current_user

router = APIRouter()


class WorkflowTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = "MANUAL"
    priority: str = WorkflowTaskPriority.NORMAL.value
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    due_date: Optional[datetime] = None
    sla_hours: Optional[int] = None
    form_id: Optional[str] = None
    allowed_actions: Optional[str] = None
    task_url: Optional[str] = None
    notes: Optional[str] = None


@router.get("/workflow-tasks")
def list_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List workflow tasks"""
    tenant_id = str(current_user.tenant_id)

    query = select(WorkflowTask).where(WorkflowTask.tenant_id == tenant_id)

    if status:
        query = query.where(WorkflowTask.status == status)

    if priority:
        query = query.where(WorkflowTask.priority == priority)

    if assigned_to_id:
        query = query.where(WorkflowTask.assigned_to_id == assigned_to_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(WorkflowTask.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/workflow-tasks")
def create_task(
    payload: WorkflowTaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a workflow task"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Generate task number
    count = session.exec(
        select(func.count(WorkflowTask.id)).where(
            WorkflowTask.tenant_id == tenant_id
        )
    ).one() or 0

    task_number = f"WFTASK-{datetime.now().year}-{count + 1:05d}"

    task = WorkflowTask(
        tenant_id=tenant_id,
        task_number=task_number,
        **payload.model_dump(),
        status=WorkflowTaskStatus.PENDING.value,
        created_by=user_id,
    )

    if payload.assigned_to_id:
        task.status = WorkflowTaskStatus.ASSIGNED.value
        task.assigned_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return task.model_dump()


@router.get("/workflow-tasks/{task_id}")
def get_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get workflow task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(WorkflowTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    return task.model_dump()


@router.patch("/workflow-tasks/{task_id}/claim")
def claim_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Claim a task"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    task = session.get(WorkflowTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.claimed_by_id:
        raise HTTPException(400, "Task already claimed")

    task.claimed_by_id = user_id
    task.claimed_by_name = current_user.full_name
    task.claimed_at = datetime.utcnow()
    task.status = WorkflowTaskStatus.IN_PROGRESS.value
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}


@router.patch("/workflow-tasks/{task_id}/start")
def start_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start working on a task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(WorkflowTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.status not in [WorkflowTaskStatus.PENDING.value, WorkflowTaskStatus.ASSIGNED.value]:
        raise HTTPException(400, "Task cannot be started")

    task.status = WorkflowTaskStatus.IN_PROGRESS.value
    task.started_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}


@router.patch("/workflow-tasks/{task_id}/complete")
def complete_task(
    task_id: str,
    result: Optional[str] = Query(None),
    comments: Optional[str] = Query(None),
    result_data: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a task"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    task = session.get(WorkflowTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.status not in [WorkflowTaskStatus.IN_PROGRESS.value, WorkflowTaskStatus.ASSIGNED.value]:
        raise HTTPException(400, "Task cannot be completed")

    task.status = WorkflowTaskStatus.COMPLETED.value
    task.result = result
    task.result_data = result_data
    task.comments = comments
    task.completed_at = datetime.utcnow()
    task.completed_by = user_id
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}


@router.patch("/workflow-tasks/{task_id}/cancel")
def cancel_task(
    task_id: str,
    reason: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel a task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(WorkflowTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.status == WorkflowTaskStatus.COMPLETED.value:
        raise HTTPException(400, "Cannot cancel completed task")

    task.status = WorkflowTaskStatus.CANCELLED.value
    task.comments = reason
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}


@router.get("/my-workflow-tasks")
def get_my_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """Get tasks assigned to current user"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    query = select(WorkflowTask).where(
        WorkflowTask.tenant_id == tenant_id,
        (WorkflowTask.assigned_to_id == user_id) | (WorkflowTask.claimed_by_id == user_id)
    )

    if status:
        query = query.where(WorkflowTask.status == status)
    else:
        query = query.where(
            WorkflowTask.status.in_([
                WorkflowTaskStatus.PENDING.value,
                WorkflowTaskStatus.ASSIGNED.value,
                WorkflowTaskStatus.IN_PROGRESS.value
            ])
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(WorkflowTask.due_date, WorkflowTask.created_at)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
