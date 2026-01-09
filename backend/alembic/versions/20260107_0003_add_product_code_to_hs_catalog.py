"""Add product_code column to fms_hs_code_catalog table

Revision ID: 20260107_0003
Revises: 20260107_0002_add_supplier_code
Create Date: 2026-01-07

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260107_0003'
down_revision = 'add_supplier_code'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add product_code column to fms_hs_code_catalog
    op.add_column('fms_hs_code_catalog', sa.Column('product_code', sa.String(), nullable=True))
    op.create_index('ix_fms_hs_code_catalog_product_code', 'fms_hs_code_catalog', ['product_code'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_fms_hs_code_catalog_product_code', table_name='fms_hs_code_catalog')
    op.drop_column('fms_hs_code_catalog', 'product_code')
