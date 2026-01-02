"""
Project Management - Timesheets API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.project import (
    Timesheet, TimesheetStatus,
    TimesheetEntry,
    TimesheetApproval,
)
from app.core.security import get_current_user

router = APIRouter()


class TimesheetEntryCreate(BaseModel):
    project_id: str
    project_name: Optional[str] = None
    task_id: Optional[str] = None
    task_name: Optional[str] = None
    work_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hours: Decimal
    overtime_hours: Decimal = Decimal("0")
    is_billable: bool = True
    work_type: Optional[str] = None
    description: str


@router.get("/timesheets")
def list_timesheets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    period_start: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all timesheets"""
    tenant_id = str(current_user.tenant_id)

    query = select(Timesheet).where(Timesheet.tenant_id == tenant_id)

    if user_id:
        query = query.where(Timesheet.user_id == user_id)
    else:
        # Default to current user's timesheets
        query = query.where(Timesheet.user_id == str(current_user.id))

    if status:
        query = query.where(Timesheet.status == status)

    if period_start:
        query = query.where(Timesheet.period_start == period_start)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(Timesheet.period_start.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/timesheets/current-week")
def get_or_create_current_week_timesheet(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get or create timesheet for current week"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Calculate week start (Monday)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    # Check if timesheet exists
    existing = session.exec(
        select(Timesheet).where(
            Timesheet.tenant_id == tenant_id,
            Timesheet.user_id == user_id,
            Timesheet.period_start == week_start
        )
    ).first()

    if existing:
        # Get entries
        entries = session.exec(
            select(TimesheetEntry).where(
                TimesheetEntry.timesheet_id == str(existing.id)
            ).order_by(TimesheetEntry.work_date, TimesheetEntry.created_at)
        ).all()

        result = existing.model_dump()
        result["entries"] = [e.model_dump() for e in entries]
        return result

    # Create new timesheet
    timesheet = Timesheet(
        tenant_id=tenant_id,
        user_id=user_id,
        user_name=current_user.full_name,
        period_start=week_start,
        period_end=week_end,
        period_type="WEEKLY",
        status=TimesheetStatus.DRAFT.value,
        created_by=user_id,
    )

    session.add(timesheet)
    session.commit()
    session.refresh(timesheet)

    result = timesheet.model_dump()
    result["entries"] = []
    return result


@router.get("/timesheets/{timesheet_id}")
def get_timesheet(
    timesheet_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get timesheet with entries"""
    tenant_id = str(current_user.tenant_id)

    timesheet = session.get(Timesheet, timesheet_id)
    if not timesheet or str(timesheet.tenant_id) != tenant_id:
        raise HTTPException(404, "Timesheet not found")

    # Get entries
    entries = session.exec(
        select(TimesheetEntry).where(
            TimesheetEntry.timesheet_id == timesheet_id
        ).order_by(TimesheetEntry.work_date, TimesheetEntry.created_at)
    ).all()

    result = timesheet.model_dump()
    result["entries"] = [e.model_dump() for e in entries]

    return result


@router.post("/timesheet-entries")
def create_entry(
    payload: TimesheetEntryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a timesheet entry"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Find or create timesheet for the work date
    work_date = payload.work_date
    week_start = work_date - timedelta(days=work_date.weekday())
    week_end = week_start + timedelta(days=6)

    timesheet = session.exec(
        select(Timesheet).where(
            Timesheet.tenant_id == tenant_id,
            Timesheet.user_id == user_id,
            Timesheet.period_start == week_start
        )
    ).first()

    if not timesheet:
        timesheet = Timesheet(
            tenant_id=tenant_id,
            user_id=user_id,
            user_name=current_user.full_name,
            period_start=week_start,
            period_end=week_end,
            period_type="WEEKLY",
            status=TimesheetStatus.DRAFT.value,
            created_by=user_id,
        )
        session.add(timesheet)
        session.flush()

    if timesheet.status not in [TimesheetStatus.DRAFT.value, TimesheetStatus.REJECTED.value]:
        raise HTTPException(400, "Cannot add entries to submitted timesheet")

    entry = TimesheetEntry(
        tenant_id=tenant_id,
        timesheet_id=str(timesheet.id),
        user_id=user_id,
        **payload.model_dump(),
        created_by=user_id,
    )

    session.add(entry)
    session.flush()

    # Update timesheet totals
    timesheet.total_regular_hours = (timesheet.total_regular_hours or Decimal("0")) + payload.hours
    timesheet.total_overtime_hours = (timesheet.total_overtime_hours or Decimal("0")) + payload.overtime_hours
    if payload.is_billable:
        timesheet.total_billable_hours = (timesheet.total_billable_hours or Decimal("0")) + payload.hours
    else:
        timesheet.total_non_billable_hours = (timesheet.total_non_billable_hours or Decimal("0")) + payload.hours

    session.add(timesheet)
    session.commit()
    session.refresh(entry)

    return entry.model_dump()


@router.put("/timesheet-entries/{entry_id}")
def update_entry(
    entry_id: str,
    payload: TimesheetEntryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a timesheet entry"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(TimesheetEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Entry not found")

    if str(entry.user_id) != str(current_user.id):
        raise HTTPException(403, "Can only edit your own entries")

    # Get timesheet to check status
    timesheet = session.get(Timesheet, entry.timesheet_id)
    if timesheet and timesheet.status not in [TimesheetStatus.DRAFT.value, TimesheetStatus.REJECTED.value]:
        raise HTTPException(400, "Cannot edit entries in submitted timesheet")

    # Update totals (subtract old, add new)
    if timesheet:
        timesheet.total_regular_hours = (timesheet.total_regular_hours or Decimal("0")) - entry.hours + payload.hours
        timesheet.total_overtime_hours = (timesheet.total_overtime_hours or Decimal("0")) - entry.overtime_hours + payload.overtime_hours
        session.add(timesheet)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)

    entry.updated_at = datetime.utcnow()

    session.add(entry)
    session.commit()
    session.refresh(entry)

    return entry.model_dump()


@router.delete("/timesheet-entries/{entry_id}")
def delete_entry(
    entry_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a timesheet entry"""
    tenant_id = str(current_user.tenant_id)

    entry = session.get(TimesheetEntry, entry_id)
    if not entry or str(entry.tenant_id) != tenant_id:
        raise HTTPException(404, "Entry not found")

    if str(entry.user_id) != str(current_user.id):
        raise HTTPException(403, "Can only delete your own entries")

    # Update timesheet totals
    timesheet = session.get(Timesheet, entry.timesheet_id)
    if timesheet:
        if timesheet.status not in [TimesheetStatus.DRAFT.value, TimesheetStatus.REJECTED.value]:
            raise HTTPException(400, "Cannot delete entries from submitted timesheet")

        timesheet.total_regular_hours = max(Decimal("0"), (timesheet.total_regular_hours or Decimal("0")) - entry.hours)
        timesheet.total_overtime_hours = max(Decimal("0"), (timesheet.total_overtime_hours or Decimal("0")) - entry.overtime_hours)
        session.add(timesheet)

    session.delete(entry)
    session.commit()

    return {"success": True}


@router.post("/timesheets/{timesheet_id}/submit")
def submit_timesheet(
    timesheet_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit timesheet for approval"""
    tenant_id = str(current_user.tenant_id)

    timesheet = session.get(Timesheet, timesheet_id)
    if not timesheet or str(timesheet.tenant_id) != tenant_id:
        raise HTTPException(404, "Timesheet not found")

    if str(timesheet.user_id) != str(current_user.id):
        raise HTTPException(403, "Can only submit your own timesheet")

    if timesheet.status not in [TimesheetStatus.DRAFT.value, TimesheetStatus.REJECTED.value]:
        raise HTTPException(400, "Timesheet cannot be submitted")

    timesheet.status = TimesheetStatus.SUBMITTED.value
    timesheet.submitted_at = datetime.utcnow()
    timesheet.updated_at = datetime.utcnow()

    session.add(timesheet)
    session.commit()
    session.refresh(timesheet)

    return {"success": True, "timesheet": timesheet.model_dump()}


@router.post("/timesheets/{timesheet_id}/approve")
def approve_timesheet(
    timesheet_id: str,
    comments: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve a timesheet"""
    tenant_id = str(current_user.tenant_id)

    timesheet = session.get(Timesheet, timesheet_id)
    if not timesheet or str(timesheet.tenant_id) != tenant_id:
        raise HTTPException(404, "Timesheet not found")

    if timesheet.status != TimesheetStatus.SUBMITTED.value:
        raise HTTPException(400, "Only submitted timesheets can be approved")

    timesheet.status = TimesheetStatus.APPROVED.value
    timesheet.updated_at = datetime.utcnow()

    # Create approval record
    approval = TimesheetApproval(
        tenant_id=tenant_id,
        timesheet_id=timesheet_id,
        approver_id=str(current_user.id),
        approver_name=current_user.full_name,
        action="APPROVED",
        comments=comments,
    )

    session.add(timesheet)
    session.add(approval)
    session.commit()
    session.refresh(timesheet)

    return {"success": True, "timesheet": timesheet.model_dump()}


@router.post("/timesheets/{timesheet_id}/reject")
def reject_timesheet(
    timesheet_id: str,
    comments: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Reject a timesheet"""
    tenant_id = str(current_user.tenant_id)

    timesheet = session.get(Timesheet, timesheet_id)
    if not timesheet or str(timesheet.tenant_id) != tenant_id:
        raise HTTPException(404, "Timesheet not found")

    if timesheet.status != TimesheetStatus.SUBMITTED.value:
        raise HTTPException(400, "Only submitted timesheets can be rejected")

    timesheet.status = TimesheetStatus.REJECTED.value
    timesheet.updated_at = datetime.utcnow()

    # Create approval record
    approval = TimesheetApproval(
        tenant_id=tenant_id,
        timesheet_id=timesheet_id,
        approver_id=str(current_user.id),
        approver_name=current_user.full_name,
        action="REJECTED",
        comments=comments,
    )

    session.add(timesheet)
    session.add(approval)
    session.commit()
    session.refresh(timesheet)

    return {"success": True, "timesheet": timesheet.model_dump()}
