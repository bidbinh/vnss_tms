"""
Workflow Engine - Instances API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.workflow import (
    WorkflowDefinition, WorkflowStatus,
    WorkflowInstance, InstanceStatus,
    WorkflowStepInstance, StepInstanceStatus,
    WorkflowHistory, WorkflowStep,
)
from app.core.security import get_current_user
from app.services.workflow_integration import WorkflowIntegrationService

router = APIRouter()


class WorkflowInstanceCreate(BaseModel):
    workflow_id: str
    title: str
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    entity_reference: Optional[str] = None
    priority: int = 5
    due_date: Optional[datetime] = None
    form_data: Optional[str] = None
    notes: Optional[str] = None


@router.get("/workflow-instances")
def list_instances(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    workflow_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    initiator_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List workflow instances"""
    tenant_id = str(current_user.tenant_id)

    query = select(WorkflowInstance).where(WorkflowInstance.tenant_id == tenant_id)

    if workflow_id:
        query = query.where(WorkflowInstance.workflow_id == workflow_id)

    if status:
        query = query.where(WorkflowInstance.status == status)

    if initiator_id:
        query = query.where(WorkflowInstance.initiator_id == initiator_id)

    if entity_type:
        query = query.where(WorkflowInstance.entity_type == entity_type)

    if entity_id:
        query = query.where(WorkflowInstance.entity_id == entity_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(WorkflowInstance.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/workflow-instances")
def create_instance(
    payload: WorkflowInstanceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create and start a workflow instance"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Get workflow definition
    workflow = session.get(WorkflowDefinition, payload.workflow_id)
    if not workflow or str(workflow.tenant_id) != tenant_id:
        raise HTTPException(404, "Workflow definition not found")

    if workflow.status != WorkflowStatus.ACTIVE.value:
        raise HTTPException(400, "Workflow is not active")

    # Generate instance number
    count = session.exec(
        select(func.count(WorkflowInstance.id)).where(
            WorkflowInstance.tenant_id == tenant_id
        )
    ).one() or 0

    instance_number = f"WF-{datetime.now().year}-{count + 1:05d}"

    instance = WorkflowInstance(
        tenant_id=tenant_id,
        workflow_id=payload.workflow_id,
        workflow_code=workflow.code,
        workflow_name=workflow.name,
        workflow_version=workflow.version,
        instance_number=instance_number,
        **payload.model_dump(exclude={"workflow_id"}),
        status=InstanceStatus.RUNNING.value,
        initiator_id=user_id,
        initiator_name=current_user.full_name,
        started_at=datetime.utcnow(),
        created_by=user_id,
    )

    session.add(instance)
    session.flush()

    # Create step instances
    steps = session.exec(
        select(WorkflowStep).where(
            WorkflowStep.workflow_id == payload.workflow_id
        ).order_by(WorkflowStep.step_order)
    ).all()

    if steps:
        first_step = steps[0]
        for step in steps:
            step_instance = WorkflowStepInstance(
                tenant_id=tenant_id,
                instance_id=str(instance.id),
                step_id=str(step.id),
                step_order=step.step_order,
                step_code=step.code,
                step_name=step.name,
                step_type=step.step_type,
                status=StepInstanceStatus.ACTIVE.value if step.id == first_step.id else StepInstanceStatus.PENDING.value,
                assigned_to_id=step.assignee_id,
                sla_hours=step.sla_hours,
                activated_at=datetime.utcnow() if step.id == first_step.id else None,
            )
            session.add(step_instance)

        instance.current_step_id = str(first_step.id)
        instance.current_step_name = first_step.name

    # Add history
    history = WorkflowHistory(
        tenant_id=tenant_id,
        instance_id=str(instance.id),
        event_type="CREATED",
        event_description=f"Workflow started by {current_user.full_name}",
        actor_id=user_id,
        actor_name=current_user.full_name,
        to_status=InstanceStatus.RUNNING.value,
    )
    session.add(history)

    session.add(instance)
    session.commit()
    session.refresh(instance)

    return instance.model_dump()


@router.get("/workflow-instances/{instance_id}")
def get_instance(
    instance_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get workflow instance with details"""
    tenant_id = str(current_user.tenant_id)

    instance = session.get(WorkflowInstance, instance_id)
    if not instance or str(instance.tenant_id) != tenant_id:
        raise HTTPException(404, "Instance not found")

    # Get step instances
    step_instances = session.exec(
        select(WorkflowStepInstance).where(
            WorkflowStepInstance.instance_id == instance_id
        ).order_by(WorkflowStepInstance.step_order)
    ).all()

    # Get history
    history = session.exec(
        select(WorkflowHistory).where(
            WorkflowHistory.instance_id == instance_id
        ).order_by(WorkflowHistory.created_at.desc())
    ).all()

    result = instance.model_dump()
    result["step_instances"] = [s.model_dump() for s in step_instances]
    result["history"] = [h.model_dump() for h in history]

    return result


@router.post("/workflow-instances/{instance_id}/action")
def take_action(
    instance_id: str,
    action: str = Query(...),
    comments: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Take action on current step"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    instance = session.get(WorkflowInstance, instance_id)
    if not instance or str(instance.tenant_id) != tenant_id:
        raise HTTPException(404, "Instance not found")

    if instance.status != InstanceStatus.RUNNING.value:
        raise HTTPException(400, "Workflow is not running")

    # Get current active step
    current_step = session.exec(
        select(WorkflowStepInstance).where(
            WorkflowStepInstance.instance_id == instance_id,
            WorkflowStepInstance.status == StepInstanceStatus.ACTIVE.value
        )
    ).first()

    if not current_step:
        raise HTTPException(400, "No active step found")

    # Update step instance
    current_step.action_taken = action
    current_step.action_by_id = user_id
    current_step.action_by_name = current_user.full_name
    current_step.action_comments = comments
    current_step.completed_at = datetime.utcnow()
    current_step.status = StepInstanceStatus.COMPLETED.value if action in ["APPROVE", "COMPLETE"] else StepInstanceStatus.REJECTED.value

    session.add(current_step)

    # Add history
    history = WorkflowHistory(
        tenant_id=tenant_id,
        instance_id=instance_id,
        step_instance_id=str(current_step.id),
        event_type="ACTION_TAKEN",
        event_description=f"{action} by {current_user.full_name}",
        actor_id=user_id,
        actor_name=current_user.full_name,
        from_step=current_step.step_name,
        action=action,
        comments=comments,
    )
    session.add(history)

    # Find next step or complete workflow
    if action in ["APPROVE", "COMPLETE"]:
        # Get next pending step
        next_step = session.exec(
            select(WorkflowStepInstance).where(
                WorkflowStepInstance.instance_id == instance_id,
                WorkflowStepInstance.status == StepInstanceStatus.PENDING.value
            ).order_by(WorkflowStepInstance.step_order)
        ).first()

        if next_step:
            next_step.status = StepInstanceStatus.ACTIVE.value
            next_step.activated_at = datetime.utcnow()
            session.add(next_step)

            instance.current_step_id = next_step.step_id
            instance.current_step_name = next_step.step_name
        else:
            # No more steps - complete workflow
            instance.status = InstanceStatus.COMPLETED.value
            instance.completed_at = datetime.utcnow()
            instance.final_action = "APPROVED"
            instance.current_step_id = None
            instance.current_step_name = None

            completion_history = WorkflowHistory(
                tenant_id=tenant_id,
                instance_id=instance_id,
                event_type="COMPLETED",
                event_description="Workflow completed successfully",
                actor_id=user_id,
                actor_name=current_user.full_name,
                to_status=InstanceStatus.COMPLETED.value,
            )
            session.add(completion_history)

            # Callback to update entity status
            try:
                workflow_service = WorkflowIntegrationService(session)
                workflow_service.on_workflow_complete(instance, "APPROVED", comments)
            except Exception as e:
                print(f"Workflow callback error: {e}")

    elif action == "REJECT":
        instance.status = InstanceStatus.REJECTED.value
        instance.completed_at = datetime.utcnow()
        instance.final_action = "REJECTED"
        instance.final_comments = comments
        instance.current_step_id = None
        instance.current_step_name = None

        # Callback to update entity status
        try:
            workflow_service = WorkflowIntegrationService(session)
            workflow_service.on_workflow_complete(instance, "REJECTED", comments)
        except Exception as e:
            print(f"Workflow callback error: {e}")

    instance.updated_at = datetime.utcnow()
    session.add(instance)
    session.commit()
    session.refresh(instance)

    return {"success": True, "instance": instance.model_dump()}


@router.post("/workflow-instances/{instance_id}/cancel")
def cancel_instance(
    instance_id: str,
    reason: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel a workflow instance"""
    tenant_id = str(current_user.tenant_id)

    instance = session.get(WorkflowInstance, instance_id)
    if not instance or str(instance.tenant_id) != tenant_id:
        raise HTTPException(404, "Instance not found")

    if instance.status not in [InstanceStatus.RUNNING.value, InstanceStatus.PENDING.value]:
        raise HTTPException(400, "Cannot cancel workflow in current status")

    instance.status = InstanceStatus.CANCELLED.value
    instance.completed_at = datetime.utcnow()
    instance.final_comments = reason
    instance.updated_at = datetime.utcnow()

    # Add history
    history = WorkflowHistory(
        tenant_id=tenant_id,
        instance_id=instance_id,
        event_type="CANCELLED",
        event_description=f"Workflow cancelled by {current_user.full_name}",
        actor_id=str(current_user.id),
        actor_name=current_user.full_name,
        to_status=InstanceStatus.CANCELLED.value,
        comments=reason,
    )

    session.add(instance)
    session.add(history)
    session.commit()
    session.refresh(instance)

    return {"success": True, "instance": instance.model_dump()}


@router.get("/my-pending-tasks")
def get_my_pending_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """Get pending workflow tasks assigned to current user"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    query = select(WorkflowStepInstance).where(
        WorkflowStepInstance.tenant_id == tenant_id,
        WorkflowStepInstance.assigned_to_id == user_id,
        WorkflowStepInstance.status == StepInstanceStatus.ACTIVE.value
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(WorkflowStepInstance.activated_at)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    # Enrich with instance data
    result = []
    for item in items:
        item_dict = item.model_dump()
        instance = session.get(WorkflowInstance, item.instance_id)
        if instance:
            item_dict["instance"] = {
                "instance_number": instance.instance_number,
                "title": instance.title,
                "initiator_name": instance.initiator_name,
                "entity_type": instance.entity_type,
                "entity_reference": instance.entity_reference,
            }
        result.append(item_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
