"""Seed sample user tasks data for testing

Revision ID: seed_user_tasks_sample
Revises: add_user_tasks
Create Date: 2026-01-06

Sample data includes:
- Tasks from different sources (TMS, HRM, CRM, MANUAL, WORKFLOW)
- Different statuses (PENDING, IN_PROGRESS, COMPLETED)
- Different types (ACTION, APPROVAL, REVIEW)
- Different priorities and scopes
- Some overdue tasks
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from datetime import datetime, timedelta
import uuid


# revision identifiers
revision = 'seed_user_tasks_sample'
down_revision = 'add_user_tasks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Get first tenant and user for sample data
    result = conn.execute(text("SELECT id FROM tenants LIMIT 1"))
    tenant_row = result.fetchone()
    if not tenant_row:
        print("No tenant found, skipping seed")
        return
    tenant_id = tenant_row[0]

    result = conn.execute(text("SELECT id, full_name FROM users WHERE tenant_id = :tid LIMIT 1"), {"tid": tenant_id})
    user_row = result.fetchone()
    if not user_row:
        print("No user found, skipping seed")
        return
    user_id = user_row[0]
    user_name = user_row[1]

    now = datetime.utcnow()

    # Sample tasks data
    tasks = [
        # === TMS Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00001",
            "title": "Xác nhận chuyến xe HN-SG #TMS-2026-001",
            "description": "Xác nhận thông tin chuyến xe và liên hệ khách hàng trước khi xuất phát",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "TMS",
            "source_module": "TMS",
            "source_entity_type": "Trip",
            "source_entity_code": "TMS-2026-001",
            "source_url": "/tms/orders",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Dispatch System",
            "due_date": (now + timedelta(hours=4)).isoformat(),
            "is_overdue": False,
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00002",
            "title": "Hoàn thành giao hàng đơn #ORD-2026-088",
            "description": "Giao hàng cho khách tại Bình Dương, cập nhật POD sau khi hoàn thành",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "TMS",
            "source_module": "TMS",
            "source_entity_type": "Order",
            "source_entity_code": "ORD-2026-088",
            "source_url": "/tms/orders",
            "status": "IN_PROGRESS",
            "priority": "URGENT",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Operations Manager",
            "due_date": (now + timedelta(hours=2)).isoformat(),
            "started_at": (now - timedelta(hours=1)).isoformat(),
            "is_overdue": False,
        },

        # === HRM Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00003",
            "title": "Nộp bảng chấm công tháng 12/2025",
            "description": "Hoàn thành và nộp bảng chấm công cho phòng HR trước ngày 5/1",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "HRM",
            "source_module": "HRM",
            "source_entity_type": "Attendance",
            "source_url": "/hrm/attendance",
            "status": "PENDING",
            "priority": "NORMAL",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "HR System",
            "due_date": (now + timedelta(days=2)).isoformat(),
            "is_overdue": False,
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00004",
            "title": "Cập nhật thông tin cá nhân 2026",
            "description": "Cập nhật thông tin liên hệ, địa chỉ, người thân khẩn cấp cho năm mới",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "HRM",
            "source_module": "HRM",
            "source_entity_type": "Employee",
            "source_url": "/hrm/employees",
            "status": "PENDING",
            "priority": "LOW",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "HR System",
            "due_date": (now + timedelta(days=7)).isoformat(),
            "is_overdue": False,
        },

        # === APPROVAL Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00005",
            "title": "Phê duyệt đơn xin nghỉ phép - Nguyễn Văn A",
            "description": "Nhân viên Nguyễn Văn A xin nghỉ phép từ 10/1 - 12/1/2026 (3 ngày)",
            "task_type": "APPROVAL",
            "scope": "COMPANY",
            "source": "WORKFLOW",
            "source_module": "WORKFLOW",
            "source_entity_type": "LeaveRequest",
            "source_entity_code": "LR-2026-015",
            "source_url": "/hrm/leaves",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Workflow System",
            "due_date": (now + timedelta(days=1)).isoformat(),
            "is_overdue": False,
            "actions_json": '[{"key":"approve","label":"Duyệt","style":"primary"},{"key":"reject","label":"Từ chối","style":"danger"}]',
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00006",
            "title": "Phê duyệt đề nghị thanh toán #PAY-2026-042",
            "description": "Thanh toán tiền nhiên liệu tháng 12: 15,000,000 VND",
            "task_type": "APPROVAL",
            "scope": "COMPANY",
            "source": "ACCOUNTING",
            "source_module": "ACCOUNTING",
            "source_entity_type": "PaymentRequest",
            "source_entity_code": "PAY-2026-042",
            "source_url": "/accounting/accounts-payable",
            "status": "PENDING",
            "priority": "NORMAL",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Accounting System",
            "due_date": (now + timedelta(days=3)).isoformat(),
            "is_overdue": False,
            "actions_json": '[{"key":"approve","label":"Duyệt","style":"primary"},{"key":"reject","label":"Từ chối","style":"danger"}]',
        },

        # === CRM Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00007",
            "title": "Follow-up báo giá khách hàng ABC Corp",
            "description": "Liên hệ lại khách hàng ABC Corp về báo giá vận chuyển đã gửi tuần trước",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "CRM",
            "source_module": "CRM",
            "source_entity_type": "Quote",
            "source_entity_code": "QT-2026-018",
            "source_url": "/crm/quotes",
            "status": "PENDING",
            "priority": "NORMAL",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Sales Manager",
            "due_date": (now + timedelta(days=1)).isoformat(),
            "is_overdue": False,
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00008",
            "title": "Gọi điện chúc mừng năm mới khách hàng VIP",
            "description": "Liên hệ danh sách 10 khách hàng VIP để chúc mừng năm mới và cảm ơn hợp tác",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "CRM",
            "source_module": "CRM",
            "source_entity_type": "Activity",
            "source_url": "/crm/activities",
            "status": "IN_PROGRESS",
            "priority": "LOW",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Sales Manager",
            "due_date": (now + timedelta(days=5)).isoformat(),
            "started_at": now.isoformat(),
            "is_overdue": False,
        },

        # === OVERDUE Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00009",
            "title": "Báo cáo doanh thu tuần 52/2025",
            "description": "Hoàn thành báo cáo doanh thu tuần cuối năm 2025",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "MANUAL",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Finance Director",
            "due_date": (now - timedelta(days=2)).isoformat(),
            "is_overdue": True,
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00010",
            "title": "Xác nhận công nợ với nhà cung cấp XYZ",
            "description": "Đối chiếu và xác nhận công nợ Q4/2025 với NCC XYZ",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "ACCOUNTING",
            "source_module": "ACCOUNTING",
            "source_url": "/accounting/accounts-payable",
            "status": "IN_PROGRESS",
            "priority": "URGENT",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Chief Accountant",
            "due_date": (now - timedelta(days=1)).isoformat(),
            "started_at": (now - timedelta(days=3)).isoformat(),
            "is_overdue": True,
        },

        # === PERSONAL Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00011",
            "title": "Đặt lịch họp team tuần sau",
            "description": "Sắp xếp lịch họp weekly với team vào thứ 2 tuần sau",
            "task_type": "ACTION",
            "scope": "PERSONAL",
            "source": "MANUAL",
            "status": "PENDING",
            "priority": "NORMAL",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_id": user_id,
            "assigned_by_name": user_name,
            "due_date": (now + timedelta(days=3)).isoformat(),
            "is_overdue": False,
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00012",
            "title": "Review tài liệu training sản phẩm mới",
            "description": "Đọc và review tài liệu training cho sản phẩm mới ra mắt Q1/2026",
            "task_type": "REVIEW",
            "scope": "PERSONAL",
            "source": "MANUAL",
            "status": "PENDING",
            "priority": "LOW",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_id": user_id,
            "assigned_by_name": user_name,
            "due_date": (now + timedelta(days=14)).isoformat(),
            "is_overdue": False,
        },

        # === COMPLETED Tasks ===
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00013",
            "title": "Kiểm tra xe trước chuyến đi HCM",
            "description": "Kiểm tra tình trạng xe, dầu nhớt, lốp trước chuyến HN-HCM",
            "task_type": "ACTION",
            "scope": "COMPANY",
            "source": "TMS",
            "source_module": "TMS",
            "status": "COMPLETED",
            "priority": "HIGH",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Garage Manager",
            "due_date": (now - timedelta(hours=5)).isoformat(),
            "started_at": (now - timedelta(hours=6)).isoformat(),
            "completed_at": (now - timedelta(hours=4)).isoformat(),
            "result": "COMPLETED",
            "result_note": "Xe OK, đã kiểm tra đầy đủ các hạng mục",
            "is_overdue": False,
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "task_number": "TASK-2026-00014",
            "title": "Phê duyệt đơn tạm ứng - Trần Văn B",
            "description": "Đơn tạm ứng chi phí công tác: 5,000,000 VND",
            "task_type": "APPROVAL",
            "scope": "COMPANY",
            "source": "WORKFLOW",
            "source_module": "WORKFLOW",
            "status": "COMPLETED",
            "priority": "NORMAL",
            "assigned_to_id": user_id,
            "assigned_to_name": user_name,
            "assigned_by_name": "Workflow System",
            "due_date": (now - timedelta(days=1)).isoformat(),
            "completed_at": (now - timedelta(days=1, hours=2)).isoformat(),
            "result": "APPROVED",
            "result_note": "Đồng ý tạm ứng theo quy định",
            "is_overdue": False,
        },
    ]

    # Insert tasks
    for task in tasks:
        columns = ", ".join(task.keys())
        placeholders = ", ".join([f":{k}" for k in task.keys()])
        sql = f"INSERT INTO user_tasks ({columns}) VALUES ({placeholders})"
        conn.execute(text(sql), task)

    # Create sequence record
    conn.execute(text("""
        INSERT INTO user_task_sequences (id, tenant_id, year, last_number)
        VALUES (:id, :tid, 2026, 14)
    """), {"id": str(uuid.uuid4()), "tid": tenant_id})

    print(f"Seeded 14 sample tasks for tenant {tenant_id}")


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("DELETE FROM user_task_comments"))
    conn.execute(text("DELETE FROM user_task_watchers"))
    conn.execute(text("DELETE FROM user_tasks WHERE task_number LIKE 'TASK-2026-%'"))
    conn.execute(text("DELETE FROM user_task_sequences WHERE year = 2026"))
