"""Add customer addresses, bank accounts, contacts tables

Revision ID: 20260117_0001
Revises: 20260115_0001
Create Date: 2026-01-17 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '20260117_0001'
down_revision: Union[str, None] = '20260115_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create customer_addresses table
    op.create_table('customer_addresses',
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('address_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('address', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column('ward', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('district', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('country', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False, server_default='Việt Nam'),
        sa.Column('postal_code', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('contact_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('contact_phone', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('contact_email', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_same_as_operating', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_customer_addresses_customer_id', 'customer_addresses', ['customer_id'], unique=False)
    op.create_index('ix_customer_addresses_address_type', 'customer_addresses', ['address_type'], unique=False)
    op.create_index('ix_customer_addresses_city', 'customer_addresses', ['city'], unique=False)
    op.create_index('ix_customer_addresses_is_default', 'customer_addresses', ['is_default'], unique=False)
    op.create_index('ix_customer_addresses_is_active', 'customer_addresses', ['is_active'], unique=False)

    # Create customer_bank_accounts table
    op.create_table('customer_bank_accounts',
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('bank_name', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('bank_code', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('bank_bin', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('bank_branch', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
        sa.Column('account_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('account_holder', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_customer_bank_accounts_customer_id', 'customer_bank_accounts', ['customer_id'], unique=False)
    op.create_index('ix_customer_bank_accounts_is_primary', 'customer_bank_accounts', ['is_primary'], unique=False)
    op.create_index('ix_customer_bank_accounts_is_active', 'customer_bank_accounts', ['is_active'], unique=False)

    # Create customer_contacts table
    op.create_table('customer_contacts',
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('customer_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('contact_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False, server_default='GENERAL'),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('department', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('mobile', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('zalo', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_decision_maker', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_customer_contacts_customer_id', 'customer_contacts', ['customer_id'], unique=False)
    op.create_index('ix_customer_contacts_contact_type', 'customer_contacts', ['contact_type'], unique=False)
    op.create_index('ix_customer_contacts_is_primary', 'customer_contacts', ['is_primary'], unique=False)
    op.create_index('ix_customer_contacts_is_active', 'customer_contacts', ['is_active'], unique=False)


def downgrade() -> None:
    # Drop customer_contacts
    op.drop_index('ix_customer_contacts_is_active', table_name='customer_contacts')
    op.drop_index('ix_customer_contacts_is_primary', table_name='customer_contacts')
    op.drop_index('ix_customer_contacts_contact_type', table_name='customer_contacts')
    op.drop_index('ix_customer_contacts_customer_id', table_name='customer_contacts')
    op.drop_table('customer_contacts')

    # Drop customer_bank_accounts
    op.drop_index('ix_customer_bank_accounts_is_active', table_name='customer_bank_accounts')
    op.drop_index('ix_customer_bank_accounts_is_primary', table_name='customer_bank_accounts')
    op.drop_index('ix_customer_bank_accounts_customer_id', table_name='customer_bank_accounts')
    op.drop_table('customer_bank_accounts')

    # Drop customer_addresses
    op.drop_index('ix_customer_addresses_is_active', table_name='customer_addresses')
    op.drop_index('ix_customer_addresses_is_default', table_name='customer_addresses')
    op.drop_index('ix_customer_addresses_city', table_name='customer_addresses')
    op.drop_index('ix_customer_addresses_address_type', table_name='customer_addresses')
    op.drop_index('ix_customer_addresses_customer_id', table_name='customer_addresses')
    op.drop_table('customer_addresses')
