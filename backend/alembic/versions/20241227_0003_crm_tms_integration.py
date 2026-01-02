"""CRM - TMS Integration Fields and Activity Logs

Revision ID: 20241227_0003
Revises: 006
Create Date: 2024-12-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Add TMS integration fields to crm_accounts
    op.add_column('crm_accounts', sa.Column('tms_customer_id', sa.String(36), nullable=True))
    op.add_column('crm_accounts', sa.Column('synced_to_tms', sa.Boolean, default=False, nullable=True))
    op.add_column('crm_accounts', sa.Column('synced_at', sa.String(50), nullable=True))

    # Create index for tms_customer_id
    op.create_index('ix_crm_accounts_tms_customer_id', 'crm_accounts', ['tms_customer_id'])

    # Create Activity Logs table
    op.create_table('crm_activity_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Entity reference
        sa.Column('entity_type', sa.String(50), nullable=False, index=True),
        sa.Column('entity_id', sa.String(36), nullable=False, index=True),
        sa.Column('entity_code', sa.String(100), nullable=True),
        sa.Column('entity_name', sa.String(255), nullable=True),

        # Action
        sa.Column('action', sa.String(50), nullable=False, index=True),
        sa.Column('action_label', sa.String(255), nullable=True),

        # Changes
        sa.Column('old_values', sa.Text, nullable=True),
        sa.Column('new_values', sa.Text, nullable=True),
        sa.Column('changed_fields', sa.Text, nullable=True),

        # Description
        sa.Column('description', sa.Text, nullable=True),

        # Related entities
        sa.Column('related_entity_type', sa.String(50), nullable=True),
        sa.Column('related_entity_id', sa.String(36), nullable=True),

        # User
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_name', sa.String(255), nullable=True),

        # Audit
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create composite index for entity lookup
    op.create_index('ix_crm_activity_logs_entity', 'crm_activity_logs', ['entity_type', 'entity_id'])


def downgrade():
    # Drop activity logs table
    op.drop_index('ix_crm_activity_logs_entity', 'crm_activity_logs')
    op.drop_table('crm_activity_logs')

    # Remove index
    op.drop_index('ix_crm_accounts_tms_customer_id', 'crm_accounts')

    # Remove columns
    op.drop_column('crm_accounts', 'synced_at')
    op.drop_column('crm_accounts', 'synced_to_tms')
    op.drop_column('crm_accounts', 'tms_customer_id')
