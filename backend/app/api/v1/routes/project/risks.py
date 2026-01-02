"""
Project Management - Risks API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.project import (
    ProjectRisk, RiskStatus, RiskProbability, RiskImpact,
    RiskMitigation,
)
from app.core.security import get_current_user

router = APIRouter()


class RiskCreate(BaseModel):
    project_id: str
    title: str
    description: str
    category: Optional[str] = None
    probability: str = RiskProbability.MEDIUM.value
    impact: str = RiskImpact.MODERATE.value
    cost_impact: Decimal = Decimal("0")
    schedule_impact_days: int = 0
    scope_impact: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    target_resolution_date: Optional[date] = None
    response_strategy: Optional[str] = None
    response_plan: Optional[str] = None
    contingency_plan: Optional[str] = None
    trigger_conditions: Optional[str] = None
    notes: Optional[str] = None


class MitigationCreate(BaseModel):
    risk_id: str
    action_description: str
    action_type: str = "PREVENTIVE"
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    due_date: Optional[date] = None
    estimated_cost: Decimal = Decimal("0")
    notes: Optional[str] = None


# Risk score calculation
PROBABILITY_SCORES = {
    RiskProbability.VERY_LOW.value: 1,
    RiskProbability.LOW.value: 2,
    RiskProbability.MEDIUM.value: 3,
    RiskProbability.HIGH.value: 4,
    RiskProbability.VERY_HIGH.value: 5,
}

IMPACT_SCORES = {
    RiskImpact.NEGLIGIBLE.value: 1,
    RiskImpact.MINOR.value: 2,
    RiskImpact.MODERATE.value: 3,
    RiskImpact.MAJOR.value: 4,
    RiskImpact.CRITICAL.value: 5,
}


@router.get("/risks")
def list_risks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    probability: Optional[str] = Query(None),
    impact: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all risks"""
    tenant_id = str(current_user.tenant_id)

    query = select(ProjectRisk).where(ProjectRisk.tenant_id == tenant_id)

    if project_id:
        query = query.where(ProjectRisk.project_id == project_id)

    if status:
        query = query.where(ProjectRisk.status == status)

    if probability:
        query = query.where(ProjectRisk.probability == probability)

    if impact:
        query = query.where(ProjectRisk.impact == impact)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination - order by risk score descending
    query = query.order_by(ProjectRisk.risk_score.desc(), ProjectRisk.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/risks")
def create_risk(
    payload: RiskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new risk"""
    tenant_id = str(current_user.tenant_id)

    # Generate risk number
    count = session.exec(
        select(func.count(ProjectRisk.id)).where(
            ProjectRisk.tenant_id == tenant_id,
            ProjectRisk.project_id == payload.project_id
        )
    ).one() or 0

    risk_number = f"RISK-{count + 1:03d}"

    # Calculate risk score
    prob_score = PROBABILITY_SCORES.get(payload.probability, 3)
    impact_score = IMPACT_SCORES.get(payload.impact, 3)
    risk_score = Decimal(str(prob_score * impact_score))

    risk = ProjectRisk(
        tenant_id=tenant_id,
        risk_number=risk_number,
        **payload.model_dump(),
        risk_score=risk_score,
        status=RiskStatus.IDENTIFIED.value,
        identified_date=date.today(),
        created_by=str(current_user.id),
    )

    session.add(risk)
    session.commit()
    session.refresh(risk)

    return risk.model_dump()


@router.get("/risks/{risk_id}")
def get_risk(
    risk_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get risk with mitigations"""
    tenant_id = str(current_user.tenant_id)

    risk = session.get(ProjectRisk, risk_id)
    if not risk or str(risk.tenant_id) != tenant_id:
        raise HTTPException(404, "Risk not found")

    # Get mitigations
    mitigations = session.exec(
        select(RiskMitigation).where(
            RiskMitigation.tenant_id == tenant_id,
            RiskMitigation.risk_id == risk_id
        ).order_by(RiskMitigation.action_number)
    ).all()

    result = risk.model_dump()
    result["mitigations"] = [m.model_dump() for m in mitigations]

    return result


@router.put("/risks/{risk_id}")
def update_risk(
    risk_id: str,
    payload: RiskCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a risk"""
    tenant_id = str(current_user.tenant_id)

    risk = session.get(ProjectRisk, risk_id)
    if not risk or str(risk.tenant_id) != tenant_id:
        raise HTTPException(404, "Risk not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "project_id":
            setattr(risk, key, value)

    # Recalculate risk score
    prob_score = PROBABILITY_SCORES.get(risk.probability, 3)
    impact_score = IMPACT_SCORES.get(risk.impact, 3)
    risk.risk_score = Decimal(str(prob_score * impact_score))

    risk.updated_at = datetime.utcnow()
    risk.updated_by = str(current_user.id)

    session.add(risk)
    session.commit()
    session.refresh(risk)

    return risk.model_dump()


@router.patch("/risks/{risk_id}/status")
def update_risk_status(
    risk_id: str,
    status: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update risk status"""
    tenant_id = str(current_user.tenant_id)

    risk = session.get(ProjectRisk, risk_id)
    if not risk or str(risk.tenant_id) != tenant_id:
        raise HTTPException(404, "Risk not found")

    risk.status = status
    risk.updated_at = datetime.utcnow()
    risk.updated_by = str(current_user.id)

    if status in [RiskStatus.RESOLVED.value, RiskStatus.CLOSED.value]:
        risk.actual_resolution_date = date.today()

    session.add(risk)
    session.commit()
    session.refresh(risk)

    return {"success": True, "risk": risk.model_dump()}


# =====================
# RISK MITIGATIONS
# =====================

@router.post("/risk-mitigations")
def create_mitigation(
    payload: MitigationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a risk mitigation action"""
    tenant_id = str(current_user.tenant_id)

    # Get next action number
    count = session.exec(
        select(func.count(RiskMitigation.id)).where(
            RiskMitigation.risk_id == payload.risk_id
        )
    ).one() or 0

    mitigation = RiskMitigation(
        tenant_id=tenant_id,
        **payload.model_dump(),
        action_number=count + 1,
        status="PLANNED",
        created_by=str(current_user.id),
    )

    session.add(mitigation)
    session.commit()
    session.refresh(mitigation)

    return mitigation.model_dump()


@router.put("/risk-mitigations/{mitigation_id}")
def update_mitigation(
    mitigation_id: str,
    payload: MitigationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a risk mitigation"""
    tenant_id = str(current_user.tenant_id)

    mitigation = session.get(RiskMitigation, mitigation_id)
    if not mitigation or str(mitigation.tenant_id) != tenant_id:
        raise HTTPException(404, "Mitigation not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "risk_id":
            setattr(mitigation, key, value)

    mitigation.updated_at = datetime.utcnow()

    session.add(mitigation)
    session.commit()
    session.refresh(mitigation)

    return mitigation.model_dump()


@router.patch("/risk-mitigations/{mitigation_id}/complete")
def complete_mitigation(
    mitigation_id: str,
    result: Optional[str] = Query(None),
    effectiveness: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a mitigation action"""
    tenant_id = str(current_user.tenant_id)

    mitigation = session.get(RiskMitigation, mitigation_id)
    if not mitigation or str(mitigation.tenant_id) != tenant_id:
        raise HTTPException(404, "Mitigation not found")

    mitigation.status = "COMPLETED"
    mitigation.progress_percent = Decimal("100")
    mitigation.completed_date = date.today()
    mitigation.result = result
    mitigation.effectiveness = effectiveness
    mitigation.updated_at = datetime.utcnow()

    session.add(mitigation)
    session.commit()
    session.refresh(mitigation)

    return {"success": True, "mitigation": mitigation.model_dump()}
