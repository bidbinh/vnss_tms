"""HRM Module - Complete Schema

Revision ID: 20241226_0002
Revises: 20241226_0001_platform_core
Create Date: 2024-12-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # === ORGANIZATION STRUCTURE ===

    # 1. Branches (Chi nhánh)
    op.create_table('hrm_branches',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.Text, nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('province', sa.String(100), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('manager_id', sa.String(36), nullable=True),  # FK added later
        sa.Column('is_headquarters', sa.Boolean, default=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 2. Departments (Phòng ban)
    op.create_table('hrm_departments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('parent_id', sa.String(36), nullable=True),
        sa.Column('branch_id', sa.String(36), nullable=True),
        sa.Column('manager_id', sa.String(36), nullable=True),  # FK added later
        sa.Column('cost_center_code', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['parent_id'], ['hrm_departments.id']),
        sa.ForeignKeyConstraint(['branch_id'], ['hrm_branches.id']),
    )

    # 3. Positions (Chức danh)
    op.create_table('hrm_positions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('level', sa.Integer, default=1),
        sa.Column('department_id', sa.String(36), nullable=True),
        sa.Column('min_salary', sa.Float, nullable=True),
        sa.Column('max_salary', sa.Float, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('requirements', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
    )

    # 4. Work Shifts (Ca làm việc) - Create before employees since employees reference it
    op.create_table('hrm_work_shifts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('start_time', sa.String(10), nullable=False),
        sa.Column('end_time', sa.String(10), nullable=False),
        sa.Column('break_start', sa.String(10), nullable=True),
        sa.Column('break_end', sa.String(10), nullable=True),
        sa.Column('break_duration_minutes', sa.Integer, default=60),
        sa.Column('working_hours', sa.Float, default=8),
        sa.Column('late_grace_minutes', sa.Integer, default=15),
        sa.Column('early_leave_grace_minutes', sa.Integer, default=15),
        sa.Column('is_night_shift', sa.Boolean, default=False),
        sa.Column('night_shift_multiplier', sa.Float, default=1.3),
        sa.Column('is_flexible', sa.Boolean, default=False),
        sa.Column('core_start_time', sa.String(10), nullable=True),
        sa.Column('core_end_time', sa.String(10), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 5. Teams (Nhóm/Tổ)
    op.create_table('hrm_teams',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('department_id', sa.String(36), nullable=False),
        sa.Column('leader_id', sa.String(36), nullable=True),  # FK added later
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
    )

    # === EMPLOYEE ===

    # 6. Employees (Nhân viên)
    op.create_table('hrm_employees',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('full_name', sa.String(255), nullable=False, index=True),
        # Personal
        sa.Column('date_of_birth', sa.String(10), nullable=True),
        sa.Column('gender', sa.String(20), nullable=True),
        sa.Column('marital_status', sa.String(20), nullable=True),
        sa.Column('nationality', sa.String(50), default='Vietnamese'),
        # Contact
        sa.Column('phone', sa.String(50), nullable=True, index=True),
        sa.Column('email', sa.String(255), nullable=True, index=True),
        # Permanent address
        sa.Column('permanent_address', sa.Text, nullable=True),
        sa.Column('permanent_city', sa.String(100), nullable=True),
        sa.Column('permanent_province', sa.String(100), nullable=True),
        # Current address
        sa.Column('current_address', sa.Text, nullable=True),
        sa.Column('current_city', sa.String(100), nullable=True),
        sa.Column('current_province', sa.String(100), nullable=True),
        # Identification
        sa.Column('id_number', sa.String(50), nullable=True, index=True),
        sa.Column('id_issue_date', sa.String(10), nullable=True),
        sa.Column('id_issue_place', sa.String(255), nullable=True),
        sa.Column('id_expiry_date', sa.String(10), nullable=True),
        sa.Column('tax_code', sa.String(50), nullable=True),
        # Bank info
        sa.Column('bank_name', sa.String(255), nullable=True),
        sa.Column('bank_branch', sa.String(255), nullable=True),
        sa.Column('bank_account', sa.String(50), nullable=True),
        sa.Column('bank_account_name', sa.String(255), nullable=True),
        # Employment
        sa.Column('employee_type', sa.String(20), default='FULL_TIME', index=True),
        sa.Column('status', sa.String(20), default='ACTIVE', index=True),
        sa.Column('join_date', sa.String(10), nullable=True),
        sa.Column('probation_end_date', sa.String(10), nullable=True),
        sa.Column('official_date', sa.String(10), nullable=True),
        sa.Column('resign_date', sa.String(10), nullable=True),
        sa.Column('resign_reason', sa.Text, nullable=True),
        # Organization
        sa.Column('branch_id', sa.String(36), nullable=True),
        sa.Column('department_id', sa.String(36), nullable=True),
        sa.Column('team_id', sa.String(36), nullable=True),
        sa.Column('position_id', sa.String(36), nullable=True),
        sa.Column('manager_id', sa.String(36), nullable=True),
        # Insurance
        sa.Column('social_insurance_number', sa.String(50), nullable=True),
        sa.Column('health_insurance_number', sa.String(50), nullable=True),
        sa.Column('health_insurance_place', sa.String(255), nullable=True),
        # Driver link
        sa.Column('driver_id', sa.String(36), nullable=True, index=True),
        sa.Column('license_number', sa.String(50), nullable=True),
        sa.Column('license_class', sa.String(20), nullable=True),
        sa.Column('license_expiry', sa.String(10), nullable=True),
        # Health check
        sa.Column('health_check_date', sa.String(10), nullable=True),
        sa.Column('health_check_expiry', sa.String(10), nullable=True),
        sa.Column('health_check_result', sa.String(50), nullable=True),
        # Work settings
        sa.Column('work_shift_id', sa.String(36), nullable=True),
        sa.Column('salary_type', sa.String(20), default='FIXED'),
        # User account
        sa.Column('user_id', sa.String(36), nullable=True, index=True),
        # Other
        sa.Column('avatar_url', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        # Foreign keys
        sa.ForeignKeyConstraint(['branch_id'], ['hrm_branches.id']),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
        sa.ForeignKeyConstraint(['team_id'], ['hrm_teams.id']),
        sa.ForeignKeyConstraint(['position_id'], ['hrm_positions.id']),
        sa.ForeignKeyConstraint(['manager_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['work_shift_id'], ['hrm_work_shifts.id']),
    )

    # Add foreign keys that reference employees to previous tables
    op.create_foreign_key('fk_branches_manager', 'hrm_branches', 'hrm_employees', ['manager_id'], ['id'])
    op.create_foreign_key('fk_departments_manager', 'hrm_departments', 'hrm_employees', ['manager_id'], ['id'])
    op.create_foreign_key('fk_teams_leader', 'hrm_teams', 'hrm_employees', ['leader_id'], ['id'])

    # 7. Employee Dependents (Người phụ thuộc)
    op.create_table('hrm_employee_dependents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('relationship', sa.String(50), nullable=False),
        sa.Column('date_of_birth', sa.String(10), nullable=True),
        sa.Column('id_number', sa.String(50), nullable=True),
        sa.Column('tax_code', sa.String(50), nullable=True),
        sa.Column('deduction_from', sa.String(10), nullable=True),
        sa.Column('deduction_to', sa.String(10), nullable=True),
        sa.Column('document_type', sa.String(50), nullable=True),
        sa.Column('document_number', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
    )

    # 8. Employee Documents (Hồ sơ)
    op.create_table('hrm_employee_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('document_name', sa.String(255), nullable=False),
        sa.Column('document_number', sa.String(100), nullable=True),
        sa.Column('issue_date', sa.String(10), nullable=True),
        sa.Column('expiry_date', sa.String(10), nullable=True),
        sa.Column('issue_place', sa.String(255), nullable=True),
        sa.Column('file_url', sa.Text, nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('alert_before_days', sa.Integer, default=30),
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('verified_by', sa.String(36), nullable=True),
        sa.Column('verified_at', sa.DateTime, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
    )

    # === CONTRACTS ===

    # 9. Contracts (Hợp đồng lao động)
    op.create_table('hrm_contracts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('contract_number', sa.String(50), nullable=False, index=True),
        sa.Column('contract_type', sa.String(30), nullable=False),
        sa.Column('status', sa.String(20), default='DRAFT', index=True),
        sa.Column('sign_date', sa.String(10), nullable=True),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=True),
        sa.Column('previous_contract_id', sa.String(36), nullable=True),
        sa.Column('basic_salary', sa.Float, default=0),
        sa.Column('insurance_salary', sa.Float, nullable=True),
        sa.Column('allowances_json', sa.Text, nullable=True),
        sa.Column('probation_salary_percent', sa.Float, default=85),
        sa.Column('job_title', sa.String(255), nullable=True),
        sa.Column('job_description', sa.Text, nullable=True),
        sa.Column('work_location', sa.String(255), nullable=True),
        sa.Column('working_hours_per_day', sa.Float, default=8),
        sa.Column('working_days_per_week', sa.Float, default=5),
        sa.Column('termination_date', sa.String(10), nullable=True),
        sa.Column('termination_reason', sa.Text, nullable=True),
        sa.Column('termination_type', sa.String(30), nullable=True),
        sa.Column('contract_file_url', sa.Text, nullable=True),
        sa.Column('employee_signed_date', sa.String(10), nullable=True),
        sa.Column('company_signed_by', sa.String(255), nullable=True),
        sa.Column('company_signed_date', sa.String(10), nullable=True),
        sa.Column('expiry_alert_days', sa.Integer, default=30),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['previous_contract_id'], ['hrm_contracts.id']),
    )

    # === ATTENDANCE ===

    # 10. Shift Assignments (Phân ca)
    op.create_table('hrm_shift_assignments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('shift_id', sa.String(36), nullable=False),
        sa.Column('effective_from', sa.String(10), nullable=False),
        sa.Column('effective_to', sa.String(10), nullable=True),
        sa.Column('working_days_json', sa.String(50), default='[1,2,3,4,5]'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['shift_id'], ['hrm_work_shifts.id']),
    )

    # 11. Attendance Records (Bảng chấm công)
    op.create_table('hrm_attendance_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('date', sa.String(10), nullable=False, index=True),
        sa.Column('shift_id', sa.String(36), nullable=True),
        sa.Column('check_in_time', sa.String(10), nullable=True),
        sa.Column('check_out_time', sa.String(10), nullable=True),
        sa.Column('check_in_location', sa.String(255), nullable=True),
        sa.Column('check_out_location', sa.String(255), nullable=True),
        sa.Column('check_in_source', sa.String(20), nullable=True),
        sa.Column('check_out_source', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), default='PRESENT', index=True),
        sa.Column('late_minutes', sa.Integer, default=0),
        sa.Column('early_leave_minutes', sa.Integer, default=0),
        sa.Column('working_hours', sa.Float, default=0),
        sa.Column('overtime_hours', sa.Float, default=0),
        sa.Column('work_units', sa.Float, default=1),
        sa.Column('trip_ids_json', sa.Text, nullable=True),
        sa.Column('is_approved', sa.Boolean, default=True),
        sa.Column('approved_by', sa.String(36), nullable=True),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['shift_id'], ['hrm_work_shifts.id']),
    )

    # 12. Overtime Requests (Đăng ký OT)
    op.create_table('hrm_overtime_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('date', sa.String(10), nullable=False, index=True),
        sa.Column('start_time', sa.String(10), nullable=False),
        sa.Column('end_time', sa.String(10), nullable=False),
        sa.Column('hours', sa.Float, nullable=False),
        sa.Column('ot_type', sa.String(20), default='WEEKDAY'),
        sa.Column('multiplier', sa.Float, default=1.5),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='PENDING', index=True),
        sa.Column('approved_by', sa.String(36), nullable=True),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('attendance_record_id', sa.String(36), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['approved_by'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['attendance_record_id'], ['hrm_attendance_records.id']),
    )

    # === LEAVE MANAGEMENT ===

    # 13. Leave Types (Loại nghỉ phép)
    op.create_table('hrm_leave_types',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(20), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('is_paid', sa.Boolean, default=True),
        sa.Column('default_days_per_year', sa.Float, default=12),
        sa.Column('is_accrual', sa.Boolean, default=False),
        sa.Column('accrual_per_month', sa.Float, default=1),
        sa.Column('allow_carry_forward', sa.Boolean, default=False),
        sa.Column('max_carry_forward_days', sa.Float, default=5),
        sa.Column('allow_negative_balance', sa.Boolean, default=False),
        sa.Column('max_negative_days', sa.Float, default=0),
        sa.Column('requires_approval', sa.Boolean, default=True),
        sa.Column('requires_attachment', sa.Boolean, default=False),
        sa.Column('gender_specific', sa.String(10), nullable=True),
        sa.Column('min_tenure_months', sa.Integer, default=0),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 14. Leave Balances (Số dư phép)
    op.create_table('hrm_leave_balances',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('leave_type_id', sa.String(36), nullable=False, index=True),
        sa.Column('year', sa.Integer, nullable=False, index=True),
        sa.Column('entitled_days', sa.Float, default=0),
        sa.Column('carried_forward_days', sa.Float, default=0),
        sa.Column('used_days', sa.Float, default=0),
        sa.Column('pending_days', sa.Float, default=0),
        sa.Column('available_days', sa.Float, default=0),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['leave_type_id'], ['hrm_leave_types.id']),
    )

    # 15. Leave Requests (Đơn xin nghỉ)
    op.create_table('hrm_leave_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('leave_type_id', sa.String(36), nullable=False, index=True),
        sa.Column('request_number', sa.String(50), nullable=False, index=True),
        sa.Column('from_date', sa.String(10), nullable=False),
        sa.Column('to_date', sa.String(10), nullable=False),
        sa.Column('is_half_day', sa.Boolean, default=False),
        sa.Column('half_day_type', sa.String(20), nullable=True),
        sa.Column('total_days', sa.Float, default=1),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('attachment_url', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='PENDING', index=True),
        sa.Column('handover_to_id', sa.String(36), nullable=True),
        sa.Column('handover_notes', sa.Text, nullable=True),
        sa.Column('cancelled_at', sa.DateTime, nullable=True),
        sa.Column('cancellation_reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['leave_type_id'], ['hrm_leave_types.id']),
        sa.ForeignKeyConstraint(['handover_to_id'], ['hrm_employees.id']),
    )

    # 16. Leave Approval Flows (Quy trình duyệt phép)
    op.create_table('hrm_leave_approval_flows',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('leave_type_id', sa.String(36), nullable=True),
        sa.Column('min_days', sa.Float, default=0),
        sa.Column('max_days', sa.Float, nullable=True),
        sa.Column('department_id', sa.String(36), nullable=True),
        sa.Column('approval_levels', sa.Integer, default=1),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['leave_type_id'], ['hrm_leave_types.id']),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
    )

    # 17. Leave Approvers (Lịch sử duyệt)
    op.create_table('hrm_leave_approvers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('leave_request_id', sa.String(36), nullable=False, index=True),
        sa.Column('level', sa.Integer, default=1),
        sa.Column('approver_id', sa.String(36), nullable=False),
        sa.Column('approver_role', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), default='PENDING'),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['leave_request_id'], ['hrm_leave_requests.id']),
        sa.ForeignKeyConstraint(['approver_id'], ['hrm_employees.id']),
    )

    # === PAYROLL ===

    # 18. Salary Structures (Cơ cấu lương)
    op.create_table('hrm_salary_structures',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('employee_type', sa.String(20), nullable=True),
        sa.Column('department_id', sa.String(36), nullable=True),
        sa.Column('position_id', sa.String(36), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_default', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
        sa.ForeignKeyConstraint(['position_id'], ['hrm_positions.id']),
    )

    # 19. Salary Components (Thành phần lương)
    op.create_table('hrm_salary_components',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('structure_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('component_type', sa.String(30), default='EARNING'),
        sa.Column('calculation_type', sa.String(20), default='FIXED'),
        sa.Column('default_amount', sa.Float, default=0),
        sa.Column('formula', sa.Text, nullable=True),
        sa.Column('percent_of_component', sa.String(50), nullable=True),
        sa.Column('percent_value', sa.Float, nullable=True),
        sa.Column('is_taxable', sa.Boolean, default=True),
        sa.Column('is_insurance_base', sa.Boolean, default=False),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['structure_id'], ['hrm_salary_structures.id']),
    )

    # 20. Employee Salaries (Lương nhân viên)
    op.create_table('hrm_employee_salaries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('structure_id', sa.String(36), nullable=False),
        sa.Column('effective_from', sa.String(10), nullable=False),
        sa.Column('effective_to', sa.String(10), nullable=True),
        sa.Column('overrides_json', sa.Text, nullable=True),
        sa.Column('trip_rate_json', sa.Text, nullable=True),
        sa.Column('is_current', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['structure_id'], ['hrm_salary_structures.id']),
    )

    # 21. Payroll Periods (Kỳ lương)
    op.create_table('hrm_payroll_periods',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(20), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('year', sa.Integer, nullable=False, index=True),
        sa.Column('month', sa.Integer, nullable=False, index=True),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=False),
        sa.Column('attendance_cutoff_date', sa.String(10), nullable=False),
        sa.Column('payroll_run_date', sa.String(10), nullable=True),
        sa.Column('payment_date', sa.String(10), nullable=True),
        sa.Column('status', sa.String(20), default='OPEN'),
        sa.Column('locked_at', sa.DateTime, nullable=True),
        sa.Column('locked_by', sa.String(36), nullable=True),
        sa.Column('total_working_days', sa.Float, default=22),
        sa.Column('holidays_json', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 22. Payroll Records (Bảng lương)
    op.create_table('hrm_payroll_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('payroll_period_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_salary_id', sa.String(36), nullable=False),
        # Attendance summary
        sa.Column('working_days', sa.Float, default=0),
        sa.Column('leave_days', sa.Float, default=0),
        sa.Column('unpaid_leave_days', sa.Float, default=0),
        sa.Column('absent_days', sa.Float, default=0),
        sa.Column('late_count', sa.Integer, default=0),
        sa.Column('early_leave_count', sa.Integer, default=0),
        # Overtime
        sa.Column('ot_hours_weekday', sa.Float, default=0),
        sa.Column('ot_hours_weekend', sa.Float, default=0),
        sa.Column('ot_hours_holiday', sa.Float, default=0),
        # Earnings
        sa.Column('basic_salary', sa.Float, default=0),
        sa.Column('prorated_salary', sa.Float, default=0),
        sa.Column('allowances_total', sa.Float, default=0),
        sa.Column('overtime_total', sa.Float, default=0),
        sa.Column('bonus_total', sa.Float, default=0),
        sa.Column('commission_total', sa.Float, default=0),
        sa.Column('trip_income_total', sa.Float, default=0),
        sa.Column('gross_salary', sa.Float, default=0),
        # Deductions
        sa.Column('insurance_employee', sa.Float, default=0),
        sa.Column('tax_amount', sa.Float, default=0),
        sa.Column('advance_deduction', sa.Float, default=0),
        sa.Column('loan_deduction', sa.Float, default=0),
        sa.Column('penalty_deduction', sa.Float, default=0),
        sa.Column('other_deductions', sa.Float, default=0),
        sa.Column('total_deductions', sa.Float, default=0),
        # Net
        sa.Column('net_salary', sa.Float, default=0),
        # Employer cost
        sa.Column('insurance_employer', sa.Float, default=0),
        sa.Column('total_cost', sa.Float, default=0),
        # Payment
        sa.Column('payment_status', sa.String(20), default='PENDING'),
        sa.Column('payment_date', sa.String(10), nullable=True),
        sa.Column('payment_reference', sa.String(100), nullable=True),
        # Details
        sa.Column('earnings_json', sa.Text, nullable=True),
        sa.Column('deductions_json', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['payroll_period_id'], ['hrm_payroll_periods.id']),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['employee_salary_id'], ['hrm_employee_salaries.id']),
    )

    # 23. Payroll Items (Chi tiết lương)
    op.create_table('hrm_payroll_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('payroll_record_id', sa.String(36), nullable=False, index=True),
        sa.Column('component_code', sa.String(50), nullable=False),
        sa.Column('component_name', sa.String(255), nullable=False),
        sa.Column('component_type', sa.String(30), nullable=False),
        sa.Column('amount', sa.Float, default=0),
        sa.Column('calculation_notes', sa.Text, nullable=True),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['payroll_record_id'], ['hrm_payroll_records.id']),
    )

    # 24. Deductions (Khấu trừ đặc biệt)
    op.create_table('hrm_deductions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('deduction_type', sa.String(30), nullable=False),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('total_amount', sa.Float, default=0),
        sa.Column('remaining_amount', sa.Float, default=0),
        sa.Column('monthly_deduction', sa.Float, default=0),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=True),
        sa.Column('interest_rate', sa.Float, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
    )

    # === ADVANCE PAYMENTS ===

    # 25. Advance Requests (Yêu cầu tạm ứng)
    op.create_table('hrm_advance_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('request_number', sa.String(50), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('requested_amount', sa.Float, nullable=False),
        sa.Column('approved_amount', sa.Float, default=0),
        sa.Column('purpose', sa.Text, nullable=True),
        sa.Column('advance_type', sa.String(20), default='SALARY'),
        sa.Column('trip_id', sa.String(36), nullable=True),
        sa.Column('request_date', sa.String(10), nullable=False),
        sa.Column('needed_date', sa.String(10), nullable=True),
        sa.Column('status', sa.String(20), default='PENDING', index=True),
        sa.Column('approved_by', sa.String(36), nullable=True),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('paid_date', sa.String(10), nullable=True),
        sa.Column('paid_by', sa.String(36), nullable=True),
        sa.Column('payment_method', sa.String(20), nullable=True),
        sa.Column('payment_reference', sa.String(100), nullable=True),
        sa.Column('repaid_amount', sa.Float, default=0),
        sa.Column('remaining_amount', sa.Float, default=0),
        sa.Column('repayment_method', sa.String(30), default='SALARY_DEDUCTION'),
        sa.Column('deduction_start_month', sa.String(10), nullable=True),
        sa.Column('monthly_deduction_amount', sa.Float, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['approved_by'], ['hrm_employees.id']),
    )

    # 26. Advance Repayments (Lịch sử trả tạm ứng)
    op.create_table('hrm_advance_repayments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('advance_request_id', sa.String(36), nullable=False, index=True),
        sa.Column('repayment_date', sa.String(10), nullable=False),
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('repayment_method', sa.String(30), nullable=False),
        sa.Column('reference', sa.String(100), nullable=True),
        sa.Column('payroll_record_id', sa.String(36), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['advance_request_id'], ['hrm_advance_requests.id']),
        sa.ForeignKeyConstraint(['payroll_record_id'], ['hrm_payroll_records.id']),
    )

    # === INSURANCE ===

    # 27. Insurance Records (Quản lý bảo hiểm)
    op.create_table('hrm_insurance_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('insurance_type', sa.String(20), nullable=False),
        sa.Column('insurance_number', sa.String(50), nullable=False),
        sa.Column('health_insurance_place', sa.String(255), nullable=True),
        sa.Column('registered_salary', sa.Float, default=0),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=True),
        sa.Column('employee_rate', sa.Float, default=0),
        sa.Column('employer_rate', sa.Float, default=0),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
    )

    # 28. Insurance Contributions (Lịch sử đóng BH)
    op.create_table('hrm_insurance_contributions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('insurance_record_id', sa.String(36), nullable=False, index=True),
        sa.Column('year', sa.Integer, nullable=False, index=True),
        sa.Column('month', sa.Integer, nullable=False, index=True),
        sa.Column('salary_base', sa.Float, default=0),
        sa.Column('employee_amount', sa.Float, default=0),
        sa.Column('employer_amount', sa.Float, default=0),
        sa.Column('total_amount', sa.Float, default=0),
        sa.Column('payroll_record_id', sa.String(36), nullable=True),
        sa.Column('is_paid', sa.Boolean, default=False),
        sa.Column('paid_date', sa.String(10), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['insurance_record_id'], ['hrm_insurance_records.id']),
        sa.ForeignKeyConstraint(['payroll_record_id'], ['hrm_payroll_records.id']),
    )

    # === TRAINING ===

    # 29. Trainings (Khóa đào tạo)
    op.create_table('hrm_trainings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('training_type', sa.String(30), default='SKILL'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('objectives', sa.Text, nullable=True),
        sa.Column('content_outline', sa.Text, nullable=True),
        sa.Column('start_date', sa.String(10), nullable=True),
        sa.Column('end_date', sa.String(10), nullable=True),
        sa.Column('duration_hours', sa.Float, default=0),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('format', sa.String(20), default='OFFLINE'),
        sa.Column('course_url', sa.Text, nullable=True),
        sa.Column('total_modules', sa.Integer, default=0),
        sa.Column('trainer_name', sa.String(255), nullable=True),
        sa.Column('trainer_organization', sa.String(255), nullable=True),
        sa.Column('cost_per_person', sa.Float, default=0),
        sa.Column('total_budget', sa.Float, default=0),
        sa.Column('actual_cost', sa.Float, default=0),
        sa.Column('max_participants', sa.Integer, nullable=True),
        sa.Column('min_participants', sa.Integer, nullable=True),
        sa.Column('passing_score', sa.Float, default=70),
        sa.Column('certificate_validity_months', sa.Integer, nullable=True),
        sa.Column('is_mandatory', sa.Boolean, default=False),
        sa.Column('mandatory_for_departments', sa.Text, nullable=True),
        sa.Column('mandatory_for_positions', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='PLANNED', index=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 30. Certificates (Chứng chỉ)
    op.create_table('hrm_certificates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('certificate_number', sa.String(100), nullable=False, index=True),
        sa.Column('certificate_name', sa.String(255), nullable=False),
        sa.Column('certificate_type', sa.String(30), nullable=False),
        sa.Column('issuing_organization', sa.String(255), nullable=True),
        sa.Column('issue_date', sa.String(10), nullable=False),
        sa.Column('expiry_date', sa.String(10), nullable=True),
        sa.Column('training_id', sa.String(36), nullable=True),
        sa.Column('license_class', sa.String(20), nullable=True),
        sa.Column('file_url', sa.Text, nullable=True),
        sa.Column('alert_before_days', sa.Integer, default=30),
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('verified_by', sa.String(36), nullable=True),
        sa.Column('verified_at', sa.DateTime, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['training_id'], ['hrm_trainings.id']),
    )

    # 31. Training Participants (Học viên)
    op.create_table('hrm_training_participants',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('training_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('enrolled_date', sa.String(10), nullable=False),
        sa.Column('enrolled_by', sa.String(36), nullable=True),
        sa.Column('modules_completed', sa.Integer, default=0),
        sa.Column('progress_percent', sa.Float, default=0),
        sa.Column('last_accessed', sa.DateTime, nullable=True),
        sa.Column('status', sa.String(20), default='ENROLLED', index=True),
        sa.Column('completion_date', sa.String(10), nullable=True),
        sa.Column('score', sa.Float, nullable=True),
        sa.Column('is_passed', sa.Boolean, nullable=True),
        sa.Column('attended_hours', sa.Float, default=0),
        sa.Column('attendance_percent', sa.Float, default=0),
        sa.Column('feedback_score', sa.Float, nullable=True),
        sa.Column('feedback_comment', sa.Text, nullable=True),
        sa.Column('certificate_id', sa.String(36), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['training_id'], ['hrm_trainings.id']),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['certificate_id'], ['hrm_certificates.id']),
    )

    # === EVALUATION ===

    # 32. Evaluation Periods (Kỳ đánh giá)
    op.create_table('hrm_evaluation_periods',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('year', sa.Integer, nullable=False, index=True),
        sa.Column('period_type', sa.String(20), default='QUARTERLY'),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=False),
        sa.Column('evaluation_start_date', sa.String(10), nullable=True),
        sa.Column('evaluation_end_date', sa.String(10), nullable=True),
        sa.Column('enable_self_evaluation', sa.Boolean, default=True),
        sa.Column('enable_manager_evaluation', sa.Boolean, default=True),
        sa.Column('enable_peer_evaluation', sa.Boolean, default=True),
        sa.Column('enable_subordinate_evaluation', sa.Boolean, default=False),
        sa.Column('self_weight', sa.Float, default=20),
        sa.Column('manager_weight', sa.Float, default=50),
        sa.Column('peer_weight', sa.Float, default=20),
        sa.Column('subordinate_weight', sa.Float, default=10),
        sa.Column('status', sa.String(20), default='DRAFT'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 33. Evaluation Templates (Mẫu đánh giá)
    op.create_table('hrm_evaluation_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('employee_type', sa.String(20), nullable=True),
        sa.Column('department_id', sa.String(36), nullable=True),
        sa.Column('position_id', sa.String(36), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_default', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
        sa.ForeignKeyConstraint(['position_id'], ['hrm_positions.id']),
    )

    # 34. Evaluation Criteria (Tiêu chí đánh giá)
    op.create_table('hrm_evaluation_criteria',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('template_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(30), default='KPI'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('weight', sa.Float, default=10),
        sa.Column('min_score', sa.Float, default=1),
        sa.Column('max_score', sa.Float, default=5),
        sa.Column('score_labels_json', sa.Text, nullable=True),
        sa.Column('target_value', sa.Float, nullable=True),
        sa.Column('target_unit', sa.String(50), nullable=True),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['template_id'], ['hrm_evaluation_templates.id']),
    )

    # 35. Employee Evaluations (Đánh giá nhân viên)
    op.create_table('hrm_employee_evaluations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('period_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('template_id', sa.String(36), nullable=False),
        sa.Column('evaluator_id', sa.String(36), nullable=False, index=True),
        sa.Column('evaluator_type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), default='DRAFT', index=True),
        sa.Column('submitted_at', sa.DateTime, nullable=True),
        sa.Column('total_score', sa.Float, default=0),
        sa.Column('weighted_score', sa.Float, default=0),
        sa.Column('rating', sa.String(10), nullable=True),
        sa.Column('strengths', sa.Text, nullable=True),
        sa.Column('improvements', sa.Text, nullable=True),
        sa.Column('overall_comments', sa.Text, nullable=True),
        sa.Column('goals_next_period', sa.Text, nullable=True),
        sa.Column('acknowledged_at', sa.DateTime, nullable=True),
        sa.Column('employee_comments', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['period_id'], ['hrm_evaluation_periods.id']),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['template_id'], ['hrm_evaluation_templates.id']),
        sa.ForeignKeyConstraint(['evaluator_id'], ['hrm_employees.id']),
    )

    # 36. Evaluation Scores (Điểm theo tiêu chí)
    op.create_table('hrm_evaluation_scores',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('evaluation_id', sa.String(36), nullable=False, index=True),
        sa.Column('criteria_id', sa.String(36), nullable=False, index=True),
        sa.Column('score', sa.Float, default=0),
        sa.Column('weighted_score', sa.Float, default=0),
        sa.Column('actual_value', sa.Float, nullable=True),
        sa.Column('achievement_percent', sa.Float, nullable=True),
        sa.Column('comments', sa.Text, nullable=True),
        sa.Column('evidence', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['evaluation_id'], ['hrm_employee_evaluations.id']),
        sa.ForeignKeyConstraint(['criteria_id'], ['hrm_evaluation_criteria.id']),
    )

    # 37. Employee Final Scores (Điểm tổng hợp)
    op.create_table('hrm_employee_final_scores',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('period_id', sa.String(36), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), nullable=False, index=True),
        sa.Column('self_score', sa.Float, nullable=True),
        sa.Column('manager_score', sa.Float, nullable=True),
        sa.Column('peer_avg_score', sa.Float, nullable=True),
        sa.Column('subordinate_avg_score', sa.Float, nullable=True),
        sa.Column('final_score', sa.Float, default=0),
        sa.Column('final_rating', sa.String(10), nullable=True),
        sa.Column('rank_in_department', sa.Integer, nullable=True),
        sa.Column('rank_in_company', sa.Integer, nullable=True),
        sa.Column('salary_adjustment_percent', sa.Float, nullable=True),
        sa.Column('bonus_amount', sa.Float, nullable=True),
        sa.Column('promotion_recommended', sa.Boolean, default=False),
        sa.Column('training_recommended', sa.Text, nullable=True),
        sa.Column('reviewed_by', sa.String(36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime, nullable=True),
        sa.Column('review_comments', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='PENDING'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['period_id'], ['hrm_evaluation_periods.id']),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['reviewed_by'], ['hrm_employees.id']),
    )

    # === RECRUITMENT ===

    # 38. Job Postings (Tin tuyển dụng)
    op.create_table('hrm_job_postings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False, index=True),
        sa.Column('position_id', sa.String(36), nullable=True),
        sa.Column('department_id', sa.String(36), nullable=True),
        sa.Column('branch_id', sa.String(36), nullable=True),
        sa.Column('job_type', sa.String(20), default='FULL_TIME'),
        sa.Column('experience_level', sa.String(20), nullable=True),
        sa.Column('headcount', sa.Integer, default=1),
        sa.Column('salary_min', sa.Float, nullable=True),
        sa.Column('salary_max', sa.Float, nullable=True),
        sa.Column('salary_currency', sa.String(10), default='VND'),
        sa.Column('show_salary', sa.Boolean, default=True),
        sa.Column('work_location', sa.String(255), nullable=True),
        sa.Column('is_remote', sa.Boolean, default=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('requirements', sa.Text, nullable=True),
        sa.Column('benefits', sa.Text, nullable=True),
        sa.Column('skills_required', sa.Text, nullable=True),
        sa.Column('posted_date', sa.String(10), nullable=True),
        sa.Column('deadline', sa.String(10), nullable=True),
        sa.Column('hiring_manager_id', sa.String(36), nullable=True),
        sa.Column('recruiter_id', sa.String(36), nullable=True),
        sa.Column('views_count', sa.Integer, default=0),
        sa.Column('applications_count', sa.Integer, default=0),
        sa.Column('status', sa.String(20), default='DRAFT', index=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['position_id'], ['hrm_positions.id']),
        sa.ForeignKeyConstraint(['department_id'], ['hrm_departments.id']),
        sa.ForeignKeyConstraint(['branch_id'], ['hrm_branches.id']),
        sa.ForeignKeyConstraint(['hiring_manager_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['recruiter_id'], ['hrm_employees.id']),
    )

    # 39. Candidates (Ứng viên)
    op.create_table('hrm_candidates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('job_posting_id', sa.String(36), nullable=False, index=True),
        sa.Column('full_name', sa.String(255), nullable=False, index=True),
        sa.Column('email', sa.String(255), nullable=True, index=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('date_of_birth', sa.String(10), nullable=True),
        sa.Column('gender', sa.String(10), nullable=True),
        sa.Column('address', sa.Text, nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('current_company', sa.String(255), nullable=True),
        sa.Column('current_position', sa.String(255), nullable=True),
        sa.Column('experience_years', sa.Float, nullable=True),
        sa.Column('highest_education', sa.String(30), nullable=True),
        sa.Column('expected_salary', sa.Float, nullable=True),
        sa.Column('available_date', sa.String(10), nullable=True),
        sa.Column('resume_url', sa.Text, nullable=True),
        sa.Column('cover_letter', sa.Text, nullable=True),
        sa.Column('portfolio_url', sa.Text, nullable=True),
        sa.Column('source', sa.String(30), nullable=True),
        sa.Column('referrer_id', sa.String(36), nullable=True),
        sa.Column('skills_json', sa.Text, nullable=True),
        sa.Column('languages_json', sa.Text, nullable=True),
        sa.Column('screening_score', sa.Float, nullable=True),
        sa.Column('overall_score', sa.Float, nullable=True),
        sa.Column('status', sa.String(30), default='NEW', index=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('employee_id', sa.String(36), nullable=True),
        sa.Column('hired_date', sa.String(10), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['job_posting_id'], ['hrm_job_postings.id']),
        sa.ForeignKeyConstraint(['referrer_id'], ['hrm_employees.id']),
        sa.ForeignKeyConstraint(['employee_id'], ['hrm_employees.id']),
    )

    # 40. Interviews (Lịch phỏng vấn)
    op.create_table('hrm_interviews',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('candidate_id', sa.String(36), nullable=False, index=True),
        sa.Column('interview_round', sa.Integer, default=1),
        sa.Column('interview_type', sa.String(20), default='ONSITE'),
        sa.Column('interview_name', sa.String(255), nullable=True),
        sa.Column('scheduled_date', sa.String(10), nullable=False),
        sa.Column('scheduled_time', sa.String(10), nullable=False),
        sa.Column('duration_minutes', sa.Integer, default=60),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('meeting_link', sa.Text, nullable=True),
        sa.Column('interviewer_ids_json', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='SCHEDULED'),
        sa.Column('result', sa.String(20), default='PENDING'),
        sa.Column('score', sa.Float, nullable=True),
        sa.Column('strengths', sa.Text, nullable=True),
        sa.Column('weaknesses', sa.Text, nullable=True),
        sa.Column('overall_feedback', sa.Text, nullable=True),
        sa.Column('recommendation', sa.String(20), nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('completed_by', sa.String(36), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['candidate_id'], ['hrm_candidates.id']),
        sa.ForeignKeyConstraint(['completed_by'], ['hrm_employees.id']),
    )

    # Create indexes for performance
    op.create_index('ix_hrm_employees_tenant_code', 'hrm_employees', ['tenant_id', 'employee_code'])
    op.create_index('ix_hrm_attendance_tenant_date', 'hrm_attendance_records', ['tenant_id', 'date'])
    op.create_index('ix_hrm_payroll_tenant_period', 'hrm_payroll_records', ['tenant_id', 'payroll_period_id'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('hrm_interviews')
    op.drop_table('hrm_candidates')
    op.drop_table('hrm_job_postings')
    op.drop_table('hrm_employee_final_scores')
    op.drop_table('hrm_evaluation_scores')
    op.drop_table('hrm_employee_evaluations')
    op.drop_table('hrm_evaluation_criteria')
    op.drop_table('hrm_evaluation_templates')
    op.drop_table('hrm_evaluation_periods')
    op.drop_table('hrm_training_participants')
    op.drop_table('hrm_certificates')
    op.drop_table('hrm_trainings')
    op.drop_table('hrm_insurance_contributions')
    op.drop_table('hrm_insurance_records')
    op.drop_table('hrm_advance_repayments')
    op.drop_table('hrm_advance_requests')
    op.drop_table('hrm_deductions')
    op.drop_table('hrm_payroll_items')
    op.drop_table('hrm_payroll_records')
    op.drop_table('hrm_payroll_periods')
    op.drop_table('hrm_employee_salaries')
    op.drop_table('hrm_salary_components')
    op.drop_table('hrm_salary_structures')
    op.drop_table('hrm_leave_approvers')
    op.drop_table('hrm_leave_approval_flows')
    op.drop_table('hrm_leave_requests')
    op.drop_table('hrm_leave_balances')
    op.drop_table('hrm_leave_types')
    op.drop_table('hrm_overtime_requests')
    op.drop_table('hrm_attendance_records')
    op.drop_table('hrm_shift_assignments')
    op.drop_table('hrm_contracts')
    op.drop_table('hrm_employee_documents')
    op.drop_table('hrm_employee_dependents')
    # Drop foreign keys first
    op.drop_constraint('fk_branches_manager', 'hrm_branches', type_='foreignkey')
    op.drop_constraint('fk_departments_manager', 'hrm_departments', type_='foreignkey')
    op.drop_constraint('fk_teams_leader', 'hrm_teams', type_='foreignkey')
    op.drop_table('hrm_employees')
    op.drop_table('hrm_teams')
    op.drop_table('hrm_work_shifts')
    op.drop_table('hrm_positions')
    op.drop_table('hrm_departments')
    op.drop_table('hrm_branches')
