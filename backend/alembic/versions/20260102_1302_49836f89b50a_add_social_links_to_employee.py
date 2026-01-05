"""add_social_links_to_employee

Revision ID: 49836f89b50a
Revises: add_hrm_namecard_tables
Create Date: 2026-01-02 13:02:49.956874+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '49836f89b50a'
down_revision: Union[str, None] = 'add_hrm_namecard_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add social links columns to hrm_employees table
    op.add_column('hrm_employees', sa.Column('zalo_phone', sa.String(20), nullable=True))
    op.add_column('hrm_employees', sa.Column('facebook_url', sa.String(500), nullable=True))
    op.add_column('hrm_employees', sa.Column('linkedin_url', sa.String(500), nullable=True))
    op.add_column('hrm_employees', sa.Column('website_url', sa.String(500), nullable=True))


def downgrade() -> None:
    # Remove social links columns
    op.drop_column('hrm_employees', 'website_url')
    op.drop_column('hrm_employees', 'linkedin_url')
    op.drop_column('hrm_employees', 'facebook_url')
    op.drop_column('hrm_employees', 'zalo_phone')
