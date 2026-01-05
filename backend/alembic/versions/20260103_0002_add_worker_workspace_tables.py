"""Add worker and workspace tables for Personal Workspace feature

Revision ID: add_worker_workspace
Revises: add_activity_logs
Create Date: 2026-01-03

Personal Workspace MVP:
- workers: Cá nhân có workspace riêng (minh.9log.tech)
- workspace_invitations: Lời mời worker vào tenant
- worker_tenant_access: Quyền truy cập của worker vào tenant
- worker_tasks: Task được giao cho worker
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_worker_workspace'
down_revision = 'add_activity_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === 1. WORKERS TABLE ===
    op.create_table(
        'workers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Identity
        sa.Column('username', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('phone', sa.String(20), nullable=True, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),

        # Profile
        sa.Column('full_name', sa.String(100), nullable=False),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('cover_photo_url', sa.String(500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),

        # Professional
        sa.Column('job_title', sa.String(100), nullable=True),
        sa.Column('skills', sa.Text(), nullable=True),  # JSON array
        sa.Column('experience_years', sa.Integer(), nullable=True),

        # Location
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('province', sa.String(100), nullable=True),
        sa.Column('country', sa.String(10), nullable=False, server_default='VN'),
        sa.Column('address', sa.Text(), nullable=True),

        # Identity docs
        sa.Column('id_number', sa.String(20), nullable=True),
        sa.Column('id_issue_date', sa.String(20), nullable=True),
        sa.Column('id_issue_place', sa.String(100), nullable=True),

        # License
        sa.Column('license_number', sa.String(20), nullable=True),
        sa.Column('license_class', sa.String(10), nullable=True),
        sa.Column('license_expiry', sa.String(20), nullable=True),

        # Bank
        sa.Column('bank_name', sa.String(100), nullable=True),
        sa.Column('bank_branch', sa.String(100), nullable=True),
        sa.Column('bank_account', sa.String(50), nullable=True),
        sa.Column('bank_account_name', sa.String(100), nullable=True),

        # Social
        sa.Column('facebook_url', sa.String(255), nullable=True),
        sa.Column('zalo_phone', sa.String(20), nullable=True),
        sa.Column('linkedin_url', sa.String(255), nullable=True),

        # Settings
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('preferred_work_types', sa.Text(), nullable=True),
        sa.Column('preferred_locations', sa.Text(), nullable=True),

        # Status
        sa.Column('status', sa.String(30), nullable=False, server_default='ACTIVE', index=True),
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('phone_verified', sa.Boolean(), nullable=False, server_default='0'),

        # Security
        sa.Column('last_login_at', sa.String(30), nullable=True),
        sa.Column('password_changed_at', sa.String(30), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('locked_until', sa.String(30), nullable=True),
    )

    # === 2. WORKSPACE INVITATIONS TABLE ===
    op.create_table(
        'workspace_invitations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Who invites
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('invited_by_user_id', sa.String(36), nullable=False, index=True),

        # Who is invited
        sa.Column('worker_id', sa.String(36), sa.ForeignKey('workers.id'), nullable=True, index=True),
        sa.Column('invited_email', sa.String(255), nullable=True, index=True),

        # Details
        sa.Column('role', sa.String(50), nullable=False, server_default='WORKER'),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('permissions_json', sa.Text(), nullable=True),

        # Status
        sa.Column('status', sa.String(30), nullable=False, server_default='PENDING', index=True),
        sa.Column('expires_at', sa.String(30), nullable=True),

        # Response
        sa.Column('responded_at', sa.String(30), nullable=True),
        sa.Column('decline_reason', sa.Text(), nullable=True),

        # Token
        sa.Column('invitation_token', sa.String(100), unique=True, nullable=False, index=True),
    )

    # === 3. WORKER TENANT ACCESS TABLE ===
    op.create_table(
        'worker_tenant_access',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Links
        sa.Column('worker_id', sa.String(36), sa.ForeignKey('workers.id'), nullable=False, index=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('invitation_id', sa.String(36), sa.ForeignKey('workspace_invitations.id'), nullable=True),

        # Role & Permissions
        sa.Column('role', sa.String(50), nullable=False, server_default='WORKER'),
        sa.Column('permissions_json', sa.Text(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1', index=True),
        sa.Column('deactivated_at', sa.String(30), nullable=True),
        sa.Column('deactivated_reason', sa.Text(), nullable=True),

        # Stats
        sa.Column('total_tasks_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_task_at', sa.String(30), nullable=True),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('total_ratings', sa.Integer(), nullable=False, server_default='0'),
    )

    # Unique constraint: one access per worker per tenant
    op.create_unique_constraint(
        'uq_worker_tenant_access',
        'worker_tenant_access',
        ['worker_id', 'tenant_id']
    )

    # === 4. WORKER TASKS TABLE ===
    op.create_table(
        'worker_tasks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Links
        sa.Column('worker_id', sa.String(36), sa.ForeignKey('workers.id'), nullable=False, index=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('access_id', sa.String(36), sa.ForeignKey('worker_tenant_access.id'), nullable=False, index=True),

        # Task reference
        sa.Column('task_type', sa.String(50), nullable=False, index=True),
        sa.Column('task_ref_id', sa.String(36), nullable=False, index=True),
        sa.Column('task_code', sa.String(50), nullable=True),

        # Info
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Assignment
        sa.Column('assigned_at', sa.String(30), nullable=False),
        sa.Column('assigned_by_user_id', sa.String(36), nullable=True),

        # Timeline
        sa.Column('scheduled_start', sa.String(30), nullable=True),
        sa.Column('scheduled_end', sa.String(30), nullable=True),
        sa.Column('actual_start', sa.String(30), nullable=True),
        sa.Column('actual_end', sa.String(30), nullable=True),

        # Status
        sa.Column('status', sa.String(30), nullable=False, server_default='ASSIGNED', index=True),

        # Payment
        sa.Column('payment_amount', sa.Float(), nullable=True),
        sa.Column('payment_status', sa.String(30), nullable=True),
        sa.Column('paid_at', sa.String(30), nullable=True),

        # Notes
        sa.Column('worker_notes', sa.Text(), nullable=True),
        sa.Column('company_notes', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('worker_tasks')
    op.drop_table('worker_tenant_access')
    op.drop_table('workspace_invitations')
    op.drop_table('workers')
