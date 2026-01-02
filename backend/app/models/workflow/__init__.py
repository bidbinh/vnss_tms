"""
Workflow Engine Module Models
Hệ thống quy trình: Workflow Definition, Tasks, Approvals, Automation
"""

from app.models.workflow.definition import (
    WorkflowDefinition, WorkflowStatus, WorkflowType, WorkflowCategory,
    WorkflowStep, StepType, StepAction,
    WorkflowTransition,
    WorkflowCondition, ConditionType, ConditionOperator,
)

from app.models.workflow.instance import (
    WorkflowInstance, InstanceStatus,
    WorkflowStepInstance, StepInstanceStatus,
    WorkflowHistory,
    WorkflowVariable,
)

from app.models.workflow.approval import (
    ApprovalRequest, ApprovalStatus, ApprovalType,
    ApprovalStep, ApprovalDecision,
    ApprovalDelegate,
    ApprovalRule, RuleType,
)

from app.models.workflow.task import (
    WorkflowTask, WorkflowTaskStatus, WorkflowTaskPriority,
    TaskReminder,
    TaskEscalation,
)

from app.models.workflow.notification import (
    WorkflowNotification, NotificationType, NotificationChannel,
    NotificationTemplate,
)

__all__ = [
    # Definition
    "WorkflowDefinition", "WorkflowStatus", "WorkflowType", "WorkflowCategory",
    "WorkflowStep", "StepType", "StepAction",
    "WorkflowTransition",
    "WorkflowCondition", "ConditionType", "ConditionOperator",
    # Instance
    "WorkflowInstance", "InstanceStatus",
    "WorkflowStepInstance", "StepInstanceStatus",
    "WorkflowHistory",
    "WorkflowVariable",
    # Approval
    "ApprovalRequest", "ApprovalStatus", "ApprovalType",
    "ApprovalStep", "ApprovalDecision",
    "ApprovalDelegate",
    "ApprovalRule", "RuleType",
    # Task
    "WorkflowTask", "WorkflowTaskStatus", "WorkflowTaskPriority",
    "TaskReminder",
    "TaskEscalation",
    # Notification
    "WorkflowNotification", "NotificationType", "NotificationChannel",
    "NotificationTemplate",
]
