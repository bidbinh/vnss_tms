"""Add VNACCS fields to customs declarations and HS codes

Revision ID: 20260108_0001
Revises: 20260107_0003
Create Date: 2026-01-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '20260108_0001'
down_revision = '20260107_0003'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if column exists in table"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def index_exists(table_name, index_name):
    """Check if index exists"""
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
    return index_name in indexes


def upgrade() -> None:
    # === CUSTOMS DECLARATIONS - Add VNACCS fields ===

    customs_columns = [
        # Declaration info
        ('declaration_type_code', sa.String(10)),
        ('first_declaration_no', sa.String(15)),
        ('transaction_code', sa.String(10)),
        ('amendment_count', sa.Integer()),
        ('tax_registration_code', sa.String(5)),
        ('registration_time', sa.DateTime()),
        ('reference_no', sa.String(50)),

        # Customs office
        ('customs_sub_dept', sa.String(100)),
        ('check_result', sa.String(500)),

        # Declarant
        ('declarant_code', sa.String(15)),
        ('declarant_address', sa.String(500)),
        ('declarant_phone', sa.String(20)),
        ('declarant_email', sa.String(100)),

        # Trader
        ('importer_code', sa.String(15)),
        ('trader_phone', sa.String(20)),
        ('trader_fax', sa.String(20)),

        # Broker
        ('broker_name', sa.String(200)),
        ('broker_code', sa.String(20)),
        ('broker_tax_code', sa.String(20)),

        # Foreign partner
        ('foreign_partner_address', sa.String(500)),
        ('foreign_partner_country', sa.String(2)),

        # Contract/PO
        ('po_no', sa.String(50)),
        ('po_date', sa.Date()),

        # Payment
        ('payment_terms', sa.String(500)),
        ('lc_no', sa.String(50)),
        ('lc_date', sa.Date()),
        ('lc_bank', sa.String(200)),

        # Transport
        ('mbl_no', sa.String(50)),
        ('hbl_no', sa.String(50)),
        ('awb_no', sa.String(50)),
        ('flight_no', sa.String(20)),
        ('eta_date', sa.Date()),
        ('departure_date', sa.Date()),

        # Ports/Gates
        ('entry_gate_code', sa.String(10)),
        ('exit_gate_code', sa.String(10)),

        # Warehouse
        ('warehouse_code', sa.String(20)),
        ('warehouse_name', sa.String(200)),
        ('unloading_place_code', sa.String(20)),
        ('unloading_place', sa.String(200)),

        # Incoterms
        ('incoterms_place', sa.String(200)),

        # Valuation
        ('valuation_method', sa.String(5)),
        ('price_condition_code', sa.String(10)),
        ('commission_value', sa.Float()),
        ('brokerage_value', sa.Float()),
        ('packing_cost', sa.Float()),
        ('total_value_foreign', sa.Float()),
        ('total_value_vnd', sa.Float()),

        # Cargo summary
        ('total_items', sa.Integer()),
        ('representative_hs_code', sa.String(4)),
        ('goods_description', sa.String(1000)),
        ('container_type', sa.String(20)),

        # Tax
        ('import_duty_payable', sa.Float()),
        ('import_duty_exempted', sa.Float()),
        ('vat_payable', sa.Float()),
        ('vat_exempted', sa.Float()),
        ('exemption_code', sa.String(10)),
        ('tax_payment_deadline', sa.Date()),
        ('tax_payment_date', sa.Date()),
        ('tax_receipt_no', sa.String(50)),

        # Release
        ('release_by', sa.String(100)),

        # E-Manifest
        ('emanifest_no', sa.String(50)),
        ('emanifest_date', sa.DateTime()),

        # C/O
        ('co_no', sa.String(50)),
        ('co_form', sa.String(20)),
        ('co_date', sa.Date()),
        ('co_issuing_country', sa.String(2)),

        # License
        ('import_license_no', sa.String(50)),
        ('import_license_date', sa.Date()),
        ('import_license_issuer', sa.String(200)),
        ('import_license_expiry', sa.Date()),
        ('inspection_cert_no', sa.String(50)),
        ('inspection_cert_date', sa.Date()),

        # Attachments
        ('attached_documents', sa.Text()),
        ('hs_codes_summary', sa.Text()),

        # Notes
        ('notes', sa.Text()),
        ('customs_notes', sa.Text()),
        ('declaration_file', sa.String(500)),

        # ECUS Sync
        ('ecus_synced', sa.Boolean()),
        ('ecus_sync_date', sa.DateTime()),
        ('ecus_declaration_id', sa.String(50)),
    ]

    for col_name, col_type in customs_columns:
        if not column_exists('fms_customs_declarations', col_name):
            op.add_column('fms_customs_declarations', sa.Column(col_name, col_type, nullable=True))

    # === HS CODES - Add fields ===
    hs_columns = [
        # Product details
        ('product_code', sa.String(100)),
        ('brand', sa.String(100)),
        ('model', sa.String(100)),
        ('serial_lot_no', sa.String(100)),
        ('manufacturing_date', sa.Date()),
        ('expiry_date', sa.Date()),

        # Units
        ('unit_code', sa.String(10)),
        ('unit_2_code', sa.String(10)),

        # Tax
        ('applied_rate', sa.Float()),
        ('exemption_code', sa.String(10)),
        ('exemption_amount', sa.Float()),
        ('legal_document', sa.String(200)),

        # C/O
        ('co_no_line', sa.String(50)),

        # License
        ('license_expiry', sa.Date()),
    ]

    for col_name, col_type in hs_columns:
        if not column_exists('fms_hs_codes', col_name):
            op.add_column('fms_hs_codes', sa.Column(col_name, col_type, nullable=True))

    # Create index on product_code for HS lookup (if not exists)
    if column_exists('fms_hs_codes', 'product_code') and not index_exists('fms_hs_codes', 'ix_fms_hs_codes_product_code'):
        op.create_index('ix_fms_hs_codes_product_code', 'fms_hs_codes', ['tenant_id', 'product_code'])


def downgrade() -> None:
    # Drop index
    if index_exists('fms_hs_codes', 'ix_fms_hs_codes_product_code'):
        op.drop_index('ix_fms_hs_codes_product_code', 'fms_hs_codes')

    # Drop HS Codes columns
    hs_columns_to_drop = [
        'license_expiry', 'co_no_line', 'legal_document', 'exemption_amount',
        'exemption_code', 'applied_rate', 'unit_2_code', 'unit_code',
        'expiry_date', 'manufacturing_date', 'serial_lot_no', 'model', 'brand'
    ]
    for col in hs_columns_to_drop:
        if column_exists('fms_hs_codes', col):
            op.drop_column('fms_hs_codes', col)

    # Drop Customs Declarations columns
    customs_columns_to_drop = [
        'ecus_declaration_id', 'ecus_sync_date', 'ecus_synced',
        'declaration_file', 'customs_notes', 'notes', 'hs_codes_summary', 'attached_documents',
        'inspection_cert_date', 'inspection_cert_no', 'import_license_expiry',
        'import_license_issuer', 'import_license_date', 'import_license_no',
        'co_issuing_country', 'co_date', 'co_form', 'co_no',
        'emanifest_date', 'emanifest_no', 'release_by',
        'tax_receipt_no', 'tax_payment_date', 'tax_payment_deadline',
        'exemption_code', 'vat_exempted', 'vat_payable',
        'import_duty_exempted', 'import_duty_payable',
        'container_type', 'goods_description', 'representative_hs_code', 'total_items',
        'total_value_vnd', 'total_value_foreign', 'packing_cost', 'brokerage_value',
        'commission_value', 'price_condition_code', 'valuation_method', 'incoterms_place',
        'unloading_place', 'unloading_place_code', 'warehouse_name', 'warehouse_code',
        'exit_gate_code', 'entry_gate_code',
        'departure_date', 'eta_date', 'flight_no', 'awb_no', 'hbl_no', 'mbl_no',
        'lc_bank', 'lc_date', 'lc_no', 'payment_terms',
        'po_date', 'po_no',
        'foreign_partner_country', 'foreign_partner_address',
        'broker_tax_code', 'broker_code', 'broker_name',
        'trader_fax', 'trader_phone', 'importer_code',
        'declarant_email', 'declarant_phone', 'declarant_address', 'declarant_code',
        'check_result', 'customs_sub_dept',
        'reference_no', 'registration_time', 'tax_registration_code',
        'amendment_count', 'transaction_code', 'first_declaration_no', 'declaration_type_code'
    ]
    for col in customs_columns_to_drop:
        if column_exists('fms_customs_declarations', col):
            op.drop_column('fms_customs_declarations', col)
