"""Add supplier_code to fms_hs_codes

Revision ID: add_supplier_code
Revises: add_customs_master_data
Create Date: 2026-01-07 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_supplier_code'
down_revision: Union[str, None] = 'add_customs_master_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add supplier_code column to fms_hs_codes table
    # supplier_code = Supplier PN / Model (mã nhà cung cấp/xuất khẩu)
    op.add_column(
        'fms_hs_codes',
        sa.Column('supplier_code', sa.String(100), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('fms_hs_codes', 'supplier_code')
