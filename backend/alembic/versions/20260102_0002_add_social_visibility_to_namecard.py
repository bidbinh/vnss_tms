"""add_social_visibility_to_namecard

Revision ID: add_social_visibility
Revises: 49836f89b50a
Create Date: 2026-01-02 13:15:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_social_visibility'
down_revision: Union[str, None] = '49836f89b50a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add social visibility columns to hrm_employee_namecards table
    op.add_column('hrm_employee_namecards', sa.Column('show_zalo', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('hrm_employee_namecards', sa.Column('show_facebook', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('hrm_employee_namecards', sa.Column('show_linkedin', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('hrm_employee_namecards', sa.Column('show_website', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove social visibility columns
    op.drop_column('hrm_employee_namecards', 'show_website')
    op.drop_column('hrm_employee_namecards', 'show_linkedin')
    op.drop_column('hrm_employee_namecards', 'show_facebook')
    op.drop_column('hrm_employee_namecards', 'show_zalo')
