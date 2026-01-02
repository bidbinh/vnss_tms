"""
Project Management - Issues API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from app.db.session import get_session
from app.models import User
from app.models.project import (
    ProjectIssue, IssueStatus, IssuePriority, IssueType,
    IssueComment,
)
from app.core.security import get_current_user

router = APIRouter()


class IssueCreate(BaseModel):
    project_id: str
    task_id: Optional[str] = None
    title: str
    description: str
    issue_type: str = IssueType.PROBLEM.value
    priority: str = IssuePriority.MEDIUM.value
    category: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: Optional[date] = None
    is_blocking: bool = False
    affected_areas: Optional[str] = None
    notes: Optional[str] = None


class IssueCommentCreate(BaseModel):
    issue_id: str
    content: str
    parent_comment_id: Optional[str] = None


@router.get("/issues")
def list_issues(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    is_blocking: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
):
    """List all issues"""
    tenant_id = str(current_user.tenant_id)

    query = select(ProjectIssue).where(ProjectIssue.tenant_id == tenant_id)

    if project_id:
        query = query.where(ProjectIssue.project_id == project_id)

    if status:
        query = query.where(ProjectIssue.status == status)

    if priority:
        query = query.where(ProjectIssue.priority == priority)

    if assignee_id:
        query = query.where(ProjectIssue.assignee_id == assignee_id)

    if is_blocking is not None:
        query = query.where(ProjectIssue.is_blocking == is_blocking)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    query = query.order_by(ProjectIssue.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    items = session.exec(query).all()

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/issues")
def create_issue(
    payload: IssueCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new issue"""
    tenant_id = str(current_user.tenant_id)

    # Generate issue number
    count = session.exec(
        select(func.count(ProjectIssue.id)).where(
            ProjectIssue.tenant_id == tenant_id,
            ProjectIssue.project_id == payload.project_id
        )
    ).one() or 0

    issue_number = f"ISSUE-{count + 1:04d}"

    issue = ProjectIssue(
        tenant_id=tenant_id,
        issue_number=issue_number,
        **payload.model_dump(),
        status=IssueStatus.OPEN.value,
        reporter_id=str(current_user.id),
        reporter_name=current_user.full_name,
        reported_date=date.today(),
        created_by=str(current_user.id),
    )

    session.add(issue)
    session.commit()
    session.refresh(issue)

    return issue.model_dump()


@router.get("/issues/{issue_id}")
def get_issue(
    issue_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get issue with comments"""
    tenant_id = str(current_user.tenant_id)

    issue = session.get(ProjectIssue, issue_id)
    if not issue or str(issue.tenant_id) != tenant_id:
        raise HTTPException(404, "Issue not found")

    # Get comments
    comments = session.exec(
        select(IssueComment).where(
            IssueComment.tenant_id == tenant_id,
            IssueComment.issue_id == issue_id
        ).order_by(IssueComment.created_at.desc())
    ).all()

    result = issue.model_dump()
    result["comments"] = [c.model_dump() for c in comments]

    return result


@router.put("/issues/{issue_id}")
def update_issue(
    issue_id: str,
    payload: IssueCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an issue"""
    tenant_id = str(current_user.tenant_id)

    issue = session.get(ProjectIssue, issue_id)
    if not issue or str(issue.tenant_id) != tenant_id:
        raise HTTPException(404, "Issue not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        if key != "project_id":
            setattr(issue, key, value)

    issue.updated_at = datetime.utcnow()
    issue.updated_by = str(current_user.id)

    session.add(issue)
    session.commit()
    session.refresh(issue)

    return issue.model_dump()


@router.patch("/issues/{issue_id}/status")
def update_issue_status(
    issue_id: str,
    status: str = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update issue status"""
    tenant_id = str(current_user.tenant_id)

    issue = session.get(ProjectIssue, issue_id)
    if not issue or str(issue.tenant_id) != tenant_id:
        raise HTTPException(404, "Issue not found")

    old_status = issue.status
    issue.status = status
    issue.updated_at = datetime.utcnow()
    issue.updated_by = str(current_user.id)

    if status == IssueStatus.RESOLVED.value:
        issue.resolved_date = date.today()
        issue.resolved_by = str(current_user.id)
    elif status == IssueStatus.CLOSED.value:
        issue.closed_date = date.today()

    session.add(issue)

    # Add status change comment
    comment = IssueComment(
        tenant_id=tenant_id,
        issue_id=issue_id,
        content=f"Status changed from {old_status} to {status}",
        author_id=str(current_user.id),
        author_name=current_user.full_name,
        status_changed_from=old_status,
        status_changed_to=status,
    )
    session.add(comment)

    session.commit()
    session.refresh(issue)

    return {"success": True, "issue": issue.model_dump()}


@router.patch("/issues/{issue_id}/resolve")
def resolve_issue(
    issue_id: str,
    resolution: str = Query(...),
    resolution_notes: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Resolve an issue"""
    tenant_id = str(current_user.tenant_id)

    issue = session.get(ProjectIssue, issue_id)
    if not issue or str(issue.tenant_id) != tenant_id:
        raise HTTPException(404, "Issue not found")

    issue.status = IssueStatus.RESOLVED.value
    issue.resolution = resolution
    issue.resolution_notes = resolution_notes
    issue.resolved_date = date.today()
    issue.resolved_by = str(current_user.id)
    issue.updated_at = datetime.utcnow()
    issue.updated_by = str(current_user.id)

    session.add(issue)
    session.commit()
    session.refresh(issue)

    return {"success": True, "issue": issue.model_dump()}


@router.patch("/issues/{issue_id}/assign")
def assign_issue(
    issue_id: str,
    assignee_id: str = Query(...),
    assignee_name: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Assign issue to user"""
    tenant_id = str(current_user.tenant_id)

    issue = session.get(ProjectIssue, issue_id)
    if not issue or str(issue.tenant_id) != tenant_id:
        raise HTTPException(404, "Issue not found")

    issue.assignee_id = assignee_id
    issue.assignee_name = assignee_name
    issue.updated_at = datetime.utcnow()

    session.add(issue)
    session.commit()
    session.refresh(issue)

    return {"success": True, "issue": issue.model_dump()}


# =====================
# ISSUE COMMENTS
# =====================

@router.post("/issue-comments")
def add_comment(
    payload: IssueCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add comment to issue"""
    tenant_id = str(current_user.tenant_id)

    comment = IssueComment(
        tenant_id=tenant_id,
        **payload.model_dump(),
        author_id=str(current_user.id),
        author_name=current_user.full_name,
    )

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment.model_dump()


@router.delete("/issue-comments/{comment_id}")
def delete_comment(
    comment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete issue comment"""
    tenant_id = str(current_user.tenant_id)

    comment = session.get(IssueComment, comment_id)
    if not comment or str(comment.tenant_id) != tenant_id:
        raise HTTPException(404, "Comment not found")

    if str(comment.author_id) != str(current_user.id):
        raise HTTPException(403, "Can only delete your own comments")

    session.delete(comment)
    session.commit()

    return {"success": True}
