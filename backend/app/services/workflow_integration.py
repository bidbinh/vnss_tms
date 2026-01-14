"""
Workflow Integration Service
Kết nối Workflow Engine với các module ERP (TMS, HRM, CRM, WMS, Accounting)

Chức năng:
1. Tự động tạo Workflow Instance khi entity cần approval
2. Callback khi workflow hoàn thành để cập nhật entity status
3. Quản lý mapping giữa entity và workflow definition
4. Chọn workflow dựa trên điều kiện (trigger_condition)
"""
from typing import Optional, Callable, Dict, Any, List
from sqlmodel import Session, select
from datetime import datetime
from decimal import Decimal
import json

from app.models.workflow import (
    WorkflowDefinition, WorkflowStatus,
    WorkflowInstance, InstanceStatus,
    WorkflowStepInstance, StepInstanceStatus,
    WorkflowHistory, WorkflowStep,
    ConditionOperator,
)


# =============================================================================
# WORKFLOW MAPPINGS
# Định nghĩa entity nào sử dụng workflow nào
# =============================================================================

WORKFLOW_MAPPINGS: Dict[str, Dict[str, Dict[str, Any]]] = {
    # -------------------------------------------------------------------------
    # TMS Module
    # -------------------------------------------------------------------------
    "TMS": {
        "Order": {
            "workflow_code": "WF-ORDER-APPROVAL",
            "entity_table": "tms_orders",
            "status_field": "approval_status",
            "trigger_field": "total_amount",
            "trigger_threshold": Decimal("100000000"),  # 100 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
        "Trip": {
            "workflow_code": "WF-TRIP-APPROVAL",
            "entity_table": "tms_trips",
            "status_field": "approval_status",
            "trigger_field": None,  # Always require approval
            "trigger_threshold": None,
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
    },

    # -------------------------------------------------------------------------
    # HRM Module
    # -------------------------------------------------------------------------
    "HRM": {
        "LeaveRequest": {
            "workflow_code": "WF-LEAVE-SHORT",  # Fallback - sẽ dùng find_matching_workflow
            "entity_table": "hrm_leave_requests",
            "status_field": "status",
            "trigger_field": None,  # Always require approval
            "trigger_threshold": None,
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING",
        },
        "Expense": {
            "workflow_code": "WF-EXPENSE-APPROVAL",
            "entity_table": "hrm_expenses",
            "status_field": "status",
            "trigger_field": "amount",
            "trigger_threshold": Decimal("5000000"),  # 5 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING",
        },
        "Advance": {
            "workflow_code": "WF-ADVANCE-APPROVAL",
            "entity_table": "hrm_advances",
            "status_field": "status",
            "trigger_field": "amount",
            "trigger_threshold": Decimal("10000000"),  # 10 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING",
        },
        "DriverPayroll": {
            "workflow_code": "WF-DRIVER-PAYROLL",
            "entity_table": "driver_payroll",
            "status_field": "status",
            "trigger_field": None,  # Always require approval
            "trigger_threshold": None,
            "approved_status": "CONFIRMED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_HR_REVIEW",
        },
    },

    # -------------------------------------------------------------------------
    # CRM Module
    # -------------------------------------------------------------------------
    "CRM": {
        "Quote": {
            "workflow_code": "WF-QUOTE-APPROVAL",
            "entity_table": "crm_quotes",
            "status_field": "approval_status",
            "trigger_field": "total_amount",
            "trigger_threshold": Decimal("500000000"),  # 500 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
        "Contract": {
            "workflow_code": "WF-CONTRACT-APPROVAL",
            "entity_table": "crm_contracts",
            "status_field": "approval_status",
            "trigger_field": "total_value",
            "trigger_threshold": Decimal("1000000000"),  # 1 tỷ VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
    },

    # -------------------------------------------------------------------------
    # WMS Module
    # -------------------------------------------------------------------------
    "WMS": {
        "StockAdjustment": {
            "workflow_code": "WF-STOCK-ADJ-APPROVAL",
            "entity_table": "wms_stock_adjustments",
            "status_field": "status",
            "trigger_field": "total_value",
            "trigger_threshold": Decimal("50000000"),  # 50 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING",
        },
        "GoodsReceipt": {
            "workflow_code": "WF-GR-APPROVAL",
            "entity_table": "wms_goods_receipts",
            "status_field": "approval_status",
            "trigger_field": None,  # Always require approval
            "trigger_threshold": None,
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
    },

    # -------------------------------------------------------------------------
    # Accounting Module
    # -------------------------------------------------------------------------
    "ACCOUNTING": {
        "JournalEntry": {
            "workflow_code": "WF-JOURNAL-APPROVAL",
            "entity_table": "acc_journal_entries",
            "status_field": "approval_status",
            "trigger_field": "total_debit",
            "trigger_threshold": Decimal("100000000"),  # 100 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
        "Payment": {
            "workflow_code": "WF-PAYMENT-APPROVAL",
            "entity_table": "acc_payments",
            "status_field": "status",
            "trigger_field": "amount",
            "trigger_threshold": Decimal("50000000"),  # 50 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING",
        },
    },

    # -------------------------------------------------------------------------
    # Project Module
    # -------------------------------------------------------------------------
    "PROJECT": {
        "Project": {
            "workflow_code": "WF-PROJECT-APPROVAL",
            "entity_table": "prj_projects",
            "status_field": "approval_status",
            "trigger_field": "budget_amount",
            "trigger_threshold": Decimal("500000000"),  # 500 triệu VND
            "approved_status": "APPROVED",
            "rejected_status": "REJECTED",
            "pending_status": "PENDING_APPROVAL",
        },
    },
}


# =============================================================================
# WORKFLOW INTEGRATION SERVICE
# =============================================================================

class WorkflowIntegrationService:
    """
    Service xử lý tích hợp Workflow với các module ERP
    """

    def __init__(self, session: Session):
        self.session = session

    def get_workflow_config(self, module: str, entity_type: str) -> Optional[Dict]:
        """Lấy cấu hình workflow cho entity"""
        module_config = WORKFLOW_MAPPINGS.get(module.upper())
        if not module_config:
            return None
        return module_config.get(entity_type)

    def evaluate_condition(self, condition: Dict, entity_data: Dict) -> bool:
        """
        Đánh giá điều kiện trigger workflow

        condition format: {"field": "total_days", "operator": "LESS_OR_EQUAL", "value": 3}
        """
        field = condition.get("field")
        operator = condition.get("operator")
        expected_value = condition.get("value")

        if not field or not operator:
            return True  # Không có điều kiện = luôn match

        actual_value = entity_data.get(field)
        if actual_value is None:
            return False

        # Convert values for comparison
        try:
            if isinstance(expected_value, (int, float)):
                actual_value = float(actual_value) if actual_value else 0
                expected_value = float(expected_value)
        except (ValueError, TypeError):
            pass

        # Evaluate based on operator
        if operator == ConditionOperator.EQUALS.value or operator == "EQUALS":
            return actual_value == expected_value
        elif operator == ConditionOperator.NOT_EQUALS.value or operator == "NOT_EQUALS":
            return actual_value != expected_value
        elif operator == ConditionOperator.GREATER_THAN.value or operator == "GREATER_THAN":
            return actual_value > expected_value
        elif operator == ConditionOperator.LESS_THAN.value or operator == "LESS_THAN":
            return actual_value < expected_value
        elif operator == ConditionOperator.GREATER_OR_EQUAL.value or operator == "GREATER_OR_EQUAL":
            return actual_value >= expected_value
        elif operator == ConditionOperator.LESS_OR_EQUAL.value or operator == "LESS_OR_EQUAL":
            return actual_value <= expected_value
        elif operator == ConditionOperator.CONTAINS.value or operator == "CONTAINS":
            return str(expected_value) in str(actual_value)
        elif operator == ConditionOperator.IN_LIST.value or operator == "IN_LIST":
            return actual_value in expected_value
        elif operator == ConditionOperator.IS_NULL.value or operator == "IS_NULL":
            return actual_value is None
        elif operator == ConditionOperator.IS_NOT_NULL.value or operator == "IS_NOT_NULL":
            return actual_value is not None

        return False

    def find_matching_workflow(
        self,
        tenant_id: str,
        module: str,
        entity_type: str,
        entity_data: Dict
    ) -> Optional[WorkflowDefinition]:
        """
        Tìm workflow definition phù hợp với entity data

        - Lấy tất cả workflows active cho entity_module + entity_type
        - Sắp xếp theo trigger_priority (cao → thấp)
        - Kiểm tra trigger_condition
        - Trả về workflow đầu tiên match
        """
        workflows = self.session.exec(
            select(WorkflowDefinition).where(
                WorkflowDefinition.tenant_id == tenant_id,
                WorkflowDefinition.entity_module == module.upper(),
                WorkflowDefinition.entity_type == entity_type,
                WorkflowDefinition.status == WorkflowStatus.ACTIVE.value,
                WorkflowDefinition.is_current_version == True
            ).order_by(WorkflowDefinition.trigger_priority.desc())
        ).all()

        for workflow in workflows:
            # Không có điều kiện = luôn match
            if not workflow.trigger_condition:
                return workflow

            # Parse và evaluate điều kiện
            try:
                condition = json.loads(workflow.trigger_condition)

                # Nếu là list điều kiện (AND logic)
                if isinstance(condition, list):
                    all_match = all(
                        self.evaluate_condition(cond, entity_data)
                        for cond in condition
                    )
                    if all_match:
                        return workflow
                else:
                    # Single condition
                    if self.evaluate_condition(condition, entity_data):
                        return workflow

            except (json.JSONDecodeError, TypeError):
                # Lỗi parse = bỏ qua workflow này
                continue

        return None

    def should_trigger_workflow(
        self,
        module: str,
        entity_type: str,
        entity_data: Dict[str, Any]
    ) -> bool:
        """
        Kiểm tra entity có cần trigger workflow không

        Returns True nếu:
        - Không có trigger_field (luôn cần approval)
        - Hoặc giá trị trigger_field >= threshold
        """
        config = self.get_workflow_config(module, entity_type)
        if not config:
            return False

        trigger_field = config.get("trigger_field")
        threshold = config.get("trigger_threshold")

        # Không có điều kiện = luôn trigger
        if trigger_field is None:
            return True

        # Kiểm tra giá trị
        value = entity_data.get(trigger_field)
        if value is None:
            return False

        # Convert to Decimal for comparison
        if isinstance(value, (int, float)):
            value = Decimal(str(value))

        return value >= threshold

    def submit_for_approval(
        self,
        tenant_id: str,
        user_id: str,
        user_name: str,
        module: str,
        entity_type: str,
        entity_id: str,
        entity_reference: str,
        title: str,
        description: Optional[str] = None,
        priority: int = 5,
        form_data: Optional[str] = None,
        entity_data: Optional[Dict] = None,  # Entity data để check điều kiện
    ) -> Optional[WorkflowInstance]:
        """
        Submit một entity để phê duyệt

        1. Tìm WorkflowDefinition phù hợp (dựa trên điều kiện)
        2. Tạo WorkflowInstance
        3. Tạo các StepInstance
        4. Ghi history

        Returns WorkflowInstance hoặc None nếu không tìm thấy workflow
        """
        config = self.get_workflow_config(module, entity_type)
        if not config:
            return None

        # Tìm workflow phù hợp với entity_data
        entity_data = entity_data or {}
        workflow = self.find_matching_workflow(
            tenant_id=tenant_id,
            module=module,
            entity_type=entity_type,
            entity_data=entity_data
        )

        # Fallback: tìm theo workflow_code từ mapping nếu không match điều kiện
        if not workflow:
            workflow_code = config["workflow_code"]
            workflow = self.session.exec(
                select(WorkflowDefinition).where(
                    WorkflowDefinition.tenant_id == tenant_id,
                    WorkflowDefinition.code == workflow_code,
                    WorkflowDefinition.status == WorkflowStatus.ACTIVE.value
                )
            ).first()

        if not workflow:
            # Không tìm thấy workflow definition active
            return None

        # Generate instance number
        from sqlmodel import func
        count = self.session.exec(
            select(func.count(WorkflowInstance.id)).where(
                WorkflowInstance.tenant_id == tenant_id
            )
        ).one() or 0

        instance_number = f"WF-{datetime.now().year}-{count + 1:05d}"

        # Tạo instance
        instance = WorkflowInstance(
            tenant_id=tenant_id,
            workflow_id=str(workflow.id),
            workflow_code=workflow.code,
            workflow_name=workflow.name,
            workflow_version=workflow.version,
            instance_number=instance_number,
            title=title,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_reference=entity_reference,
            entity_module=module,
            priority=priority,
            form_data=form_data,
            status=InstanceStatus.RUNNING.value,
            initiator_id=user_id,
            initiator_name=user_name,
            started_at=datetime.utcnow(),
            created_by=user_id,
        )

        self.session.add(instance)
        self.session.flush()

        # Tạo step instances
        steps = self.session.exec(
            select(WorkflowStep).where(
                WorkflowStep.workflow_id == str(workflow.id)
            ).order_by(WorkflowStep.step_order)
        ).all()

        if steps:
            first_step = steps[0]
            for step in steps:
                step_instance = WorkflowStepInstance(
                    tenant_id=tenant_id,
                    instance_id=str(instance.id),
                    step_id=str(step.id),
                    step_order=step.step_order,
                    step_code=step.code,
                    step_name=step.name,
                    step_type=step.step_type,
                    status=StepInstanceStatus.ACTIVE.value if step.id == first_step.id else StepInstanceStatus.PENDING.value,
                    assigned_to_id=step.assignee_id,
                    sla_hours=step.sla_hours,
                    activated_at=datetime.utcnow() if step.id == first_step.id else None,
                )
                self.session.add(step_instance)

            instance.current_step_id = str(first_step.id)
            instance.current_step_name = first_step.name

        # Ghi history
        history = WorkflowHistory(
            tenant_id=tenant_id,
            instance_id=str(instance.id),
            event_type="SUBMITTED",
            event_description=f"Submitted for approval by {user_name}",
            actor_id=user_id,
            actor_name=user_name,
            to_status=InstanceStatus.RUNNING.value,
        )
        self.session.add(history)

        self.session.add(instance)
        self.session.commit()
        self.session.refresh(instance)

        return instance

    def on_workflow_complete(
        self,
        instance: WorkflowInstance,
        final_action: str,  # "APPROVED" or "REJECTED"
        comments: Optional[str] = None
    ) -> bool:
        """
        Callback khi workflow hoàn thành
        Cập nhật status của entity gốc

        Returns True nếu update thành công
        """
        if not instance.entity_module or not instance.entity_type or not instance.entity_id:
            return False

        config = self.get_workflow_config(instance.entity_module, instance.entity_type)
        if not config:
            return False

        # Xác định status mới
        if final_action == "APPROVED":
            new_status = config["approved_status"]
        elif final_action == "REJECTED":
            new_status = config["rejected_status"]
        else:
            return False

        # Update entity status trực tiếp qua SQL
        table_name = config["entity_table"]
        status_field = config["status_field"]

        # Sử dụng raw SQL để update (vì entity có thể thuộc nhiều model khác nhau)
        from sqlalchemy import text
        stmt = text(f"""
            UPDATE {table_name}
            SET {status_field} = :new_status,
                updated_at = :updated_at
            WHERE id = :entity_id
            AND tenant_id = :tenant_id
        """)

        self.session.execute(stmt, {
            "new_status": new_status,
            "updated_at": datetime.utcnow(),
            "entity_id": instance.entity_id,
            "tenant_id": instance.tenant_id,
        })

        self.session.commit()
        return True

    def get_pending_approval_count(self, tenant_id: str, user_id: str) -> int:
        """Đếm số approval đang chờ user xử lý"""
        from sqlmodel import func
        count = self.session.exec(
            select(func.count(WorkflowStepInstance.id)).where(
                WorkflowStepInstance.tenant_id == tenant_id,
                WorkflowStepInstance.assigned_to_id == user_id,
                WorkflowStepInstance.status == StepInstanceStatus.ACTIVE.value
            )
        ).one()
        return count or 0

    def get_entity_workflow_status(
        self,
        tenant_id: str,
        entity_type: str,
        entity_id: str
    ) -> Optional[Dict]:
        """
        Lấy trạng thái workflow của một entity

        Returns dict với instance info hoặc None nếu chưa có workflow
        """
        instance = self.session.exec(
            select(WorkflowInstance).where(
                WorkflowInstance.tenant_id == tenant_id,
                WorkflowInstance.entity_type == entity_type,
                WorkflowInstance.entity_id == entity_id
            ).order_by(WorkflowInstance.created_at.desc())
        ).first()

        if not instance:
            return None

        return {
            "instance_id": instance.id,
            "instance_number": instance.instance_number,
            "status": instance.status,
            "current_step": instance.current_step_name,
            "started_at": instance.started_at,
            "completed_at": instance.completed_at,
            "final_action": instance.final_action,
        }


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def create_workflow_integration(session: Session) -> WorkflowIntegrationService:
    """Factory function để tạo service"""
    return WorkflowIntegrationService(session)


def get_all_workflow_codes() -> list:
    """Lấy danh sách tất cả workflow codes cần seed"""
    codes = []
    for module, entities in WORKFLOW_MAPPINGS.items():
        for entity_type, config in entities.items():
            codes.append({
                "code": config["workflow_code"],
                "name": f"{entity_type} Approval Workflow",
                "module": module,
                "entity_type": entity_type,
            })
    return codes
