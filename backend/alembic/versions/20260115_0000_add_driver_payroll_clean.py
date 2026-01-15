"""Add driver_payroll table (clean version)

Revision ID: 20260115_0000
Revises: 20260109_0008
Create Date: 2026-01-15 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260115_0000'
down_revision: Union[str, None] = '20260109_0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create driver_payroll table only
    op.create_table('driver_payroll',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('driver_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('month', sa.Integer(), nullable=False),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('workflow_instance_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('trip_snapshot', sa.JSON(), nullable=True),
    sa.Column('adjustments', sa.JSON(), nullable=True),
    sa.Column('total_trips', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('total_distance_km', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('total_trip_salary', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('total_adjustments', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('total_bonuses', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('total_deductions', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('net_salary', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('created_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('submitted_at', sa.DateTime(), nullable=True),
    sa.Column('confirmed_by_driver_at', sa.DateTime(), nullable=True),
    sa.Column('confirmed_by_hr_at', sa.DateTime(), nullable=True),
    sa.Column('paid_at', sa.DateTime(), nullable=True),
    sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
    sa.Column('driver_notes', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
    sa.Column('hr_notes', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
    # Note: workflow_instance_id FK removed due to permission issues - can be added later
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'driver_id', 'year', 'month', name='uq_driver_payroll_period')
    )
    op.create_index(op.f('ix_driver_payroll_created_by_id'), 'driver_payroll', ['created_by_id'], unique=False)
    op.create_index(op.f('ix_driver_payroll_driver_id'), 'driver_payroll', ['driver_id'], unique=False)
    op.create_index(op.f('ix_driver_payroll_id'), 'driver_payroll', ['id'], unique=False)
    op.create_index(op.f('ix_driver_payroll_month'), 'driver_payroll', ['month'], unique=False)
    op.create_index(op.f('ix_driver_payroll_status'), 'driver_payroll', ['status'], unique=False)
    op.create_index(op.f('ix_driver_payroll_tenant_id'), 'driver_payroll', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_driver_payroll_workflow_instance_id'), 'driver_payroll', ['workflow_instance_id'], unique=False)
    op.create_index(op.f('ix_driver_payroll_year'), 'driver_payroll', ['year'], unique=False)


def downgrade() -> None:
    # Drop driver_payroll table
    op.drop_index(op.f('ix_driver_payroll_year'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_workflow_instance_id'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_tenant_id'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_status'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_month'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_id'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_driver_id'), table_name='driver_payroll')
    op.drop_index(op.f('ix_driver_payroll_created_by_id'), table_name='driver_payroll')
    op.drop_table('driver_payroll')
