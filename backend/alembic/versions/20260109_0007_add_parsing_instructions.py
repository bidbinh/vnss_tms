"""Add customer parsing instructions table

Revision ID: 20260109_0007
Revises: 20260109_0006
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260109_0007'
down_revision = '20260109_0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create parsing instructions table
    op.create_table(
        'fms_parsing_instructions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Matching criteria
        sa.Column('name', sa.String(255), nullable=False),  # Display name for this instruction set
        sa.Column('shipper_pattern', sa.String(255), nullable=True),  # Pattern to match: "CHUNQIU*", "HONGBO*"
        sa.Column('shipper_keywords', sa.Text, nullable=True),  # JSON array of keywords to match
        sa.Column('customer_id', sa.String(36), nullable=True, index=True),  # Link to specific customer

        # Instructions content
        sa.Column('instructions', sa.Text, nullable=False),  # Main instruction text in Vietnamese
        sa.Column('field_mappings', sa.Text, nullable=True),  # JSON: {"Consignee": "exporter", "Ship To": "importer"}
        sa.Column('data_source_priority', sa.Text, nullable=True),  # JSON: {"address": ["BL", "Invoice"], "container": ["Arrival", "BL"]}
        sa.Column('value_transforms', sa.Text, nullable=True),  # JSON: {"company_name": {"CHUNQIU INT'L": "HONGKONG CHUNQIU..."}}

        # Examples for better AI understanding
        sa.Column('examples', sa.Text, nullable=True),  # JSON array of input/output examples

        # Status & tracking
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('priority', sa.Integer, default=0),  # Higher = checked first
        sa.Column('times_applied', sa.Integer, default=0),
        sa.Column('last_applied_at', sa.DateTime, nullable=True),

        # Audit
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )

    # Create index for pattern matching
    op.create_index(
        'ix_fms_parsing_instructions_pattern',
        'fms_parsing_instructions',
        ['tenant_id', 'shipper_pattern', 'is_active']
    )


def downgrade() -> None:
    op.drop_index('ix_fms_parsing_instructions_pattern')
    op.drop_table('fms_parsing_instructions')
