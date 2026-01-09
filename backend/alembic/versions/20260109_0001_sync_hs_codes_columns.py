"""Sync fms_hs_codes columns with model

Revision ID: 20260109_0001
Revises: 20260108_0002
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20260109_0001'
down_revision = '20260108_0002'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if column exists in table"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def add_column_if_not_exists(table_name, column):
    """Add column if it doesn't exist"""
    if not column_exists(table_name, column.name):
        op.add_column(table_name, column)
        print(f"Added column {column.name} to {table_name}")
    else:
        print(f"Column {column.name} already exists in {table_name}")


def upgrade():
    # Add missing columns
    add_column_if_not_exists('fms_hs_codes', sa.Column('hs_description', sa.Text(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('product_name', sa.Text(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('country_of_origin', sa.String(10), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('quantity_2', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('unit_2', sa.String(20), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('import_duty_rate', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('import_duty_amount', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('special_consumption_rate', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('special_consumption_amount', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('total_tax_amount', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('customs_value', sa.Float(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('notes', sa.Text(), nullable=True))
    add_column_if_not_exists('fms_hs_codes', sa.Column('updated_at', sa.DateTime(), nullable=True))

    # Copy data from old columns to new columns
    op.execute("""
        UPDATE fms_hs_codes SET
            hs_description = COALESCE(hs_description, description),
            product_name = COALESCE(product_name, description),
            country_of_origin = COALESCE(country_of_origin, origin_country),
            import_duty_rate = COALESCE(import_duty_rate, duty_rate, 0),
            import_duty_amount = COALESCE(import_duty_amount, duty_amount, 0),
            special_consumption_rate = COALESCE(special_consumption_rate, sct_rate, 0),
            special_consumption_amount = COALESCE(special_consumption_amount, sct_amount, 0),
            total_tax_amount = COALESCE(total_tax_amount, COALESCE(duty_amount, 0) + COALESCE(vat_amount, 0) + COALESCE(sct_amount, 0)),
            customs_value = COALESCE(customs_value, total_value, 0),
            notes = COALESCE(notes, remarks),
            updated_at = COALESCE(updated_at, created_at)
    """)


def downgrade():
    # We don't drop columns on downgrade to avoid data loss
    pass
