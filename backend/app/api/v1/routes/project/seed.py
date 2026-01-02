"""
Project Management - Seed Data API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, date, timedelta
from decimal import Decimal
import random

from app.db.session import get_session
from app.models import User
from app.models.project import (
    Project, ProjectStatus, ProjectPriority, ProjectType,
    ProjectMember, MemberRole, ProjectPhase, PhaseStatus,
    Task, TaskStatus, TaskPriority, TaskType,
    Milestone, MilestoneStatus,
    Resource, ResourceType,
    Timesheet, TimesheetStatus, TimesheetEntry,
    ProjectRisk, RiskStatus, RiskProbability, RiskImpact,
    ProjectIssue, IssueStatus, IssuePriority,
)
from app.core.security import get_current_user

router = APIRouter()


@router.post("/seed")
def seed_project_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed Project Management sample data"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    created = {
        "projects": 0,
        "phases": 0,
        "members": 0,
        "tasks": 0,
        "milestones": 0,
        "resources": 0,
        "risks": 0,
        "issues": 0,
    }

    # ===================
    # 1. PROJECTS
    # ===================
    project_data = [
        {
            "code": "PRJ-ERP-2024",
            "name": "ERP Implementation Phase 2",
            "description": "Triển khai hệ thống ERP giai đoạn 2 - Module Kế toán & Nhân sự",
            "project_type": ProjectType.IMPLEMENTATION.value,
            "priority": ProjectPriority.HIGH.value,
            "customer_name": "Internal",
            "start_date": date.today() - timedelta(days=30),
            "end_date": date.today() + timedelta(days=150),
            "budget_amount": Decimal("500000000"),
            "estimated_hours": Decimal("2000"),
        },
        {
            "code": "PRJ-WEB-2024",
            "name": "Website Redesign",
            "description": "Thiết kế lại website công ty với giao diện mới",
            "project_type": ProjectType.CLIENT.value,
            "priority": ProjectPriority.MEDIUM.value,
            "customer_name": "ABC Corp",
            "start_date": date.today() - timedelta(days=15),
            "end_date": date.today() + timedelta(days=60),
            "budget_amount": Decimal("150000000"),
            "estimated_hours": Decimal("500"),
        },
        {
            "code": "PRJ-APP-2024",
            "name": "Mobile App Development",
            "description": "Phát triển ứng dụng di động cho khách hàng",
            "project_type": ProjectType.CLIENT.value,
            "priority": ProjectPriority.HIGH.value,
            "customer_name": "XYZ Ltd",
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=90),
            "budget_amount": Decimal("300000000"),
            "estimated_hours": Decimal("1200"),
        },
    ]

    projects = []
    for prj_data in project_data:
        existing = session.exec(
            select(Project).where(
                Project.tenant_id == tenant_id,
                Project.code == prj_data["code"]
            )
        ).first()

        if not existing:
            prj = Project(
                tenant_id=tenant_id,
                **prj_data,
                status=ProjectStatus.IN_PROGRESS.value,
                manager_id=user_id,
                manager_name=current_user.full_name,
                created_by=user_id,
            )
            session.add(prj)
            session.flush()
            projects.append(prj)
            created["projects"] += 1

            # Add current user as member
            member = ProjectMember(
                tenant_id=tenant_id,
                project_id=str(prj.id),
                user_id=user_id,
                user_name=current_user.full_name,
                user_email=current_user.email,
                role=MemberRole.MANAGER.value,
                join_date=date.today(),
                created_by=user_id,
            )
            session.add(member)
            created["members"] += 1
        else:
            projects.append(existing)

    session.flush()

    # ===================
    # 2. PROJECT PHASES
    # ===================
    phase_templates = [
        ("Khởi động", 10),
        ("Phân tích yêu cầu", 15),
        ("Thiết kế", 20),
        ("Phát triển", 35),
        ("Kiểm thử", 15),
        ("Triển khai", 5),
    ]

    for prj in projects:
        for i, (phase_name, weight) in enumerate(phase_templates, 1):
            existing = session.exec(
                select(ProjectPhase).where(
                    ProjectPhase.tenant_id == tenant_id,
                    ProjectPhase.project_id == str(prj.id),
                    ProjectPhase.phase_number == i
                )
            ).first()

            if not existing:
                phase = ProjectPhase(
                    tenant_id=tenant_id,
                    project_id=str(prj.id),
                    phase_number=i,
                    name=phase_name,
                    weight_percent=Decimal(str(weight)),
                    status=PhaseStatus.NOT_STARTED.value if i > 2 else PhaseStatus.COMPLETED.value if i == 1 else PhaseStatus.IN_PROGRESS.value,
                    created_by=user_id,
                )
                session.add(phase)
                created["phases"] += 1

    session.flush()

    # ===================
    # 3. MILESTONES
    # ===================
    milestone_templates = [
        "Hoàn thành phân tích yêu cầu",
        "Hoàn thành thiết kế hệ thống",
        "Hoàn thành phát triển module chính",
        "Hoàn thành UAT",
        "Go-live",
    ]

    for prj in projects:
        for i, ms_name in enumerate(milestone_templates):
            existing = session.exec(
                select(Milestone).where(
                    Milestone.tenant_id == tenant_id,
                    Milestone.project_id == str(prj.id),
                    Milestone.name == ms_name
                )
            ).first()

            if not existing:
                ms = Milestone(
                    tenant_id=tenant_id,
                    project_id=str(prj.id),
                    name=ms_name,
                    due_date=prj.start_date + timedelta(days=30 * (i + 1)) if prj.start_date else None,
                    status=MilestoneStatus.COMPLETED.value if i == 0 else MilestoneStatus.NOT_STARTED.value,
                    owner_id=user_id,
                    owner_name=current_user.full_name,
                    created_by=user_id,
                )
                session.add(ms)
                created["milestones"] += 1

    session.flush()

    # ===================
    # 4. TASKS
    # ===================
    task_templates = [
        ("Khảo sát hiện trạng", TaskType.TASK.value, TaskPriority.HIGH.value),
        ("Thu thập yêu cầu nghiệp vụ", TaskType.TASK.value, TaskPriority.HIGH.value),
        ("Phân tích gap", TaskType.TASK.value, TaskPriority.MEDIUM.value),
        ("Thiết kế giải pháp", TaskType.TASK.value, TaskPriority.HIGH.value),
        ("Thiết kế database", TaskType.TASK.value, TaskPriority.HIGH.value),
        ("Phát triển backend API", TaskType.TASK.value, TaskPriority.HIGH.value),
        ("Phát triển frontend", TaskType.TASK.value, TaskPriority.HIGH.value),
        ("Unit testing", TaskType.TASK.value, TaskPriority.MEDIUM.value),
        ("Integration testing", TaskType.TASK.value, TaskPriority.MEDIUM.value),
        ("Bug fix: Login issue", TaskType.BUG.value, TaskPriority.HIGH.value),
        ("Feature: Export PDF", TaskType.FEATURE.value, TaskPriority.MEDIUM.value),
    ]

    for prj in projects[:2]:  # Only first 2 projects
        for i, (task_title, task_type, priority) in enumerate(task_templates):
            task_number = f"TASK-{i+1:04d}"
            existing = session.exec(
                select(Task).where(
                    Task.tenant_id == tenant_id,
                    Task.project_id == str(prj.id),
                    Task.task_number == task_number
                )
            ).first()

            if not existing:
                status = TaskStatus.DONE.value if i < 3 else TaskStatus.IN_PROGRESS.value if i < 5 else TaskStatus.TODO.value
                task = Task(
                    tenant_id=tenant_id,
                    project_id=str(prj.id),
                    task_number=task_number,
                    title=task_title,
                    task_type=task_type,
                    priority=priority,
                    status=status,
                    assignee_id=user_id,
                    assignee_name=current_user.full_name,
                    reporter_id=user_id,
                    reporter_name=current_user.full_name,
                    estimated_hours=Decimal(str(random.randint(4, 40))),
                    actual_hours=Decimal(str(random.randint(2, 30))) if status != TaskStatus.TODO.value else Decimal("0"),
                    start_date=date.today() - timedelta(days=random.randint(1, 20)),
                    due_date=date.today() + timedelta(days=random.randint(5, 30)),
                    created_by=user_id,
                )
                session.add(task)
                created["tasks"] += 1

                # Update project task counts
                prj.total_tasks = (prj.total_tasks or 0) + 1
                if status == TaskStatus.DONE.value:
                    prj.completed_tasks = (prj.completed_tasks or 0) + 1

        session.add(prj)

    session.flush()

    # ===================
    # 5. RESOURCES
    # ===================
    resource_data = [
        ("RES-DEV-001", "Nguyễn Văn A - Developer", ResourceType.HUMAN.value, 200000),
        ("RES-DEV-002", "Trần Thị B - Developer", ResourceType.HUMAN.value, 180000),
        ("RES-BA-001", "Lê Văn C - Business Analyst", ResourceType.HUMAN.value, 250000),
        ("RES-PM-001", "Phạm Thị D - Project Manager", ResourceType.HUMAN.value, 300000),
        ("RES-QA-001", "Hoàng Văn E - QA Engineer", ResourceType.HUMAN.value, 170000),
        ("RES-SRV-001", "Server Development", ResourceType.EQUIPMENT.value, 0),
        ("RES-SW-001", "License phần mềm", ResourceType.SOFTWARE.value, 0),
    ]

    for code, name, res_type, rate in resource_data:
        existing = session.exec(
            select(Resource).where(
                Resource.tenant_id == tenant_id,
                Resource.code == code
            )
        ).first()

        if not existing:
            res = Resource(
                tenant_id=tenant_id,
                code=code,
                name=name,
                resource_type=res_type,
                cost_rate_per_hour=Decimal(str(rate)),
                billing_rate_per_hour=Decimal(str(rate * 1.5)) if rate > 0 else Decimal("0"),
                is_available=True,
                created_by=user_id,
            )
            session.add(res)
            created["resources"] += 1

    session.flush()

    # ===================
    # 6. RISKS
    # ===================
    risk_data = [
        ("Thiếu nguồn lực phát triển", RiskProbability.MEDIUM.value, RiskImpact.MAJOR.value),
        ("Thay đổi yêu cầu trong quá trình phát triển", RiskProbability.HIGH.value, RiskImpact.MODERATE.value),
        ("Kỹ thuật mới chưa được thử nghiệm", RiskProbability.LOW.value, RiskImpact.MAJOR.value),
        ("Khách hàng chậm phản hồi", RiskProbability.MEDIUM.value, RiskImpact.MODERATE.value),
    ]

    for prj in projects[:1]:  # Only first project
        for i, (title, prob, impact) in enumerate(risk_data):
            risk_number = f"RISK-{i+1:03d}"
            existing = session.exec(
                select(ProjectRisk).where(
                    ProjectRisk.tenant_id == tenant_id,
                    ProjectRisk.project_id == str(prj.id),
                    ProjectRisk.risk_number == risk_number
                )
            ).first()

            if not existing:
                prob_score = {"VERY_LOW": 1, "LOW": 2, "MEDIUM": 3, "HIGH": 4, "VERY_HIGH": 5}.get(prob, 3)
                impact_score = {"NEGLIGIBLE": 1, "MINOR": 2, "MODERATE": 3, "MAJOR": 4, "CRITICAL": 5}.get(impact, 3)

                risk = ProjectRisk(
                    tenant_id=tenant_id,
                    project_id=str(prj.id),
                    risk_number=risk_number,
                    title=title,
                    description=f"Mô tả chi tiết về rủi ro: {title}",
                    probability=prob,
                    impact=impact,
                    risk_score=Decimal(str(prob_score * impact_score)),
                    status=RiskStatus.IDENTIFIED.value,
                    owner_id=user_id,
                    owner_name=current_user.full_name,
                    response_strategy="MITIGATE",
                    created_by=user_id,
                )
                session.add(risk)
                created["risks"] += 1

    session.flush()

    # ===================
    # 7. ISSUES
    # ===================
    issue_data = [
        ("API response chậm với dữ liệu lớn", IssuePriority.HIGH.value),
        ("Lỗi hiển thị trên Safari", IssuePriority.MEDIUM.value),
        ("Yêu cầu thêm báo cáo xuất Excel", IssuePriority.LOW.value),
    ]

    for prj in projects[:1]:
        for i, (title, priority) in enumerate(issue_data):
            issue_number = f"ISSUE-{i+1:04d}"
            existing = session.exec(
                select(ProjectIssue).where(
                    ProjectIssue.tenant_id == tenant_id,
                    ProjectIssue.project_id == str(prj.id),
                    ProjectIssue.issue_number == issue_number
                )
            ).first()

            if not existing:
                issue = ProjectIssue(
                    tenant_id=tenant_id,
                    project_id=str(prj.id),
                    issue_number=issue_number,
                    title=title,
                    description=f"Mô tả chi tiết: {title}",
                    priority=priority,
                    status=IssueStatus.OPEN.value if i > 0 else IssueStatus.IN_PROGRESS.value,
                    reporter_id=user_id,
                    reporter_name=current_user.full_name,
                    assignee_id=user_id,
                    assignee_name=current_user.full_name,
                    created_by=user_id,
                )
                session.add(issue)
                created["issues"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Project Management sample data created successfully",
        "created": created,
    }


@router.delete("/project/seed")
def delete_project_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all Project Management sample data"""
    tenant_id = str(current_user.tenant_id)

    deleted = {
        "issues": 0,
        "risks": 0,
        "timesheet_entries": 0,
        "timesheets": 0,
        "resources": 0,
        "milestones": 0,
        "tasks": 0,
        "phases": 0,
        "members": 0,
        "projects": 0,
    }

    from app.models.project import (
        ProjectIssue, IssueComment,
        ProjectRisk, RiskMitigation,
        Timesheet, TimesheetEntry,
        Resource, ResourceAllocation,
        Milestone, Task, TaskComment, TaskChecklist, ChecklistItem,
        ProjectPhase, ProjectMember, Project,
    )

    # Delete in reverse order
    issues = session.exec(select(ProjectIssue).where(ProjectIssue.tenant_id == tenant_id)).all()
    for item in issues:
        session.delete(item)
        deleted["issues"] += 1

    risks = session.exec(select(ProjectRisk).where(ProjectRisk.tenant_id == tenant_id)).all()
    for item in risks:
        session.delete(item)
        deleted["risks"] += 1

    entries = session.exec(select(TimesheetEntry).where(TimesheetEntry.tenant_id == tenant_id)).all()
    for item in entries:
        session.delete(item)
        deleted["timesheet_entries"] += 1

    timesheets = session.exec(select(Timesheet).where(Timesheet.tenant_id == tenant_id)).all()
    for item in timesheets:
        session.delete(item)
        deleted["timesheets"] += 1

    resources = session.exec(select(Resource).where(Resource.tenant_id == tenant_id)).all()
    for item in resources:
        session.delete(item)
        deleted["resources"] += 1

    milestones = session.exec(select(Milestone).where(Milestone.tenant_id == tenant_id)).all()
    for item in milestones:
        session.delete(item)
        deleted["milestones"] += 1

    tasks = session.exec(select(Task).where(Task.tenant_id == tenant_id)).all()
    for item in tasks:
        session.delete(item)
        deleted["tasks"] += 1

    phases = session.exec(select(ProjectPhase).where(ProjectPhase.tenant_id == tenant_id)).all()
    for item in phases:
        session.delete(item)
        deleted["phases"] += 1

    members = session.exec(select(ProjectMember).where(ProjectMember.tenant_id == tenant_id)).all()
    for item in members:
        session.delete(item)
        deleted["members"] += 1

    projects = session.exec(select(Project).where(Project.tenant_id == tenant_id)).all()
    for item in projects:
        session.delete(item)
        deleted["projects"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Project Management data deleted successfully",
        "deleted": deleted,
    }
