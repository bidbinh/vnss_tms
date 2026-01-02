"""
Project Management - Project, Phase, Member Models
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class ProjectStatus(str, Enum):
    """Project status"""
    DRAFT = "DRAFT"
    PLANNING = "PLANNING"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ARCHIVED = "ARCHIVED"


class ProjectPriority(str, Enum):
    """Project priority"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProjectType(str, Enum):
    """Project type"""
    INTERNAL = "INTERNAL"
    CLIENT = "CLIENT"
    RESEARCH = "RESEARCH"
    MAINTENANCE = "MAINTENANCE"
    CONSULTING = "CONSULTING"
    IMPLEMENTATION = "IMPLEMENTATION"


class MemberRole(str, Enum):
    """Project member role"""
    MANAGER = "MANAGER"
    LEAD = "LEAD"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"
    STAKEHOLDER = "STAKEHOLDER"


class PhaseStatus(str, Enum):
    """Phase status"""
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


class Project(SQLModel, table=True):
    """Project - Main project entity"""
    __tablename__ = "prj_projects"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    code: str = Field(index=True)  # PRJ-2024-001
    name: str
    description: Optional[str] = None
    project_type: str = Field(default=ProjectType.INTERNAL.value)
    status: str = Field(default=ProjectStatus.DRAFT.value)
    priority: str = Field(default=ProjectPriority.MEDIUM.value)

    # Client/Customer
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    contract_id: Optional[str] = None
    contract_number: Optional[str] = None

    # Manager
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None

    # Timeline
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None

    # Budget
    budget_amount: Decimal = Field(default=Decimal("0"))
    actual_cost: Decimal = Field(default=Decimal("0"))
    currency: str = Field(default="VND")

    # Progress
    progress_percent: Decimal = Field(default=Decimal("0"))
    total_tasks: int = Field(default=0)
    completed_tasks: int = Field(default=0)

    # Hours
    estimated_hours: Decimal = Field(default=Decimal("0"))
    actual_hours: Decimal = Field(default=Decimal("0"))

    # Parent Project (for sub-projects)
    parent_project_id: Optional[str] = None

    # Tags/Categories
    category: Optional[str] = None
    tags: Optional[str] = None  # JSON array of tags

    # Settings
    is_template: bool = Field(default=False)
    allow_overtime: bool = Field(default=True)
    track_time: bool = Field(default=True)

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class ProjectMember(SQLModel, table=True):
    """Project Member - Team member assignment"""
    __tablename__ = "prj_project_members"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    project_id: str = Field(index=True)
    user_id: str = Field(index=True)
    employee_id: Optional[str] = None

    # Role
    role: str = Field(default=MemberRole.MEMBER.value)
    is_active: bool = Field(default=True)

    # User Info (denormalized for performance)
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

    # Allocation
    allocation_percent: Decimal = Field(default=Decimal("100"))  # % of time allocated
    hourly_rate: Decimal = Field(default=Decimal("0"))  # Cost rate per hour
    billing_rate: Decimal = Field(default=Decimal("0"))  # Billing rate per hour

    # Dates
    join_date: Optional[date] = None
    leave_date: Optional[date] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ProjectPhase(SQLModel, table=True):
    """Project Phase - Project phases/stages"""
    __tablename__ = "prj_project_phases"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    project_id: str = Field(index=True)
    phase_number: int = Field(default=1)
    name: str
    description: Optional[str] = None
    status: str = Field(default=PhaseStatus.NOT_STARTED.value)

    # Timeline
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None

    # Progress
    progress_percent: Decimal = Field(default=Decimal("0"))
    weight_percent: Decimal = Field(default=Decimal("0"))  # Weight in overall project

    # Budget
    budget_amount: Decimal = Field(default=Decimal("0"))
    actual_cost: Decimal = Field(default=Decimal("0"))

    # Deliverables
    deliverables: Optional[str] = None  # JSON array

    # Gate/Review
    requires_approval: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
