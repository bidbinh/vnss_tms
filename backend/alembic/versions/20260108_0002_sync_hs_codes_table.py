"""Sync HS codes table with model - add missing columns

Revision ID: 20260108_0002
Revises: 20260108_0001
Create Date: 2026-01-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20260108_0002'
down_revision = '20260108_0001'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if column exists in table"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Add missing columns to fms_hs_codes table"""

    # All columns that should exist in fms_hs_codes based on model
    hs_columns = [
        # Basic fields
        ('shipment_id', sa.String(50)),
        ('item_no', sa.Integer()),
        ('hs_code', sa.String(20)),
        ('hs_description', sa.Text()),

        # Product info
        ('product_name', sa.Text()),
        ('product_code', sa.String(100)),
        ('supplier_code', sa.String(100)),
        ('product_specification', sa.Text()),
        ('brand', sa.String(100)),
        ('model', sa.String(100)),
        ('serial_lot_no', sa.String(100)),

        # Dates
        ('manufacturing_date', sa.Date()),
        ('expiry_date', sa.Date()),

        # Origin
        ('country_of_origin', sa.String(5)),
        ('origin_criteria', sa.String(20)),

        # Quantity
        ('quantity', sa.Float()),
        ('unit', sa.String(20)),
        ('unit_code', sa.String(10)),
        ('quantity_2', sa.Float()),
        ('unit_2', sa.String(20)),
        ('unit_2_code', sa.String(10)),

        # Weight
        ('gross_weight', sa.Float()),
        ('net_weight', sa.Float()),

        # Value
        ('unit_price', sa.Float()),
        ('currency_code', sa.String(5)),
        ('total_value', sa.Float()),
        ('customs_value', sa.Float()),

        # Tax rates
        ('import_duty_rate', sa.Float()),
        ('preferential_rate', sa.Float()),
        ('special_preferential_rate', sa.Float()),
        ('applied_rate', sa.Float()),
        ('vat_rate', sa.Float()),
        ('special_consumption_rate', sa.Float()),
        ('environmental_rate', sa.Float()),

        # Tax amounts
        ('import_duty_amount', sa.Float()),
        ('vat_amount', sa.Float()),
        ('special_consumption_amount', sa.Float()),
        ('environmental_amount', sa.Float()),
        ('total_tax_amount', sa.Float()),

        # Exemption
        ('exemption_code', sa.String(20)),
        ('exemption_amount', sa.Float()),
        ('legal_document', sa.String(200)),

        # FTA / C/O
        ('preferential_code', sa.String(20)),
        ('co_form', sa.String(20)),
        ('co_no_line', sa.String(50)),

        # License
        ('license_no', sa.String(50)),
        ('license_date', sa.Date()),
        ('license_issuer', sa.String(200)),
        ('license_expiry', sa.Date()),

        # Notes
        ('notes', sa.Text()),

        # Audit
        ('created_at', sa.DateTime()),
        ('updated_at', sa.DateTime()),
        ('created_by', sa.String(50)),
    ]

    for col_name, col_type in hs_columns:
        if not column_exists('fms_hs_codes', col_name):
            op.add_column('fms_hs_codes', sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    """Remove added columns - be careful, this removes data"""
    # Only remove columns that were added by this migration
    # We won't remove core columns like id, tenant_id, declaration_id
    columns_to_drop = [
        'shipment_id', 'product_specification', 'origin_criteria',
        'unit_code', 'unit_2_code', 'currency_code',
        'preferential_rate', 'special_preferential_rate', 'applied_rate',
        'environmental_rate', 'environmental_amount',
        'legal_document', 'preferential_code', 'co_form', 'co_no_line',
        'license_no', 'license_date', 'license_issuer',
        'created_by'
    ]

    for col in columns_to_drop:
        if column_exists('fms_hs_codes', col):
            op.drop_column('fms_hs_codes', col)
