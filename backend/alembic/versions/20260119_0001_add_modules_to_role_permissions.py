"""Add modules_json column to role_permissions table

Revision ID: 20260119_0001
Revises: 20260118_0002_add_tms_automation_fields_priority2
Create Date: 2026-01-19

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260119_0001'
down_revision = '20260118_0002_add_tms_automation_fields_priority2'
branch_labels = None
depends_on = None


def upgrade():
    # Add modules_json column to role_permissions table
    # This stores which top-level app modules the role can access (e.g., ["tms", "crm"])
    # Empty array means all modules (backward compatibility)
    op.add_column('role_permissions',
        sa.Column('modules_json', sa.String(length=500), nullable=True, server_default='[]')
    )


def downgrade():
    op.drop_column('role_permissions', 'modules_json')
