"""
CRM - Activity Logs API Routes
View activity history for CRM entities
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from typing import Optional
from datetime import datetime
import json

from app.db.session import get_session
from app.models import User
from app.models.crm.activity_log import ActivityLog, ActivityLogAction, ActivityLogEntityType
from app.core.security import get_current_user

router = APIRouter(prefix="/activity-logs", tags=["CRM - Activity Logs"])


def log_activity(
    session: Session,
    tenant_id: str,
    user_id: str,
    user_name: str,
    entity_type: str,
    entity_id: str,
    action: str,
    entity_code: str = None,
    entity_name: str = None,
    description: str = None,
    old_values: dict = None,
    new_values: dict = None,
    changed_fields: list = None,
    related_entity_type: str = None,
    related_entity_id: str = None,
    ip_address: str = None,
):
    """Helper function to log CRM activities"""
    # Generate action label
    action_labels = {
        "CREATE": f"Created {entity_type.lower()}",
        "UPDATE": f"Updated {entity_type.lower()}",
        "DELETE": f"Deleted {entity_type.lower()}",
        "STATUS_CHANGE": f"Changed status of {entity_type.lower()}",
        "CONVERT": "Converted lead to account",
        "ACCEPT": "Accepted quote",
        "REJECT": "Rejected quote",
        "SEND": "Sent quote",
        "SYNC": "Synced to TMS",
        "ASSIGN": f"Assigned {entity_type.lower()}",
        "UNASSIGN": f"Unassigned {entity_type.lower()}",
    }

    log = ActivityLog(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_code=entity_code,
        entity_name=entity_name,
        action=action,
        action_label=action_labels.get(action, action),
        description=description,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        changed_fields=json.dumps(changed_fields) if changed_fields else None,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        user_id=user_id,
        user_name=user_name,
        ip_address=ip_address,
    )

    session.add(log)
    # Note: Don't commit here - let the caller handle transaction
    return log


@router.get("")
def list_activity_logs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all activity logs with filters"""
    tenant_id = str(current_user.tenant_id)

    query = select(ActivityLog).where(ActivityLog.tenant_id == tenant_id)

    if entity_type:
        query = query.where(ActivityLog.entity_type == entity_type)

    if entity_id:
        query = query.where(ActivityLog.entity_id == entity_id)

    if action:
        query = query.where(ActivityLog.action == action)

    if user_id:
        query = query.where(ActivityLog.user_id == user_id)

    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.where(ActivityLog.created_at >= from_dt)
        except ValueError:
            pass

    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
            # Add 1 day to include the entire to_date
            to_dt = datetime(to_dt.year, to_dt.month, to_dt.day, 23, 59, 59)
            query = query.where(ActivityLog.created_at <= to_dt)
        except ValueError:
            pass

    if search:
        search_filter = or_(
            ActivityLog.entity_code.ilike(f"%{search}%"),
            ActivityLog.entity_name.ilike(f"%{search}%"),
            ActivityLog.description.ilike(f"%{search}%"),
            ActivityLog.user_name.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sort by created_at desc (newest first)
    query = query.order_by(ActivityLog.created_at.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    logs = session.exec(query).all()

    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_code": log.entity_code,
            "entity_name": log.entity_name,
            "action": log.action,
            "action_label": log.action_label,
            "description": log.description,
            "old_values": json.loads(log.old_values) if log.old_values else None,
            "new_values": json.loads(log.new_values) if log.new_values else None,
            "changed_fields": json.loads(log.changed_fields) if log.changed_fields else None,
            "related_entity_type": log.related_entity_type,
            "related_entity_id": log.related_entity_id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "created_at": str(log.created_at) if log.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/entity/{entity_type}/{entity_id}")
def get_entity_activity_logs(
    entity_type: str,
    entity_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get activity logs for a specific entity"""
    tenant_id = str(current_user.tenant_id)

    query = select(ActivityLog).where(
        ActivityLog.tenant_id == tenant_id,
        ActivityLog.entity_type == entity_type.upper(),
        ActivityLog.entity_id == entity_id
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Sort by created_at desc
    query = query.order_by(ActivityLog.created_at.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    logs = session.exec(query).all()

    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "action": log.action,
            "action_label": log.action_label,
            "description": log.description,
            "old_values": json.loads(log.old_values) if log.old_values else None,
            "new_values": json.loads(log.new_values) if log.new_values else None,
            "changed_fields": json.loads(log.changed_fields) if log.changed_fields else None,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "created_at": str(log.created_at) if log.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/summary")
def get_activity_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    days: int = Query(7, ge=1, le=90),
):
    """Get activity summary for dashboard"""
    tenant_id = str(current_user.tenant_id)
    from_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    from_date = from_date.replace(day=from_date.day - days + 1)

    # Count by action
    action_counts = {}
    for action in ActivityLogAction:
        count = session.exec(
            select(func.count()).where(
                ActivityLog.tenant_id == tenant_id,
                ActivityLog.action == action.value,
                ActivityLog.created_at >= from_date
            )
        ).one()
        if count > 0:
            action_counts[action.value] = count

    # Count by entity type
    entity_counts = {}
    for entity_type in ActivityLogEntityType:
        count = session.exec(
            select(func.count()).where(
                ActivityLog.tenant_id == tenant_id,
                ActivityLog.entity_type == entity_type.value,
                ActivityLog.created_at >= from_date
            )
        ).one()
        if count > 0:
            entity_counts[entity_type.value] = count

    # Recent activities (last 10)
    recent = session.exec(
        select(ActivityLog)
        .where(ActivityLog.tenant_id == tenant_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
    ).all()

    return {
        "period_days": days,
        "action_counts": action_counts,
        "entity_counts": entity_counts,
        "total_activities": sum(action_counts.values()),
        "recent_activities": [
            {
                "id": log.id,
                "entity_type": log.entity_type,
                "entity_name": log.entity_name,
                "action": log.action,
                "action_label": log.action_label,
                "user_name": log.user_name,
                "created_at": str(log.created_at) if log.created_at else None,
            }
            for log in recent
        ]
    }
