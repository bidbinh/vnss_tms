"""add_accounting_tables_manual

Revision ID: c6bea02ad829
Revises: 151bc36f9180
Create Date: 2025-12-27 07:12:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c6bea02ad829'
down_revision: Union[str, None] = '151bc36f9180'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ====================
    # CHART OF ACCOUNTS
    # ====================

    # Fiscal Years
    op.create_table('acc_fiscal_years',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_closed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_by', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_acc_fiscal_years_tenant_id', 'acc_fiscal_years', ['tenant_id'])
    op.create_index('ix_acc_fiscal_years_code', 'acc_fiscal_years', ['code'])

    # Fiscal Periods
    op.create_table('acc_fiscal_periods',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('fiscal_year_id', sa.String(), nullable=False),
        sa.Column('period_number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('is_open', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_adjustment', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_by', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['fiscal_year_id'], ['acc_fiscal_years.id'])
    )
    op.create_index('ix_acc_fiscal_periods_tenant_id', 'acc_fiscal_periods', ['tenant_id'])

    # Chart of Accounts
    op.create_table('acc_chart_of_accounts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('account_code', sa.String(), nullable=False),
        sa.Column('account_name', sa.String(), nullable=False),
        sa.Column('account_name_en', sa.String(), nullable=True),
        sa.Column('parent_id', sa.String(), nullable=True),
        sa.Column('level', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_parent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('full_path', sa.String(), nullable=True),
        sa.Column('classification', sa.String(), nullable=False, server_default="'ASSET'"),
        sa.Column('nature', sa.String(), nullable=False, server_default="'DEBIT'"),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('allow_posting', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('require_partner', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_cost_center', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_project', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('allow_multi_currency', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('opening_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('opening_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('current_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('current_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['parent_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_chart_of_accounts_tenant_id', 'acc_chart_of_accounts', ['tenant_id'])
    op.create_index('ix_acc_chart_of_accounts_account_code', 'acc_chart_of_accounts', ['account_code'])
    op.create_index('ix_acc_chart_of_accounts_classification', 'acc_chart_of_accounts', ['classification'])

    # Cost Centers
    op.create_table('acc_cost_centers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('parent_id', sa.String(), nullable=True),
        sa.Column('manager_id', sa.String(), nullable=True),
        sa.Column('department_id', sa.String(), nullable=True),
        sa.Column('budget_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['parent_id'], ['acc_cost_centers.id'])
    )
    op.create_index('ix_acc_cost_centers_tenant_id', 'acc_cost_centers', ['tenant_id'])
    op.create_index('ix_acc_cost_centers_code', 'acc_cost_centers', ['code'])

    # Projects
    op.create_table('acc_projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('customer_id', sa.String(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('budget_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('actual_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'ACTIVE'"),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_acc_projects_tenant_id', 'acc_projects', ['tenant_id'])
    op.create_index('ix_acc_projects_code', 'acc_projects', ['code'])

    # ====================
    # JOURNALS
    # ====================

    # Journals
    op.create_table('acc_journals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('journal_type', sa.String(), nullable=False, server_default="'GENERAL'"),
        sa.Column('default_debit_account_id', sa.String(), nullable=True),
        sa.Column('default_credit_account_id', sa.String(), nullable=True),
        sa.Column('sequence_prefix', sa.String(), nullable=False, server_default="'JE'"),
        sa.Column('next_sequence', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sequence_padding', sa.Integer(), nullable=False, server_default='6'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['default_debit_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['default_credit_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_journals_tenant_id', 'acc_journals', ['tenant_id'])
    op.create_index('ix_acc_journals_code', 'acc_journals', ['code'])
    op.create_index('ix_acc_journals_journal_type', 'acc_journals', ['journal_type'])

    # Journal Entries
    op.create_table('acc_journal_entries',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('journal_id', sa.String(), nullable=False),
        sa.Column('entry_number', sa.String(), nullable=False),
        sa.Column('entry_date', sa.DateTime(), nullable=False),
        sa.Column('fiscal_year_id', sa.String(), nullable=False),
        sa.Column('fiscal_period_id', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('reference', sa.String(), nullable=True),
        sa.Column('source_type', sa.String(), nullable=True),
        sa.Column('source_id', sa.String(), nullable=True),
        sa.Column('total_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('total_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('posted_by', sa.String(), nullable=True),
        sa.Column('reversed_entry_id', sa.String(), nullable=True),
        sa.Column('reversal_of_id', sa.String(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['journal_id'], ['acc_journals.id']),
        sa.ForeignKeyConstraint(['fiscal_year_id'], ['acc_fiscal_years.id']),
        sa.ForeignKeyConstraint(['fiscal_period_id'], ['acc_fiscal_periods.id'])
    )
    op.create_index('ix_acc_journal_entries_tenant_id', 'acc_journal_entries', ['tenant_id'])
    op.create_index('ix_acc_journal_entries_entry_number', 'acc_journal_entries', ['entry_number'])
    op.create_index('ix_acc_journal_entries_entry_date', 'acc_journal_entries', ['entry_date'])
    op.create_index('ix_acc_journal_entries_status', 'acc_journal_entries', ['status'])

    # Journal Entry Lines
    op.create_table('acc_journal_entry_lines',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('journal_entry_id', sa.String(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('account_id', sa.String(), nullable=False),
        sa.Column('account_code', sa.String(), nullable=False),
        sa.Column('debit_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('credit_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('amount_currency', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('partner_id', sa.String(), nullable=True),
        sa.Column('partner_type', sa.String(), nullable=True),
        sa.Column('cost_center_id', sa.String(), nullable=True),
        sa.Column('project_id', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('tax_id', sa.String(), nullable=True),
        sa.Column('tax_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('is_reconciled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reconcile_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id']),
        sa.ForeignKeyConstraint(['account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['cost_center_id'], ['acc_cost_centers.id']),
        sa.ForeignKeyConstraint(['project_id'], ['acc_projects.id'])
    )
    op.create_index('ix_acc_journal_entry_lines_tenant_id', 'acc_journal_entry_lines', ['tenant_id'])
    op.create_index('ix_acc_journal_entry_lines_journal_entry_id', 'acc_journal_entry_lines', ['journal_entry_id'])
    op.create_index('ix_acc_journal_entry_lines_account_id', 'acc_journal_entry_lines', ['account_id'])

    # General Ledger
    op.create_table('acc_general_ledger',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('account_id', sa.String(), nullable=False),
        sa.Column('account_code', sa.String(), nullable=False),
        sa.Column('fiscal_year_id', sa.String(), nullable=False),
        sa.Column('fiscal_period_id', sa.String(), nullable=False),
        sa.Column('opening_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('opening_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('period_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('period_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('closing_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('closing_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('partner_id', sa.String(), nullable=True),
        sa.Column('last_entry_id', sa.String(), nullable=True),
        sa.Column('last_entry_date', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['fiscal_year_id'], ['acc_fiscal_years.id']),
        sa.ForeignKeyConstraint(['fiscal_period_id'], ['acc_fiscal_periods.id'])
    )
    op.create_index('ix_acc_general_ledger_tenant_id', 'acc_general_ledger', ['tenant_id'])
    op.create_index('ix_acc_general_ledger_account_id', 'acc_general_ledger', ['account_id'])

    # Account Balances
    op.create_table('acc_account_balances',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('account_id', sa.String(), nullable=False),
        sa.Column('balance_date', sa.DateTime(), nullable=False),
        sa.Column('debit_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('credit_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('currency_debit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency_credit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_account_balances_tenant_id', 'acc_account_balances', ['tenant_id'])
    op.create_index('ix_acc_account_balances_account_id', 'acc_account_balances', ['account_id'])
    op.create_index('ix_acc_account_balances_balance_date', 'acc_account_balances', ['balance_date'])

    # ====================
    # TAX
    # ====================

    # Tax Rates
    op.create_table('acc_tax_rates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('tax_type', sa.String(), nullable=False, server_default="'VAT'"),
        sa.Column('rate', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('rate_type', sa.String(), nullable=False, server_default="'PERCENTAGE'"),
        sa.Column('vat_type', sa.String(), nullable=True),
        sa.Column('tax_account_id', sa.String(), nullable=True),
        sa.Column('refund_account_id', sa.String(), nullable=True),
        sa.Column('effective_from', sa.DateTime(), nullable=True),
        sa.Column('effective_to', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tax_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['refund_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_tax_rates_tenant_id', 'acc_tax_rates', ['tenant_id'])
    op.create_index('ix_acc_tax_rates_code', 'acc_tax_rates', ['code'])
    op.create_index('ix_acc_tax_rates_tax_type', 'acc_tax_rates', ['tax_type'])

    # ====================
    # BANKING
    # ====================

    # Bank Accounts
    op.create_table('acc_bank_accounts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=False, server_default="'CURRENT'"),
        sa.Column('bank_name', sa.String(), nullable=True),
        sa.Column('bank_branch', sa.String(), nullable=True),
        sa.Column('account_number', sa.String(), nullable=True),
        sa.Column('account_holder', sa.String(), nullable=True),
        sa.Column('swift_code', sa.String(), nullable=True),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('current_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('available_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('opening_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('opening_date', sa.DateTime(), nullable=True),
        sa.Column('gl_account_id', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default="'ACTIVE'"),
        sa.Column('last_reconcile_date', sa.DateTime(), nullable=True),
        sa.Column('last_reconcile_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['gl_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_bank_accounts_tenant_id', 'acc_bank_accounts', ['tenant_id'])
    op.create_index('ix_acc_bank_accounts_code', 'acc_bank_accounts', ['code'])
    op.create_index('ix_acc_bank_accounts_account_number', 'acc_bank_accounts', ['account_number'])
    op.create_index('ix_acc_bank_accounts_status', 'acc_bank_accounts', ['status'])

    # Bank Reconciliations
    op.create_table('acc_bank_reconciliations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('bank_account_id', sa.String(), nullable=False),
        sa.Column('reconciliation_date', sa.DateTime(), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('statement_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('book_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('deposits_in_transit', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('outstanding_checks', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('bank_charges', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('bank_interest', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('other_adjustments', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('adjusted_statement_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('adjusted_book_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('difference', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('completed_by', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['bank_account_id'], ['acc_bank_accounts.id'])
    )
    op.create_index('ix_acc_bank_reconciliations_tenant_id', 'acc_bank_reconciliations', ['tenant_id'])
    op.create_index('ix_acc_bank_reconciliations_bank_account_id', 'acc_bank_reconciliations', ['bank_account_id'])

    # Bank Transactions
    op.create_table('acc_bank_transactions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('bank_account_id', sa.String(), nullable=False),
        sa.Column('transaction_number', sa.String(), nullable=False),
        sa.Column('transaction_date', sa.DateTime(), nullable=False),
        sa.Column('value_date', sa.DateTime(), nullable=True),
        sa.Column('transaction_type', sa.String(), nullable=False, server_default="'CREDIT'"),
        sa.Column('amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('amount_vnd', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('running_balance', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('partner_id', sa.String(), nullable=True),
        sa.Column('partner_name', sa.String(), nullable=True),
        sa.Column('partner_bank_account', sa.String(), nullable=True),
        sa.Column('reference', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('source_type', sa.String(), nullable=True),
        sa.Column('source_id', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default="'PENDING'"),
        sa.Column('is_reconciled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reconciliation_id', sa.String(), nullable=True),
        sa.Column('reconciled_date', sa.DateTime(), nullable=True),
        sa.Column('journal_entry_id', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['bank_account_id'], ['acc_bank_accounts.id']),
        sa.ForeignKeyConstraint(['reconciliation_id'], ['acc_bank_reconciliations.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id'])
    )
    op.create_index('ix_acc_bank_transactions_tenant_id', 'acc_bank_transactions', ['tenant_id'])
    op.create_index('ix_acc_bank_transactions_bank_account_id', 'acc_bank_transactions', ['bank_account_id'])
    op.create_index('ix_acc_bank_transactions_transaction_date', 'acc_bank_transactions', ['transaction_date'])
    op.create_index('ix_acc_bank_transactions_status', 'acc_bank_transactions', ['status'])

    # ====================
    # ACCOUNTS RECEIVABLE
    # ====================

    # Customer Invoices
    op.create_table('acc_customer_invoices',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('invoice_number', sa.String(), nullable=False),
        sa.Column('invoice_date', sa.DateTime(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('invoice_type', sa.String(), nullable=False, server_default="'SALES'"),
        sa.Column('customer_id', sa.String(), nullable=False),
        sa.Column('customer_code', sa.String(), nullable=True),
        sa.Column('customer_name', sa.String(), nullable=False),
        sa.Column('customer_tax_code', sa.String(), nullable=True),
        sa.Column('customer_address', sa.String(), nullable=True),
        sa.Column('vat_invoice_number', sa.String(), nullable=True),
        sa.Column('vat_invoice_date', sa.DateTime(), nullable=True),
        sa.Column('vat_invoice_series', sa.String(), nullable=True),
        sa.Column('source_type', sa.String(), nullable=True),
        sa.Column('source_id', sa.String(), nullable=True),
        sa.Column('subtotal', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('total_amount_vnd', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('paid_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('balance_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('payment_terms', sa.String(), nullable=True),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('journal_entry_id', sa.String(), nullable=True),
        sa.Column('receivable_account_id', sa.String(), nullable=True),
        sa.Column('revenue_account_id', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('internal_notes', sa.String(), nullable=True),
        sa.Column('validated_at', sa.DateTime(), nullable=True),
        sa.Column('validated_by', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id']),
        sa.ForeignKeyConstraint(['receivable_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['revenue_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_customer_invoices_tenant_id', 'acc_customer_invoices', ['tenant_id'])
    op.create_index('ix_acc_customer_invoices_invoice_number', 'acc_customer_invoices', ['invoice_number'])
    op.create_index('ix_acc_customer_invoices_customer_id', 'acc_customer_invoices', ['customer_id'])
    op.create_index('ix_acc_customer_invoices_status', 'acc_customer_invoices', ['status'])

    # Customer Invoice Lines
    op.create_table('acc_customer_invoice_lines',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('invoice_id', sa.String(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('product_id', sa.String(), nullable=True),
        sa.Column('product_code', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('quantity', sa.Numeric(15, 4), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('tax_id', sa.String(), nullable=True),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('line_total', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('revenue_account_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['invoice_id'], ['acc_customer_invoices.id']),
        sa.ForeignKeyConstraint(['tax_id'], ['acc_tax_rates.id']),
        sa.ForeignKeyConstraint(['revenue_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_customer_invoice_lines_tenant_id', 'acc_customer_invoice_lines', ['tenant_id'])
    op.create_index('ix_acc_customer_invoice_lines_invoice_id', 'acc_customer_invoice_lines', ['invoice_id'])

    # Payment Receipts
    op.create_table('acc_payment_receipts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('receipt_number', sa.String(), nullable=False),
        sa.Column('receipt_date', sa.DateTime(), nullable=False),
        sa.Column('customer_id', sa.String(), nullable=False),
        sa.Column('customer_code', sa.String(), nullable=True),
        sa.Column('customer_name', sa.String(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=False, server_default="'CASH'"),
        sa.Column('bank_account_id', sa.String(), nullable=True),
        sa.Column('bank_reference', sa.String(), nullable=True),
        sa.Column('bank_transaction_date', sa.DateTime(), nullable=True),
        sa.Column('amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('amount_vnd', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('allocated_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('unallocated_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('journal_entry_id', sa.String(), nullable=True),
        sa.Column('debit_account_id', sa.String(), nullable=True),
        sa.Column('credit_account_id', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('confirmed_by', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['bank_account_id'], ['acc_bank_accounts.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id']),
        sa.ForeignKeyConstraint(['debit_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['credit_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_payment_receipts_tenant_id', 'acc_payment_receipts', ['tenant_id'])
    op.create_index('ix_acc_payment_receipts_receipt_number', 'acc_payment_receipts', ['receipt_number'])
    op.create_index('ix_acc_payment_receipts_customer_id', 'acc_payment_receipts', ['customer_id'])
    op.create_index('ix_acc_payment_receipts_status', 'acc_payment_receipts', ['status'])

    # Payment Receipt Allocations
    op.create_table('acc_payment_receipt_allocations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('receipt_id', sa.String(), nullable=False),
        sa.Column('invoice_id', sa.String(), nullable=False),
        sa.Column('allocated_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('allocation_date', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['receipt_id'], ['acc_payment_receipts.id']),
        sa.ForeignKeyConstraint(['invoice_id'], ['acc_customer_invoices.id'])
    )
    op.create_index('ix_acc_payment_receipt_allocations_tenant_id', 'acc_payment_receipt_allocations', ['tenant_id'])

    # ====================
    # ACCOUNTS PAYABLE
    # ====================

    # Vendor Invoices
    op.create_table('acc_vendor_invoices',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('invoice_number', sa.String(), nullable=False),
        sa.Column('invoice_date', sa.DateTime(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('invoice_type', sa.String(), nullable=False, server_default="'PURCHASE'"),
        sa.Column('vendor_id', sa.String(), nullable=False),
        sa.Column('vendor_code', sa.String(), nullable=True),
        sa.Column('vendor_name', sa.String(), nullable=False),
        sa.Column('vendor_tax_code', sa.String(), nullable=True),
        sa.Column('vendor_address', sa.String(), nullable=True),
        sa.Column('vendor_invoice_number', sa.String(), nullable=False),
        sa.Column('vendor_invoice_date', sa.DateTime(), nullable=True),
        sa.Column('vendor_invoice_series', sa.String(), nullable=True),
        sa.Column('source_type', sa.String(), nullable=True),
        sa.Column('source_id', sa.String(), nullable=True),
        sa.Column('purchase_order_id', sa.String(), nullable=True),
        sa.Column('goods_receipt_id', sa.String(), nullable=True),
        sa.Column('is_matched', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('subtotal', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('total_amount_vnd', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('paid_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('balance_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('payment_terms', sa.String(), nullable=True),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('journal_entry_id', sa.String(), nullable=True),
        sa.Column('payable_account_id', sa.String(), nullable=True),
        sa.Column('expense_account_id', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('internal_notes', sa.String(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id']),
        sa.ForeignKeyConstraint(['payable_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['expense_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_vendor_invoices_tenant_id', 'acc_vendor_invoices', ['tenant_id'])
    op.create_index('ix_acc_vendor_invoices_invoice_number', 'acc_vendor_invoices', ['invoice_number'])
    op.create_index('ix_acc_vendor_invoices_vendor_id', 'acc_vendor_invoices', ['vendor_id'])
    op.create_index('ix_acc_vendor_invoices_status', 'acc_vendor_invoices', ['status'])

    # Vendor Invoice Lines
    op.create_table('acc_vendor_invoice_lines',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('invoice_id', sa.String(), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('product_id', sa.String(), nullable=True),
        sa.Column('product_code', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('quantity', sa.Numeric(15, 4), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('tax_id', sa.String(), nullable=True),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('line_total', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('po_line_id', sa.String(), nullable=True),
        sa.Column('receipt_line_id', sa.String(), nullable=True),
        sa.Column('received_quantity', sa.Numeric(15, 4), nullable=False, server_default='0'),
        sa.Column('expense_account_id', sa.String(), nullable=True),
        sa.Column('cost_center_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['invoice_id'], ['acc_vendor_invoices.id']),
        sa.ForeignKeyConstraint(['tax_id'], ['acc_tax_rates.id']),
        sa.ForeignKeyConstraint(['expense_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['cost_center_id'], ['acc_cost_centers.id'])
    )
    op.create_index('ix_acc_vendor_invoice_lines_tenant_id', 'acc_vendor_invoice_lines', ['tenant_id'])
    op.create_index('ix_acc_vendor_invoice_lines_invoice_id', 'acc_vendor_invoice_lines', ['invoice_id'])

    # Payment Vouchers
    op.create_table('acc_payment_vouchers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('voucher_number', sa.String(), nullable=False),
        sa.Column('voucher_date', sa.DateTime(), nullable=False),
        sa.Column('vendor_id', sa.String(), nullable=False),
        sa.Column('vendor_code', sa.String(), nullable=True),
        sa.Column('vendor_name', sa.String(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=False, server_default="'BANK_TRANSFER'"),
        sa.Column('bank_account_id', sa.String(), nullable=True),
        sa.Column('beneficiary_bank', sa.String(), nullable=True),
        sa.Column('beneficiary_account', sa.String(), nullable=True),
        sa.Column('beneficiary_name', sa.String(), nullable=True),
        sa.Column('bank_reference', sa.String(), nullable=True),
        sa.Column('amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('exchange_rate', sa.Numeric(15, 6), nullable=False, server_default='1'),
        sa.Column('amount_vnd', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('allocated_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('unallocated_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('journal_entry_id', sa.String(), nullable=True),
        sa.Column('debit_account_id', sa.String(), nullable=True),
        sa.Column('credit_account_id', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.String(), nullable=True),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('posted_by', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['bank_account_id'], ['acc_bank_accounts.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id']),
        sa.ForeignKeyConstraint(['debit_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['credit_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_payment_vouchers_tenant_id', 'acc_payment_vouchers', ['tenant_id'])
    op.create_index('ix_acc_payment_vouchers_voucher_number', 'acc_payment_vouchers', ['voucher_number'])
    op.create_index('ix_acc_payment_vouchers_vendor_id', 'acc_payment_vouchers', ['vendor_id'])
    op.create_index('ix_acc_payment_vouchers_status', 'acc_payment_vouchers', ['status'])

    # Payment Voucher Allocations
    op.create_table('acc_payment_voucher_allocations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('voucher_id', sa.String(), nullable=False),
        sa.Column('invoice_id', sa.String(), nullable=False),
        sa.Column('allocated_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('allocation_date', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['voucher_id'], ['acc_payment_vouchers.id']),
        sa.ForeignKeyConstraint(['invoice_id'], ['acc_vendor_invoices.id'])
    )
    op.create_index('ix_acc_payment_voucher_allocations_tenant_id', 'acc_payment_voucher_allocations', ['tenant_id'])

    # ====================
    # FIXED ASSETS
    # ====================

    # Fixed Asset Categories
    op.create_table('acc_fixed_asset_categories',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category_type', sa.String(), nullable=False, server_default="'MACHINERY'"),
        sa.Column('default_useful_life', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('default_depreciation_method', sa.String(), nullable=False, server_default="'STRAIGHT_LINE'"),
        sa.Column('default_salvage_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('asset_account_id', sa.String(), nullable=True),
        sa.Column('depreciation_account_id', sa.String(), nullable=True),
        sa.Column('expense_account_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['asset_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['depreciation_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['expense_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_fixed_asset_categories_tenant_id', 'acc_fixed_asset_categories', ['tenant_id'])
    op.create_index('ix_acc_fixed_asset_categories_code', 'acc_fixed_asset_categories', ['code'])

    # Fixed Assets
    op.create_table('acc_fixed_assets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('asset_code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('category_id', sa.String(), nullable=False),
        sa.Column('category_code', sa.String(), nullable=True),
        sa.Column('serial_number', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('manufacturer', sa.String(), nullable=True),
        sa.Column('specifications', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('department_id', sa.String(), nullable=True),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('cost_center_id', sa.String(), nullable=True),
        sa.Column('vehicle_id', sa.String(), nullable=True),
        sa.Column('acquisition_date', sa.DateTime(), nullable=False),
        sa.Column('in_service_date', sa.DateTime(), nullable=True),
        sa.Column('purchase_order_id', sa.String(), nullable=True),
        sa.Column('vendor_id', sa.String(), nullable=True),
        sa.Column('invoice_number', sa.String(), nullable=True),
        sa.Column('invoice_date', sa.DateTime(), nullable=True),
        sa.Column('purchase_price', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('additional_costs', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('original_cost', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('revalued_cost', sa.Numeric(20, 2), nullable=True),
        sa.Column('salvage_value', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('depreciable_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(), nullable=False, server_default="'VND'"),
        sa.Column('depreciation_method', sa.String(), nullable=False, server_default="'STRAIGHT_LINE'"),
        sa.Column('useful_life_months', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('remaining_life_months', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('depreciation_start_date', sa.DateTime(), nullable=True),
        sa.Column('monthly_depreciation', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('accumulated_depreciation', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('book_value', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('disposal_date', sa.DateTime(), nullable=True),
        sa.Column('disposal_type', sa.String(), nullable=True),
        sa.Column('disposal_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('disposal_gain_loss', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default="'DRAFT'"),
        sa.Column('is_fully_depreciated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('insured_value', sa.Numeric(20, 2), nullable=True),
        sa.Column('insurance_policy', sa.String(), nullable=True),
        sa.Column('insurance_expiry', sa.DateTime(), nullable=True),
        sa.Column('warranty_expiry', sa.DateTime(), nullable=True),
        sa.Column('asset_account_id', sa.String(), nullable=True),
        sa.Column('depreciation_account_id', sa.String(), nullable=True),
        sa.Column('expense_account_id', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['category_id'], ['acc_fixed_asset_categories.id']),
        sa.ForeignKeyConstraint(['cost_center_id'], ['acc_cost_centers.id']),
        sa.ForeignKeyConstraint(['asset_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['depreciation_account_id'], ['acc_chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['expense_account_id'], ['acc_chart_of_accounts.id'])
    )
    op.create_index('ix_acc_fixed_assets_tenant_id', 'acc_fixed_assets', ['tenant_id'])
    op.create_index('ix_acc_fixed_assets_asset_code', 'acc_fixed_assets', ['asset_code'])
    op.create_index('ix_acc_fixed_assets_category_id', 'acc_fixed_assets', ['category_id'])
    op.create_index('ix_acc_fixed_assets_status', 'acc_fixed_assets', ['status'])

    # Asset Depreciations
    op.create_table('acc_asset_depreciations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('fiscal_year_id', sa.String(), nullable=False),
        sa.Column('fiscal_period_id', sa.String(), nullable=False),
        sa.Column('depreciation_date', sa.DateTime(), nullable=False),
        sa.Column('opening_book_value', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('depreciation_amount', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('accumulated_depreciation', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('closing_book_value', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('journal_entry_id', sa.String(), nullable=True),
        sa.Column('is_posted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('posted_by', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['asset_id'], ['acc_fixed_assets.id']),
        sa.ForeignKeyConstraint(['fiscal_year_id'], ['acc_fiscal_years.id']),
        sa.ForeignKeyConstraint(['fiscal_period_id'], ['acc_fiscal_periods.id']),
        sa.ForeignKeyConstraint(['journal_entry_id'], ['acc_journal_entries.id'])
    )
    op.create_index('ix_acc_asset_depreciations_tenant_id', 'acc_asset_depreciations', ['tenant_id'])
    op.create_index('ix_acc_asset_depreciations_asset_id', 'acc_asset_depreciations', ['asset_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('acc_asset_depreciations')
    op.drop_table('acc_fixed_assets')
    op.drop_table('acc_fixed_asset_categories')
    op.drop_table('acc_payment_voucher_allocations')
    op.drop_table('acc_payment_vouchers')
    op.drop_table('acc_vendor_invoice_lines')
    op.drop_table('acc_vendor_invoices')
    op.drop_table('acc_payment_receipt_allocations')
    op.drop_table('acc_payment_receipts')
    op.drop_table('acc_customer_invoice_lines')
    op.drop_table('acc_customer_invoices')
    op.drop_table('acc_bank_transactions')
    op.drop_table('acc_bank_reconciliations')
    op.drop_table('acc_bank_accounts')
    op.drop_table('acc_tax_rates')
    op.drop_table('acc_account_balances')
    op.drop_table('acc_general_ledger')
    op.drop_table('acc_journal_entry_lines')
    op.drop_table('acc_journal_entries')
    op.drop_table('acc_journals')
    op.drop_table('acc_projects')
    op.drop_table('acc_cost_centers')
    op.drop_table('acc_chart_of_accounts')
    op.drop_table('acc_fiscal_periods')
    op.drop_table('acc_fiscal_years')
