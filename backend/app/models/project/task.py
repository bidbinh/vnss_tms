"""
Project Management - Task Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class TaskStatus(str, Enum):
    """Task status"""
    BACKLOG = "BACKLOG"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    BLOCKED = "BLOCKED"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class TaskPriority(str, Enum):
    """Task priority"""
    LOWEST = "LOWEST"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    HIGHEST = "HIGHEST"


class TaskType(str, Enum):
    """Task type"""
    TASK = "TASK"
    BUG = "BUG"
    STORY = "STORY"
    EPIC = "EPIC"
    SUBTASK = "SUBTASK"
    FEATURE = "FEATURE"
    IMPROVEMENT = "IMPROVEMENT"


class DependencyType(str, Enum):
    """Task dependency type"""
    FINISH_TO_START = "FS"  # Predecessor must finish before successor starts
    START_TO_START = "SS"  # Both must start together
    FINISH_TO_FINISH = "FF"  # Both must finish together
    START_TO_FINISH = "SF"  # Predecessor must start before successor finishes


class Task(SQLModel, table=True):
    """Task - Project task/work item"""
    __tablename__ = "prj_tasks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Project & Parent
    project_id: str = Field(index=True)
    phase_id: Optional[str] = None
    milestone_id: Optional[str] = None
    parent_task_id: Optional[str] = None  # For subtasks

    # Basic Info
    task_number: str = Field(index=True)  # TASK-001
    title: str
    description: Optional[str] = None
    task_type: str = Field(default=TaskType.TASK.value)
    status: str = Field(default=TaskStatus.TODO.value)
    priority: str = Field(default=TaskPriority.MEDIUM.value)

    # Assignment
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    reporter_id: Optional[str] = None
    reporter_name: Optional[str] = None

    # Timeline
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None

    # Estimates
    estimated_hours: Decimal = Field(default=Decimal("0"))
    actual_hours: Decimal = Field(default=Decimal("0"))
    remaining_hours: Decimal = Field(default=Decimal("0"))
    story_points: Optional[int] = None

    # Progress
    progress_percent: Decimal = Field(default=Decimal("0"))

    # Cost
    estimated_cost: Decimal = Field(default=Decimal("0"))
    actual_cost: Decimal = Field(default=Decimal("0"))

    # Agile/Sprint
    sprint_id: Optional[str] = None
    board_column: Optional[str] = None
    position: int = Field(default=0)  # Order in board/list

    # Labels/Tags
    labels: Optional[str] = None  # JSON array

    # Time Tracking
    time_tracking_enabled: bool = Field(default=True)

    # Notes
    notes: Optional[str] = None

    # Completed Info
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class TaskDependency(SQLModel, table=True):
    """Task Dependency - Task relationships"""
    __tablename__ = "prj_task_dependencies"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    predecessor_id: str = Field(index=True)  # Task that must be done first
    successor_id: str = Field(index=True)  # Task that depends on predecessor
    dependency_type: str = Field(default=DependencyType.FINISH_TO_START.value)
    lag_days: int = Field(default=0)  # Days between tasks

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class TaskAssignment(SQLModel, table=True):
    """Task Assignment - Multiple assignees per task"""
    __tablename__ = "prj_task_assignments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    task_id: str = Field(index=True)
    user_id: str = Field(index=True)
    user_name: Optional[str] = None

    # Role
    is_primary: bool = Field(default=False)  # Primary assignee
    role: Optional[str] = None  # Developer, Reviewer, etc.

    # Allocation
    allocation_percent: Decimal = Field(default=Decimal("100"))
    estimated_hours: Decimal = Field(default=Decimal("0"))

    # Notes
    notes: Optional[str] = None

    # Audit
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_by: Optional[str] = None


class TaskComment(SQLModel, table=True):
    """Task Comment - Discussion on tasks"""
    __tablename__ = "prj_task_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    task_id: str = Field(index=True)
    parent_comment_id: Optional[str] = None  # For replies

    # Content
    content: str
    content_html: Optional[str] = None

    # Author
    author_id: str
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None

    # Mentions
    mentions: Optional[str] = None  # JSON array of user IDs

    # Edit
    is_edited: bool = Field(default=False)
    edited_at: Optional[datetime] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskAttachment(SQLModel, table=True):
    """Task Attachment - Files attached to tasks"""
    __tablename__ = "prj_task_attachments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    task_id: str = Field(index=True)

    # File Info
    file_name: str
    file_path: str
    file_size: int = Field(default=0)  # bytes
    file_type: Optional[str] = None  # MIME type
    thumbnail_path: Optional[str] = None

    # Upload
    uploaded_by: str
    uploaded_by_name: Optional[str] = None

    # Notes
    description: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TaskChecklist(SQLModel, table=True):
    """Task Checklist - Checklist groups within tasks"""
    __tablename__ = "prj_task_checklists"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    task_id: str = Field(index=True)
    name: str = Field(default="Checklist")
    position: int = Field(default=0)

    # Progress
    total_items: int = Field(default=0)
    completed_items: int = Field(default=0)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ChecklistItem(SQLModel, table=True):
    """Checklist Item - Individual checklist items"""
    __tablename__ = "prj_checklist_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    checklist_id: str = Field(index=True)
    content: str
    is_checked: bool = Field(default=False)
    position: int = Field(default=0)

    # Assignment
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None

    # Completed
    checked_at: Optional[datetime] = None
    checked_by: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
