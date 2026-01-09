"""Add tags_json column to user_tasks table

Revision ID: add_user_task_tags
Revises: seed_user_tasks_sample
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_user_task_tags'
down_revision = 'seed_user_tasks_sample'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('user_tasks', sa.Column('tags_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_tasks', 'tags_json')
