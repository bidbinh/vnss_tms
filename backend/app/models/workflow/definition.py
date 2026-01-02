"""
Workflow Engine - Definition Models
"""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class WorkflowStatus(str, Enum):
    """Workflow definition status"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DEPRECATED = "DEPRECATED"


class WorkflowType(str, Enum):
    """Workflow type"""
    APPROVAL = "APPROVAL"
    SEQUENTIAL = "SEQUENTIAL"
    PARALLEL = "PARALLEL"
    STATE_MACHINE = "STATE_MACHINE"
    CUSTOM = "CUSTOM"


class WorkflowCategory(str, Enum):
    """Workflow category"""
    HR = "HR"
    FINANCE = "FINANCE"
    PROCUREMENT = "PROCUREMENT"
    SALES = "SALES"
    OPERATIONS = "OPERATIONS"
    GENERAL = "GENERAL"


class StepType(str, Enum):
    """Workflow step type"""
    START = "START"
    END = "END"
    TASK = "TASK"
    APPROVAL = "APPROVAL"
    DECISION = "DECISION"
    PARALLEL_SPLIT = "PARALLEL_SPLIT"
    PARALLEL_JOIN = "PARALLEL_JOIN"
    SUBPROCESS = "SUBPROCESS"
    TIMER = "TIMER"
    SCRIPT = "SCRIPT"
    NOTIFICATION = "NOTIFICATION"


class StepAction(str, Enum):
    """Step action type"""
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_INFO = "REQUEST_INFO"
    DELEGATE = "DELEGATE"
    ESCALATE = "ESCALATE"
    COMPLETE = "COMPLETE"
    SKIP = "SKIP"


class ConditionType(str, Enum):
    """Condition type"""
    FIELD_VALUE = "FIELD_VALUE"
    EXPRESSION = "EXPRESSION"
    SCRIPT = "SCRIPT"
    ALWAYS = "ALWAYS"


class ConditionOperator(str, Enum):
    """Condition operator"""
    EQUALS = "EQUALS"
    NOT_EQUALS = "NOT_EQUALS"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    GREATER_OR_EQUAL = "GREATER_OR_EQUAL"
    LESS_OR_EQUAL = "LESS_OR_EQUAL"
    CONTAINS = "CONTAINS"
    IN_LIST = "IN_LIST"
    IS_NULL = "IS_NULL"
    IS_NOT_NULL = "IS_NOT_NULL"


class WorkflowDefinition(SQLModel, table=True):
    """Workflow Definition - Define workflow structure"""
    __tablename__ = "wf_definitions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    # Basic Info
    code: str = Field(index=True)  # WF-LEAVE-APPROVAL
    name: str
    description: Optional[str] = None
    workflow_type: str = Field(default=WorkflowType.APPROVAL.value)
    category: str = Field(default=WorkflowCategory.GENERAL.value)
    status: str = Field(default=WorkflowStatus.DRAFT.value)

    # Version Control
    version: int = Field(default=1)
    is_current_version: bool = Field(default=True)
    previous_version_id: Optional[str] = None

    # Entity Binding
    entity_type: Optional[str] = None  # Order, LeaveRequest, etc.
    entity_module: Optional[str] = None  # TMS, HRM, CRM, etc.

    # Trigger Conditions (when to use this workflow)
    # JSON format: {"field": "total_days", "operator": "LESS_THAN", "value": 4}
    # or complex: [{"field": "total_days", "operator": "GREATER_OR_EQUAL", "value": 4}, ...]
    trigger_condition: Optional[str] = None  # JSON condition
    trigger_priority: int = Field(default=0)  # Higher priority = check first

    # Settings
    allow_parallel: bool = Field(default=False)
    allow_delegation: bool = Field(default=True)
    allow_recall: bool = Field(default=True)
    auto_complete_on_all_approved: bool = Field(default=True)
    require_comments_on_reject: bool = Field(default=True)

    # SLA
    default_sla_hours: Optional[int] = None
    escalation_enabled: bool = Field(default=False)

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    activated_at: Optional[datetime] = None
    activated_by: Optional[str] = None


class WorkflowStep(SQLModel, table=True):
    """Workflow Step - Individual step in workflow"""
    __tablename__ = "wf_steps"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    workflow_id: str = Field(index=True)
    step_order: int = Field(default=1)

    # Basic Info
    code: str  # STEP-1, APPROVAL-MANAGER
    name: str
    description: Optional[str] = None
    step_type: str = Field(default=StepType.TASK.value)

    # Assignment
    assignee_type: Optional[str] = None  # USER, ROLE, DEPARTMENT, DYNAMIC
    assignee_id: Optional[str] = None  # User ID or Role ID
    assignee_expression: Optional[str] = None  # Dynamic expression like ${manager_id}
    fallback_assignee_id: Optional[str] = None

    # Multi-approval settings
    require_all_approvers: bool = Field(default=False)  # All must approve
    min_approvers: int = Field(default=1)  # Minimum approvers needed
    max_approvers: Optional[int] = None

    # Timing
    sla_hours: Optional[int] = None
    reminder_hours: Optional[int] = None
    escalation_hours: Optional[int] = None
    escalation_to: Optional[str] = None

    # Actions
    allowed_actions: Optional[str] = None  # JSON array of allowed actions

    # Form/Fields
    form_id: Optional[str] = None
    required_fields: Optional[str] = None  # JSON array of required field names
    visible_fields: Optional[str] = None
    editable_fields: Optional[str] = None

    # Script/Automation
    on_enter_script: Optional[str] = None
    on_exit_script: Optional[str] = None
    validation_script: Optional[str] = None

    # UI
    position_x: int = Field(default=0)
    position_y: int = Field(default=0)
    color: Optional[str] = None
    icon: Optional[str] = None

    # Notes
    notes: Optional[str] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class WorkflowTransition(SQLModel, table=True):
    """Workflow Transition - Connection between steps"""
    __tablename__ = "wf_transitions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    workflow_id: str = Field(index=True)
    from_step_id: str = Field(index=True)
    to_step_id: str = Field(index=True)

    # Basic Info
    name: Optional[str] = None
    description: Optional[str] = None

    # Trigger
    trigger_action: Optional[str] = None  # APPROVE, REJECT, COMPLETE, etc.

    # Condition
    condition_type: str = Field(default=ConditionType.ALWAYS.value)
    condition_expression: Optional[str] = None

    # Priority (for multiple transitions from same step)
    priority: int = Field(default=0)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class WorkflowCondition(SQLModel, table=True):
    """Workflow Condition - Transition conditions"""
    __tablename__ = "wf_conditions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)

    transition_id: str = Field(index=True)
    condition_order: int = Field(default=1)

    # Condition
    condition_type: str = Field(default=ConditionType.FIELD_VALUE.value)
    field_name: Optional[str] = None
    operator: str = Field(default=ConditionOperator.EQUALS.value)
    value: Optional[str] = None
    expression: Optional[str] = None

    # Logic
    and_group: int = Field(default=1)  # Conditions in same group are AND'ed

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
