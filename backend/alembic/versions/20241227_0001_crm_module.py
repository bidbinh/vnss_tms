"""CRM Module - Complete Schema

Revision ID: 20241227_0001
Revises: 20241226_0003_driver_hrm_link
Create Date: 2024-12-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # === CUSTOMER GROUPS ===
    op.create_table('crm_customer_groups',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('discount_percent', sa.Float, default=0),
        sa.Column('credit_limit_default', sa.Float, default=0),
        sa.Column('payment_terms_default', sa.String(100), nullable=True),
        sa.Column('priority', sa.Integer, default=0),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === ACCOUNTS (CUSTOMERS/VENDORS) ===
    op.create_table('crm_accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('account_type', sa.String(20), nullable=False, default='CUSTOMER'),
        sa.Column('status', sa.String(20), nullable=False, default='ACTIVE'),
        sa.Column('industry', sa.String(50), nullable=True),
        sa.Column('customer_group_id', sa.String(36), nullable=True),

        # Tax & Legal
        sa.Column('tax_code', sa.String(50), nullable=True),
        sa.Column('business_license', sa.String(100), nullable=True),

        # Address
        sa.Column('address', sa.Text, nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('province', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), default='Vietnam'),
        sa.Column('postal_code', sa.String(20), nullable=True),

        # Contact
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('fax', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),

        # Financial
        sa.Column('credit_limit', sa.Float, default=0),
        sa.Column('credit_days', sa.Integer, default=30),
        sa.Column('payment_terms', sa.String(100), nullable=True),
        sa.Column('currency', sa.String(10), default='VND'),

        # Bank
        sa.Column('bank_name', sa.String(255), nullable=True),
        sa.Column('bank_branch', sa.String(255), nullable=True),
        sa.Column('bank_account', sa.String(50), nullable=True),
        sa.Column('bank_account_name', sa.String(255), nullable=True),

        # Logistics specific
        sa.Column('default_pickup_address', sa.Text, nullable=True),
        sa.Column('default_delivery_address', sa.Text, nullable=True),
        sa.Column('commodity_types', sa.String(255), nullable=True),
        sa.Column('volume_category', sa.String(50), nullable=True),
        sa.Column('service_preferences', sa.Text, nullable=True),

        # Metadata
        sa.Column('source', sa.String(50), nullable=True),
        sa.Column('assigned_to', sa.String(36), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),

        sa.ForeignKeyConstraint(['customer_group_id'], ['crm_customer_groups.id']),
    )

    # === CONTACTS ===
    op.create_table('crm_contacts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('account_id', sa.String(36), nullable=False, index=True),

        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False, index=True),
        sa.Column('title', sa.String(100), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),

        # Contact Info
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('mobile', sa.String(50), nullable=True),
        sa.Column('fax', sa.String(50), nullable=True),

        # Address
        sa.Column('address', sa.Text, nullable=True),
        sa.Column('city', sa.String(100), nullable=True),

        # Roles
        sa.Column('is_primary', sa.Boolean, default=False),
        sa.Column('is_billing_contact', sa.Boolean, default=False),
        sa.Column('is_shipping_contact', sa.Boolean, default=False),
        sa.Column('decision_maker', sa.Boolean, default=False),

        # Status
        sa.Column('status', sa.String(20), default='ACTIVE'),

        # Social
        sa.Column('linkedin', sa.String(255), nullable=True),
        sa.Column('zalo', sa.String(50), nullable=True),

        # Preferences
        sa.Column('preferred_contact_method', sa.String(20), nullable=True),
        sa.Column('preferred_language', sa.String(10), default='vi'),

        # Notes
        sa.Column('birthday', sa.String(20), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),

        sa.ForeignKeyConstraint(['account_id'], ['crm_accounts.id']),
    )

    # === LEADS ===
    op.create_table('crm_leads',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),

        # Lead Info
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False, index=True),
        sa.Column('company_name', sa.String(255), nullable=True),
        sa.Column('title', sa.String(100), nullable=True),

        # Contact
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('mobile', sa.String(50), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),

        # Address
        sa.Column('address', sa.Text, nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), default='Vietnam'),

        # Lead Details
        sa.Column('source', sa.String(50), nullable=True, index=True),
        sa.Column('status', sa.String(20), nullable=False, default='NEW', index=True),
        sa.Column('rating', sa.String(10), nullable=True),

        # Interest
        sa.Column('industry', sa.String(50), nullable=True),
        sa.Column('company_size', sa.String(50), nullable=True),
        sa.Column('annual_revenue', sa.Float, nullable=True),
        sa.Column('service_interest', sa.String(255), nullable=True),
        sa.Column('estimated_value', sa.Float, nullable=True),

        # Assignment
        sa.Column('assigned_to', sa.String(36), nullable=True),

        # Conversion
        sa.Column('converted_account_id', sa.String(36), nullable=True),
        sa.Column('converted_contact_id', sa.String(36), nullable=True),
        sa.Column('converted_opportunity_id', sa.String(36), nullable=True),
        sa.Column('converted_at', sa.String(30), nullable=True),
        sa.Column('converted_by', sa.String(36), nullable=True),

        # Notes
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === OPPORTUNITIES ===
    op.create_table('crm_opportunities',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),

        # Relations
        sa.Column('account_id', sa.String(36), nullable=False, index=True),
        sa.Column('contact_id', sa.String(36), nullable=True),

        # Pipeline
        sa.Column('stage', sa.String(30), nullable=False, default='QUALIFICATION', index=True),
        sa.Column('probability', sa.Float, default=10),

        # Value
        sa.Column('amount', sa.Float, default=0),
        sa.Column('currency', sa.String(10), default='VND'),

        # Dates
        sa.Column('expected_close_date', sa.String(20), nullable=True),
        sa.Column('actual_close_date', sa.String(20), nullable=True),

        # Details
        sa.Column('source', sa.String(50), nullable=True),
        sa.Column('product_interest', sa.String(255), nullable=True),
        sa.Column('service_type', sa.String(50), nullable=True),

        # Logistics specific
        sa.Column('origin', sa.String(255), nullable=True),
        sa.Column('destination', sa.String(255), nullable=True),
        sa.Column('frequency', sa.String(50), nullable=True),
        sa.Column('volume_estimate', sa.String(100), nullable=True),

        # Competition
        sa.Column('competitor', sa.String(255), nullable=True),
        sa.Column('competitor_price', sa.Float, nullable=True),

        # Assignment
        sa.Column('assigned_to', sa.String(36), nullable=True),

        # Close
        sa.Column('close_reason', sa.Text, nullable=True),

        # Notes
        sa.Column('next_step', sa.Text, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),

        sa.ForeignKeyConstraint(['account_id'], ['crm_accounts.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['crm_contacts.id']),
    )

    # === QUOTES ===
    op.create_table('crm_quotes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('quote_number', sa.String(50), nullable=False, index=True),
        sa.Column('version', sa.Integer, default=1),
        sa.Column('parent_quote_id', sa.String(36), nullable=True),

        # Relations
        sa.Column('account_id', sa.String(36), nullable=False, index=True),
        sa.Column('contact_id', sa.String(36), nullable=True),
        sa.Column('opportunity_id', sa.String(36), nullable=True, index=True),

        # Status
        sa.Column('status', sa.String(20), nullable=False, default='DRAFT'),

        # Pricing
        sa.Column('subtotal', sa.Float, default=0),
        sa.Column('discount_percent', sa.Float, default=0),
        sa.Column('discount_amount', sa.Float, default=0),
        sa.Column('tax_percent', sa.Float, default=10),
        sa.Column('tax_amount', sa.Float, default=0),
        sa.Column('total_amount', sa.Float, default=0),
        sa.Column('currency', sa.String(10), default='VND'),

        # Validity
        sa.Column('valid_until', sa.String(20), nullable=True),

        # Terms
        sa.Column('payment_terms', sa.Text, nullable=True),
        sa.Column('delivery_terms', sa.Text, nullable=True),
        sa.Column('terms_conditions', sa.Text, nullable=True),

        # Tracking
        sa.Column('sent_at', sa.String(30), nullable=True),
        sa.Column('viewed_at', sa.String(30), nullable=True),
        sa.Column('accepted_at', sa.String(30), nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),

        # Notes
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),

        sa.ForeignKeyConstraint(['account_id'], ['crm_accounts.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['crm_contacts.id']),
        sa.ForeignKeyConstraint(['opportunity_id'], ['crm_opportunities.id']),
    )

    # === QUOTE ITEMS ===
    op.create_table('crm_quote_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('quote_id', sa.String(36), nullable=False, index=True),
        sa.Column('line_number', sa.Integer, default=1),

        # Item Details
        sa.Column('service_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('route', sa.String(255), nullable=True),
        sa.Column('container_type', sa.String(50), nullable=True),

        # Pricing
        sa.Column('quantity', sa.Float, default=1),
        sa.Column('unit', sa.String(20), default='CONT'),
        sa.Column('unit_price', sa.Float, default=0),
        sa.Column('discount_percent', sa.Float, default=0),

        # Notes
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),

        sa.ForeignKeyConstraint(['quote_id'], ['crm_quotes.id']),
    )

    # === ACTIVITIES ===
    op.create_table('crm_activities',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Activity Info
        sa.Column('activity_type', sa.String(20), nullable=False, default='TASK', index=True),
        sa.Column('subject', sa.String(255), nullable=False, index=True),
        sa.Column('description', sa.Text, nullable=True),

        # Related Records
        sa.Column('account_id', sa.String(36), nullable=True, index=True),
        sa.Column('contact_id', sa.String(36), nullable=True),
        sa.Column('lead_id', sa.String(36), nullable=True, index=True),
        sa.Column('opportunity_id', sa.String(36), nullable=True, index=True),
        sa.Column('quote_id', sa.String(36), nullable=True),

        # Status
        sa.Column('status', sa.String(20), nullable=False, default='PLANNED', index=True),
        sa.Column('priority', sa.String(10), default='MEDIUM'),

        # Schedule
        sa.Column('start_date', sa.String(20), nullable=True),
        sa.Column('start_time', sa.String(10), nullable=True),
        sa.Column('end_date', sa.String(20), nullable=True),
        sa.Column('end_time', sa.String(10), nullable=True),
        sa.Column('duration_minutes', sa.Integer, nullable=True),

        # Call specific
        sa.Column('call_direction', sa.String(20), nullable=True),
        sa.Column('call_result', sa.String(20), nullable=True),
        sa.Column('phone_number', sa.String(50), nullable=True),

        # Email specific
        sa.Column('email_to', sa.String(255), nullable=True),
        sa.Column('email_cc', sa.String(255), nullable=True),
        sa.Column('email_status', sa.String(20), nullable=True),

        # Meeting specific
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('meeting_type', sa.String(20), nullable=True),
        sa.Column('meeting_link', sa.String(255), nullable=True),

        # Assignment
        sa.Column('assigned_to', sa.String(36), nullable=True),
        sa.Column('participants', sa.Text, nullable=True),

        # Reminder
        sa.Column('reminder_at', sa.String(30), nullable=True),
        sa.Column('reminded', sa.Boolean, default=False),

        # Completion
        sa.Column('completed_at', sa.String(30), nullable=True),
        sa.Column('completed_by', sa.String(36), nullable=True),
        sa.Column('outcome', sa.Text, nullable=True),

        # Next Action
        sa.Column('next_action', sa.Text, nullable=True),
        sa.Column('next_action_date', sa.String(20), nullable=True),

        # Notes
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),

        sa.ForeignKeyConstraint(['account_id'], ['crm_accounts.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['crm_contacts.id']),
        sa.ForeignKeyConstraint(['lead_id'], ['crm_leads.id']),
        sa.ForeignKeyConstraint(['opportunity_id'], ['crm_opportunities.id']),
        sa.ForeignKeyConstraint(['quote_id'], ['crm_quotes.id']),
    )

    # Create indexes for better performance
    op.create_index('ix_crm_accounts_tenant_status', 'crm_accounts', ['tenant_id', 'status'])
    op.create_index('ix_crm_accounts_tenant_type', 'crm_accounts', ['tenant_id', 'account_type'])
    op.create_index('ix_crm_leads_tenant_status', 'crm_leads', ['tenant_id', 'status'])
    op.create_index('ix_crm_opportunities_tenant_stage', 'crm_opportunities', ['tenant_id', 'stage'])
    op.create_index('ix_crm_activities_tenant_type_status', 'crm_activities', ['tenant_id', 'activity_type', 'status'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_crm_activities_tenant_type_status', table_name='crm_activities')
    op.drop_index('ix_crm_opportunities_tenant_stage', table_name='crm_opportunities')
    op.drop_index('ix_crm_leads_tenant_status', table_name='crm_leads')
    op.drop_index('ix_crm_accounts_tenant_type', table_name='crm_accounts')
    op.drop_index('ix_crm_accounts_tenant_status', table_name='crm_accounts')

    # Drop tables in reverse order
    op.drop_table('crm_activities')
    op.drop_table('crm_quote_items')
    op.drop_table('crm_quotes')
    op.drop_table('crm_opportunities')
    op.drop_table('crm_leads')
    op.drop_table('crm_contacts')
    op.drop_table('crm_accounts')
    op.drop_table('crm_customer_groups')
