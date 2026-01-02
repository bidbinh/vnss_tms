"""add_workflow_trigger_condition_fields

Revision ID: f0c9a258929f
Revises: 53f0e73b128a
Create Date: 2025-12-28 10:39:48.685272+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0c9a258929f'
down_revision: Union[str, None] = '53f0e73b128a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add trigger_condition and trigger_priority to wf_definitions
    op.add_column('wf_definitions', sa.Column('trigger_condition', sa.Text(), nullable=True))
    op.add_column('wf_definitions', sa.Column('trigger_priority', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('wf_definitions', 'trigger_priority')
    op.drop_column('wf_definitions', 'trigger_condition')
