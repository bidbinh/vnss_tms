"""
User Task - Central Task Management System

Tổng hợp tất cả công việc cá nhân cần xử lý từ mọi module trong platform:
- TMS: Chuyến xe được assign, xác nhận giao hàng
- HRM: Nộp bảng chấm công, cập nhật thông tin
- Accounting: Duyệt thanh toán, xác nhận công nợ
- CRM: Follow-up khách hàng, xử lý báo giá
- Project: Task dự án được giao
- Workflow: Các phê duyệt đang chờ
- Manual: Task tự tạo cá nhân/công ty
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class UserTaskStatus(str, Enum):
    """Task status"""
    PENDING = "PENDING"           # Chưa bắt đầu
    IN_PROGRESS = "IN_PROGRESS"   # Đang thực hiện
    COMPLETED = "COMPLETED"       # Hoàn thành
    CANCELLED = "CANCELLED"       # Đã hủy


class UserTaskPriority(str, Enum):
    """Task priority"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class UserTaskType(str, Enum):
    """Task type - determines behavior"""
    ACTION = "ACTION"           # Cần thực hiện action
    APPROVAL = "APPROVAL"       # Cần phê duyệt
    REVIEW = "REVIEW"           # Cần xem xét/theo dõi
    NOTIFICATION = "NOTIFICATION"  # Chỉ thông báo, tích đã xem


class UserTaskScope(str, Enum):
    """Task scope - personal or company"""
    COMPANY = "COMPANY"         # Công việc công ty (default)
    PERSONAL = "PERSONAL"       # Việc cá nhân


class UserTaskSource(str, Enum):
    """Source module that created the task"""
    MANUAL = "MANUAL"           # Tự tạo thủ công
    TMS = "TMS"                 # Transport Management
    HRM = "HRM"                 # Human Resource
    CRM = "CRM"                 # Customer Relationship
    ACCOUNTING = "ACCOUNTING"   # Accounting
    WMS = "WMS"                 # Warehouse Management
    PROJECT = "PROJECT"         # Project Management
    WORKFLOW = "WORKFLOW"       # Workflow/Approval
    FMS = "FMS"                 # Forwarding Management
    MES = "MES"                 # Manufacturing
    SYSTEM = "SYSTEM"           # System generated


class UserTask(SQLModel, table=True):
    """
    User Task - Central task for all personal work items

    This aggregates tasks from all modules into a single view for each user.
    """
    __tablename__ = "user_tasks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Task identification
    task_number: str = Field(index=True)  # TASK-2024-00001

    # Basic Info
    title: str
    description: Optional[str] = None

    # Classification
    task_type: str = Field(default=UserTaskType.ACTION.value, index=True)
    scope: str = Field(default=UserTaskScope.COMPANY.value, index=True)
    source: str = Field(default=UserTaskSource.MANUAL.value, index=True)

    # Status & Priority
    status: str = Field(default=UserTaskStatus.PENDING.value, index=True)
    priority: str = Field(default=UserTaskPriority.NORMAL.value, index=True)

    # Source reference - link to original entity
    source_module: Optional[str] = None      # TMS, HRM, CRM, etc.
    source_entity_type: Optional[str] = None # Order, Trip, LeaveRequest, etc.
    source_entity_id: Optional[str] = None   # ID of the original entity
    source_entity_code: Optional[str] = None # Display code: ORD-2024-001
    source_url: Optional[str] = None         # Direct URL to the source entity

    # Assignment
    assigned_to_id: str = Field(index=True)  # User who needs to do this task
    assigned_to_name: Optional[str] = None
    assigned_by_id: Optional[str] = None     # Who assigned/created the task
    assigned_by_name: Optional[str] = None
    assigned_at: datetime = Field(default_factory=datetime.utcnow)

    # Watchers - users who follow this task (JSON array of user IDs)
    watchers_json: Optional[str] = None  # ["user_id_1", "user_id_2"]

    # Timeline
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Overdue tracking
    is_overdue: bool = Field(default=False)

    # Result/Completion
    result: Optional[str] = None             # COMPLETED, APPROVED, REJECTED, etc.
    result_data: Optional[str] = None        # JSON - structured result data
    result_note: Optional[str] = None        # Note when completing

    # Attachments (JSON array)
    attachments_json: Optional[str] = None   # [{"name": "file.pdf", "url": "...", "size": 1234}]

    # Actions configuration (JSON array of available actions)
    # e.g., [{"key": "approve", "label": "Duyệt", "style": "primary"}, {"key": "reject", "label": "Từ chối", "style": "danger"}]
    actions_json: Optional[str] = None

    # Tags for categorization (JSON array)
    # e.g., ["urgent", "review", "meeting"]
    tags_json: Optional[str] = None

    # Comments/Activity log (stored separately in UserTaskComment)
    comments_count: int = Field(default=0)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None


class UserTaskComment(SQLModel, table=True):
    """Comments/Activity on a task"""
    __tablename__ = "user_task_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    task_id: str = Field(index=True, foreign_key="user_tasks.id")

    # Comment content
    content: str

    # Type: COMMENT, STATUS_CHANGE, ASSIGNMENT_CHANGE, etc.
    comment_type: str = Field(default="COMMENT")

    # Attachments in this comment
    attachments_json: Optional[str] = None

    # Author
    user_id: str
    user_name: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserTaskWatcher(SQLModel, table=True):
    """Users watching a task - for efficient querying"""
    __tablename__ = "user_task_watchers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    task_id: str = Field(index=True, foreign_key="user_tasks.id")
    user_id: str = Field(index=True)
    user_name: Optional[str] = None

    # When they started watching
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserTaskSequence(SQLModel, table=True):
    """Auto-increment sequence for task numbers per tenant per year"""
    __tablename__ = "user_task_sequences"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    year: int
    last_number: int = Field(default=0)

    # Unique constraint: one sequence per tenant per year
    # Will be enforced at database level
