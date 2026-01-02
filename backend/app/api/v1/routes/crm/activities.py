"""
CRM - Activities API Routes
Manage CRM activities (calls, emails, meetings, tasks, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.crm.activity import Activity, ActivityType, ActivityStatus
from app.models.crm.account import Account
from app.models.crm.contact import Contact
from app.models.crm.lead import Lead
from app.models.crm.opportunity import Opportunity
from app.core.security import get_current_user

router = APIRouter(prefix="/activities", tags=["CRM - Activities"])


class ActivityCreate(BaseModel):
    activity_type: str = "TASK"
    subject: str
    description: Optional[str] = None
    account_id: Optional[str] = None
    contact_id: Optional[str] = None
    lead_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    quote_id: Optional[str] = None
    priority: str = "MEDIUM"
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    # Call specific
    call_direction: Optional[str] = None
    phone_number: Optional[str] = None
    # Email specific
    email_to: Optional[str] = None
    email_cc: Optional[str] = None
    # Meeting specific
    location: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_link: Optional[str] = None
    # Assignment
    assigned_to: Optional[str] = None
    participants: Optional[str] = None
    # Reminder
    reminder_at: Optional[str] = None
    notes: Optional[str] = None


class ActivityUpdate(BaseModel):
    activity_type: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    call_direction: Optional[str] = None
    call_result: Optional[str] = None
    phone_number: Optional[str] = None
    email_to: Optional[str] = None
    email_cc: Optional[str] = None
    email_status: Optional[str] = None
    location: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_link: Optional[str] = None
    assigned_to: Optional[str] = None
    participants: Optional[str] = None
    reminder_at: Optional[str] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_activities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    activity_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    lead_id: Optional[str] = Query(None),
    opportunity_id: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all activities"""
    tenant_id = str(current_user.tenant_id)

    query = select(Activity).where(Activity.tenant_id == tenant_id)

    if activity_type:
        query = query.where(Activity.activity_type == activity_type)

    if status:
        query = query.where(Activity.status == status)

    if account_id:
        query = query.where(Activity.account_id == account_id)

    if contact_id:
        query = query.where(Activity.contact_id == contact_id)

    if lead_id:
        query = query.where(Activity.lead_id == lead_id)

    if opportunity_id:
        query = query.where(Activity.opportunity_id == opportunity_id)

    if assigned_to:
        query = query.where(Activity.assigned_to == assigned_to)

    if priority:
        query = query.where(Activity.priority == priority)

    if search:
        search_filter = or_(
            Activity.subject.ilike(f"%{search}%"),
            Activity.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Activity.created_at.desc()).offset(offset).limit(page_size)

    activities = session.exec(query).all()

    # Enrich with related info
    items = []
    for act in activities:
        account = session.get(Account, act.account_id) if act.account_id else None
        contact = session.get(Contact, act.contact_id) if act.contact_id else None
        lead = session.get(Lead, act.lead_id) if act.lead_id else None
        opportunity = session.get(Opportunity, act.opportunity_id) if act.opportunity_id else None

        items.append({
            "id": act.id,
            "activity_type": act.activity_type,
            "subject": act.subject,
            "description": act.description,
            "status": act.status,
            "priority": act.priority,
            "start_date": act.start_date,
            "start_time": act.start_time,
            "end_date": act.end_date,
            "duration_minutes": act.duration_minutes,
            "account": {
                "id": account.id,
                "name": account.name,
            } if account else None,
            "contact": {
                "id": contact.id,
                "full_name": contact.full_name,
            } if contact else None,
            "lead": {
                "id": lead.id,
                "full_name": lead.full_name,
            } if lead else None,
            "opportunity": {
                "id": opportunity.id,
                "name": opportunity.name,
            } if opportunity else None,
            "assigned_to": act.assigned_to,
            "created_at": str(act.created_at) if act.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/upcoming")
def get_upcoming_activities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(10, ge=1, le=50),
):
    """Get upcoming activities for the current user"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    today = datetime.now().strftime("%Y-%m-%d")

    query = select(Activity).where(
        Activity.tenant_id == tenant_id,
        Activity.status.in_(["PLANNED", "IN_PROGRESS"]),
        or_(
            Activity.assigned_to == user_id,
            Activity.created_by == user_id,
        ),
        Activity.start_date >= today,
    ).order_by(Activity.start_date, Activity.start_time).limit(limit)

    activities = session.exec(query).all()

    items = []
    for act in activities:
        account = session.get(Account, act.account_id) if act.account_id else None

        items.append({
            "id": act.id,
            "activity_type": act.activity_type,
            "subject": act.subject,
            "status": act.status,
            "priority": act.priority,
            "start_date": act.start_date,
            "start_time": act.start_time,
            "account": {
                "id": account.id,
                "name": account.name,
            } if account else None,
        })

    return {"items": items}


@router.get("/overdue")
def get_overdue_activities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    """Get overdue activities"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    today = datetime.now().strftime("%Y-%m-%d")

    query = select(Activity).where(
        Activity.tenant_id == tenant_id,
        Activity.status.in_(["PLANNED", "IN_PROGRESS"]),
        or_(
            Activity.assigned_to == user_id,
            Activity.created_by == user_id,
        ),
        Activity.end_date < today,
    ).order_by(Activity.end_date.desc()).limit(limit)

    activities = session.exec(query).all()

    items = []
    for act in activities:
        account = session.get(Account, act.account_id) if act.account_id else None

        items.append({
            "id": act.id,
            "activity_type": act.activity_type,
            "subject": act.subject,
            "status": act.status,
            "priority": act.priority,
            "start_date": act.start_date,
            "end_date": act.end_date,
            "account": {
                "id": account.id,
                "name": account.name,
            } if account else None,
        })

    return {"items": items}


@router.post("")
def create_activity(
    payload: ActivityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new activity"""
    tenant_id = str(current_user.tenant_id)

    activity = Activity(
        tenant_id=tenant_id,
        **payload.model_dump(),
        created_by=str(current_user.id),
    )

    session.add(activity)
    session.commit()
    session.refresh(activity)

    return activity


@router.get("/{activity_id}")
def get_activity(
    activity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get activity by ID"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    account = session.get(Account, activity.account_id) if activity.account_id else None
    contact = session.get(Contact, activity.contact_id) if activity.contact_id else None
    lead = session.get(Lead, activity.lead_id) if activity.lead_id else None
    opportunity = session.get(Opportunity, activity.opportunity_id) if activity.opportunity_id else None

    return {
        **activity.model_dump(),
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
        } if account else None,
        "contact": {
            "id": contact.id,
            "full_name": contact.full_name,
        } if contact else None,
        "lead": {
            "id": lead.id,
            "full_name": lead.full_name,
        } if lead else None,
        "opportunity": {
            "id": opportunity.id,
            "name": opportunity.name,
        } if opportunity else None,
        "created_at": str(activity.created_at) if activity.created_at else None,
        "updated_at": str(activity.updated_at) if activity.updated_at else None,
    }


@router.put("/{activity_id}")
def update_activity(
    activity_id: str,
    payload: ActivityUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an activity"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(activity, key, value)

    activity.updated_at = datetime.utcnow()

    session.add(activity)
    session.commit()
    session.refresh(activity)

    return activity


@router.post("/{activity_id}/complete")
def complete_activity(
    activity_id: str,
    outcome: Optional[str] = None,
    next_action: Optional[str] = None,
    next_action_date: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark activity as completed"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    activity.status = ActivityStatus.COMPLETED.value
    activity.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    activity.completed_by = str(current_user.id)
    activity.outcome = outcome
    activity.next_action = next_action
    activity.next_action_date = next_action_date
    activity.updated_at = datetime.utcnow()

    session.add(activity)
    session.commit()
    session.refresh(activity)

    # Create follow-up activity if next_action is specified
    if next_action and next_action_date:
        follow_up = Activity(
            tenant_id=tenant_id,
            activity_type=ActivityType.FOLLOW_UP.value,
            subject=f"Follow-up: {activity.subject}",
            description=next_action,
            account_id=activity.account_id,
            contact_id=activity.contact_id,
            lead_id=activity.lead_id,
            opportunity_id=activity.opportunity_id,
            start_date=next_action_date,
            assigned_to=activity.assigned_to,
            created_by=str(current_user.id),
        )
        session.add(follow_up)
        session.commit()

    return activity


@router.post("/{activity_id}/cancel")
def cancel_activity(
    activity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancel an activity"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    activity.status = ActivityStatus.CANCELLED.value
    activity.updated_at = datetime.utcnow()

    session.add(activity)
    session.commit()
    session.refresh(activity)

    return activity


@router.post("/{activity_id}/log-call")
def log_call_result(
    activity_id: str,
    call_result: str,
    outcome: Optional[str] = None,
    duration_minutes: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Log call result"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    if activity.activity_type != ActivityType.CALL.value:
        raise HTTPException(400, "Activity is not a call")

    activity.call_result = call_result
    activity.outcome = outcome
    activity.duration_minutes = duration_minutes
    activity.status = ActivityStatus.COMPLETED.value
    activity.completed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    activity.completed_by = str(current_user.id)
    activity.updated_at = datetime.utcnow()

    session.add(activity)
    session.commit()
    session.refresh(activity)

    return activity


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an activity"""
    tenant_id = str(current_user.tenant_id)

    activity = session.get(Activity, activity_id)
    if not activity or str(activity.tenant_id) != tenant_id:
        raise HTTPException(404, "Activity not found")

    session.delete(activity)
    session.commit()

    return {"success": True, "message": "Activity deleted"}
