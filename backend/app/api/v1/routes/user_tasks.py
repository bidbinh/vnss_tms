"""
User Tasks API Routes - Central Task Management System

Provides API for managing personal tasks from all modules in the platform.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select, func, or_, and_
from sqlalchemy import case
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from app.db.session import get_session
from app.models import User
from app.models.user_task import (
    UserTask, UserTaskStatus, UserTaskPriority, UserTaskType, UserTaskScope, UserTaskSource,
    UserTaskComment, UserTaskWatcher, UserTaskSequence,
)
from app.core.security import get_current_user

router = APIRouter()


# =====================================================
# PYDANTIC MODELS
# =====================================================

class UserTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = UserTaskType.ACTION.value
    scope: str = UserTaskScope.COMPANY.value
    priority: str = UserTaskPriority.NORMAL.value
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[str] = None  # If not provided, assign to current user
    assigned_to_name: Optional[str] = None
    watchers: Optional[List[str]] = None  # List of user IDs
    watchers_json: Optional[str] = None   # JSON string of watcher IDs
    tags_json: Optional[str] = None       # JSON string of tags
    attachments_json: Optional[str] = None  # JSON string of attachments
    actions_json: Optional[str] = None


class UserTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None


class UserTaskComplete(BaseModel):
    result: Optional[str] = None
    result_note: Optional[str] = None
    result_data: Optional[str] = None


class UserTaskCommentCreate(BaseModel):
    content: str
    attachments_json: Optional[str] = None


class AddWatcherRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = None


# =====================================================
# HELPER FUNCTIONS
# =====================================================

@router.get("/my-tasks/users")
def get_tenant_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all users in tenant for task assignment - no admin permission required"""
    tenant_id = str(current_user.tenant_id)

    query = select(User).where(
        User.tenant_id == tenant_id,
        User.status == "ACTIVE"
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.username.ilike(search_pattern),
            )
        )

    query = query.order_by(User.full_name).limit(100)
    users = session.exec(query).all()

    return {
        "items": [
            {
                "id": str(u.id),
                "full_name": u.full_name or u.username,
                "email": u.email or "",
                "username": u.username,
            }
            for u in users
        ]
    }

def generate_task_number(session: Session, tenant_id: str) -> str:
    """Generate next task number for tenant"""
    year = datetime.now().year

    # Get or create sequence
    seq = session.exec(
        select(UserTaskSequence).where(
            UserTaskSequence.tenant_id == tenant_id,
            UserTaskSequence.year == year
        )
    ).first()

    if not seq:
        seq = UserTaskSequence(tenant_id=tenant_id, year=year, last_number=0)
        session.add(seq)

    seq.last_number += 1
    session.add(seq)

    return f"TASK-{year}-{seq.last_number:05d}"


def get_task_counts(session: Session, tenant_id: str, user_id: str) -> dict:
    """Get task counts for current user - includes tasks assigned to user OR created by user"""
    # Base query counts tasks where user is assigned OR is creator
    base_query = select(func.count(UserTask.id)).where(
        UserTask.tenant_id == tenant_id,
        or_(
            UserTask.assigned_to_id == user_id,
            UserTask.created_by_id == user_id,
        )
    )

    # Total active (not completed/cancelled)
    active_count = session.exec(
        base_query.where(UserTask.status.in_([
            UserTaskStatus.PENDING.value,
            UserTaskStatus.IN_PROGRESS.value
        ]))
    ).one()

    # Pending
    pending_count = session.exec(
        base_query.where(UserTask.status == UserTaskStatus.PENDING.value)
    ).one()

    # In Progress
    in_progress_count = session.exec(
        base_query.where(UserTask.status == UserTaskStatus.IN_PROGRESS.value)
    ).one()

    # Completed
    completed_count = session.exec(
        base_query.where(UserTask.status == UserTaskStatus.COMPLETED.value)
    ).one()

    # Overdue
    overdue_count = session.exec(
        base_query.where(
            UserTask.status.in_([UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value]),
            UserTask.due_date < datetime.utcnow()
        )
    ).one()

    # Need approval (task type = APPROVAL)
    approval_count = session.exec(
        base_query.where(
            UserTask.task_type == UserTaskType.APPROVAL.value,
            UserTask.status.in_([UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value])
        )
    ).one()

    # Watching (from UserTaskWatcher)
    watching_count = session.exec(
        select(func.count(UserTaskWatcher.id)).where(
            UserTaskWatcher.tenant_id == tenant_id,
            UserTaskWatcher.user_id == user_id
        )
    ).one()

    return {
        "total_active": active_count,
        "pending": pending_count,
        "in_progress": in_progress_count,
        "completed": completed_count,
        "overdue": overdue_count,
        "need_approval": approval_count,
        "watching": watching_count,
    }


# =====================================================
# API ROUTES
# =====================================================

@router.get("/my-tasks")
def get_my_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    # Filters
    status: Optional[str] = Query(None, description="Filter by status"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    scope: Optional[str] = Query(None, description="Filter by scope (COMPANY/PERSONAL)"),
    source: Optional[str] = Query(None, description="Filter by source module"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    is_overdue: Optional[bool] = Query(None, description="Filter overdue tasks"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    # Tab filters
    tab: Optional[str] = Query(None, description="Tab: all, pending, approval, watching, completed"),
    # Pagination
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """
    Get tasks for current user.

    Includes:
    - Tasks assigned to the user
    - Tasks the user is watching
    """
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Get task IDs that user is watching
    watching_task_ids = session.exec(
        select(UserTaskWatcher.task_id).where(
            UserTaskWatcher.tenant_id == tenant_id,
            UserTaskWatcher.user_id == user_id
        )
    ).all()

    # Base query - show tasks where user is:
    # 1. Assigned to (assigned_to_id)
    # 2. Creator (created_by_id)
    # 3. Watcher (in UserTaskWatcher table)
    base_conditions = [
        UserTask.tenant_id == tenant_id,
        or_(
            UserTask.assigned_to_id == user_id,  # Tasks assigned to me
            UserTask.created_by_id == user_id,   # Tasks I created
            UserTask.id.in_(watching_task_ids) if watching_task_ids else False,  # Tasks I'm watching
        )
    ]

    assigned_query = select(UserTask).where(*base_conditions)

    # Apply tab filter
    if tab == "active":
        # Default tab - show tasks that need to be done (pending + in_progress)
        assigned_query = assigned_query.where(
            UserTask.status.in_([UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value])
        )
    elif tab == "pending":
        assigned_query = assigned_query.where(UserTask.status == UserTaskStatus.PENDING.value)
    elif tab == "approval":
        assigned_query = assigned_query.where(
            UserTask.task_type == UserTaskType.APPROVAL.value,
            UserTask.status.in_([UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value])
        )
    elif tab == "watching":
        # Query tasks user is watching (override base query)
        assigned_query = select(UserTask).where(
            UserTask.tenant_id == tenant_id,
            UserTask.id.in_(watching_task_ids) if watching_task_ids else UserTask.id == None
        )
    elif tab == "completed":
        assigned_query = assigned_query.where(UserTask.status == UserTaskStatus.COMPLETED.value)
    elif tab == "all":
        # Show all tasks (including completed, but exclude cancelled)
        if not status:
            assigned_query = assigned_query.where(
                UserTask.status.in_([
                    UserTaskStatus.PENDING.value,
                    UserTaskStatus.IN_PROGRESS.value,
                    UserTaskStatus.COMPLETED.value
                ])
            )

    query = assigned_query

    # Apply filters
    if status:
        query = query.where(UserTask.status == status)

    if task_type:
        query = query.where(UserTask.task_type == task_type)

    if scope:
        query = query.where(UserTask.scope == scope)

    if source:
        query = query.where(UserTask.source == source)

    if priority:
        query = query.where(UserTask.priority == priority)

    if is_overdue is True:
        query = query.where(
            UserTask.due_date < datetime.utcnow(),
            UserTask.status.in_([UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value])
        )

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                UserTask.title.ilike(search_term),
                UserTask.description.ilike(search_term),
                UserTask.task_number.ilike(search_term)
            )
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Order by priority and due_date
    priority_order = case(
        (UserTask.priority == UserTaskPriority.URGENT.value, 1),
        (UserTask.priority == UserTaskPriority.HIGH.value, 2),
        (UserTask.priority == UserTaskPriority.NORMAL.value, 3),
        (UserTask.priority == UserTaskPriority.LOW.value, 4),
        else_=5
    )
    query = query.order_by(priority_order, UserTask.due_date.asc().nullslast(), UserTask.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    # Get counts for tabs
    counts = get_task_counts(session, tenant_id, user_id)

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total > 0 else 0,
        "counts": counts,
    }


@router.post("/my-tasks")
def create_task(
    payload: UserTaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new task"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    task_number = generate_task_number(session, tenant_id)

    # If no assignee, assign to self
    assigned_to_id = payload.assigned_to_id or user_id
    assigned_to_name = payload.assigned_to_name or (current_user.full_name if assigned_to_id == user_id else None)

    task = UserTask(
        tenant_id=tenant_id,
        task_number=task_number,
        title=payload.title,
        description=payload.description,
        task_type=payload.task_type,
        scope=payload.scope,
        source=UserTaskSource.MANUAL.value,
        priority=payload.priority,
        due_date=payload.due_date,
        assigned_to_id=assigned_to_id,
        assigned_to_name=assigned_to_name,
        assigned_by_id=user_id,
        assigned_by_name=current_user.full_name,
        actions_json=payload.actions_json,
        tags_json=payload.tags_json,
        attachments_json=payload.attachments_json,
        watchers_json=payload.watchers_json,
        created_by_id=user_id,
        created_by_name=current_user.full_name,
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add watchers if provided (from watchers list or watchers_json)
    watcher_ids = payload.watchers or []
    if payload.watchers_json:
        try:
            watcher_ids = watcher_ids + json.loads(payload.watchers_json)
        except:
            pass

    # Remove duplicates
    watcher_ids = list(set(watcher_ids))

    if watcher_ids:
        for watcher_id in watcher_ids:
            watcher = UserTaskWatcher(
                tenant_id=tenant_id,
                task_id=task.id,
                user_id=watcher_id,
            )
            session.add(watcher)
        session.commit()

    return task.model_dump()


@router.get("/my-tasks/{task_id}")
def get_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get task details"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    # Get watchers
    watchers = session.exec(
        select(UserTaskWatcher).where(UserTaskWatcher.task_id == task_id)
    ).all()

    # Get comments
    comments = session.exec(
        select(UserTaskComment).where(UserTaskComment.task_id == task_id).order_by(UserTaskComment.created_at.desc())
    ).all()

    result = task.model_dump()
    result["watchers"] = [w.model_dump() for w in watchers]
    result["comments"] = [c.model_dump() for c in comments]

    return result


@router.patch("/my-tasks/{task_id}")
def update_task(
    task_id: str,
    payload: UserTaskUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)

    return task.model_dump()


@router.patch("/my-tasks/{task_id}/start")
def start_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start working on a task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.status != UserTaskStatus.PENDING.value:
        raise HTTPException(400, "Task cannot be started")

    task.status = UserTaskStatus.IN_PROGRESS.value
    task.started_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add comment for status change
    comment = UserTaskComment(
        tenant_id=tenant_id,
        task_id=task_id,
        content="Bắt đầu thực hiện task",
        comment_type="STATUS_CHANGE",
        user_id=str(current_user.id),
        user_name=current_user.full_name,
    )
    session.add(comment)
    task.comments_count += 1
    session.commit()

    return {"success": True, "task": task.model_dump()}


@router.patch("/my-tasks/{task_id}/complete")
def complete_task(
    task_id: str,
    payload: UserTaskComplete,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a task"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.status not in [UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value]:
        raise HTTPException(400, "Task cannot be completed")

    task.status = UserTaskStatus.COMPLETED.value
    task.result = payload.result or "COMPLETED"
    task.result_note = payload.result_note
    task.result_data = payload.result_data
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add comment for completion
    note_text = f" - {payload.result_note}" if payload.result_note else ""
    comment = UserTaskComment(
        tenant_id=tenant_id,
        task_id=task_id,
        content=f"Hoàn thành task{note_text}",
        comment_type="STATUS_CHANGE",
        user_id=user_id,
        user_name=current_user.full_name,
    )
    session.add(comment)
    task.comments_count += 1
    session.commit()

    return {"success": True, "task": task.model_dump()}


@router.patch("/my-tasks/{task_id}/cancel")
def cancel_task(
    task_id: str,
    reason: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel a task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.status == UserTaskStatus.COMPLETED.value:
        raise HTTPException(400, "Cannot cancel completed task")

    task.status = UserTaskStatus.CANCELLED.value
    task.result_note = reason
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add comment for cancellation
    comment = UserTaskComment(
        tenant_id=tenant_id,
        task_id=task_id,
        content=f"Hủy task: {reason}" if reason else "Hủy task",
        comment_type="STATUS_CHANGE",
        user_id=str(current_user.id),
        user_name=current_user.full_name,
    )
    session.add(comment)
    task.comments_count += 1
    session.commit()

    return {"success": True, "task": task.model_dump()}


# =====================================================
# APPROVAL ACTIONS
# =====================================================

@router.patch("/my-tasks/{task_id}/approve")
def approve_task(
    task_id: str,
    note: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a task (for APPROVAL type tasks)"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.task_type != UserTaskType.APPROVAL.value:
        raise HTTPException(400, "Task is not an approval task")

    if task.status not in [UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value]:
        raise HTTPException(400, "Task cannot be approved")

    task.status = UserTaskStatus.COMPLETED.value
    task.result = "APPROVED"
    task.result_note = note
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add comment
    comment = UserTaskComment(
        tenant_id=tenant_id,
        task_id=task_id,
        content=f"Đã phê duyệt{': ' + note if note else ''}",
        comment_type="APPROVAL",
        user_id=user_id,
        user_name=current_user.full_name,
    )
    session.add(comment)
    task.comments_count += 1
    session.commit()

    # TODO: Callback to source module if source_entity_id is set

    return {"success": True, "task": task.model_dump()}


@router.patch("/my-tasks/{task_id}/reject")
def reject_task(
    task_id: str,
    reason: str = Query(..., description="Reason for rejection"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject a task (for APPROVAL type tasks)"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    if task.task_type != UserTaskType.APPROVAL.value:
        raise HTTPException(400, "Task is not an approval task")

    if task.status not in [UserTaskStatus.PENDING.value, UserTaskStatus.IN_PROGRESS.value]:
        raise HTTPException(400, "Task cannot be rejected")

    task.status = UserTaskStatus.COMPLETED.value
    task.result = "REJECTED"
    task.result_note = reason
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add comment
    comment = UserTaskComment(
        tenant_id=tenant_id,
        task_id=task_id,
        content=f"Từ chối: {reason}",
        comment_type="REJECTION",
        user_id=user_id,
        user_name=current_user.full_name,
    )
    session.add(comment)
    task.comments_count += 1
    session.commit()

    # TODO: Callback to source module if source_entity_id is set

    return {"success": True, "task": task.model_dump()}


# =====================================================
# COMMENTS
# =====================================================

@router.post("/my-tasks/{task_id}/comments")
def add_comment(
    task_id: str,
    payload: UserTaskCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a comment to task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    comment = UserTaskComment(
        tenant_id=tenant_id,
        task_id=task_id,
        content=payload.content,
        comment_type="COMMENT",
        attachments_json=payload.attachments_json,
        user_id=str(current_user.id),
        user_name=current_user.full_name,
    )

    session.add(comment)
    task.comments_count += 1
    task.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(comment)

    return comment.model_dump()


@router.get("/my-tasks/{task_id}/comments")
def get_comments(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """Get comments for a task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    query = select(UserTaskComment).where(UserTaskComment.task_id == task_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(UserTaskComment.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
    }


# =====================================================
# WATCHERS
# =====================================================

@router.post("/my-tasks/{task_id}/watchers")
def add_watcher(
    task_id: str,
    payload: AddWatcherRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a watcher to task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    # Check if already watching
    existing = session.exec(
        select(UserTaskWatcher).where(
            UserTaskWatcher.task_id == task_id,
            UserTaskWatcher.user_id == payload.user_id
        )
    ).first()

    if existing:
        raise HTTPException(400, "User is already watching this task")

    watcher = UserTaskWatcher(
        tenant_id=tenant_id,
        task_id=task_id,
        user_id=payload.user_id,
        user_name=payload.user_name,
    )

    session.add(watcher)
    session.commit()
    session.refresh(watcher)

    return watcher.model_dump()


@router.delete("/my-tasks/{task_id}/watchers/{user_id}")
def remove_watcher(
    task_id: str,
    user_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a watcher from task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(UserTask, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    watcher = session.exec(
        select(UserTaskWatcher).where(
            UserTaskWatcher.task_id == task_id,
            UserTaskWatcher.user_id == user_id
        )
    ).first()

    if not watcher:
        raise HTTPException(404, "Watcher not found")

    session.delete(watcher)
    session.commit()

    return {"success": True}


# =====================================================
# SERVICE FUNCTION FOR OTHER MODULES
# =====================================================

def create_task_from_module(
    session: Session,
    tenant_id: str,
    title: str,
    assigned_to_id: str,
    source: str,
    task_type: str = UserTaskType.ACTION.value,
    description: Optional[str] = None,
    priority: str = UserTaskPriority.NORMAL.value,
    due_date: Optional[datetime] = None,
    source_entity_type: Optional[str] = None,
    source_entity_id: Optional[str] = None,
    source_entity_code: Optional[str] = None,
    source_url: Optional[str] = None,
    assigned_to_name: Optional[str] = None,
    assigned_by_id: Optional[str] = None,
    assigned_by_name: Optional[str] = None,
    actions_json: Optional[str] = None,
    watchers: Optional[List[str]] = None,
) -> UserTask:
    """
    Create a task from another module.

    This is a helper function for other modules to create tasks programmatically.

    Example usage from TMS:
        from app.api.v1.routes.user_tasks import create_task_from_module

        task = create_task_from_module(
            session=session,
            tenant_id=tenant_id,
            title=f"Xác nhận chuyến xe {trip.trip_number}",
            assigned_to_id=driver_user_id,
            source=UserTaskSource.TMS.value,
            task_type=UserTaskType.ACTION.value,
            source_entity_type="Trip",
            source_entity_id=trip.id,
            source_entity_code=trip.trip_number,
            source_url=f"/tms/trips/{trip.id}",
        )
    """
    task_number = generate_task_number(session, tenant_id)

    task = UserTask(
        tenant_id=tenant_id,
        task_number=task_number,
        title=title,
        description=description,
        task_type=task_type,
        scope=UserTaskScope.COMPANY.value,
        source=source,
        source_module=source,
        source_entity_type=source_entity_type,
        source_entity_id=source_entity_id,
        source_entity_code=source_entity_code,
        source_url=source_url,
        priority=priority,
        due_date=due_date,
        assigned_to_id=assigned_to_id,
        assigned_to_name=assigned_to_name,
        assigned_by_id=assigned_by_id,
        assigned_by_name=assigned_by_name,
        actions_json=actions_json,
        created_by_id=assigned_by_id,
        created_by_name=assigned_by_name,
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    # Add watchers if provided
    if watchers:
        for watcher_id in watchers:
            watcher = UserTaskWatcher(
                tenant_id=tenant_id,
                task_id=task.id,
                user_id=watcher_id,
            )
            session.add(watcher)
        session.commit()

    return task


def complete_task_from_module(
    session: Session,
    task_id: str,
    result: str = "COMPLETED",
    result_note: Optional[str] = None,
    result_data: Optional[str] = None,
) -> UserTask:
    """
    Complete a task from another module.

    This is used when the source module completes the action
    and needs to mark the task as done.
    """
    task = session.get(UserTask, task_id)
    if not task:
        raise ValueError("Task not found")

    task.status = UserTaskStatus.COMPLETED.value
    task.result = result
    task.result_note = result_note
    task.result_data = result_data
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return task
