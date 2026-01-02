"""manual_crm_tms_hrm_updates

Revision ID: 349bc3d897f5
Revises: 007
Create Date: 2025-12-27 05:42:28.657534+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '349bc3d897f5'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ========== CRM CONTRACTS ==========
    # Add new columns (all nullable to avoid data issues)
    op.add_column('crm_contracts', sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True))
    op.add_column('crm_contracts', sa.Column('contact_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_contracts', sa.Column('effective_date', sa.Date(), nullable=True))
    op.add_column('crm_contracts', sa.Column('termination_date', sa.Date(), nullable=True))
    op.add_column('crm_contracts', sa.Column('monthly_value', sa.Numeric(precision=18, scale=2), nullable=True))
    op.add_column('crm_contracts', sa.Column('auto_renew', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('crm_contracts', sa.Column('renewal_terms', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))
    op.add_column('crm_contracts', sa.Column('renewal_notice_days', sa.Integer(), nullable=True, server_default='30'))
    op.add_column('crm_contracts', sa.Column('special_terms', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True))
    op.add_column('crm_contracts', sa.Column('signed_by_title', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_contracts', sa.Column('customer_signed_by', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True))
    op.add_column('crm_contracts', sa.Column('customer_signed_date', sa.Date(), nullable=True))
    op.add_column('crm_contracts', sa.Column('attachment_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))
    op.add_column('crm_contracts', sa.Column('document_urls', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True))
    op.add_column('crm_contracts', sa.Column('internal_notes', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=True))
    op.add_column('crm_contracts', sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_contracts', sa.Column('approved_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_contracts', sa.Column('approved_at', sa.DateTime(), nullable=True))

    # Add indexes
    op.create_index(op.f('ix_crm_contracts_contact_id'), 'crm_contracts', ['contact_id'], unique=False)
    op.create_index(op.f('ix_crm_contracts_contract_type'), 'crm_contracts', ['contract_type'], unique=False)
    op.create_index(op.f('ix_crm_contracts_created_by'), 'crm_contracts', ['created_by'], unique=False)
    op.create_index(op.f('ix_crm_contracts_end_date'), 'crm_contracts', ['end_date'], unique=False)
    op.create_index(op.f('ix_crm_contracts_start_date'), 'crm_contracts', ['start_date'], unique=False)

    # Add foreign keys
    op.create_foreign_key('fk_crm_contracts_contact', 'crm_contracts', 'crm_contacts', ['contact_id'], ['id'])
    op.create_foreign_key('fk_crm_contracts_account', 'crm_contracts', 'crm_accounts', ['account_id'], ['id'])
    op.create_foreign_key('fk_crm_contracts_opportunity', 'crm_contracts', 'crm_opportunities', ['opportunity_id'], ['id'])
    op.create_foreign_key('fk_crm_contracts_quote', 'crm_contracts', 'crm_quotes', ['quote_id'], ['id'])
    op.create_foreign_key('fk_crm_contracts_created_by', 'crm_contracts', 'users', ['created_by'], ['id'])
    op.create_foreign_key('fk_crm_contracts_updated_by', 'crm_contracts', 'users', ['updated_by'], ['id'])
    op.create_foreign_key('fk_crm_contracts_approved_by', 'crm_contracts', 'users', ['approved_by'], ['id'])

    # ========== CRM CONTRACT ITEMS (new table) ==========
    op.create_table('crm_contract_items',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('contract_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('product_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('product_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('quantity', sa.Numeric(precision=12, scale=4), nullable=True, server_default='1'),
        sa.Column('unit', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('unit_price', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'),
        sa.Column('discount_percent', sa.Numeric(precision=5, scale=2), nullable=True, server_default='0'),
        sa.Column('tax_percent', sa.Numeric(precision=5, scale=2), nullable=True, server_default='0'),
        sa.Column('line_total', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'),
        sa.Column('service_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['contract_id'], ['crm_contracts.id'], name='fk_crm_contract_items_contract'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_crm_contract_items_contract_id'), 'crm_contract_items', ['contract_id'], unique=False)
    op.create_index(op.f('ix_crm_contract_items_product_id'), 'crm_contract_items', ['product_id'], unique=False)

    # ========== CRM SALES ORDERS ==========
    # Add new columns
    op.add_column('crm_sales_orders', sa.Column('reference_number', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('po_number', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('expected_delivery_date', sa.Date(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('shipped_date', sa.Date(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('actual_delivery_date', sa.Date(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('due_date', sa.Date(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('discount_percent', sa.Numeric(precision=5, scale=2), nullable=True, server_default='0'))
    op.add_column('crm_sales_orders', sa.Column('shipping_cost', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'))
    op.add_column('crm_sales_orders', sa.Column('amount_paid', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'))
    op.add_column('crm_sales_orders', sa.Column('amount_due', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'))
    op.add_column('crm_sales_orders', sa.Column('shipping_city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('shipping_state', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('shipping_postal_code', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('shipping_country', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('billing_city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('billing_state', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('billing_postal_code', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('billing_country', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('shipping_method', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('tracking_number', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('carrier', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('payment_reference', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('special_instructions', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('updated_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('approved_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('confirmed_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('tms_order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_sales_orders', sa.Column('tms_synced_at', sa.DateTime(), nullable=True))

    # Add indexes
    op.create_index(op.f('ix_crm_sales_orders_due_date'), 'crm_sales_orders', ['due_date'], unique=False)
    op.create_index(op.f('ix_crm_sales_orders_tms_order_id'), 'crm_sales_orders', ['tms_order_id'], unique=False)

    # ========== CRM SALES ORDER ITEMS ==========
    op.add_column('crm_sales_order_items', sa.Column('sku', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column('crm_sales_order_items', sa.Column('quantity_shipped', sa.Numeric(precision=12, scale=4), nullable=True, server_default='0'))
    op.add_column('crm_sales_order_items', sa.Column('quantity_delivered', sa.Numeric(precision=12, scale=4), nullable=True, server_default='0'))
    op.add_column('crm_sales_order_items', sa.Column('quantity_returned', sa.Numeric(precision=12, scale=4), nullable=True, server_default='0'))
    op.add_column('crm_sales_order_items', sa.Column('discount_amount', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'))
    op.add_column('crm_sales_order_items', sa.Column('tax_amount', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'))
    op.add_column('crm_sales_order_items', sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column('crm_sales_order_items', sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))
    op.add_column('crm_sales_order_items', sa.Column('updated_at', sa.DateTime(), nullable=True))

    # ========== CRM QUOTE ITEMS ==========
    op.add_column('crm_quote_items', sa.Column('service_category', sqlmodel.sql.sqltypes.AutoString(), nullable=True, server_default='TMS'))
    op.add_column('crm_quote_items', sa.Column('vehicle_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_quote_items', sa.Column('warehouse_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_quote_items', sa.Column('storage_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_quote_items', sa.Column('handling_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_quote_items', sa.Column('fleet_service', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('crm_quote_items', sa.Column('customs_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_index(op.f('ix_crm_quote_items_service_category'), 'crm_quote_items', ['service_category'], unique=False)


def downgrade() -> None:
    # CRM Quote Items
    op.drop_index(op.f('ix_crm_quote_items_service_category'), table_name='crm_quote_items')
    op.drop_column('crm_quote_items', 'customs_type')
    op.drop_column('crm_quote_items', 'fleet_service')
    op.drop_column('crm_quote_items', 'handling_type')
    op.drop_column('crm_quote_items', 'storage_type')
    op.drop_column('crm_quote_items', 'warehouse_id')
    op.drop_column('crm_quote_items', 'vehicle_type')
    op.drop_column('crm_quote_items', 'service_category')

    # CRM Sales Order Items
    op.drop_column('crm_sales_order_items', 'updated_at')
    op.drop_column('crm_sales_order_items', 'notes')
    op.drop_column('crm_sales_order_items', 'status')
    op.drop_column('crm_sales_order_items', 'tax_amount')
    op.drop_column('crm_sales_order_items', 'discount_amount')
    op.drop_column('crm_sales_order_items', 'quantity_returned')
    op.drop_column('crm_sales_order_items', 'quantity_delivered')
    op.drop_column('crm_sales_order_items', 'quantity_shipped')
    op.drop_column('crm_sales_order_items', 'sku')

    # CRM Sales Orders
    op.drop_index(op.f('ix_crm_sales_orders_tms_order_id'), table_name='crm_sales_orders')
    op.drop_index(op.f('ix_crm_sales_orders_due_date'), table_name='crm_sales_orders')
    op.drop_column('crm_sales_orders', 'tms_synced_at')
    op.drop_column('crm_sales_orders', 'tms_order_id')
    op.drop_column('crm_sales_orders', 'confirmed_at')
    op.drop_column('crm_sales_orders', 'confirmed_by')
    op.drop_column('crm_sales_orders', 'approved_at')
    op.drop_column('crm_sales_orders', 'approved_by')
    op.drop_column('crm_sales_orders', 'updated_by')
    op.drop_column('crm_sales_orders', 'special_instructions')
    op.drop_column('crm_sales_orders', 'payment_reference')
    op.drop_column('crm_sales_orders', 'carrier')
    op.drop_column('crm_sales_orders', 'tracking_number')
    op.drop_column('crm_sales_orders', 'shipping_method')
    op.drop_column('crm_sales_orders', 'billing_country')
    op.drop_column('crm_sales_orders', 'billing_postal_code')
    op.drop_column('crm_sales_orders', 'billing_state')
    op.drop_column('crm_sales_orders', 'billing_city')
    op.drop_column('crm_sales_orders', 'shipping_country')
    op.drop_column('crm_sales_orders', 'shipping_postal_code')
    op.drop_column('crm_sales_orders', 'shipping_state')
    op.drop_column('crm_sales_orders', 'shipping_city')
    op.drop_column('crm_sales_orders', 'amount_due')
    op.drop_column('crm_sales_orders', 'amount_paid')
    op.drop_column('crm_sales_orders', 'shipping_cost')
    op.drop_column('crm_sales_orders', 'discount_percent')
    op.drop_column('crm_sales_orders', 'due_date')
    op.drop_column('crm_sales_orders', 'actual_delivery_date')
    op.drop_column('crm_sales_orders', 'shipped_date')
    op.drop_column('crm_sales_orders', 'expected_delivery_date')
    op.drop_column('crm_sales_orders', 'po_number')
    op.drop_column('crm_sales_orders', 'reference_number')

    # CRM Contract Items
    op.drop_index(op.f('ix_crm_contract_items_product_id'), table_name='crm_contract_items')
    op.drop_index(op.f('ix_crm_contract_items_contract_id'), table_name='crm_contract_items')
    op.drop_table('crm_contract_items')

    # CRM Contracts
    op.drop_constraint('fk_crm_contracts_approved_by', 'crm_contracts', type_='foreignkey')
    op.drop_constraint('fk_crm_contracts_updated_by', 'crm_contracts', type_='foreignkey')
    op.drop_constraint('fk_crm_contracts_created_by', 'crm_contracts', type_='foreignkey')
    op.drop_constraint('fk_crm_contracts_quote', 'crm_contracts', type_='foreignkey')
    op.drop_constraint('fk_crm_contracts_opportunity', 'crm_contracts', type_='foreignkey')
    op.drop_constraint('fk_crm_contracts_account', 'crm_contracts', type_='foreignkey')
    op.drop_constraint('fk_crm_contracts_contact', 'crm_contracts', type_='foreignkey')
    op.drop_index(op.f('ix_crm_contracts_start_date'), table_name='crm_contracts')
    op.drop_index(op.f('ix_crm_contracts_end_date'), table_name='crm_contracts')
    op.drop_index(op.f('ix_crm_contracts_created_by'), table_name='crm_contracts')
    op.drop_index(op.f('ix_crm_contracts_contract_type'), table_name='crm_contracts')
    op.drop_index(op.f('ix_crm_contracts_contact_id'), table_name='crm_contracts')
    op.drop_column('crm_contracts', 'approved_at')
    op.drop_column('crm_contracts', 'approved_by')
    op.drop_column('crm_contracts', 'updated_by')
    op.drop_column('crm_contracts', 'internal_notes')
    op.drop_column('crm_contracts', 'document_urls')
    op.drop_column('crm_contracts', 'attachment_url')
    op.drop_column('crm_contracts', 'customer_signed_date')
    op.drop_column('crm_contracts', 'customer_signed_by')
    op.drop_column('crm_contracts', 'signed_by_title')
    op.drop_column('crm_contracts', 'special_terms')
    op.drop_column('crm_contracts', 'renewal_notice_days')
    op.drop_column('crm_contracts', 'renewal_terms')
    op.drop_column('crm_contracts', 'auto_renew')
    op.drop_column('crm_contracts', 'monthly_value')
    op.drop_column('crm_contracts', 'termination_date')
    op.drop_column('crm_contracts', 'effective_date')
    op.drop_column('crm_contracts', 'contact_id')
    op.drop_column('crm_contracts', 'description')
