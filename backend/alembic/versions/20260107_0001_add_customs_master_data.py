"""Add customs master data tables

Revision ID: add_customs_master_data
Revises: add_user_task_tags
Create Date: 2026-01-07 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'add_customs_master_data'
down_revision: Union[str, None] = 'add_user_task_tags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # FMS Countries - Danh muc quoc gia
    # ============================================================
    op.create_table('fms_countries',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Country code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=2), nullable=False),
        sa.Column('code_alpha3', sqlmodel.sql.sqltypes.AutoString(length=3), nullable=True),

        # Names
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_vi', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('name_local', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Additional info
        sa.Column('region', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('currency_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('phone_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Customs specific
        sa.Column('customs_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_fta_partner', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('fta_codes', sa.Text(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_countries_tenant_id', 'fms_countries', ['tenant_id'])
    op.create_index('ix_fms_countries_code', 'fms_countries', ['code'])

    # ============================================================
    # FMS Ports - Danh muc cang va dia diem
    # ============================================================
    op.create_table('fms_ports',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Port code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column('country_code', sqlmodel.sql.sqltypes.AutoString(length=2), nullable=False),

        # Names
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_vi', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('name_local', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Type
        sa.Column('port_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='SEAPORT'),

        # Location
        sa.Column('city', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('province', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),

        # Customs specific
        sa.Column('customs_office_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_customs_clearance', sa.Boolean(), nullable=False, server_default='true'),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_ports_tenant_id', 'fms_ports', ['tenant_id'])
    op.create_index('ix_fms_ports_code', 'fms_ports', ['code'])

    # ============================================================
    # FMS Customs Offices - Danh muc chi cuc hai quan
    # ============================================================
    op.create_table('fms_customs_offices',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Office code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('parent_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Names
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_short', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Type/Level
        sa.Column('office_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('level', sa.Integer(), nullable=False, server_default='2'),

        # Location
        sa.Column('province', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('fax', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Ports managed
        sa.Column('managed_ports', sa.Text(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_customs_offices_tenant_id', 'fms_customs_offices', ['tenant_id'])
    op.create_index('ix_fms_customs_offices_code', 'fms_customs_offices', ['code'])

    # ============================================================
    # FMS HS Code Catalog - Bieu thue hang hoa
    # ============================================================
    op.create_table('fms_hs_code_catalog',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # HS Code
        sa.Column('hs_code', sqlmodel.sql.sqltypes.AutoString(length=12), nullable=False),
        sa.Column('hs_code_parent', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Description
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('description_vi', sa.Text(), nullable=False),

        # Unit
        sa.Column('unit_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('unit_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('unit_code_2', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('unit_name_2', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Tax rates
        sa.Column('import_duty_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('preferential_rate', sa.Float(), nullable=True),
        sa.Column('vat_rate', sa.Float(), nullable=False, server_default='10'),
        sa.Column('special_consumption_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('environmental_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('export_duty_rate', sa.Float(), nullable=False, server_default='0'),

        # FTA rates
        sa.Column('acfta_rate', sa.Float(), nullable=True),
        sa.Column('akfta_rate', sa.Float(), nullable=True),
        sa.Column('ajcep_rate', sa.Float(), nullable=True),
        sa.Column('vkfta_rate', sa.Float(), nullable=True),
        sa.Column('evfta_rate', sa.Float(), nullable=True),
        sa.Column('cptpp_rate', sa.Float(), nullable=True),
        sa.Column('rcep_rate', sa.Float(), nullable=True),

        # Regulations
        sa.Column('requires_license', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('requires_inspection', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('inspection_agency', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('special_notes', sa.Text(), nullable=True),

        # Classification
        sa.Column('chapter', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('heading', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('subheading', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Validity
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_to', sa.DateTime(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_hs_code_catalog_tenant_id', 'fms_hs_code_catalog', ['tenant_id'])
    op.create_index('ix_fms_hs_code_catalog_hs_code', 'fms_hs_code_catalog', ['hs_code'])

    # ============================================================
    # FMS Currencies - Danh muc tien te
    # ============================================================
    op.create_table('fms_currencies',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Currency code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=3), nullable=False),
        sa.Column('numeric_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Names
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_vi', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('symbol', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Exchange rate
        sa.Column('exchange_rate', sa.Float(), nullable=True),
        sa.Column('rate_date', sa.DateTime(), nullable=True),

        # Decimal places
        sa.Column('decimal_places', sa.Integer(), nullable=False, server_default='2'),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_currencies_tenant_id', 'fms_currencies', ['tenant_id'])
    op.create_index('ix_fms_currencies_code', 'fms_currencies', ['code'])

    # ============================================================
    # FMS Units of Measure - Danh muc don vi tinh
    # ============================================================
    op.create_table('fms_units',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Unit code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=5), nullable=False),

        # Names
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_vi', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('symbol', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Category
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Conversion
        sa.Column('base_unit', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('conversion_factor', sa.Float(), nullable=False, server_default='1'),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_units_tenant_id', 'fms_units', ['tenant_id'])
    op.create_index('ix_fms_units_code', 'fms_units', ['code'])

    # ============================================================
    # FMS Declaration Types - Ma loai hinh to khai
    # ============================================================
    op.create_table('fms_declaration_types',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Type code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),

        # Names
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),

        # Category
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('sub_category', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Regulations
        sa.Column('requires_license', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('requires_co', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('special_handling', sa.Text(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_declaration_types_tenant_id', 'fms_declaration_types', ['tenant_id'])
    op.create_index('ix_fms_declaration_types_code', 'fms_declaration_types', ['code'])

    # ============================================================
    # FMS Exemption Codes - Ma mien giam thue
    # ============================================================
    op.create_table('fms_exemption_codes',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Exemption code
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),

        # Names
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name_en', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),

        # Type
        sa.Column('exemption_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Legal basis
        sa.Column('legal_reference', sa.Text(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fms_exemption_codes_tenant_id', 'fms_exemption_codes', ['tenant_id'])
    op.create_index('ix_fms_exemption_codes_code', 'fms_exemption_codes', ['code'])


def downgrade() -> None:
    op.drop_table('fms_exemption_codes')
    op.drop_table('fms_declaration_types')
    op.drop_table('fms_units')
    op.drop_table('fms_currencies')
    op.drop_table('fms_hs_code_catalog')
    op.drop_table('fms_customs_offices')
    op.drop_table('fms_ports')
    op.drop_table('fms_countries')
