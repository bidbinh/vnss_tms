"""
Project Management - Issue Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class IssueStatus(str, Enum):
    """Issue status"""
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    ON_HOLD = "ON_HOLD"


class IssuePriority(str, Enum):
    """Issue priority"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IssueType(str, Enum):
    """Issue type"""
    PROBLEM = "PROBLEM"
    CHANGE_REQUEST = "CHANGE_REQUEST"
    QUESTION = "QUESTION"
    INCIDENT = "INCIDENT"
    ENHANCEMENT = "ENHANCEMENT"


class ProjectIssue(SQLModel, table=True):
    """Project Issue - Issue tracking"""
    __tablename__ = "prj_issues"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    project_id: str = Field(index=True)
    task_id: Optional[str] = None

    # Basic Info
    issue_number: str = Field(index=True)  # ISSUE-001
    title: str
    description: str
    issue_type: str = Field(default=IssueType.PROBLEM.value)
    status: str = Field(default=IssueStatus.OPEN.value)
    priority: str = Field(default=IssuePriority.MEDIUM.value)

    # Category
    category: Optional[str] = None

    # Reporter
    reporter_id: str
    reporter_name: Optional[str] = None

    # Assignee
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None

    # Timeline
    reported_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    resolved_date: Optional[date] = None
    closed_date: Optional[date] = None

    # Resolution
    resolution: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None

    # Impact
    is_blocking: bool = Field(default=False)
    affected_areas: Optional[str] = None  # JSON array

    # Related
    related_risk_id: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class IssueComment(SQLModel, table=True):
    """Issue Comment - Discussion on issues"""
    __tablename__ = "prj_issue_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    issue_id: str = Field(index=True)
    parent_comment_id: Optional[str] = None

    # Content
    content: str

    # Author
    author_id: str
    author_name: Optional[str] = None

    # Status Change (if comment includes status change)
    status_changed_to: Optional[str] = None
    status_changed_from: Optional[str] = None

    # Edit
    is_edited: bool = Field(default=False)
    edited_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
