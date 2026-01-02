"""CRM Contracts and Sales Orders

Revision ID: 20241227_0002
Revises: 005
Create Date: 2024-12-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # === CONTRACTS ===
    op.create_table('crm_contracts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('account_id', sa.String(36), nullable=False, index=True),
        sa.Column('opportunity_id', sa.String(36), nullable=True, index=True),
        sa.Column('quote_id', sa.String(36), nullable=True, index=True),

        sa.Column('contract_type', sa.String(50), nullable=False, default='SERVICE'),
        sa.Column('status', sa.String(50), nullable=False, default='DRAFT', index=True),

        sa.Column('start_date', sa.String(20), nullable=True),
        sa.Column('end_date', sa.String(20), nullable=True),

        sa.Column('total_value', sa.Float, default=0),
        sa.Column('currency', sa.String(10), default='VND'),

        sa.Column('payment_terms', sa.String(100), nullable=True),
        sa.Column('billing_frequency', sa.String(50), nullable=True),

        sa.Column('terms_conditions', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        sa.Column('signed_by', sa.String(255), nullable=True),
        sa.Column('signed_date', sa.String(20), nullable=True),

        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )

    # === SALES ORDERS ===
    op.create_table('crm_sales_orders',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('account_id', sa.String(36), nullable=False, index=True),
        sa.Column('contact_id', sa.String(36), nullable=True, index=True),
        sa.Column('quote_id', sa.String(36), nullable=True, index=True),
        sa.Column('contract_id', sa.String(36), nullable=True, index=True),

        sa.Column('order_date', sa.String(20), nullable=True),
        sa.Column('delivery_date', sa.String(20), nullable=True),

        sa.Column('status', sa.String(50), nullable=False, default='DRAFT', index=True),
        sa.Column('payment_status', sa.String(50), nullable=False, default='UNPAID'),

        sa.Column('subtotal', sa.Float, default=0),
        sa.Column('tax_amount', sa.Float, default=0),
        sa.Column('discount_amount', sa.Float, default=0),
        sa.Column('total_amount', sa.Float, default=0),
        sa.Column('currency', sa.String(10), default='VND'),

        sa.Column('shipping_address', sa.Text, nullable=True),
        sa.Column('billing_address', sa.Text, nullable=True),

        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('payment_terms', sa.String(100), nullable=True),

        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('internal_notes', sa.Text, nullable=True),

        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )

    # === SALES ORDER ITEMS ===
    op.create_table('crm_sales_order_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sales_order_id', sa.String(36), nullable=False, index=True),

        sa.Column('product_id', sa.String(36), nullable=True),
        sa.Column('product_code', sa.String(50), nullable=True),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),

        sa.Column('quantity', sa.Float, default=1),
        sa.Column('unit', sa.String(20), nullable=True),
        sa.Column('unit_price', sa.Float, default=0),
        sa.Column('discount_percent', sa.Float, default=0),
        sa.Column('tax_percent', sa.Float, default=0),

        sa.Column('line_total', sa.Float, default=0),

        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('crm_sales_order_items')
    op.drop_table('crm_sales_orders')
    op.drop_table('crm_contracts')
