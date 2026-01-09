"""Add user_tasks tables for Central Task Management System

Revision ID: add_user_tasks
Revises: 20260105_0004_seed_default_roles
Create Date: 2026-01-06

Central Task Management:
- user_tasks: Main task table aggregating tasks from all modules
- user_task_comments: Comments and activity log for tasks
- user_task_watchers: Users watching/following tasks
- user_task_sequences: Auto-increment sequences for task numbers
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_user_tasks'
down_revision = 'seed_default_roles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === 1. USER_TASKS TABLE ===
    op.create_table(
        'user_tasks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Task identification
        sa.Column('task_number', sa.String(50), nullable=False, index=True),

        # Basic Info
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Classification
        sa.Column('task_type', sa.String(20), nullable=False, server_default='ACTION', index=True),
        sa.Column('scope', sa.String(20), nullable=False, server_default='COMPANY', index=True),
        sa.Column('source', sa.String(20), nullable=False, server_default='MANUAL', index=True),

        # Status & Priority
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING', index=True),
        sa.Column('priority', sa.String(20), nullable=False, server_default='NORMAL', index=True),

        # Source reference
        sa.Column('source_module', sa.String(50), nullable=True),
        sa.Column('source_entity_type', sa.String(100), nullable=True),
        sa.Column('source_entity_id', sa.String(36), nullable=True),
        sa.Column('source_entity_code', sa.String(100), nullable=True),
        sa.Column('source_url', sa.String(500), nullable=True),

        # Assignment
        sa.Column('assigned_to_id', sa.String(36), nullable=False, index=True),
        sa.Column('assigned_to_name', sa.String(100), nullable=True),
        sa.Column('assigned_by_id', sa.String(36), nullable=True),
        sa.Column('assigned_by_name', sa.String(100), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),

        # Watchers (JSON array)
        sa.Column('watchers_json', sa.Text(), nullable=True),

        # Timeline
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('reminder_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),

        # Overdue tracking
        sa.Column('is_overdue', sa.Boolean(), nullable=False, server_default='0'),

        # Result/Completion
        sa.Column('result', sa.String(50), nullable=True),
        sa.Column('result_data', sa.Text(), nullable=True),
        sa.Column('result_note', sa.Text(), nullable=True),

        # Attachments (JSON array)
        sa.Column('attachments_json', sa.Text(), nullable=True),

        # Actions configuration (JSON)
        sa.Column('actions_json', sa.Text(), nullable=True),

        # Comments count
        sa.Column('comments_count', sa.Integer(), nullable=False, server_default='0'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', sa.String(36), nullable=True),
        sa.Column('created_by_name', sa.String(100), nullable=True),
    )

    # Create indexes for common queries
    op.create_index('ix_user_tasks_tenant_assigned', 'user_tasks', ['tenant_id', 'assigned_to_id'])
    op.create_index('ix_user_tasks_tenant_status', 'user_tasks', ['tenant_id', 'status'])
    op.create_index('ix_user_tasks_due_date', 'user_tasks', ['due_date'])

    # === 2. USER_TASK_COMMENTS TABLE ===
    op.create_table(
        'user_task_comments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('user_tasks.id', ondelete='CASCADE'), nullable=False, index=True),

        # Comment content
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('comment_type', sa.String(50), nullable=False, server_default='COMMENT'),

        # Attachments
        sa.Column('attachments_json', sa.Text(), nullable=True),

        # Author
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('user_name', sa.String(100), nullable=True),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === 3. USER_TASK_WATCHERS TABLE ===
    op.create_table(
        'user_task_watchers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('task_id', sa.String(36), sa.ForeignKey('user_tasks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_name', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create unique constraint for task_id + user_id
    op.create_unique_constraint('uq_user_task_watchers_task_user', 'user_task_watchers', ['task_id', 'user_id'])

    # === 4. USER_TASK_SEQUENCES TABLE ===
    op.create_table(
        'user_task_sequences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('last_number', sa.Integer(), nullable=False, server_default='0'),
    )

    # Create unique constraint for tenant_id + year
    op.create_unique_constraint('uq_user_task_sequences_tenant_year', 'user_task_sequences', ['tenant_id', 'year'])


def downgrade() -> None:
    op.drop_table('user_task_sequences')
    op.drop_table('user_task_watchers')
    op.drop_table('user_task_comments')
    op.drop_table('user_tasks')
