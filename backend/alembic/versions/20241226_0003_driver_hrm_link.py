"""Add employee_id to drivers table for HRM link

Revision ID: 004
Revises: 003
Create Date: 2024-12-26

This migration adds:
- employee_id column to drivers table (FK to hrm_employees)
- Establishes bidirectional link: drivers.employee_id <-> hrm_employees.driver_id
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add employee_id to drivers table
    op.add_column('drivers', sa.Column('employee_id', sa.String(length=36), nullable=True))

    # Create index for fast lookup
    op.create_index('ix_drivers_employee_id', 'drivers', ['employee_id'])

    # Create foreign key constraint
    op.create_foreign_key(
        'fk_drivers_employee_id',
        'drivers',
        'hrm_employees',
        ['employee_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop foreign key first
    op.drop_constraint('fk_drivers_employee_id', 'drivers', type_='foreignkey')

    # Drop index
    op.drop_index('ix_drivers_employee_id', table_name='drivers')

    # Drop column
    op.drop_column('drivers', 'employee_id')
