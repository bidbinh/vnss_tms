"""
Workflow Engine - Definitions API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.workflow import (
    WorkflowDefinition, WorkflowStatus, WorkflowType, WorkflowCategory,
    WorkflowStep, StepType,
    WorkflowTransition,
)
from app.core.security import get_current_user
from app.services.workflow_seed import seed_workflows

router = APIRouter()


class WorkflowDefinitionCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    workflow_type: str = WorkflowType.APPROVAL.value
    category: str = WorkflowCategory.GENERAL.value
    entity_type: Optional[str] = None
    entity_module: Optional[str] = None
    allow_parallel: bool = False
    allow_delegation: bool = True
    allow_recall: bool = True
    default_sla_hours: Optional[int] = None
    escalation_enabled: bool = False
    notes: Optional[str] = None


class WorkflowStepCreate(BaseModel):
    workflow_id: str
    step_order: int = 1
    code: str
    name: str
    description: Optional[str] = None
    step_type: str = StepType.TASK.value
    assignee_type: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_expression: Optional[str] = None
    require_all_approvers: bool = False
    min_approvers: int = 1
    sla_hours: Optional[int] = None
    reminder_hours: Optional[int] = None
    escalation_hours: Optional[int] = None
    escalation_to: Optional[str] = None
    allowed_actions: Optional[str] = None
    position_x: int = 0
    position_y: int = 0


class WorkflowTransitionCreate(BaseModel):
    workflow_id: str
    from_step_id: str
    to_step_id: str
    name: Optional[str] = None
    trigger_action: Optional[str] = None
    condition_expression: Optional[str] = None
    priority: int = 0


@router.get("/workflow-definitions")
def list_definitions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    workflow_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all workflow definitions"""
    tenant_id = str(current_user.tenant_id)

    query = select(WorkflowDefinition).where(
        WorkflowDefinition.tenant_id == tenant_id,
        WorkflowDefinition.is_current_version == True
    )

    if status:
        query = query.where(WorkflowDefinition.status == status)

    if workflow_type:
        query = query.where(WorkflowDefinition.workflow_type == workflow_type)

    if category:
        query = query.where(WorkflowDefinition.category == category)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(WorkflowDefinition.name)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/workflow-definitions")
def create_definition(
    payload: WorkflowDefinitionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new workflow definition"""
    tenant_id = str(current_user.tenant_id)

    # Check unique code
    existing = session.exec(
        select(WorkflowDefinition).where(
            WorkflowDefinition.tenant_id == tenant_id,
            WorkflowDefinition.code == payload.code,
            WorkflowDefinition.is_current_version == True
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Workflow code '{payload.code}' already exists")

    definition = WorkflowDefinition(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=WorkflowStatus.DRAFT.value,
        version=1,
        is_current_version=True,
        created_by=str(current_user.id),
    )

    session.add(definition)
    session.commit()
    session.refresh(definition)

    return definition.model_dump()


@router.get("/workflow-definitions/{definition_id}")
def get_definition(
    definition_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get workflow definition with steps"""
    tenant_id = str(current_user.tenant_id)

    definition = session.get(WorkflowDefinition, definition_id)
    if not definition or str(definition.tenant_id) != tenant_id:
        raise HTTPException(404, "Workflow definition not found")

    # Get steps
    steps = session.exec(
        select(WorkflowStep).where(
            WorkflowStep.workflow_id == definition_id
        ).order_by(WorkflowStep.step_order)
    ).all()

    # Get transitions
    transitions = session.exec(
        select(WorkflowTransition).where(
            WorkflowTransition.workflow_id == definition_id
        )
    ).all()

    result = definition.model_dump()
    result["steps"] = [s.model_dump() for s in steps]
    result["transitions"] = [t.model_dump() for t in transitions]

    return result


@router.put("/workflow-definitions/{definition_id}")
def update_definition(
    definition_id: str,
    payload: WorkflowDefinitionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a workflow definition"""
    tenant_id = str(current_user.tenant_id)

    definition = session.get(WorkflowDefinition, definition_id)
    if not definition or str(definition.tenant_id) != tenant_id:
        raise HTTPException(404, "Workflow definition not found")

    if definition.status == WorkflowStatus.ACTIVE.value:
        raise HTTPException(400, "Cannot update active workflow. Create a new version instead.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "code":
            setattr(definition, key, value)

    definition.updated_at = datetime.utcnow()
    definition.updated_by = str(current_user.id)

    session.add(definition)
    session.commit()
    session.refresh(definition)

    return definition.model_dump()


@router.post("/workflow-definitions/{definition_id}/activate")
def activate_definition(
    definition_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Activate a workflow definition"""
    tenant_id = str(current_user.tenant_id)

    definition = session.get(WorkflowDefinition, definition_id)
    if not definition or str(definition.tenant_id) != tenant_id:
        raise HTTPException(404, "Workflow definition not found")

    if definition.status not in [WorkflowStatus.DRAFT.value, WorkflowStatus.INACTIVE.value]:
        raise HTTPException(400, "Cannot activate workflow in current status")

    # Check has at least one step
    steps = session.exec(
        select(WorkflowStep).where(WorkflowStep.workflow_id == definition_id)
    ).all()
    if not steps:
        raise HTTPException(400, "Workflow must have at least one step")

    definition.status = WorkflowStatus.ACTIVE.value
    definition.activated_at = datetime.utcnow()
    definition.activated_by = str(current_user.id)
    definition.updated_at = datetime.utcnow()

    session.add(definition)
    session.commit()
    session.refresh(definition)

    return {"success": True, "definition": definition.model_dump()}


@router.post("/workflow-definitions/{definition_id}/deactivate")
def deactivate_definition(
    definition_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a workflow definition"""
    tenant_id = str(current_user.tenant_id)

    definition = session.get(WorkflowDefinition, definition_id)
    if not definition or str(definition.tenant_id) != tenant_id:
        raise HTTPException(404, "Workflow definition not found")

    if definition.status != WorkflowStatus.ACTIVE.value:
        raise HTTPException(400, "Only active workflows can be deactivated")

    definition.status = WorkflowStatus.INACTIVE.value
    definition.updated_at = datetime.utcnow()

    session.add(definition)
    session.commit()
    session.refresh(definition)

    return {"success": True, "definition": definition.model_dump()}


# =====================
# WORKFLOW STEPS
# =====================

@router.post("/workflow-steps")
def create_step(
    payload: WorkflowStepCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a workflow step"""
    tenant_id = str(current_user.tenant_id)

    step = WorkflowStep(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(step)
    session.commit()
    session.refresh(step)

    return step.model_dump()


@router.put("/workflow-steps/{step_id}")
def update_step(
    step_id: str,
    payload: WorkflowStepCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a workflow step"""
    tenant_id = str(current_user.tenant_id)

    step = session.get(WorkflowStep, step_id)
    if not step or str(step.tenant_id) != tenant_id:
        raise HTTPException(404, "Step not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "workflow_id":
            setattr(step, key, value)

    step.updated_at = datetime.utcnow()

    session.add(step)
    session.commit()
    session.refresh(step)

    return step.model_dump()


@router.delete("/workflow-steps/{step_id}")
def delete_step(
    step_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a workflow step"""
    tenant_id = str(current_user.tenant_id)

    step = session.get(WorkflowStep, step_id)
    if not step or str(step.tenant_id) != tenant_id:
        raise HTTPException(404, "Step not found")

    # Delete related transitions
    transitions = session.exec(
        select(WorkflowTransition).where(
            (WorkflowTransition.from_step_id == step_id) |
            (WorkflowTransition.to_step_id == step_id)
        )
    ).all()
    for t in transitions:
        session.delete(t)

    session.delete(step)
    session.commit()

    return {"success": True}


# =====================
# WORKFLOW TRANSITIONS
# =====================

@router.post("/workflow-transitions")
def create_transition(
    payload: WorkflowTransitionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a workflow transition"""
    tenant_id = str(current_user.tenant_id)

    transition = WorkflowTransition(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(transition)
    session.commit()
    session.refresh(transition)

    return transition.model_dump()


@router.delete("/workflow-transitions/{transition_id}")
def delete_transition(
    transition_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a workflow transition"""
    tenant_id = str(current_user.tenant_id)

    transition = session.get(WorkflowTransition, transition_id)
    if not transition or str(transition.tenant_id) != tenant_id:
        raise HTTPException(404, "Transition not found")

    session.delete(transition)
    session.commit()

    return {"success": True}


# =====================
# SEED DATA
# =====================

@router.post("/workflow-definitions/seed")
def seed_workflow_definitions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Seed default workflow definitions for the tenant.
    Only ADMIN can run this.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(403, "Only ADMIN can seed workflow definitions")

    tenant_id = str(current_user.tenant_id)

    result = seed_workflows(session, tenant_id)

    return {
        "success": True,
        "message": f"Seeded {result['created_workflows']} workflows with {result['created_steps']} steps. Skipped {result['skipped']} existing.",
        **result,
    }
