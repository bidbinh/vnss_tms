"""
Workflow Engine - Seed Data API Routes
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from datetime import datetime

from app.db.session import get_session
from app.models import User
from app.models.workflow import (
    WorkflowDefinition, WorkflowStatus, WorkflowType, WorkflowCategory,
    WorkflowStep, StepType,
    WorkflowTransition,
    NotificationTemplate, NotificationType, NotificationChannel,
)
from app.core.security import get_current_user

router = APIRouter()


@router.post("/seed")
def seed_workflow_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed Workflow sample data"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    created = {
        "workflows": 0,
        "steps": 0,
        "transitions": 0,
        "templates": 0,
    }

    # ===================
    # 1. WORKFLOW DEFINITIONS
    # ===================
    workflow_data = [
        {
            "code": "WF-LEAVE-APPROVAL",
            "name": "Phê duyệt nghỉ phép",
            "description": "Quy trình phê duyệt đơn xin nghỉ phép",
            "workflow_type": WorkflowType.APPROVAL.value,
            "category": WorkflowCategory.HR.value,
            "entity_type": "LeaveRequest",
            "entity_module": "HRM",
            "allow_delegation": True,
            "default_sla_hours": 24,
        },
        {
            "code": "WF-PO-APPROVAL",
            "name": "Phê duyệt đơn mua hàng",
            "description": "Quy trình phê duyệt Purchase Order",
            "workflow_type": WorkflowType.APPROVAL.value,
            "category": WorkflowCategory.PROCUREMENT.value,
            "entity_type": "PurchaseOrder",
            "entity_module": "PROCUREMENT",
            "allow_delegation": True,
            "default_sla_hours": 48,
        },
        {
            "code": "WF-EXPENSE-APPROVAL",
            "name": "Phê duyệt chi phí",
            "description": "Quy trình phê duyệt đề nghị thanh toán",
            "workflow_type": WorkflowType.APPROVAL.value,
            "category": WorkflowCategory.FINANCE.value,
            "entity_type": "ExpenseRequest",
            "entity_module": "FINANCE",
            "allow_delegation": True,
            "default_sla_hours": 24,
        },
    ]

    workflows = []
    for wf_data in workflow_data:
        existing = session.exec(
            select(WorkflowDefinition).where(
                WorkflowDefinition.tenant_id == tenant_id,
                WorkflowDefinition.code == wf_data["code"],
                WorkflowDefinition.is_current_version == True
            )
        ).first()

        if not existing:
            wf = WorkflowDefinition(
                tenant_id=tenant_id,
                **wf_data,
                status=WorkflowStatus.ACTIVE.value,
                version=1,
                is_current_version=True,
                created_by=user_id,
                activated_at=datetime.utcnow(),
                activated_by=user_id,
            )
            session.add(wf)
            session.flush()
            workflows.append(wf)
            created["workflows"] += 1
        else:
            workflows.append(existing)

    # ===================
    # 2. WORKFLOW STEPS
    # ===================
    step_templates = {
        "WF-LEAVE-APPROVAL": [
            ("START", "Bắt đầu", StepType.START.value, 0, 0),
            ("MANAGER", "Quản lý trực tiếp", StepType.APPROVAL.value, 200, 0),
            ("HR", "Phòng nhân sự", StepType.APPROVAL.value, 400, 0),
            ("END", "Kết thúc", StepType.END.value, 600, 0),
        ],
        "WF-PO-APPROVAL": [
            ("START", "Bắt đầu", StepType.START.value, 0, 0),
            ("DEPT_MANAGER", "Trưởng phòng", StepType.APPROVAL.value, 200, 0),
            ("FINANCE", "Phòng tài chính", StepType.APPROVAL.value, 400, 0),
            ("DIRECTOR", "Ban giám đốc", StepType.APPROVAL.value, 600, 0),
            ("END", "Kết thúc", StepType.END.value, 800, 0),
        ],
        "WF-EXPENSE-APPROVAL": [
            ("START", "Bắt đầu", StepType.START.value, 0, 0),
            ("MANAGER", "Quản lý", StepType.APPROVAL.value, 200, 0),
            ("FINANCE", "Kế toán trưởng", StepType.APPROVAL.value, 400, 0),
            ("END", "Kết thúc", StepType.END.value, 600, 0),
        ],
    }

    step_map = {}  # workflow_code -> {step_code: step_id}
    for wf in workflows:
        step_map[wf.code] = {}
        templates = step_templates.get(wf.code, [])
        for i, (code, name, step_type, x, y) in enumerate(templates, 1):
            existing = session.exec(
                select(WorkflowStep).where(
                    WorkflowStep.workflow_id == str(wf.id),
                    WorkflowStep.code == code
                )
            ).first()

            if not existing:
                step = WorkflowStep(
                    tenant_id=tenant_id,
                    workflow_id=str(wf.id),
                    step_order=i,
                    code=code,
                    name=name,
                    step_type=step_type,
                    position_x=x,
                    position_y=y,
                    sla_hours=24 if step_type == StepType.APPROVAL.value else None,
                    created_by=user_id,
                )
                session.add(step)
                session.flush()
                step_map[wf.code][code] = str(step.id)
                created["steps"] += 1
            else:
                step_map[wf.code][code] = str(existing.id)

    session.flush()

    # ===================
    # 3. TRANSITIONS
    # ===================
    transition_templates = {
        "WF-LEAVE-APPROVAL": [
            ("START", "MANAGER", "SUBMIT"),
            ("MANAGER", "HR", "APPROVE"),
            ("MANAGER", "END", "REJECT"),
            ("HR", "END", "APPROVE"),
            ("HR", "END", "REJECT"),
        ],
        "WF-PO-APPROVAL": [
            ("START", "DEPT_MANAGER", "SUBMIT"),
            ("DEPT_MANAGER", "FINANCE", "APPROVE"),
            ("DEPT_MANAGER", "END", "REJECT"),
            ("FINANCE", "DIRECTOR", "APPROVE"),
            ("FINANCE", "END", "REJECT"),
            ("DIRECTOR", "END", "APPROVE"),
            ("DIRECTOR", "END", "REJECT"),
        ],
        "WF-EXPENSE-APPROVAL": [
            ("START", "MANAGER", "SUBMIT"),
            ("MANAGER", "FINANCE", "APPROVE"),
            ("MANAGER", "END", "REJECT"),
            ("FINANCE", "END", "APPROVE"),
            ("FINANCE", "END", "REJECT"),
        ],
    }

    for wf in workflows:
        transitions = transition_templates.get(wf.code, [])
        wf_steps = step_map.get(wf.code, {})

        for from_code, to_code, action in transitions:
            from_id = wf_steps.get(from_code)
            to_id = wf_steps.get(to_code)

            if from_id and to_id:
                existing = session.exec(
                    select(WorkflowTransition).where(
                        WorkflowTransition.workflow_id == str(wf.id),
                        WorkflowTransition.from_step_id == from_id,
                        WorkflowTransition.to_step_id == to_id
                    )
                ).first()

                if not existing:
                    trans = WorkflowTransition(
                        tenant_id=tenant_id,
                        workflow_id=str(wf.id),
                        from_step_id=from_id,
                        to_step_id=to_id,
                        name=f"{from_code} -> {to_code}",
                        trigger_action=action,
                        created_by=user_id,
                    )
                    session.add(trans)
                    created["transitions"] += 1

    # ===================
    # 4. NOTIFICATION TEMPLATES
    # ===================
    template_data = [
        {
            "code": "TASK_ASSIGNED",
            "name": "Task Assigned Notification",
            "notification_type": NotificationType.TASK_ASSIGNED.value,
            "channel": NotificationChannel.EMAIL.value,
            "subject_template": "Bạn có task mới: ${task_title}",
            "body_template": "Xin chào ${recipient_name},\n\nBạn được giao task: ${task_title}\n\nVui lòng xử lý trước: ${due_date}",
        },
        {
            "code": "APPROVAL_REQUESTED",
            "name": "Approval Request Notification",
            "notification_type": NotificationType.APPROVAL_REQUESTED.value,
            "channel": NotificationChannel.EMAIL.value,
            "subject_template": "Yêu cầu phê duyệt: ${request_title}",
            "body_template": "Xin chào ${approver_name},\n\n${requester_name} đã gửi yêu cầu phê duyệt:\n${request_title}\n\nVui lòng xem xét và phê duyệt.",
        },
        {
            "code": "APPROVAL_APPROVED",
            "name": "Approval Approved Notification",
            "notification_type": NotificationType.APPROVAL_APPROVED.value,
            "channel": NotificationChannel.EMAIL.value,
            "subject_template": "Đã phê duyệt: ${request_title}",
            "body_template": "Xin chào ${requester_name},\n\nYêu cầu của bạn đã được ${approver_name} phê duyệt:\n${request_title}",
        },
        {
            "code": "APPROVAL_REJECTED",
            "name": "Approval Rejected Notification",
            "notification_type": NotificationType.APPROVAL_REJECTED.value,
            "channel": NotificationChannel.EMAIL.value,
            "subject_template": "Từ chối: ${request_title}",
            "body_template": "Xin chào ${requester_name},\n\nYêu cầu của bạn đã bị ${approver_name} từ chối:\n${request_title}\n\nLý do: ${comments}",
        },
    ]

    for tmpl_data in template_data:
        existing = session.exec(
            select(NotificationTemplate).where(
                NotificationTemplate.tenant_id == tenant_id,
                NotificationTemplate.code == tmpl_data["code"]
            )
        ).first()

        if not existing:
            tmpl = NotificationTemplate(
                tenant_id=tenant_id,
                **tmpl_data,
                is_active=True,
                created_by=user_id,
            )
            session.add(tmpl)
            created["templates"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Workflow sample data created successfully",
        "created": created,
    }


@router.delete("/workflow/seed")
def delete_workflow_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all Workflow sample data"""
    tenant_id = str(current_user.tenant_id)

    deleted = {
        "notifications": 0,
        "templates": 0,
        "transitions": 0,
        "steps": 0,
        "instances": 0,
        "workflows": 0,
    }

    from app.models.workflow import (
        WorkflowNotification, NotificationTemplate,
        WorkflowTransition, WorkflowStep,
        WorkflowInstance, WorkflowStepInstance, WorkflowHistory,
        WorkflowDefinition,
        ApprovalRequest, ApprovalStep, ApprovalDecision,
        WorkflowTask,
    )

    # Delete in order
    notifications = session.exec(select(WorkflowNotification).where(WorkflowNotification.tenant_id == tenant_id)).all()
    for item in notifications:
        session.delete(item)
        deleted["notifications"] += 1

    templates = session.exec(select(NotificationTemplate).where(NotificationTemplate.tenant_id == tenant_id)).all()
    for item in templates:
        session.delete(item)
        deleted["templates"] += 1

    transitions = session.exec(select(WorkflowTransition).where(WorkflowTransition.tenant_id == tenant_id)).all()
    for item in transitions:
        session.delete(item)
        deleted["transitions"] += 1

    steps = session.exec(select(WorkflowStep).where(WorkflowStep.tenant_id == tenant_id)).all()
    for item in steps:
        session.delete(item)
        deleted["steps"] += 1

    instances = session.exec(select(WorkflowInstance).where(WorkflowInstance.tenant_id == tenant_id)).all()
    for item in instances:
        session.delete(item)
        deleted["instances"] += 1

    workflows = session.exec(select(WorkflowDefinition).where(WorkflowDefinition.tenant_id == tenant_id)).all()
    for item in workflows:
        session.delete(item)
        deleted["workflows"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Workflow data deleted successfully",
        "deleted": deleted,
    }
