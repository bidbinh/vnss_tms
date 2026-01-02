"""
Project Management - Projects API Routes
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
    Project, ProjectStatus, ProjectPriority, ProjectType,
    ProjectMember, MemberRole,
    ProjectPhase, PhaseStatus,
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    project_type: str = ProjectType.INTERNAL.value
    priority: str = ProjectPriority.MEDIUM.value
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_amount: Decimal = Decimal("0")
    currency: str = "VND"
    estimated_hours: Decimal = Decimal("0")
    category: Optional[str] = None
    notes: Optional[str] = None


class ProjectMemberCreate(BaseModel):
    project_id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role: str = MemberRole.MEMBER.value
    allocation_percent: Decimal = Decimal("100")
    hourly_rate: Decimal = Decimal("0")
    join_date: Optional[date] = None


class ProjectPhaseCreate(BaseModel):
    project_id: str
    phase_number: int = 1
    name: str
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    weight_percent: Decimal = Decimal("0")
    budget_amount: Decimal = Decimal("0")
    deliverables: Optional[str] = None


# =====================
# PROJECTS
# =====================

@router.get("/projects")
def list_projects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    project_type: Optional[str] = Query(None),
    manager_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all projects"""
    tenant_id = str(current_user.tenant_id)

    query = select(Project).where(Project.tenant_id == tenant_id)

    if status:
        query = query.where(Project.status == status)

    if project_type:
        query = query.where(Project.project_type == project_type)

    if manager_id:
        query = query.where(Project.manager_id == manager_id)

    if search:
        query = query.where(
            (Project.name.ilike(f"%{search}%")) |
            (Project.code.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Project.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/projects")
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new project"""
    tenant_id = str(current_user.tenant_id)

    # Generate code if not provided
    if not payload.code:
        count = session.exec(
            select(func.count(Project.id)).where(
                Project.tenant_id == tenant_id
            )
        ).one() or 0
        payload.code = f"PRJ-{datetime.now().year}-{count + 1:04d}"

    project = Project(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=ProjectStatus.DRAFT.value,
        created_by=str(current_user.id),
    )

    session.add(project)
    session.commit()
    session.refresh(project)

    # Auto-add creator as project manager
    member = ProjectMember(
        tenant_id=tenant_id,
        project_id=str(project.id),
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        user_email=current_user.email,
        role=MemberRole.MANAGER.value,
        join_date=date.today(),
        created_by=str(current_user.id),
    )
    session.add(member)
    session.commit()

    return project.model_dump()


@router.get("/projects/{project_id}")
def get_project(
    project_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get project with details"""
    tenant_id = str(current_user.tenant_id)

    project = session.get(Project, project_id)
    if not project or str(project.tenant_id) != tenant_id:
        raise HTTPException(404, "Project not found")

    # Get members
    members = session.exec(
        select(ProjectMember).where(
            ProjectMember.tenant_id == tenant_id,
            ProjectMember.project_id == project_id,
            ProjectMember.is_active == True
        )
    ).all()

    # Get phases
    phases = session.exec(
        select(ProjectPhase).where(
            ProjectPhase.tenant_id == tenant_id,
            ProjectPhase.project_id == project_id
        ).order_by(ProjectPhase.phase_number)
    ).all()

    result = project.model_dump()
    result["members"] = [m.model_dump() for m in members]
    result["phases"] = [p.model_dump() for p in phases]

    return result


@router.put("/projects/{project_id}")
def update_project(
    project_id: str,
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a project"""
    tenant_id = str(current_user.tenant_id)

    project = session.get(Project, project_id)
    if not project or str(project.tenant_id) != tenant_id:
        raise HTTPException(404, "Project not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "code":  # Don't update code
            setattr(project, key, value)

    project.updated_at = datetime.utcnow()
    project.updated_by = str(current_user.id)

    session.add(project)
    session.commit()
    session.refresh(project)

    return project.model_dump()


@router.post("/projects/{project_id}/start")
def start_project(
    project_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start a project"""
    tenant_id = str(current_user.tenant_id)

    project = session.get(Project, project_id)
    if not project or str(project.tenant_id) != tenant_id:
        raise HTTPException(404, "Project not found")

    if project.status not in [ProjectStatus.DRAFT.value, ProjectStatus.PLANNING.value]:
        raise HTTPException(400, "Project cannot be started")

    project.status = ProjectStatus.IN_PROGRESS.value
    project.actual_start_date = date.today()
    project.updated_at = datetime.utcnow()

    session.add(project)
    session.commit()
    session.refresh(project)

    return {"success": True, "project": project.model_dump()}


@router.post("/projects/{project_id}/complete")
def complete_project(
    project_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a project"""
    tenant_id = str(current_user.tenant_id)

    project = session.get(Project, project_id)
    if not project or str(project.tenant_id) != tenant_id:
        raise HTTPException(404, "Project not found")

    if project.status != ProjectStatus.IN_PROGRESS.value:
        raise HTTPException(400, "Only in-progress projects can be completed")

    project.status = ProjectStatus.COMPLETED.value
    project.actual_end_date = date.today()
    project.progress_percent = Decimal("100")
    project.updated_at = datetime.utcnow()

    session.add(project)
    session.commit()
    session.refresh(project)

    return {"success": True, "project": project.model_dump()}


# =====================
# PROJECT MEMBERS
# =====================

@router.post("/project-members")
def add_project_member(
    payload: ProjectMemberCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add member to project"""
    tenant_id = str(current_user.tenant_id)

    # Check if already member
    existing = session.exec(
        select(ProjectMember).where(
            ProjectMember.tenant_id == tenant_id,
            ProjectMember.project_id == payload.project_id,
            ProjectMember.user_id == payload.user_id,
            ProjectMember.is_active == True
        )
    ).first()

    if existing:
        raise HTTPException(400, "User is already a member of this project")

    member = ProjectMember(
        tenant_id=tenant_id,
        **payload.model_dump(),
        is_active=True,
        created_by=str(current_user.id),
    )

    session.add(member)
    session.commit()
    session.refresh(member)

    return member.model_dump()


@router.delete("/project-members/{member_id}")
def remove_project_member(
    member_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove member from project"""
    tenant_id = str(current_user.tenant_id)

    member = session.get(ProjectMember, member_id)
    if not member or str(member.tenant_id) != tenant_id:
        raise HTTPException(404, "Member not found")

    member.is_active = False
    member.leave_date = date.today()
    member.updated_at = datetime.utcnow()

    session.add(member)
    session.commit()

    return {"success": True}


# =====================
# PROJECT PHASES
# =====================

@router.post("/project-phases")
def create_phase(
    payload: ProjectPhaseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a project phase"""
    tenant_id = str(current_user.tenant_id)

    phase = ProjectPhase(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=PhaseStatus.NOT_STARTED.value,
        created_by=str(current_user.id),
    )

    session.add(phase)
    session.commit()
    session.refresh(phase)

    return phase.model_dump()


@router.put("/project-phases/{phase_id}")
def update_phase(
    phase_id: str,
    payload: ProjectPhaseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a project phase"""
    tenant_id = str(current_user.tenant_id)

    phase = session.get(ProjectPhase, phase_id)
    if not phase or str(phase.tenant_id) != tenant_id:
        raise HTTPException(404, "Phase not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "project_id":
            setattr(phase, key, value)

    phase.updated_at = datetime.utcnow()

    session.add(phase)
    session.commit()
    session.refresh(phase)

    return phase.model_dump()


@router.post("/project-phases/{phase_id}/complete")
def complete_phase(
    phase_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a project phase"""
    tenant_id = str(current_user.tenant_id)

    phase = session.get(ProjectPhase, phase_id)
    if not phase or str(phase.tenant_id) != tenant_id:
        raise HTTPException(404, "Phase not found")

    phase.status = PhaseStatus.COMPLETED.value
    phase.actual_end_date = date.today()
    phase.progress_percent = Decimal("100")
    phase.updated_at = datetime.utcnow()

    session.add(phase)
    session.commit()
    session.refresh(phase)

    return {"success": True, "phase": phase.model_dump()}
