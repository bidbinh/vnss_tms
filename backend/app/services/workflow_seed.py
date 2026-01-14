"""
Workflow Seed Data
Tạo các Workflow Definitions mặc định cho hệ thống ERP
"""
from typing import List, Dict, Any
from sqlmodel import Session, select
from datetime import datetime
import uuid
import json

from app.models.workflow import (
    WorkflowDefinition, WorkflowStatus, WorkflowType,
    WorkflowStep, StepType,
)


# =============================================================================
# WORKFLOW DEFINITIONS
# =============================================================================

WORKFLOW_SEEDS: List[Dict] = [
    # -------------------------------------------------------------------------
    # HRM Workflows - Leave với điều kiện theo số ngày
    # -------------------------------------------------------------------------
    {
        "code": "WF-LEAVE-SHORT",
        "name": "Phê duyệt nghỉ phép ngắn (≤3 ngày)",
        "description": "Quy trình duyệt nghỉ phép dưới hoặc bằng 3 ngày - chỉ cần Trưởng phòng duyệt",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "HRM",
        "entity_module": "HRM",
        "entity_type": "LeaveRequest",
        "default_sla_hours": 24,
        # Điều kiện: total_days <= 3
        "trigger_condition": json.dumps({
            "field": "total_days",
            "operator": "LESS_OR_EQUAL",
            "value": 3
        }),
        "trigger_priority": 10,  # Ưu tiên cao hơn
        "steps": [
            {
                "code": "MANAGER_APPROVAL",
                "name": "Trưởng phòng phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "MANAGER",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-LEAVE-LONG",
        "name": "Phê duyệt nghỉ phép dài (≥4 ngày)",
        "description": "Quy trình duyệt nghỉ phép từ 4 ngày trở lên - cần Giám đốc duyệt",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "HRM",
        "entity_module": "HRM",
        "entity_type": "LeaveRequest",
        "default_sla_hours": 48,
        # Điều kiện: total_days >= 4
        "trigger_condition": json.dumps({
            "field": "total_days",
            "operator": "GREATER_OR_EQUAL",
            "value": 4
        }),
        "trigger_priority": 5,  # Ưu tiên thấp hơn (fallback)
        "steps": [
            {
                "code": "MANAGER_APPROVAL",
                "name": "Trưởng phòng phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "MANAGER",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
            {
                "code": "DIRECTOR_APPROVAL",
                "name": "Giám đốc phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "DIRECTOR",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-EXPENSE-APPROVAL",
        "name": "Phê duyệt chi phí",
        "description": "Quy trình phê duyệt đơn thanh toán chi phí",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "HRM",
        "entity_module": "HRM",
        "entity_type": "Expense",
        "default_sla_hours": 48,
        "steps": [
            {
                "code": "MANAGER_APPROVAL",
                "name": "Quản lý phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "MANAGER",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
            {
                "code": "ACCOUNTANT_REVIEW",
                "name": "Kế toán kiểm tra",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "ACCOUNTANT",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-ADVANCE-APPROVAL",
        "name": "Phê duyệt tạm ứng",
        "description": "Quy trình phê duyệt đơn tạm ứng lương",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "HRM",
        "entity_module": "HRM",
        "entity_type": "Advance",
        "default_sla_hours": 24,
        "steps": [
            {
                "code": "MANAGER_APPROVAL",
                "name": "Quản lý phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "MANAGER",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-DRIVER-PAYROLL",
        "name": "Phê duyệt bảng lương tài xế",
        "description": "Quy trình chốt bảng lương tài xế: Dispatcher tạo → HR duyệt → Tài xế xác nhận → HR chi trả. Distance_km bị khóa sau khi tài xế xác nhận.",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "HRM",
        "entity_module": "HRM",
        "entity_type": "DriverPayroll",
        "default_sla_hours": 96,  # 4 days total
        "trigger_condition": None,  # Always triggers for driver payroll
        "trigger_priority": 10,
        "steps": [
            {
                "code": "HR_REVIEW",
                "name": "HR kiểm tra bảng lương",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "HR",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
                "description": "Nhân sự kiểm tra chi tiết bảng lương và chuyến xe"
            },
            {
                "code": "DRIVER_CONFIRM",
                "name": "Tài xế xác nhận",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "DRIVER",
                "assignee_expression": "DRIVER",  # Will be resolved to actual driver
                "sla_hours": 72,  # 3 days for driver to confirm
                "allowed_actions": "CONFIRM,REJECT",
                "description": "Tài xế xác nhận bảng lương đúng qua mobile app. Sau bước này distance_km bị khóa."
            },
        ],
    },

    # -------------------------------------------------------------------------
    # TMS Workflows
    # -------------------------------------------------------------------------
    {
        "code": "WF-ORDER-APPROVAL",
        "name": "Phê duyệt đơn hàng vận chuyển",
        "description": "Quy trình phê duyệt đơn hàng vận chuyển có giá trị lớn",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "TMS",
        "entity_module": "TMS",
        "entity_type": "Order",
        "default_sla_hours": 4,
        "steps": [
            {
                "code": "SALES_MANAGER_APPROVAL",
                "name": "Sales Manager phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "SALES_MANAGER",
                "sla_hours": 2,
                "allowed_actions": "APPROVE,REJECT",
            },
            {
                "code": "OPERATIONS_APPROVAL",
                "name": "Operations xác nhận",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "OPERATIONS",
                "sla_hours": 2,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-TRIP-APPROVAL",
        "name": "Phê duyệt chuyến xe",
        "description": "Quy trình phê duyệt lịch trình chuyến xe",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "TMS",
        "entity_module": "TMS",
        "entity_type": "Trip",
        "default_sla_hours": 2,
        "steps": [
            {
                "code": "DISPATCHER_APPROVAL",
                "name": "Điều phối viên phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "DISPATCHER",
                "sla_hours": 2,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },

    # -------------------------------------------------------------------------
    # CRM Workflows
    # -------------------------------------------------------------------------
    {
        "code": "WF-QUOTE-APPROVAL",
        "name": "Phê duyệt báo giá",
        "description": "Quy trình phê duyệt báo giá cho khách hàng",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "CRM",
        "entity_module": "CRM",
        "entity_type": "Quote",
        "default_sla_hours": 24,
        "steps": [
            {
                "code": "SALES_MANAGER_APPROVAL",
                "name": "Sales Manager phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "SALES_MANAGER",
                "sla_hours": 12,
                "allowed_actions": "APPROVE,REJECT",
            },
            {
                "code": "DIRECTOR_APPROVAL",
                "name": "Giám đốc phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "DIRECTOR",
                "sla_hours": 12,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-CONTRACT-APPROVAL",
        "name": "Phê duyệt hợp đồng",
        "description": "Quy trình phê duyệt hợp đồng với khách hàng",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "CRM",
        "entity_module": "CRM",
        "entity_type": "Contract",
        "default_sla_hours": 48,
        "steps": [
            {
                "code": "LEGAL_REVIEW",
                "name": "Pháp chế xem xét",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "LEGAL",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT,REQUEST_CHANGE",
            },
            {
                "code": "DIRECTOR_APPROVAL",
                "name": "Giám đốc phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "DIRECTOR",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },

    # -------------------------------------------------------------------------
    # WMS Workflows
    # -------------------------------------------------------------------------
    {
        "code": "WF-STOCK-ADJ-APPROVAL",
        "name": "Phê duyệt điều chỉnh tồn kho",
        "description": "Quy trình phê duyệt điều chỉnh số lượng tồn kho",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "WMS",
        "entity_module": "WMS",
        "entity_type": "StockAdjustment",
        "default_sla_hours": 8,
        "steps": [
            {
                "code": "WAREHOUSE_MANAGER_APPROVAL",
                "name": "Quản lý kho phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "WAREHOUSE_MANAGER",
                "sla_hours": 4,
                "allowed_actions": "APPROVE,REJECT",
            },
            {
                "code": "ACCOUNTANT_CONFIRMATION",
                "name": "Kế toán xác nhận",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "ACCOUNTANT",
                "sla_hours": 4,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-GR-APPROVAL",
        "name": "Phê duyệt nhập kho",
        "description": "Quy trình phê duyệt phiếu nhập kho",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "WMS",
        "entity_module": "WMS",
        "entity_type": "GoodsReceipt",
        "default_sla_hours": 4,
        "steps": [
            {
                "code": "WAREHOUSE_APPROVAL",
                "name": "Thủ kho xác nhận",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "WAREHOUSE_STAFF",
                "sla_hours": 4,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },

    # -------------------------------------------------------------------------
    # Accounting Workflows
    # -------------------------------------------------------------------------
    {
        "code": "WF-JOURNAL-APPROVAL",
        "name": "Phê duyệt bút toán",
        "description": "Quy trình phê duyệt bút toán kế toán",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "ACCOUNTING",
        "entity_module": "ACCOUNTING",
        "entity_type": "JournalEntry",
        "default_sla_hours": 24,
        "steps": [
            {
                "code": "ACCOUNTANT_REVIEW",
                "name": "Kế toán trưởng xem xét",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "CHIEF_ACCOUNTANT",
                "sla_hours": 12,
                "allowed_actions": "APPROVE,REJECT,REQUEST_CHANGE",
            },
            {
                "code": "CFO_APPROVAL",
                "name": "CFO phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "CFO",
                "sla_hours": 12,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
    {
        "code": "WF-PAYMENT-APPROVAL",
        "name": "Phê duyệt thanh toán",
        "description": "Quy trình phê duyệt lệnh thanh toán",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "ACCOUNTING",
        "entity_module": "ACCOUNTING",
        "entity_type": "Payment",
        "default_sla_hours": 8,
        "steps": [
            {
                "code": "ACCOUNTANT_APPROVAL",
                "name": "Kế toán phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "ACCOUNTANT",
                "sla_hours": 4,
                "allowed_actions": "APPROVE,REJECT",
            },
            {
                "code": "CFO_APPROVAL",
                "name": "CFO phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "CFO",
                "sla_hours": 4,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },

    # -------------------------------------------------------------------------
    # Project Workflows
    # -------------------------------------------------------------------------
    {
        "code": "WF-PROJECT-APPROVAL",
        "name": "Phê duyệt dự án",
        "description": "Quy trình phê duyệt dự án mới",
        "workflow_type": WorkflowType.APPROVAL.value,
        "category": "PROJECT",
        "entity_module": "PROJECT",
        "entity_type": "Project",
        "default_sla_hours": 72,
        "steps": [
            {
                "code": "PMO_REVIEW",
                "name": "PMO xem xét",
                "step_type": StepType.APPROVAL.value,
                "step_order": 1,
                "assignee_type": "ROLE",
                "assignee_expression": "PMO",
                "sla_hours": 24,
                "allowed_actions": "APPROVE,REJECT,REQUEST_CHANGE",
            },
            {
                "code": "SPONSOR_APPROVAL",
                "name": "Sponsor phê duyệt",
                "step_type": StepType.APPROVAL.value,
                "step_order": 2,
                "assignee_type": "ROLE",
                "assignee_expression": "DIRECTOR",
                "sla_hours": 48,
                "allowed_actions": "APPROVE,REJECT",
            },
        ],
    },
]


# =============================================================================
# SEED FUNCTIONS
# =============================================================================

def seed_workflows(session: Session, tenant_id: str) -> Dict:
    """
    Seed workflow definitions cho một tenant

    Returns dict với số lượng workflows đã tạo
    """
    created_workflows = 0
    created_steps = 0
    skipped = 0

    for wf_data in WORKFLOW_SEEDS:
        # Check if already exists
        existing = session.exec(
            select(WorkflowDefinition).where(
                WorkflowDefinition.tenant_id == tenant_id,
                WorkflowDefinition.code == wf_data["code"]
            )
        ).first()

        if existing:
            skipped += 1
            continue

        # Create workflow definition - copy to avoid modifying original
        wf_copy = wf_data.copy()
        steps_data = wf_copy.pop("steps", [])

        workflow = WorkflowDefinition(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            status=WorkflowStatus.ACTIVE.value,
            version=1,
            is_current_version=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **wf_copy
        )

        session.add(workflow)
        session.flush()  # Get the ID

        # Create steps
        for step_data in steps_data:
            step = WorkflowStep(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                workflow_id=str(workflow.id),
                created_at=datetime.utcnow(),
                **step_data
            )
            session.add(step)
            created_steps += 1

        created_workflows += 1

    session.commit()

    return {
        "created_workflows": created_workflows,
        "created_steps": created_steps,
        "skipped": skipped,
    }


def get_workflow_codes_by_module(module: str) -> List[str]:
    """Lấy danh sách workflow codes theo module"""
    return [
        wf["code"]
        for wf in WORKFLOW_SEEDS
        if wf.get("entity_module") == module.upper()
    ]
