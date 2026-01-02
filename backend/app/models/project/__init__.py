"""
Project Management Module Models
Quản lý dự án: Projects, Tasks, Milestones, Resources, Time Tracking
"""

from app.models.project.project import (
    Project, ProjectStatus, ProjectPriority, ProjectType,
    ProjectMember, MemberRole,
    ProjectPhase, PhaseStatus,
)

from app.models.project.task import (
    Task, TaskStatus, TaskPriority, TaskType,
    TaskDependency, DependencyType,
    TaskAssignment,
    TaskComment,
    TaskAttachment,
    TaskChecklist, ChecklistItem,
)

from app.models.project.milestone import (
    Milestone, MilestoneStatus,
)

from app.models.project.resource import (
    ResourceType, Resource,
    ResourceAllocation,
    ResourceCalendar,
)

from app.models.project.timesheet import (
    Timesheet, TimesheetStatus,
    TimesheetEntry,
    TimesheetApproval,
)

from app.models.project.risk import (
    ProjectRisk, RiskStatus, RiskProbability, RiskImpact,
    RiskMitigation,
)

from app.models.project.issue import (
    ProjectIssue, IssueStatus, IssuePriority, IssueType,
    IssueComment,
)

__all__ = [
    # Project
    "Project", "ProjectStatus", "ProjectPriority", "ProjectType",
    "ProjectMember", "MemberRole",
    "ProjectPhase", "PhaseStatus",
    # Task
    "Task", "TaskStatus", "TaskPriority", "TaskType",
    "TaskDependency", "DependencyType",
    "TaskAssignment",
    "TaskComment",
    "TaskAttachment",
    "TaskChecklist", "ChecklistItem",
    # Milestone
    "Milestone", "MilestoneStatus",
    # Resource
    "ResourceType", "Resource",
    "ResourceAllocation",
    "ResourceCalendar",
    # Timesheet
    "Timesheet", "TimesheetStatus",
    "TimesheetEntry",
    "TimesheetApproval",
    # Risk
    "ProjectRisk", "RiskStatus", "RiskProbability", "RiskImpact",
    "RiskMitigation",
    # Issue
    "ProjectIssue", "IssueStatus", "IssuePriority", "IssueType",
    "IssueComment",
]
