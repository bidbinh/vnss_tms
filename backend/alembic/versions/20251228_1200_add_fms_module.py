"""Add FMS (Forwarding Management System) module

Revision ID: add_fms_module
Revises: f0c9a258929f
Create Date: 2025-12-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_fms_module'
down_revision: Union[str, None] = 'f0c9a258929f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # FMS Shipments - Core shipment table
    op.create_table('fms_shipments',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Reference numbers
        sa.Column('shipment_no', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('reference_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customer_ref_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Type and mode
        sa.Column('shipment_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # EXPORT, IMPORT, CROSS_TRADE, DOMESTIC
        sa.Column('shipment_mode', sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # SEA_FCL, SEA_LCL, AIR, etc.
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='DRAFT'),
        sa.Column('incoterm', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Customer info
        sa.Column('customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customer_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Shipper info
        sa.Column('shipper_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('shipper_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('shipper_address', sa.Text(), nullable=True),
        sa.Column('shipper_contact', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('shipper_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Consignee info
        sa.Column('consignee_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('consignee_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('consignee_address', sa.Text(), nullable=True),
        sa.Column('consignee_contact', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('consignee_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Notify party
        sa.Column('notify_party_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('notify_party_address', sa.Text(), nullable=True),

        # Ports
        sa.Column('origin_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('origin_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Place of receipt/delivery
        sa.Column('place_of_receipt', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('place_of_delivery', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('final_destination', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Carrier info
        sa.Column('carrier_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('carrier_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('carrier_booking_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Vessel/Flight info
        sa.Column('vessel_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('voyage_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('flight_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Dates
        sa.Column('etd', sa.Date(), nullable=True),
        sa.Column('eta', sa.Date(), nullable=True),
        sa.Column('atd', sa.Date(), nullable=True),
        sa.Column('ata', sa.Date(), nullable=True),

        # Cargo info
        sa.Column('commodity', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('commodity_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('cargo_description', sa.Text(), nullable=True),
        sa.Column('package_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('total_packages', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('net_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volume_cbm', sa.Float(), nullable=True, server_default='0'),
        sa.Column('chargeable_weight', sa.Float(), nullable=True, server_default='0'),

        # Container info (for FCL)
        sa.Column('container_count_20', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('container_count_40', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('container_count_40hc', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('container_count_45', sa.Integer(), nullable=True, server_default='0'),

        # Document numbers
        sa.Column('master_bl_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('house_bl_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('master_awb_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('house_awb_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Agent info
        sa.Column('origin_agent_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('origin_agent_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_agent_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_agent_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Financials
        sa.Column('currency_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='USD'),
        sa.Column('total_revenue', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('profit', sa.Float(), nullable=True, server_default='0'),

        # Quotation link
        sa.Column('quotation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Special flags
        sa.Column('is_dangerous_goods', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_reefer', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_oversized', sa.Boolean(), nullable=True, server_default='false'),

        # Notes
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('special_instructions', sa.Text(), nullable=True),

        # Audit
        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fms_shipments_tenant_id', 'fms_shipments', ['tenant_id'])
    op.create_index('ix_fms_shipments_shipment_no', 'fms_shipments', ['shipment_no'])
    op.create_index('ix_fms_shipments_status', 'fms_shipments', ['status'])

    # FMS Containers
    op.create_table('fms_containers',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('container_no', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('container_size', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('container_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('seal_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='EMPTY'),

        sa.Column('tare_weight', sa.Float(), nullable=True),
        sa.Column('max_payload', sa.Float(), nullable=True),
        sa.Column('vgm_weight', sa.Float(), nullable=True),
        sa.Column('vgm_certificate_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('net_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volume_cbm', sa.Float(), nullable=True, server_default='0'),
        sa.Column('packages', sa.Integer(), nullable=True, server_default='0'),

        sa.Column('is_dangerous_goods', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('dg_class', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('un_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('is_reefer', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('temperature_setting', sa.Float(), nullable=True),
        sa.Column('humidity_setting', sa.Float(), nullable=True),
        sa.Column('ventilation_setting', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('is_oog', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('over_height', sa.Float(), nullable=True),
        sa.Column('over_width', sa.Float(), nullable=True),
        sa.Column('over_length_front', sa.Float(), nullable=True),
        sa.Column('over_length_back', sa.Float(), nullable=True),

        sa.Column('empty_pickup_location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('empty_pickup_date', sa.DateTime(), nullable=True),
        sa.Column('stuffing_location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('stuffing_date', sa.DateTime(), nullable=True),
        sa.Column('gate_in_date', sa.DateTime(), nullable=True),
        sa.Column('loading_date', sa.DateTime(), nullable=True),
        sa.Column('discharge_date', sa.DateTime(), nullable=True),
        sa.Column('gate_out_date', sa.DateTime(), nullable=True),
        sa.Column('empty_return_location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('empty_return_date', sa.DateTime(), nullable=True),

        sa.Column('free_days', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('detention_from', sa.Date(), nullable=True),
        sa.Column('demurrage_from', sa.Date(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )
    op.create_index('ix_fms_containers_tenant_id', 'fms_containers', ['tenant_id'])
    op.create_index('ix_fms_containers_container_no', 'fms_containers', ['container_no'])

    # Bills of Lading
    op.create_table('fms_bills_of_lading',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('bl_no', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('bl_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # MASTER, HOUSE
        sa.Column('bl_status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='DRAFT'),
        sa.Column('original_count', sa.Integer(), nullable=True, server_default='3'),
        sa.Column('copy_count', sa.Integer(), nullable=True, server_default='3'),

        sa.Column('shipper_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('shipper_address', sa.Text(), nullable=True),
        sa.Column('consignee_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('consignee_address', sa.Text(), nullable=True),
        sa.Column('notify_party', sa.Text(), nullable=True),

        sa.Column('vessel_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('voyage_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('port_of_loading', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('port_of_discharge', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('place_of_receipt', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('place_of_delivery', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('cargo_description', sa.Text(), nullable=True),
        sa.Column('marks_and_numbers', sa.Text(), nullable=True),
        sa.Column('package_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('packages', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volume_cbm', sa.Float(), nullable=True, server_default='0'),

        sa.Column('freight_terms', sqlmodel.sql.sqltypes.AutoString(), nullable=True),  # PREPAID, COLLECT
        sa.Column('freight_payable_at', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('issue_place', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('on_board_date', sa.Date(), nullable=True),

        sa.Column('is_surrendered', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('surrendered_date', sa.DateTime(), nullable=True),
        sa.Column('is_released', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('released_date', sa.DateTime(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )
    op.create_index('ix_fms_bills_of_lading_tenant_id', 'fms_bills_of_lading', ['tenant_id'])
    op.create_index('ix_fms_bills_of_lading_bl_no', 'fms_bills_of_lading', ['bl_no'])

    # Airway Bills
    op.create_table('fms_airway_bills',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('awb_no', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('awb_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # MASTER, HOUSE
        sa.Column('awb_status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='DRAFT'),

        sa.Column('airline_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('airline_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('flight_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('flight_date', sa.Date(), nullable=True),

        sa.Column('shipper_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('shipper_address', sa.Text(), nullable=True),
        sa.Column('shipper_account', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('consignee_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('consignee_address', sa.Text(), nullable=True),
        sa.Column('consignee_account', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('origin_airport', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_airport', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('routing', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('pieces', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volume_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('chargeable_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('rate_class', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('rate_per_kg', sa.Float(), nullable=True),

        sa.Column('commodity', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('nature_of_goods', sa.Text(), nullable=True),

        sa.Column('declared_value_carriage', sa.Float(), nullable=True),
        sa.Column('declared_value_customs', sa.Float(), nullable=True),
        sa.Column('insurance_amount', sa.Float(), nullable=True),

        sa.Column('weight_charge', sa.Float(), nullable=True, server_default='0'),
        sa.Column('valuation_charge', sa.Float(), nullable=True, server_default='0'),
        sa.Column('other_charges_prepaid', sa.Float(), nullable=True, server_default='0'),
        sa.Column('other_charges_collect', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_prepaid', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_collect', sa.Float(), nullable=True, server_default='0'),

        sa.Column('handling_info', sa.Text(), nullable=True),
        sa.Column('sci', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('issue_place', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )
    op.create_index('ix_fms_airway_bills_tenant_id', 'fms_airway_bills', ['tenant_id'])
    op.create_index('ix_fms_airway_bills_awb_no', 'fms_airway_bills', ['awb_no'])

    # Customs Declarations
    op.create_table('fms_customs_declarations',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('declaration_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('declaration_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # IMPORT, EXPORT, TRANSIT
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='DRAFT'),

        sa.Column('customs_office', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customs_officer', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('trader_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('trader_tax_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('trader_address', sa.Text(), nullable=True),

        sa.Column('broker_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('broker_license', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('invoice_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('invoice_date', sa.Date(), nullable=True),
        sa.Column('incoterm', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('currency_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('exchange_rate', sa.Float(), nullable=True),
        sa.Column('total_value', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_value_vnd', sa.Float(), nullable=True, server_default='0'),

        sa.Column('import_duty', sa.Float(), nullable=True, server_default='0'),
        sa.Column('vat', sa.Float(), nullable=True, server_default='0'),
        sa.Column('special_consumption_tax', sa.Float(), nullable=True, server_default='0'),
        sa.Column('environment_tax', sa.Float(), nullable=True, server_default='0'),
        sa.Column('other_taxes', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_taxes', sa.Float(), nullable=True, server_default='0'),

        sa.Column('submission_date', sa.DateTime(), nullable=True),
        sa.Column('registered_date', sa.DateTime(), nullable=True),
        sa.Column('release_date', sa.DateTime(), nullable=True),
        sa.Column('inspection_required', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('inspection_date', sa.DateTime(), nullable=True),
        sa.Column('inspection_result', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )
    op.create_index('ix_fms_customs_declarations_tenant_id', 'fms_customs_declarations', ['tenant_id'])
    op.create_index('ix_fms_customs_declarations_declaration_no', 'fms_customs_declarations', ['declaration_no'])

    # HS Codes for customs
    op.create_table('fms_hs_codes',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('declaration_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('line_no', sa.Integer(), nullable=True),
        sa.Column('hs_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('origin_country', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('quantity', sa.Float(), nullable=True, server_default='0'),
        sa.Column('unit', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('unit_price', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_value', sa.Float(), nullable=True, server_default='0'),

        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('net_weight', sa.Float(), nullable=True, server_default='0'),

        sa.Column('duty_rate', sa.Float(), nullable=True, server_default='0'),
        sa.Column('vat_rate', sa.Float(), nullable=True, server_default='10'),
        sa.Column('sct_rate', sa.Float(), nullable=True, server_default='0'),

        sa.Column('duty_amount', sa.Float(), nullable=True, server_default='0'),
        sa.Column('vat_amount', sa.Float(), nullable=True, server_default='0'),
        sa.Column('sct_amount', sa.Float(), nullable=True, server_default='0'),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['declaration_id'], ['fms_customs_declarations.id'], ),
    )

    # Quotations
    op.create_table('fms_quotations',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('quotation_no', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='DRAFT'),

        sa.Column('customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('customer_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('contact_person', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('contact_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('contact_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('shipment_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('shipment_mode', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('incoterm', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('origin_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('origin_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('commodity', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('cargo_description', sa.Text(), nullable=True),
        sa.Column('packages', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volume_cbm', sa.Float(), nullable=True, server_default='0'),

        sa.Column('container_20', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('container_40', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('container_40hc', sa.Integer(), nullable=True, server_default='0'),

        sa.Column('currency_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='USD'),
        sa.Column('total_buy_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_sell_price', sa.Float(), nullable=True, server_default='0'),
        sa.Column('profit', sa.Float(), nullable=True, server_default='0'),
        sa.Column('profit_margin', sa.Float(), nullable=True, server_default='0'),

        sa.Column('valid_from', sa.Date(), nullable=True),
        sa.Column('valid_to', sa.Date(), nullable=True),
        sa.Column('transit_time', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('sent_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),

        sa.Column('converted_to_shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fms_quotations_tenant_id', 'fms_quotations', ['tenant_id'])
    op.create_index('ix_fms_quotations_quotation_no', 'fms_quotations', ['quotation_no'])

    # Quotation Items
    op.create_table('fms_quotation_items',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('quotation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('charge_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('charge_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('charge_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('unit', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=True, server_default='1'),

        sa.Column('buy_rate', sa.Float(), nullable=True, server_default='0'),
        sa.Column('buy_amount', sa.Float(), nullable=True, server_default='0'),
        sa.Column('sell_rate', sa.Float(), nullable=True, server_default='0'),
        sa.Column('sell_amount', sa.Float(), nullable=True, server_default='0'),

        sa.Column('vendor_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('vendor_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['quotation_id'], ['fms_quotations.id'], ),
    )

    # Forwarding Agents
    op.create_table('fms_agents',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('agent_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('agent_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('agent_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),  # OVERSEAS_AGENT, CUSTOMS_BROKER, etc.
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),

        sa.Column('country', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('city', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),

        sa.Column('contact_person', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('fax', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('website', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('tax_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('bank_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('bank_account', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('swift_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('credit_limit', sa.Float(), nullable=True),
        sa.Column('payment_terms', sa.Integer(), nullable=True),

        sa.Column('services', sa.Text(), nullable=True),  # JSON array of services
        sa.Column('trade_lanes', sa.Text(), nullable=True),  # JSON array of trade lanes

        sa.Column('iata_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('fiata_membership', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fms_agents_tenant_id', 'fms_agents', ['tenant_id'])
    op.create_index('ix_fms_agents_agent_code', 'fms_agents', ['agent_code'])

    # Agent Agreements
    op.create_table('fms_agent_agreements',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('agent_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('agreement_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('agreement_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='ACTIVE'),

        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),

        sa.Column('commission_rate', sa.Float(), nullable=True),
        sa.Column('credit_limit', sa.Float(), nullable=True),
        sa.Column('payment_terms', sa.Integer(), nullable=True),

        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agent_id'], ['fms_agents.id'], ),
    )

    # Freight Rates
    op.create_table('fms_rates',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('rate_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('rate_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('rate_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),  # SEA_FCL, SEA_LCL, AIR
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),

        sa.Column('carrier_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('agent_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('agent_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('origin_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('origin_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('transit_time_min', sa.Integer(), nullable=True),
        sa.Column('transit_time_max', sa.Integer(), nullable=True),

        sa.Column('currency_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='USD'),

        # FCL rates
        sa.Column('rate_20gp', sa.Float(), nullable=True),
        sa.Column('rate_40gp', sa.Float(), nullable=True),
        sa.Column('rate_40hc', sa.Float(), nullable=True),

        # LCL rates
        sa.Column('rate_per_cbm', sa.Float(), nullable=True),
        sa.Column('rate_per_ton', sa.Float(), nullable=True),
        sa.Column('min_charge', sa.Float(), nullable=True),

        # Air rates
        sa.Column('rate_min', sa.Float(), nullable=True),
        sa.Column('rate_normal', sa.Float(), nullable=True),
        sa.Column('rate_45kg', sa.Float(), nullable=True),
        sa.Column('rate_100kg', sa.Float(), nullable=True),
        sa.Column('rate_300kg', sa.Float(), nullable=True),
        sa.Column('rate_500kg', sa.Float(), nullable=True),

        sa.Column('effective_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fms_rates_tenant_id', 'fms_rates', ['tenant_id'])
    op.create_index('ix_fms_rates_rate_code', 'fms_rates', ['rate_code'])

    # Shipment Tracking
    op.create_table('fms_tracking',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('event_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('event_datetime', sa.DateTime(), nullable=False),

        sa.Column('location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('location_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('vessel_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('voyage_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('container_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('is_milestone', sa.Boolean(), nullable=True, server_default='false'),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )
    op.create_index('ix_fms_tracking_tenant_id', 'fms_tracking', ['tenant_id'])
    op.create_index('ix_fms_tracking_shipment_id', 'fms_tracking', ['shipment_id'])

    # FMS Documents
    op.create_table('fms_documents',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('document_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('document_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('document_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),

        sa.Column('file_path', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('file_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('issue_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('issued_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('is_verified', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('verified_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )
    op.create_index('ix_fms_documents_tenant_id', 'fms_documents', ['tenant_id'])
    op.create_index('ix_fms_documents_shipment_id', 'fms_documents', ['shipment_id'])

    # Consolidations
    op.create_table('fms_consolidations',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('consol_no', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('consol_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),  # LCL, AIR
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='OPEN'),

        sa.Column('origin_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('origin_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('destination_port_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('carrier_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('vessel_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('voyage_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('flight_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('etd', sa.Date(), nullable=True),
        sa.Column('eta', sa.Date(), nullable=True),
        sa.Column('atd', sa.Date(), nullable=True),
        sa.Column('ata', sa.Date(), nullable=True),

        sa.Column('master_bl_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('master_awb_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('total_packages', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_volume', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_chargeable_weight', sa.Float(), nullable=True, server_default='0'),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fms_consolidations_tenant_id', 'fms_consolidations', ['tenant_id'])
    op.create_index('ix_fms_consolidations_consol_no', 'fms_consolidations', ['consol_no'])

    # Consolidation Items
    op.create_table('fms_consolidation_items',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('consolidation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('house_bl_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('house_awb_no', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.Column('packages', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('gross_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volume', sa.Float(), nullable=True, server_default='0'),
        sa.Column('chargeable_weight', sa.Float(), nullable=True, server_default='0'),

        sa.Column('remarks', sa.Text(), nullable=True),

        sa.Column('created_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('deleted_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['consolidation_id'], ['fms_consolidations.id'], ),
        sa.ForeignKeyConstraint(['shipment_id'], ['fms_shipments.id'], ),
    )


def downgrade() -> None:
    op.drop_table('fms_consolidation_items')
    op.drop_table('fms_consolidations')
    op.drop_table('fms_documents')
    op.drop_table('fms_tracking')
    op.drop_table('fms_rates')
    op.drop_table('fms_agent_agreements')
    op.drop_table('fms_agents')
    op.drop_table('fms_quotation_items')
    op.drop_table('fms_quotations')
    op.drop_table('fms_hs_codes')
    op.drop_table('fms_customs_declarations')
    op.drop_table('fms_airway_bills')
    op.drop_table('fms_bills_of_lading')
    op.drop_table('fms_containers')
    op.drop_table('fms_shipments')
