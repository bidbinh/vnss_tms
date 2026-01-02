"""
Project Management - Tasks API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.project import (
    Task, TaskStatus, TaskPriority, TaskType,
    TaskDependency, DependencyType,
    TaskAssignment, TaskComment, TaskAttachment,
    TaskChecklist, ChecklistItem,
    Project,
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class TaskCreate(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    milestone_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    task_type: str = TaskType.TASK.value
    priority: str = TaskPriority.MEDIUM.value
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Decimal = Decimal("0")
    story_points: Optional[int] = None
    labels: Optional[str] = None
    notes: Optional[str] = None


class TaskCommentCreate(BaseModel):
    task_id: str
    content: str
    parent_comment_id: Optional[str] = None


class ChecklistCreate(BaseModel):
    task_id: str
    name: str = "Checklist"


class ChecklistItemCreate(BaseModel):
    checklist_id: str
    content: str


# =====================
# TASKS
# =====================

@router.get("/tasks")
def list_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    project_id: Optional[str] = Query(None),
    phase_id: Optional[str] = Query(None),
    milestone_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all tasks"""
    tenant_id = str(current_user.tenant_id)

    query = select(Task).where(Task.tenant_id == tenant_id)

    if project_id:
        query = query.where(Task.project_id == project_id)

    if phase_id:
        query = query.where(Task.phase_id == phase_id)

    if milestone_id:
        query = query.where(Task.milestone_id == milestone_id)

    if status:
        query = query.where(Task.status == status)

    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)

    if priority:
        query = query.where(Task.priority == priority)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Task.position, Task.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/tasks")
def create_task(
    payload: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new task"""
    tenant_id = str(current_user.tenant_id)

    # Generate task number
    count = session.exec(
        select(func.count(Task.id)).where(
            Task.tenant_id == tenant_id,
            Task.project_id == payload.project_id
        )
    ).one() or 0

    task_number = f"TASK-{count + 1:04d}"

    task = Task(
        tenant_id=tenant_id,
        task_number=task_number,
        **payload.model_dump(),
        status=TaskStatus.TODO.value,
        reporter_id=str(current_user.id),
        reporter_name=current_user.full_name,
        created_by=str(current_user.id),
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    # Update project task count
    project = session.get(Project, payload.project_id)
    if project:
        project.total_tasks = (project.total_tasks or 0) + 1
        session.add(project)
        session.commit()

    return task.model_dump()


@router.get("/tasks/{task_id}")
def get_task(
    task_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get task with details"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(Task, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    # Get comments
    comments = session.exec(
        select(TaskComment).where(
            TaskComment.tenant_id == tenant_id,
            TaskComment.task_id == task_id
        ).order_by(TaskComment.created_at.desc())
    ).all()

    # Get checklists
    checklists = session.exec(
        select(TaskChecklist).where(
            TaskChecklist.tenant_id == tenant_id,
            TaskChecklist.task_id == task_id
        ).order_by(TaskChecklist.position)
    ).all()

    checklist_data = []
    for cl in checklists:
        cl_dict = cl.model_dump()
        items = session.exec(
            select(ChecklistItem).where(
                ChecklistItem.checklist_id == str(cl.id)
            ).order_by(ChecklistItem.position)
        ).all()
        cl_dict["items"] = [i.model_dump() for i in items]
        checklist_data.append(cl_dict)

    # Get subtasks
    subtasks = session.exec(
        select(Task).where(
            Task.tenant_id == tenant_id,
            Task.parent_task_id == task_id
        ).order_by(Task.position)
    ).all()

    result = task.model_dump()
    result["comments"] = [c.model_dump() for c in comments]
    result["checklists"] = checklist_data
    result["subtasks"] = [s.model_dump() for s in subtasks]

    return result


@router.put("/tasks/{task_id}")
def update_task(
    task_id: str,
    payload: TaskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a task"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(Task, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "project_id":
            setattr(task, key, value)

    task.updated_at = datetime.utcnow()
    task.updated_by = str(current_user.id)

    session.add(task)
    session.commit()
    session.refresh(task)

    return task.model_dump()


@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    status: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update task status"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(Task, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    old_status = task.status
    task.status = status
    task.updated_at = datetime.utcnow()
    task.updated_by = str(current_user.id)

    if status == TaskStatus.DONE.value:
        task.completed_at = datetime.utcnow()
        task.completed_by = str(current_user.id)
        task.progress_percent = Decimal("100")

        # Update project completed tasks
        project = session.get(Project, task.project_id)
        if project:
            project.completed_tasks = (project.completed_tasks or 0) + 1
            if project.total_tasks > 0:
                project.progress_percent = Decimal(str(
                    (project.completed_tasks / project.total_tasks) * 100
                ))
            session.add(project)

    elif status == TaskStatus.IN_PROGRESS.value and not task.actual_start_date:
        task.actual_start_date = date.today()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}


@router.patch("/tasks/{task_id}/assign")
def assign_task(
    task_id: str,
    assignee_id: str = Query(...),
    assignee_name: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Assign task to user"""
    tenant_id = str(current_user.tenant_id)

    task = session.get(Task, task_id)
    if not task or str(task.tenant_id) != tenant_id:
        raise HTTPException(404, "Task not found")

    task.assignee_id = assignee_id
    task.assignee_name = assignee_name
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)

    return {"success": True, "task": task.model_dump()}


# =====================
# TASK COMMENTS
# =====================

@router.post("/task-comments")
def add_comment(
    payload: TaskCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add comment to task"""
    tenant_id = str(current_user.tenant_id)

    comment = TaskComment(
        tenant_id=tenant_id,
        **payload.model_dump(),
        author_id=str(current_user.id),
        author_name=current_user.full_name,
    )

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment.model_dump()


@router.delete("/task-comments/{comment_id}")
def delete_comment(
    comment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete task comment"""
    tenant_id = str(current_user.tenant_id)

    comment = session.get(TaskComment, comment_id)
    if not comment or str(comment.tenant_id) != tenant_id:
        raise HTTPException(404, "Comment not found")

    if str(comment.author_id) != str(current_user.id):
        raise HTTPException(403, "Can only delete your own comments")

    session.delete(comment)
    session.commit()

    return {"success": True}


# =====================
# CHECKLISTS
# =====================

@router.post("/task-checklists")
def create_checklist(
    payload: ChecklistCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create task checklist"""
    tenant_id = str(current_user.tenant_id)

    checklist = TaskChecklist(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(checklist)
    session.commit()
    session.refresh(checklist)

    return checklist.model_dump()


@router.post("/checklist-items")
def add_checklist_item(
    payload: ChecklistItemCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add item to checklist"""
    tenant_id = str(current_user.tenant_id)

    # Get current count for position
    count = session.exec(
        select(func.count(ChecklistItem.id)).where(
            ChecklistItem.checklist_id == payload.checklist_id
        )
    ).one() or 0

    item = ChecklistItem(
        tenant_id=tenant_id,
        **payload.model_dump(),
        position=count,
    )

    session.add(item)
    session.flush()

    # Update checklist counts
    checklist = session.get(TaskChecklist, payload.checklist_id)
    if checklist:
        checklist.total_items = (checklist.total_items or 0) + 1
        session.add(checklist)

    session.commit()
    session.refresh(item)

    return item.model_dump()


@router.patch("/checklist-items/{item_id}/toggle")
def toggle_checklist_item(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Toggle checklist item"""
    tenant_id = str(current_user.tenant_id)

    item = session.get(ChecklistItem, item_id)
    if not item or str(item.tenant_id) != tenant_id:
        raise HTTPException(404, "Item not found")

    item.is_checked = not item.is_checked
    if item.is_checked:
        item.checked_at = datetime.utcnow()
        item.checked_by = str(current_user.id)
    else:
        item.checked_at = None
        item.checked_by = None

    session.add(item)

    # Update checklist completed count
    checklist = session.get(TaskChecklist, item.checklist_id)
    if checklist:
        if item.is_checked:
            checklist.completed_items = (checklist.completed_items or 0) + 1
        else:
            checklist.completed_items = max(0, (checklist.completed_items or 0) - 1)
        session.add(checklist)

    session.commit()
    session.refresh(item)

    return {"success": True, "item": item.model_dump()}
