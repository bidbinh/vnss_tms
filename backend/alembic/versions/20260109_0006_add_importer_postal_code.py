"""Add importer_postal_code to customs_declarations

Revision ID: 20260109_0006
Revises: 20260109_0005
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260109_0006'
down_revision = '20260109_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add importer_postal_code column
    op.add_column(
        'fms_customs_declarations',
        sa.Column('importer_postal_code', sa.String(20), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('fms_customs_declarations', 'importer_postal_code')
