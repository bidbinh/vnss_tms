"""expand_customers_table_fields

Revision ID: 1f9b0444e4d2
Revises: add_social_visibility
Create Date: 2026-01-02 23:43:16.797599+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '1f9b0444e4d2'
down_revision: Union[str, None] = 'add_social_visibility'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Expand customers table with new fields
    
    # Basic info
    op.add_column('customers', sa.Column('short_name', sa.String(length=100), nullable=True))
    
    # Legal info
    op.add_column('customers', sa.Column('business_license', sa.String(length=50), nullable=True))
    
    # Contact info
    op.add_column('customers', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('customers', sa.Column('fax', sa.String(length=20), nullable=True))
    op.add_column('customers', sa.Column('email', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('website', sa.String(length=255), nullable=True))
    
    # Address
    op.add_column('customers', sa.Column('address', sa.String(length=500), nullable=True))
    op.add_column('customers', sa.Column('ward', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('district', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('country', sa.String(length=100), server_default='Việt Nam', nullable=False))
    
    # Shipping address
    op.add_column('customers', sa.Column('shipping_address', sa.String(length=500), nullable=True))
    op.add_column('customers', sa.Column('shipping_ward', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('shipping_district', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('shipping_city', sa.String(length=100), nullable=True))
    
    # Financial info
    op.add_column('customers', sa.Column('payment_terms', sa.String(length=50), nullable=True))
    op.add_column('customers', sa.Column('credit_limit', sa.Float(), server_default='0', nullable=False))
    op.add_column('customers', sa.Column('credit_days', sa.Integer(), server_default='30', nullable=False))
    op.add_column('customers', sa.Column('bank_name', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('bank_branch', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('bank_account', sa.String(length=50), nullable=True))
    op.add_column('customers', sa.Column('bank_account_name', sa.String(length=100), nullable=True))
    
    # Business info
    op.add_column('customers', sa.Column('industry', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('source', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('customer_since', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('assigned_to', sa.String(), nullable=True))
    
    # Primary contact
    op.add_column('customers', sa.Column('contact_name', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('contact_phone', sa.String(length=20), nullable=True))
    op.add_column('customers', sa.Column('contact_email', sa.String(length=100), nullable=True))
    op.add_column('customers', sa.Column('contact_position', sa.String(length=100), nullable=True))
    
    # Notes & Status
    op.add_column('customers', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('customers', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    
    # CRM Integration
    op.add_column('customers', sa.Column('crm_account_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_customers_crm_account_id'), 'customers', ['crm_account_id'], unique=False)
    
    # Add index on tax_code if not exists
    op.create_index(op.f('ix_customers_tax_code'), 'customers', ['tax_code'], unique=False)


def downgrade() -> None:
    # Remove indexes
    op.drop_index(op.f('ix_customers_tax_code'), table_name='customers')
    op.drop_index(op.f('ix_customers_crm_account_id'), table_name='customers')
    
    # Remove all new columns
    op.drop_column('customers', 'crm_account_id')
    op.drop_column('customers', 'is_active')
    op.drop_column('customers', 'notes')
    op.drop_column('customers', 'contact_position')
    op.drop_column('customers', 'contact_email')
    op.drop_column('customers', 'contact_phone')
    op.drop_column('customers', 'contact_name')
    op.drop_column('customers', 'assigned_to')
    op.drop_column('customers', 'customer_since')
    op.drop_column('customers', 'source')
    op.drop_column('customers', 'industry')
    op.drop_column('customers', 'bank_account_name')
    op.drop_column('customers', 'bank_account')
    op.drop_column('customers', 'bank_branch')
    op.drop_column('customers', 'bank_name')
    op.drop_column('customers', 'credit_days')
    op.drop_column('customers', 'credit_limit')
    op.drop_column('customers', 'payment_terms')
    op.drop_column('customers', 'shipping_city')
    op.drop_column('customers', 'shipping_district')
    op.drop_column('customers', 'shipping_ward')
    op.drop_column('customers', 'shipping_address')
    op.drop_column('customers', 'country')
    op.drop_column('customers', 'city')
    op.drop_column('customers', 'district')
    op.drop_column('customers', 'ward')
    op.drop_column('customers', 'address')
    op.drop_column('customers', 'website')
    op.drop_column('customers', 'email')
    op.drop_column('customers', 'fax')
    op.drop_column('customers', 'phone')
    op.drop_column('customers', 'business_license')
    op.drop_column('customers', 'short_name')
