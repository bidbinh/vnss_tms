"""
HRM - Team API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User
from app.models.hrm.department import Team, Department
from app.models.hrm.employee import Employee
from app.core.security import get_current_user

router = APIRouter(prefix="/teams", tags=["HRM - Teams"])


class TeamCreate(BaseModel):
    code: str
    name: str
    department_id: str
    leader_id: Optional[str] = None
    notes: Optional[str] = None


class TeamUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[str] = None
    leader_id: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


@router.get("")
def list_teams(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    department_id: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
):
    """List all teams"""
    tenant_id = str(current_user.tenant_id)

    query = select(Team).where(Team.tenant_id == tenant_id)

    if department_id:
        query = query.where(Team.department_id == department_id)

    if not include_inactive:
        query = query.where(Team.is_active == True)

    query = query.order_by(Team.name)
    teams = session.exec(query).all()

    # Enrich with info
    result = []
    for team in teams:
        team_dict = team.model_dump()

        # Count members
        member_count = session.exec(
            select(func.count()).where(
                Employee.team_id == team.id,
                Employee.status == "ACTIVE"
            )
        ).one()
        team_dict["member_count"] = member_count

        # Department name
        dept = session.get(Department, team.department_id)
        team_dict["department_name"] = dept.name if dept else None

        # Leader info
        if team.leader_id:
            leader = session.get(Employee, team.leader_id)
            team_dict["leader"] = {
                "id": leader.id,
                "full_name": leader.full_name,
                "employee_code": leader.employee_code
            } if leader else None
        else:
            team_dict["leader"] = None

        result.append(team_dict)

    return result


@router.get("/{team_id}")
def get_team(
    team_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get team details"""
    tenant_id = str(current_user.tenant_id)

    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if str(team.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    team_dict = team.model_dump()

    # Get members
    members = session.exec(
        select(Employee).where(
            Employee.team_id == team_id,
            Employee.status == "ACTIVE"
        ).order_by(Employee.full_name)
    ).all()

    team_dict["members"] = [
        {
            "id": m.id,
            "employee_code": m.employee_code,
            "full_name": m.full_name,
            "position_id": m.position_id
        }
        for m in members
    ]

    return team_dict


@router.post("")
def create_team(
    payload: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create new team"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can create teams")

    tenant_id = str(current_user.tenant_id)

    # Verify department exists
    dept = session.get(Department, payload.department_id)
    if not dept or str(dept.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid department_id")

    # Check if code already exists
    existing = session.exec(
        select(Team).where(
            Team.tenant_id == tenant_id,
            Team.code == payload.code
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Team code {payload.code} already exists")

    team = Team(
        tenant_id=tenant_id,
        **payload.model_dump()
    )

    session.add(team)
    session.commit()
    session.refresh(team)

    return team


@router.patch("/{team_id}")
def update_team(
    team_id: str,
    payload: TeamUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update team"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can update teams")

    tenant_id = str(current_user.tenant_id)

    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if str(team.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(team, key, value)

    session.add(team)
    session.commit()
    session.refresh(team)

    return team


@router.delete("/{team_id}")
def delete_team(
    team_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate team"""
    if current_user.role not in ("ADMIN", "HR_MANAGER"):
        raise HTTPException(403, "Only ADMIN or HR_MANAGER can delete teams")

    tenant_id = str(current_user.tenant_id)

    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if str(team.tenant_id) != tenant_id:
        raise HTTPException(403, "Access denied")

    # Check if team has members
    member_count = session.exec(
        select(func.count()).where(
            Employee.team_id == team_id,
            Employee.status == "ACTIVE"
        )
    ).one()

    if member_count > 0:
        raise HTTPException(400, f"Cannot delete team with {member_count} active members")

    team.is_active = False
    session.add(team)
    session.commit()

    return {"message": "Team deactivated successfully"}
