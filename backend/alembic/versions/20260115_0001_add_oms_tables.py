"""Add OMS tables

Revision ID: 20260115_0001
Revises: 20260115_0000
Create Date: 2026-01-15 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260115_0001'
down_revision: Union[str, None] = '20260115_0000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create oms_orders table
    op.create_table('oms_orders',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('external_reference', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('workflow_instance_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('previous_status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('customer_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('delivery_address_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('delivery_address_text', sa.Text(), nullable=True),
    sa.Column('delivery_contact_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('delivery_contact_phone', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('order_date', sa.DateTime(), nullable=False),
    sa.Column('required_delivery_date', sa.DateTime(), nullable=True),
    sa.Column('confirmed_date', sa.DateTime(), nullable=True),
    sa.Column('completed_date', sa.DateTime(), nullable=True),
    sa.Column('base_price_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('total_product_amount', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('total_shipping_cost', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('total_tax', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('total_discount', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('grand_total', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('currency', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
    sa.Column('sales_notes', sa.Text(), nullable=True),
    sa.Column('internal_notes', sa.Text(), nullable=True),
    sa.Column('customer_notes', sa.Text(), nullable=True),
    sa.Column('rejection_reason', sa.Text(), nullable=True),
    sa.Column('created_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('confirmed_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['confirmed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'order_number', name='uq_oms_order_number')
    )
    op.create_index(op.f('ix_oms_orders_customer_id'), 'oms_orders', ['customer_id'], unique=False)
    op.create_index(op.f('ix_oms_orders_order_date'), 'oms_orders', ['order_date'], unique=False)
    op.create_index(op.f('ix_oms_orders_order_number'), 'oms_orders', ['order_number'], unique=False)
    op.create_index(op.f('ix_oms_orders_required_delivery_date'), 'oms_orders', ['required_delivery_date'], unique=False)
    op.create_index(op.f('ix_oms_orders_status'), 'oms_orders', ['status'], unique=False)
    op.create_index(op.f('ix_oms_orders_tenant_id'), 'oms_orders', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_oms_orders_workflow_instance_id'), 'oms_orders', ['workflow_instance_id'], unique=False)

    # Create oms_order_items table
    op.create_table('oms_order_items',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('product_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('product_code', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('product_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('product_unit', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('quantity_allocated', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('quantity_shipped', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('quantity_delivered', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('cs_unit_price', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('quoted_unit_price', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('approved_unit_price', sa.Numeric(precision=15, scale=2), nullable=True),
    sa.Column('shipping_unit_cost', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('line_total', sa.Numeric(precision=15, scale=2), nullable=True),
    sa.Column('tax_amount', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('discount_amount', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('net_amount', sa.Numeric(precision=15, scale=2), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['order_id'], ['oms_orders.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oms_order_items_order_id'), 'oms_order_items', ['order_id'], unique=False)
    op.create_index(op.f('ix_oms_order_items_product_id'), 'oms_order_items', ['product_id'], unique=False)
    op.create_index(op.f('ix_oms_order_items_tenant_id'), 'oms_order_items', ['tenant_id'], unique=False)

    # Create oms_allocations table
    op.create_table('oms_allocations',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_item_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('source_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('source_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('source_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('source_location', sa.Text(), nullable=True),
    sa.Column('allocated_quantity', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('allocated_date', sa.DateTime(), nullable=False),
    sa.Column('allocated_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['allocated_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['oms_orders.id'], ),
    sa.ForeignKeyConstraint(['order_item_id'], ['oms_order_items.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oms_allocations_order_id'), 'oms_allocations', ['order_id'], unique=False)
    op.create_index(op.f('ix_oms_allocations_order_item_id'), 'oms_allocations', ['order_item_id'], unique=False)
    op.create_index(op.f('ix_oms_allocations_source_id'), 'oms_allocations', ['source_id'], unique=False)
    op.create_index(op.f('ix_oms_allocations_source_type'), 'oms_allocations', ['source_type'], unique=False)
    op.create_index(op.f('ix_oms_allocations_status'), 'oms_allocations', ['status'], unique=False)
    op.create_index(op.f('ix_oms_allocations_tenant_id'), 'oms_allocations', ['tenant_id'], unique=False)

    # Create oms_shipments table
    op.create_table('oms_shipments',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('shipment_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('tms_order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('shipment_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('pickup_location_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('pickup_location_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('pickup_address', sa.Text(), nullable=True),
    sa.Column('pickup_date', sa.DateTime(), nullable=True),
    sa.Column('delivery_address_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('delivery_address', sa.Text(), nullable=True),
    sa.Column('delivery_contact_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('delivery_contact_phone', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('planned_delivery_date', sa.DateTime(), nullable=True),
    sa.Column('actual_delivery_date', sa.DateTime(), nullable=True),
    sa.Column('carrier_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('carrier_contact', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.Column('tracking_number', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['oms_orders.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'shipment_number', name='uq_oms_shipment_number')
    )
    op.create_index(op.f('ix_oms_shipments_order_id'), 'oms_shipments', ['order_id'], unique=False)
    op.create_index(op.f('ix_oms_shipments_shipment_number'), 'oms_shipments', ['shipment_number'], unique=False)
    op.create_index(op.f('ix_oms_shipments_status'), 'oms_shipments', ['status'], unique=False)
    op.create_index(op.f('ix_oms_shipments_tenant_id'), 'oms_shipments', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_oms_shipments_tms_order_id'), 'oms_shipments', ['tms_order_id'], unique=False)

    # Create oms_shipment_items table
    op.create_table('oms_shipment_items',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('shipment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_item_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('allocation_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('delivered_quantity', sa.Numeric(precision=15, scale=3), nullable=False),
    sa.Column('product_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('product_code', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('product_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('product_unit', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['allocation_id'], ['oms_allocations.id'], ),
    sa.ForeignKeyConstraint(['order_item_id'], ['oms_order_items.id'], ),
    sa.ForeignKeyConstraint(['shipment_id'], ['oms_shipments.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oms_shipment_items_allocation_id'), 'oms_shipment_items', ['allocation_id'], unique=False)
    op.create_index(op.f('ix_oms_shipment_items_order_item_id'), 'oms_shipment_items', ['order_item_id'], unique=False)
    op.create_index(op.f('ix_oms_shipment_items_shipment_id'), 'oms_shipment_items', ['shipment_id'], unique=False)
    op.create_index(op.f('ix_oms_shipment_items_tenant_id'), 'oms_shipment_items', ['tenant_id'], unique=False)

    # Create oms_status_logs table
    op.create_table('oms_status_logs',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('entity_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('entity_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('from_status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('to_status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('change_reason', sa.Text(), nullable=True),
    sa.Column('changed_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('changed_by_role', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('changed_at', sa.DateTime(), nullable=False),
    sa.Column('metadata', sa.JSON(), nullable=True),
    sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oms_status_logs_changed_at'), 'oms_status_logs', ['changed_at'], unique=False)
    op.create_index(op.f('ix_oms_status_logs_entity_id'), 'oms_status_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_oms_status_logs_entity_type'), 'oms_status_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_oms_status_logs_tenant_id'), 'oms_status_logs', ['tenant_id'], unique=False)

    # Create oms_price_approvals table
    op.create_table('oms_price_approvals',
    sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('requested_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('requested_at', sa.DateTime(), nullable=False),
    sa.Column('request_notes', sa.Text(), nullable=True),
    sa.Column('price_comparison', sa.JSON(), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('reviewed_by_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    sa.Column('review_notes', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['order_id'], ['oms_orders.id'], ),
    sa.ForeignKeyConstraint(['requested_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oms_price_approvals_order_id'), 'oms_price_approvals', ['order_id'], unique=False)
    op.create_index(op.f('ix_oms_price_approvals_status'), 'oms_price_approvals', ['status'], unique=False)
    op.create_index(op.f('ix_oms_price_approvals_tenant_id'), 'oms_price_approvals', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_oms_price_approvals_tenant_id'), table_name='oms_price_approvals')
    op.drop_index(op.f('ix_oms_price_approvals_status'), table_name='oms_price_approvals')
    op.drop_index(op.f('ix_oms_price_approvals_order_id'), table_name='oms_price_approvals')
    op.drop_table('oms_price_approvals')

    op.drop_index(op.f('ix_oms_status_logs_tenant_id'), table_name='oms_status_logs')
    op.drop_index(op.f('ix_oms_status_logs_entity_type'), table_name='oms_status_logs')
    op.drop_index(op.f('ix_oms_status_logs_entity_id'), table_name='oms_status_logs')
    op.drop_index(op.f('ix_oms_status_logs_changed_at'), table_name='oms_status_logs')
    op.drop_table('oms_status_logs')

    op.drop_index(op.f('ix_oms_shipment_items_tenant_id'), table_name='oms_shipment_items')
    op.drop_index(op.f('ix_oms_shipment_items_shipment_id'), table_name='oms_shipment_items')
    op.drop_index(op.f('ix_oms_shipment_items_order_item_id'), table_name='oms_shipment_items')
    op.drop_index(op.f('ix_oms_shipment_items_allocation_id'), table_name='oms_shipment_items')
    op.drop_table('oms_shipment_items')

    op.drop_index(op.f('ix_oms_shipments_tms_order_id'), table_name='oms_shipments')
    op.drop_index(op.f('ix_oms_shipments_tenant_id'), table_name='oms_shipments')
    op.drop_index(op.f('ix_oms_shipments_status'), table_name='oms_shipments')
    op.drop_index(op.f('ix_oms_shipments_shipment_number'), table_name='oms_shipments')
    op.drop_index(op.f('ix_oms_shipments_order_id'), table_name='oms_shipments')
    op.drop_table('oms_shipments')

    op.drop_index(op.f('ix_oms_allocations_tenant_id'), table_name='oms_allocations')
    op.drop_index(op.f('ix_oms_allocations_status'), table_name='oms_allocations')
    op.drop_index(op.f('ix_oms_allocations_source_type'), table_name='oms_allocations')
    op.drop_index(op.f('ix_oms_allocations_source_id'), table_name='oms_allocations')
    op.drop_index(op.f('ix_oms_allocations_order_item_id'), table_name='oms_allocations')
    op.drop_index(op.f('ix_oms_allocations_order_id'), table_name='oms_allocations')
    op.drop_table('oms_allocations')

    op.drop_index(op.f('ix_oms_order_items_tenant_id'), table_name='oms_order_items')
    op.drop_index(op.f('ix_oms_order_items_product_id'), table_name='oms_order_items')
    op.drop_index(op.f('ix_oms_order_items_order_id'), table_name='oms_order_items')
    op.drop_table('oms_order_items')

    op.drop_index(op.f('ix_oms_orders_workflow_instance_id'), table_name='oms_orders')
    op.drop_index(op.f('ix_oms_orders_tenant_id'), table_name='oms_orders')
    op.drop_index(op.f('ix_oms_orders_status'), table_name='oms_orders')
    op.drop_index(op.f('ix_oms_orders_required_delivery_date'), table_name='oms_orders')
    op.drop_index(op.f('ix_oms_orders_order_number'), table_name='oms_orders')
    op.drop_index(op.f('ix_oms_orders_order_date'), table_name='oms_orders')
    op.drop_index(op.f('ix_oms_orders_customer_id'), table_name='oms_orders')
    op.drop_table('oms_orders')
