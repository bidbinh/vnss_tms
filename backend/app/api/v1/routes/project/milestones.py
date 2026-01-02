"""
Project Management - Milestones API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.project import Milestone, MilestoneStatus, Task
from app.core.security import get_current_user

router = APIRouter()


class MilestoneCreate(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    deliverables: Optional[str] = None
    budget_checkpoint: Decimal = Decimal("0")
    requires_approval: bool = False
    notify_days_before: int = 7
    notes: Optional[str] = None


@router.get("/milestones")
def list_milestones(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all milestones"""
    tenant_id = str(current_user.tenant_id)

    query = select(Milestone).where(Milestone.tenant_id == tenant_id)

    if project_id:
        query = query.where(Milestone.project_id == project_id)

    if status:
        query = query.where(Milestone.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Milestone.due_date)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/milestones")
def create_milestone(
    payload: MilestoneCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new milestone"""
    tenant_id = str(current_user.tenant_id)

    milestone = Milestone(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=MilestoneStatus.NOT_STARTED.value,
        created_by=str(current_user.id),
    )

    session.add(milestone)
    session.commit()
    session.refresh(milestone)

    return milestone.model_dump()


@router.get("/milestones/{milestone_id}")
def get_milestone(
    milestone_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get milestone with linked tasks"""
    tenant_id = str(current_user.tenant_id)

    milestone = session.get(Milestone, milestone_id)
    if not milestone or str(milestone.tenant_id) != tenant_id:
        raise HTTPException(404, "Milestone not found")

    # Get linked tasks
    tasks = session.exec(
        select(Task).where(
            Task.tenant_id == tenant_id,
            Task.milestone_id == milestone_id
        ).order_by(Task.position)
    ).all()

    result = milestone.model_dump()
    result["tasks"] = [t.model_dump() for t in tasks]

    # Calculate progress
    if tasks:
        completed = len([t for t in tasks if t.status == "DONE"])
        result["total_tasks"] = len(tasks)
        result["completed_tasks"] = completed
        result["progress_percent"] = round((completed / len(tasks)) * 100, 2)

    return result


@router.put("/milestones/{milestone_id}")
def update_milestone(
    milestone_id: str,
    payload: MilestoneCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a milestone"""
    tenant_id = str(current_user.tenant_id)

    milestone = session.get(Milestone, milestone_id)
    if not milestone or str(milestone.tenant_id) != tenant_id:
        raise HTTPException(404, "Milestone not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "project_id":
            setattr(milestone, key, value)

    milestone.updated_at = datetime.utcnow()

    session.add(milestone)
    session.commit()
    session.refresh(milestone)

    return milestone.model_dump()


@router.post("/milestones/{milestone_id}/complete")
def complete_milestone(
    milestone_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a milestone"""
    tenant_id = str(current_user.tenant_id)

    milestone = session.get(Milestone, milestone_id)
    if not milestone or str(milestone.tenant_id) != tenant_id:
        raise HTTPException(404, "Milestone not found")

    milestone.status = MilestoneStatus.COMPLETED.value
    milestone.completed_date = date.today()
    milestone.progress_percent = Decimal("100")
    milestone.completed_by = str(current_user.id)
    milestone.updated_at = datetime.utcnow()

    session.add(milestone)
    session.commit()
    session.refresh(milestone)

    return {"success": True, "milestone": milestone.model_dump()}


@router.post("/milestones/{milestone_id}/approve")
def approve_milestone(
    milestone_id: str,
    notes: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a milestone (gate approval)"""
    tenant_id = str(current_user.tenant_id)

    milestone = session.get(Milestone, milestone_id)
    if not milestone or str(milestone.tenant_id) != tenant_id:
        raise HTTPException(404, "Milestone not found")

    if not milestone.requires_approval:
        raise HTTPException(400, "Milestone does not require approval")

    milestone.approved_by = str(current_user.id)
    milestone.approved_at = datetime.utcnow()
    milestone.approval_notes = notes
    milestone.updated_at = datetime.utcnow()

    session.add(milestone)
    session.commit()
    session.refresh(milestone)

    return {"success": True, "milestone": milestone.model_dump()}
