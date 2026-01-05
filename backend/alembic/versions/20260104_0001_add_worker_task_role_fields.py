"""Add role_used to worker_tasks and roles_json to worker_tenant_access

Revision ID: add_worker_task_role_fields
Revises: add_external_driver_availability
Create Date: 2026-01-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_worker_task_role_fields'
down_revision = 'add_external_driver_availability'
branch_labels = None
depends_on = None


def upgrade():
    # Add role_used to worker_tasks table
    op.add_column('worker_tasks', sa.Column('role_used', sa.String(), nullable=True))

    # Set default value for existing records
    op.execute("UPDATE worker_tasks SET role_used = 'DRIVER' WHERE role_used IS NULL")

    # Add roles_json to worker_tenant_access table
    op.add_column('worker_tenant_access', sa.Column('roles_json', sa.String(), nullable=True))

    # Initialize roles_json from existing role field
    op.execute("UPDATE worker_tenant_access SET roles_json = '[\"' || role || '\"]' WHERE roles_json IS NULL")

    # Create index for role_used
    op.create_index(op.f('ix_worker_tasks_role_used'), 'worker_tasks', ['role_used'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_worker_tasks_role_used'), table_name='worker_tasks')
    op.drop_column('worker_tasks', 'role_used')
    op.drop_column('worker_tenant_access', 'roles_json')
