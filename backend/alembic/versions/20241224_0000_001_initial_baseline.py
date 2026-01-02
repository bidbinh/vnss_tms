"""Initial baseline - mark existing database as migrated

Revision ID: 001
Revises:
Create Date: 2024-12-24

This is a baseline migration that marks the existing database schema.
It doesn't make any changes - just establishes a starting point for future migrations.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a baseline migration
    # The database schema already exists, so we don't need to create anything
    # This just marks the starting point for future migrations
    pass


def downgrade() -> None:
    # Cannot downgrade from baseline
    pass
