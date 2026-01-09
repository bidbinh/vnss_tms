"""Add customs partners tables (Exporters, Importers, Locations)

Revision ID: 20260109_0004
Revises: 20260109_0003
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260109_0004'
down_revision = '20260109_0003'
branch_labels = None
depends_on = None


def upgrade():
    # Exporters table
    op.create_table(
        'fms_customs_exporters',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('seq_no', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(500), nullable=False, index=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('address_line_1', sa.String(500), nullable=True),
        sa.Column('address_line_2', sa.String(500), nullable=True),
        sa.Column('address_line_3', sa.String(500), nullable=True),
        sa.Column('address_line_4', sa.String(500), nullable=True),
        sa.Column('country_code', sa.String(10), nullable=True),
        sa.Column('tax_code', sa.String(50), nullable=True),
        sa.Column('contact_name', sa.String(200), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )

    # Importers table
    op.create_table(
        'fms_customs_importers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('seq_no', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(500), nullable=False, index=True),
        sa.Column('postal_code', sa.String(20), nullable=True),
        sa.Column('tax_code', sa.String(50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address_line_3', sa.String(500), nullable=True),
        sa.Column('address_line_4', sa.String(500), nullable=True),
        sa.Column('contact_name', sa.String(200), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('fax', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )

    # Locations table
    op.create_table(
        'fms_customs_locations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('seq_no', sa.Integer(), nullable=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('location_type', sa.String(100), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('province', sa.String(100), nullable=True),
        sa.Column('country_code', sa.String(10), nullable=True),
        sa.Column('customs_office_code', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )


def downgrade():
    op.drop_table('fms_customs_locations')
    op.drop_table('fms_customs_importers')
    op.drop_table('fms_customs_exporters')
