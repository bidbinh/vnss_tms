"""
Workflow Engine - Approval Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


class ApprovalStatus(str, Enum):
    """Approval request status"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class ApprovalType(str, Enum):
    """Approval type"""
    SINGLE = "SINGLE"
    SEQUENTIAL = "SEQUENTIAL"
    PARALLEL = "PARALLEL"
    UNANIMOUS = "UNANIMOUS"
    MAJORITY = "MAJORITY"


class RuleType(str, Enum):
    """Approval rule type"""
    AMOUNT_BASED = "AMOUNT_BASED"
    DEPARTMENT_BASED = "DEPARTMENT_BASED"
    ROLE_BASED = "ROLE_BASED"
    CUSTOM = "CUSTOM"


class ApprovalRequest(SQLModel, table=True):
    """Approval Request - Request for approval"""
    __tablename__ = "wf_approval_requests"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Reference
    request_number: str = Field(index=True)  # APR-2024-00001
    workflow_instance_id: Optional[str] = None
    step_instance_id: Optional[str] = None

    # Entity
    entity_type: str  # LeaveRequest, PurchaseOrder, etc.
    entity_id: str = Field(index=True)
    entity_reference: Optional[str] = None

    # Request Info
    title: str
    description: Optional[str] = None
    approval_type: str = Field(default=ApprovalType.SEQUENTIAL.value)
    status: str = Field(default=ApprovalStatus.PENDING.value)

    # Requester
    requester_id: str
    requester_name: Optional[str] = None
    requester_department: Optional[str] = None

    # Amount (for amount-based approvals)
    amount: Decimal = Field(default=Decimal("0"))
    currency: str = Field(default="VND")

    # Urgency
    priority: int = Field(default=5)
    is_urgent: bool = Field(default=False)

    # Timeline
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None

    # Result
    final_status: Optional[str] = None
    final_approver_id: Optional[str] = None
    final_approver_name: Optional[str] = None
    final_comments: Optional[str] = None

    # Data
    request_data: Optional[str] = None  # JSON

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ApprovalStep(SQLModel, table=True):
    """Approval Step - Step in approval chain"""
    __tablename__ = "wf_approval_steps"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    request_id: str = Field(index=True)
    step_order: int = Field(default=1)

    # Approver
    approver_id: str = Field(index=True)
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    approver_department: Optional[str] = None

    # Delegation
    is_delegated: bool = Field(default=False)
    delegated_from_id: Optional[str] = None
    delegated_from_name: Optional[str] = None

    # Status
    status: str = Field(default=ApprovalStatus.PENDING.value)
    is_current: bool = Field(default=False)

    # Action
    decision: Optional[str] = None  # APPROVED, REJECTED, FORWARDED
    comments: Optional[str] = None
    decided_at: Optional[datetime] = None

    # Timeline
    activated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None

    # Reminders
    reminder_sent: bool = Field(default=False)
    reminder_count: int = Field(default=0)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ApprovalDecision(SQLModel, table=True):
    """Approval Decision - Decision history"""
    __tablename__ = "wf_approval_decisions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    request_id: str = Field(index=True)
    step_id: str = Field(index=True)

    # Decision
    decision: str  # APPROVED, REJECTED, REQUEST_INFO, DELEGATE
    comments: str

    # Decider
    decided_by_id: str
    decided_by_name: Optional[str] = None
    decided_at: datetime = Field(default_factory=datetime.utcnow)

    # Delegation
    delegated_to_id: Optional[str] = None
    delegated_to_name: Optional[str] = None

    # Attachments
    attachments: Optional[str] = None  # JSON array of file paths

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApprovalDelegate(SQLModel, table=True):
    """Approval Delegate - Delegation settings"""
    __tablename__ = "wf_approval_delegates"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Delegator
    delegator_id: str = Field(index=True)
    delegator_name: Optional[str] = None

    # Delegate
    delegate_id: str = Field(index=True)
    delegate_name: Optional[str] = None

    # Period
    start_date: date
    end_date: date
    is_active: bool = Field(default=True)

    # Scope
    all_approvals: bool = Field(default=True)
    workflow_ids: Optional[str] = None  # JSON array of specific workflow IDs
    entity_types: Optional[str] = None  # JSON array of entity types

    # Limits
    max_amount: Optional[Decimal] = None
    currency: str = Field(default="VND")

    # Reason
    reason: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class ApprovalRule(SQLModel, table=True):
    """Approval Rule - Approval routing rules"""
    __tablename__ = "wf_approval_rules"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    code: str = Field(index=True)
    name: str
    description: Optional[str] = None
    rule_type: str = Field(default=RuleType.AMOUNT_BASED.value)
    is_active: bool = Field(default=True)

    # Scope
    entity_type: Optional[str] = None
    department_id: Optional[str] = None
    workflow_id: Optional[str] = None

    # Amount Range
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    currency: str = Field(default="VND")

    # Approvers
    approver_type: str = Field(default="USER")  # USER, ROLE, DEPARTMENT_HEAD, CUSTOM
    approver_id: Optional[str] = None
    approver_expression: Optional[str] = None

    # Chain
    approval_chain: Optional[str] = None  # JSON array of approver configs
    require_all: bool = Field(default=False)

    # Priority
    priority: int = Field(default=0)  # Lower = higher priority

    # Conditions
    condition_expression: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
