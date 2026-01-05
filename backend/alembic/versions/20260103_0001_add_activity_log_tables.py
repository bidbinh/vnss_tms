"""add_activity_log_tables

Revision ID: add_activity_logs
Revises: 1f9b0444e4d2
Create Date: 2026-01-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'add_activity_logs'
down_revision: Union[str, None] = '1f9b0444e4d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ActivityLog table - stores all mutation operations
    op.create_table('activity_logs',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # User info (snapshot at time of action)
        sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_role', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Action details
        sa.Column('action', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('module', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('resource_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('resource_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('resource_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Request info
        sa.Column('endpoint', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('method', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('request_summary', sa.Text(), nullable=True),

        # Response info
        sa.Column('response_status', sa.Integer(), nullable=False, server_default='200'),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Client info
        sa.Column('ip_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('user_agent', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Cost tracking
        sa.Column('cost_tokens', sa.Integer(), nullable=False, server_default='1'),

        # Timestamp
        sa.Column('created_at', sa.DateTime(), nullable=False),

        # Billing link
        sa.Column('billing_transaction_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id'),
    )

    # Indexes for common queries
    op.create_index('ix_activity_logs_tenant_id', 'activity_logs', ['tenant_id'])
    op.create_index('ix_activity_logs_user_id', 'activity_logs', ['user_id'])
    op.create_index('ix_activity_logs_created_at', 'activity_logs', ['created_at'])
    op.create_index('ix_activity_logs_action', 'activity_logs', ['action'])
    op.create_index('ix_activity_logs_module', 'activity_logs', ['module'])
    op.create_index('ix_activity_logs_resource_type', 'activity_logs', ['resource_type'])
    op.create_index('ix_activity_logs_resource_id', 'activity_logs', ['resource_id'])
    op.create_index('ix_activity_logs_ip_address', 'activity_logs', ['ip_address'])
    op.create_index('ix_activity_logs_cost_tokens', 'activity_logs', ['cost_tokens'])

    # Composite indexes for common query patterns
    op.create_index(
        'ix_activity_logs_tenant_date',
        'activity_logs',
        ['tenant_id', 'created_at']
    )
    op.create_index(
        'ix_activity_logs_tenant_user_date',
        'activity_logs',
        ['tenant_id', 'user_id', 'created_at']
    )

    # ActionCost configuration table
    op.create_table('action_costs',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.Column('module', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('resource_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('action', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('cost_tokens', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),

        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index('ix_action_costs_module', 'action_costs', ['module'])
    op.create_index('ix_action_costs_resource_type', 'action_costs', ['resource_type'])
    op.create_index('ix_action_costs_action', 'action_costs', ['action'])

    # Unique constraint on module + resource_type + action
    op.create_index(
        'ix_action_costs_unique',
        'action_costs',
        ['module', 'resource_type', 'action'],
        unique=True
    )


def downgrade() -> None:
    op.drop_table('action_costs')
    op.drop_table('activity_logs')
