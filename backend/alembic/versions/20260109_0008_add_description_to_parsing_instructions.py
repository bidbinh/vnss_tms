"""Add description column to parsing instructions

Revision ID: 20260109_0008
Revises: 20260109_0007
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260109_0008'
down_revision = '20260109_0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add description column
    op.add_column(
        'fms_parsing_instructions',
        sa.Column('description', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('fms_parsing_instructions', 'description')
