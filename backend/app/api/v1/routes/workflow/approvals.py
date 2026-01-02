"""
Workflow Engine - Approvals API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.workflow import (
    ApprovalRequest, ApprovalStatus, ApprovalType,
    ApprovalStep, ApprovalDecision,
    ApprovalDelegate,
)
from app.core.security import get_current_user

router = APIRouter()


class ApprovalRequestCreate(BaseModel):
    entity_type: str
    entity_id: str
    entity_reference: Optional[str] = None
    title: str
    description: Optional[str] = None
    approval_type: str = ApprovalType.SEQUENTIAL.value
    amount: Decimal = Decimal("0")
    currency: str = "VND"
    priority: int = 5
    is_urgent: bool = False
    due_date: Optional[datetime] = None
    request_data: Optional[str] = None


class ApprovalStepCreate(BaseModel):
    request_id: str
    step_order: int = 1
    approver_id: str
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    due_date: Optional[datetime] = None


class ApprovalDelegateCreate(BaseModel):
    delegate_id: str
    delegate_name: Optional[str] = None
    start_date: datetime
    end_date: datetime
    all_approvals: bool = True
    workflow_ids: Optional[str] = None
    max_amount: Optional[Decimal] = None
    reason: Optional[str] = None


@router.get("/approval-requests")
def list_requests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    requester_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all approval requests"""
    tenant_id = str(current_user.tenant_id)

    query = select(ApprovalRequest).where(ApprovalRequest.tenant_id == tenant_id)

    if status:
        query = query.where(ApprovalRequest.status == status)

    if entity_type:
        query = query.where(ApprovalRequest.entity_type == entity_type)

    if requester_id:
        query = query.where(ApprovalRequest.requester_id == requester_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(ApprovalRequest.requested_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/approval-requests")
def create_request(
    payload: ApprovalRequestCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an approval request"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Generate request number
    count = session.exec(
        select(func.count(ApprovalRequest.id)).where(
            ApprovalRequest.tenant_id == tenant_id
        )
    ).one() or 0

    request_number = f"APR-{datetime.now().year}-{count + 1:05d}"

    request = ApprovalRequest(
        tenant_id=tenant_id,
        request_number=request_number,
        **payload.model_dump(),
        status=ApprovalStatus.PENDING.value,
        requester_id=user_id,
        requester_name=current_user.full_name,
        created_by=user_id,
    )

    session.add(request)
    session.commit()
    session.refresh(request)

    return request.model_dump()


@router.get("/approval-requests/{request_id}")
def get_request(
    request_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get approval request with steps"""
    tenant_id = str(current_user.tenant_id)

    request = session.get(ApprovalRequest, request_id)
    if not request or str(request.tenant_id) != tenant_id:
        raise HTTPException(404, "Request not found")

    # Get steps
    steps = session.exec(
        select(ApprovalStep).where(
            ApprovalStep.request_id == request_id
        ).order_by(ApprovalStep.step_order)
    ).all()

    # Get decisions
    decisions = session.exec(
        select(ApprovalDecision).where(
            ApprovalDecision.request_id == request_id
        ).order_by(ApprovalDecision.decided_at.desc())
    ).all()

    result = request.model_dump()
    result["steps"] = [s.model_dump() for s in steps]
    result["decisions"] = [d.model_dump() for d in decisions]

    return result


@router.post("/approval-steps")
def add_approval_step(
    payload: ApprovalStepCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add approver to approval request"""
    tenant_id = str(current_user.tenant_id)

    step = ApprovalStep(
        tenant_id=tenant_id,
        **payload.model_dump(),
        status=ApprovalStatus.PENDING.value,
        is_current=payload.step_order == 1,
    )

    session.add(step)
    session.commit()
    session.refresh(step)

    return step.model_dump()


@router.post("/approval-requests/{request_id}/approve")
def approve_request(
    request_id: str,
    comments: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve an approval request"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    request = session.get(ApprovalRequest, request_id)
    if not request or str(request.tenant_id) != tenant_id:
        raise HTTPException(404, "Request not found")

    if request.status != ApprovalStatus.PENDING.value:
        raise HTTPException(400, "Request is not pending")

    # Find current step
    current_step = session.exec(
        select(ApprovalStep).where(
            ApprovalStep.request_id == request_id,
            ApprovalStep.is_current == True,
            ApprovalStep.status == ApprovalStatus.PENDING.value
        )
    ).first()

    if not current_step:
        raise HTTPException(400, "No pending approval step")

    if str(current_step.approver_id) != user_id:
        raise HTTPException(403, "You are not the current approver")

    # Update step
    current_step.decision = "APPROVED"
    current_step.comments = comments
    current_step.status = ApprovalStatus.APPROVED.value
    current_step.decided_at = datetime.utcnow()
    current_step.is_current = False
    session.add(current_step)

    # Add decision record
    decision = ApprovalDecision(
        tenant_id=tenant_id,
        request_id=request_id,
        step_id=str(current_step.id),
        decision="APPROVED",
        comments=comments or "",
        decided_by_id=user_id,
        decided_by_name=current_user.full_name,
    )
    session.add(decision)

    # Find next step or complete
    next_step = session.exec(
        select(ApprovalStep).where(
            ApprovalStep.request_id == request_id,
            ApprovalStep.status == ApprovalStatus.PENDING.value,
            ApprovalStep.step_order > current_step.step_order
        ).order_by(ApprovalStep.step_order)
    ).first()

    if next_step:
        next_step.is_current = True
        next_step.activated_at = datetime.utcnow()
        session.add(next_step)
    else:
        # All approved
        request.status = ApprovalStatus.APPROVED.value
        request.final_status = "APPROVED"
        request.final_approver_id = user_id
        request.final_approver_name = current_user.full_name
        request.completed_at = datetime.utcnow()

    request.updated_at = datetime.utcnow()
    session.add(request)
    session.commit()
    session.refresh(request)

    return {"success": True, "request": request.model_dump()}


@router.post("/approval-requests/{request_id}/reject")
def reject_request(
    request_id: str,
    comments: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject an approval request"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    request = session.get(ApprovalRequest, request_id)
    if not request or str(request.tenant_id) != tenant_id:
        raise HTTPException(404, "Request not found")

    if request.status != ApprovalStatus.PENDING.value:
        raise HTTPException(400, "Request is not pending")

    # Find current step
    current_step = session.exec(
        select(ApprovalStep).where(
            ApprovalStep.request_id == request_id,
            ApprovalStep.is_current == True
        )
    ).first()

    if current_step and str(current_step.approver_id) != user_id:
        raise HTTPException(403, "You are not the current approver")

    if current_step:
        current_step.decision = "REJECTED"
        current_step.comments = comments
        current_step.status = ApprovalStatus.REJECTED.value
        current_step.decided_at = datetime.utcnow()
        session.add(current_step)

        # Add decision record
        decision = ApprovalDecision(
            tenant_id=tenant_id,
            request_id=request_id,
            step_id=str(current_step.id),
            decision="REJECTED",
            comments=comments,
            decided_by_id=user_id,
            decided_by_name=current_user.full_name,
        )
        session.add(decision)

    request.status = ApprovalStatus.REJECTED.value
    request.final_status = "REJECTED"
    request.final_approver_id = user_id
    request.final_approver_name = current_user.full_name
    request.final_comments = comments
    request.completed_at = datetime.utcnow()
    request.updated_at = datetime.utcnow()

    session.add(request)
    session.commit()
    session.refresh(request)

    return {"success": True, "request": request.model_dump()}


# =====================
# MY APPROVALS
# =====================

@router.get("/my-pending-approvals")
def get_my_pending_approvals(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """Get pending approvals for current user"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    query = select(ApprovalStep).where(
        ApprovalStep.tenant_id == tenant_id,
        ApprovalStep.approver_id == user_id,
        ApprovalStep.is_current == True,
        ApprovalStep.status == ApprovalStatus.PENDING.value
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    query = query.order_by(ApprovalStep.created_at)
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    # Enrich with request data
    result = []
    for item in items:
        item_dict = item.model_dump()
        request = session.get(ApprovalRequest, item.request_id)
        if request:
            item_dict["request"] = {
                "request_number": request.request_number,
                "title": request.title,
                "requester_name": request.requester_name,
                "entity_type": request.entity_type,
                "amount": str(request.amount),
                "is_urgent": request.is_urgent,
            }
        result.append(item_dict)

    return {
        "items": result,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


# =====================
# DELEGATION
# =====================

@router.get("/approval-delegates")
def list_delegates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List my approval delegates"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    delegates = session.exec(
        select(ApprovalDelegate).where(
            ApprovalDelegate.tenant_id == tenant_id,
            ApprovalDelegate.delegator_id == user_id,
            ApprovalDelegate.is_active == True
        ).order_by(ApprovalDelegate.start_date)
    ).all()

    return {"items": [d.model_dump() for d in delegates]}


@router.post("/approval-delegates")
def create_delegate(
    payload: ApprovalDelegateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an approval delegate"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    delegate = ApprovalDelegate(
        tenant_id=tenant_id,
        delegator_id=user_id,
        delegator_name=current_user.full_name,
        **payload.model_dump(),
        is_active=True,
        created_by=user_id,
    )

    session.add(delegate)
    session.commit()
    session.refresh(delegate)

    return delegate.model_dump()


@router.delete("/approval-delegates/{delegate_id}")
def delete_delegate(
    delegate_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a delegate"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    delegate = session.get(ApprovalDelegate, delegate_id)
    if not delegate or str(delegate.tenant_id) != tenant_id:
        raise HTTPException(404, "Delegate not found")

    if str(delegate.delegator_id) != user_id:
        raise HTTPException(403, "Can only manage your own delegates")

    delegate.is_active = False
    delegate.updated_at = datetime.utcnow()

    session.add(delegate)
    session.commit()

    return {"success": True}
