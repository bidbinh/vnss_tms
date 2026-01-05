"""Add HRM Name Card tables

Revision ID: 20260102_0001
Revises: 20260101_0003_add_vehicle_operating_cost_tables
Create Date: 2026-01-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_hrm_namecard_tables'
down_revision = 'add_vehicle_cost_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create hrm_employee_namecards table
    op.create_table(
        'hrm_employee_namecards',
        sa.Column('id', sa.String(36), nullable=False, primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('employee_id', sa.String(36), sa.ForeignKey('hrm_employees.id'), nullable=False, index=True, unique=True),
        sa.Column('token', sa.String(50), nullable=False, index=True, unique=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, index=True),
        sa.Column('show_phone', sa.Boolean(), nullable=False, default=True),
        sa.Column('show_email', sa.Boolean(), nullable=False, default=True),
        sa.Column('show_department', sa.Boolean(), nullable=False, default=True),
        sa.Column('show_position', sa.Boolean(), nullable=False, default=True),
        sa.Column('show_avatar', sa.Boolean(), nullable=False, default=True),
        sa.Column('custom_theme', sa.String(50), nullable=True),
        sa.Column('qr_code_url', sa.String(500), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=False, default=0),
        sa.Column('last_viewed_at', sa.DateTime(), nullable=True),
        sa.Column('token_generated_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    # Create hrm_namecard_templates table
    op.create_table(
        'hrm_namecard_templates',
        sa.Column('id', sa.String(36), nullable=False, primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False, index=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('primary_color', sa.String(20), nullable=False, default='#1a1a1a'),
        sa.Column('secondary_color', sa.String(20), nullable=False, default='#4a5568'),
        sa.Column('accent_color', sa.String(20), nullable=False, default='#3b82f6'),
        sa.Column('background_color', sa.String(20), nullable=False, default='#ffffff'),
        sa.Column('text_color', sa.String(20), nullable=False, default='#1a1a1a'),
        sa.Column('layout', sa.String(50), nullable=False, default='modern'),
        sa.Column('show_company_logo', sa.Boolean(), nullable=False, default=True),
        sa.Column('show_qr_code', sa.Boolean(), nullable=False, default=True),
        sa.Column('company_tagline', sa.String(255), nullable=True),
        sa.Column('company_website', sa.String(255), nullable=True),
        sa.Column('custom_css', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('hrm_namecard_templates')
    op.drop_table('hrm_employee_namecards')
