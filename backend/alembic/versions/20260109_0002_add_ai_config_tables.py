"""Add AI configuration tables

Revision ID: 20260109_0002
Revises: 20260109_0001
Create Date: 2026-01-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260109_0002'
down_revision = '20260109_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Create ai_providers table
    op.create_table(
        'ai_providers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('provider_code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('provider_name', sa.String(100), nullable=False),
        sa.Column('api_key', sa.Text(), nullable=True),
        sa.Column('api_endpoint', sa.String(500), nullable=True),
        sa.Column('default_model', sa.String(100), nullable=True),
        sa.Column('available_models', sa.Text(), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), default=False),
        sa.Column('is_configured', sa.Boolean(), default=False),
        sa.Column('max_requests_per_minute', sa.Integer(), default=60),
        sa.Column('max_tokens_per_request', sa.Integer(), default=100000),
        sa.Column('cost_per_1m_input_tokens', sa.Float(), default=0.0),
        sa.Column('cost_per_1m_output_tokens', sa.Float(), default=0.0),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )

    # Create ai_feature_configs table
    op.create_table(
        'ai_feature_configs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('feature_code', sa.String(50), nullable=False, index=True),
        sa.Column('feature_name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_code', sa.String(20), nullable=True),
        sa.Column('provider_priority', sa.Text(), default='["claude"]'),
        sa.Column('preferred_model', sa.String(100), nullable=True),
        sa.Column('max_retries', sa.Integer(), default=3),
        sa.Column('timeout_seconds', sa.Integer(), default=120),
        sa.Column('fallback_enabled', sa.Boolean(), default=True),
        sa.Column('is_enabled', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )

    # Create ai_usage_logs table
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=True, index=True),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('feature_code', sa.String(50), nullable=False, index=True),
        sa.Column('provider_code', sa.String(50), nullable=False, index=True),
        sa.Column('model_used', sa.String(100), nullable=False),
        sa.Column('input_tokens', sa.Integer(), default=0),
        sa.Column('output_tokens', sa.Integer(), default=0),
        sa.Column('total_tokens', sa.Integer(), default=0),
        sa.Column('estimated_cost', sa.Float(), default=0.0),
        sa.Column('latency_ms', sa.Integer(), default=0),
        sa.Column('success', sa.Boolean(), default=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
    )

    # Seed default AI providers
    op.execute("""
        INSERT INTO ai_providers (id, provider_code, provider_name, default_model, available_models, cost_per_1m_input_tokens, cost_per_1m_output_tokens, is_enabled, is_configured)
        VALUES
        ('prov-claude', 'claude', 'Anthropic Claude', 'claude-3-5-sonnet-20241022', '["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]', 3.0, 15.0, false, false),
        ('prov-gemini', 'gemini', 'Google Gemini', 'gemini-1.5-flash', '["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]', 0.075, 0.30, false, false),
        ('prov-openai', 'openai', 'OpenAI GPT', 'gpt-4o', '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]', 2.5, 10.0, false, false)
    """)

    # Seed default AI features
    op.execute("""
        INSERT INTO ai_feature_configs (id, feature_code, feature_name, description, module_code, provider_priority, is_enabled)
        VALUES
        ('feat-doc-parser', 'document_parser', 'Document Parser', 'Extract data from PDF documents (Invoice, Packing List, B/L)', 'fms', '["gemini", "claude"]', true),
        ('feat-hs-suggest', 'hs_code_suggest', 'HS Code Suggestion', 'Suggest HS codes based on product description', 'fms', '["claude", "gemini"]', true),
        ('feat-translation', 'translation', 'Translation', 'Translate text between languages', null, '["gemini", "claude"]', true),
        ('feat-data-extract', 'data_extraction', 'Data Extraction', 'Extract structured data from unstructured text', null, '["gemini", "claude"]', true),
        ('feat-email-parse', 'email_parser', 'Email Parser', 'Parse and extract data from emails', null, '["gemini", "claude"]', true)
    """)


def downgrade():
    op.drop_table('ai_usage_logs')
    op.drop_table('ai_feature_configs')
    op.drop_table('ai_providers')
