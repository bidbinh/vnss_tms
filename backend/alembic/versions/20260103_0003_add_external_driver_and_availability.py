"""Add external driver fields and availability tables

Revision ID: add_external_driver_availability
Revises: add_worker_workspace_tables
Create Date: 2026-01-03 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_external_driver_availability'
down_revision: Union[str, None] = 'add_worker_workspace'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add external worker fields to drivers table
    op.add_column('drivers', sa.Column('source', sa.String(20), nullable=True, server_default='INTERNAL'))
    op.add_column('drivers', sa.Column('external_worker_id', sa.String(36), nullable=True))
    op.add_column('drivers', sa.Column('external_worker_username', sa.String(100), nullable=True))

    # Create indexes
    op.create_index('ix_drivers_source', 'drivers', ['source'])
    op.create_index('ix_drivers_external_worker_id', 'drivers', ['external_worker_id'])

    # Create driver_availability table
    op.create_table(
        'driver_availability',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('worker_id', sa.String(36), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('availability_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='AVAILABLE'),
        sa.Column('task_id', sa.String(36), nullable=True),
        sa.Column('order_id', sa.String(36), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('recurrence_type', sa.String(20), nullable=False, server_default='NONE'),
        sa.Column('recurrence_end_date', sa.Date(), nullable=True),
        sa.Column('parent_availability_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_driver_availability_worker_id', 'driver_availability', ['worker_id'])
    op.create_index('ix_driver_availability_tenant_id', 'driver_availability', ['tenant_id'])
    op.create_index('ix_driver_availability_date', 'driver_availability', ['availability_date'])
    op.create_index('ix_driver_availability_status', 'driver_availability', ['status'])
    op.create_index('ix_driver_availability_task_id', 'driver_availability', ['task_id'])
    op.create_index('ix_driver_availability_order_id', 'driver_availability', ['order_id'])

    # Create driver_availability_templates table
    op.create_table(
        'driver_availability_templates',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('worker_id', sa.String(36), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_driver_availability_templates_worker_id', 'driver_availability_templates', ['worker_id'])
    op.create_index('ix_driver_availability_templates_tenant_id', 'driver_availability_templates', ['tenant_id'])


def downgrade() -> None:
    # Drop availability tables
    op.drop_table('driver_availability_templates')
    op.drop_table('driver_availability')

    # Drop driver external fields
    op.drop_index('ix_drivers_external_worker_id', 'drivers')
    op.drop_index('ix_drivers_source', 'drivers')
    op.drop_column('drivers', 'external_worker_username')
    op.drop_column('drivers', 'external_worker_id')
    op.drop_column('drivers', 'source')
