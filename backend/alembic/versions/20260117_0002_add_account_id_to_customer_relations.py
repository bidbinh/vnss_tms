"""Add account_id to customer relations tables for CRM unification

Revision ID: 20260117_0002
Revises: 20260117_0001
Create Date: 2026-01-17 14:00:00

This migration adds account_id column to:
- customer_addresses
- customer_bank_accounts
- customer_contacts

This enables unified access from both TMS (via customer_id) and CRM (via account_id).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '20260117_0002'
down_revision: Union[str, None] = '20260117_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add account_id to customer_addresses
    op.add_column('customer_addresses',
        sa.Column('account_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.create_index('ix_customer_addresses_account_id', 'customer_addresses', ['account_id'], unique=False)
    op.create_foreign_key(
        'fk_customer_addresses_account_id',
        'customer_addresses', 'crm_accounts',
        ['account_id'], ['id']
    )

    # Make customer_id nullable (for new records created via CRM)
    op.alter_column('customer_addresses', 'customer_id',
        existing_type=sa.String(),
        nullable=True
    )

    # Add account_id to customer_bank_accounts
    op.add_column('customer_bank_accounts',
        sa.Column('account_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.create_index('ix_customer_bank_accounts_account_id', 'customer_bank_accounts', ['account_id'], unique=False)
    op.create_foreign_key(
        'fk_customer_bank_accounts_account_id',
        'customer_bank_accounts', 'crm_accounts',
        ['account_id'], ['id']
    )

    # Make customer_id nullable
    op.alter_column('customer_bank_accounts', 'customer_id',
        existing_type=sa.String(),
        nullable=True
    )

    # Add account_id to customer_contacts
    op.add_column('customer_contacts',
        sa.Column('account_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.create_index('ix_customer_contacts_account_id', 'customer_contacts', ['account_id'], unique=False)
    op.create_foreign_key(
        'fk_customer_contacts_account_id',
        'customer_contacts', 'crm_accounts',
        ['account_id'], ['id']
    )

    # Make customer_id nullable
    op.alter_column('customer_contacts', 'customer_id',
        existing_type=sa.String(),
        nullable=True
    )

    # Populate account_id from existing customer.crm_account_id links
    # This is done via raw SQL for efficiency
    op.execute("""
        UPDATE customer_addresses ca
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE ca.customer_id = c.id
        AND c.crm_account_id IS NOT NULL
        AND ca.account_id IS NULL
    """)

    op.execute("""
        UPDATE customer_bank_accounts cba
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE cba.customer_id = c.id
        AND c.crm_account_id IS NOT NULL
        AND cba.account_id IS NULL
    """)

    op.execute("""
        UPDATE customer_contacts cc
        SET account_id = c.crm_account_id
        FROM customers c
        WHERE cc.customer_id = c.id
        AND c.crm_account_id IS NOT NULL
        AND cc.account_id IS NULL
    """)


def downgrade() -> None:
    # Remove account_id from customer_contacts
    op.drop_constraint('fk_customer_contacts_account_id', 'customer_contacts', type_='foreignkey')
    op.drop_index('ix_customer_contacts_account_id', table_name='customer_contacts')
    op.drop_column('customer_contacts', 'account_id')
    op.alter_column('customer_contacts', 'customer_id',
        existing_type=sa.String(),
        nullable=False
    )

    # Remove account_id from customer_bank_accounts
    op.drop_constraint('fk_customer_bank_accounts_account_id', 'customer_bank_accounts', type_='foreignkey')
    op.drop_index('ix_customer_bank_accounts_account_id', table_name='customer_bank_accounts')
    op.drop_column('customer_bank_accounts', 'account_id')
    op.alter_column('customer_bank_accounts', 'customer_id',
        existing_type=sa.String(),
        nullable=False
    )

    # Remove account_id from customer_addresses
    op.drop_constraint('fk_customer_addresses_account_id', 'customer_addresses', type_='foreignkey')
    op.drop_index('ix_customer_addresses_account_id', table_name='customer_addresses')
    op.drop_column('customer_addresses', 'account_id')
    op.alter_column('customer_addresses', 'customer_id',
        existing_type=sa.String(),
        nullable=False
    )
