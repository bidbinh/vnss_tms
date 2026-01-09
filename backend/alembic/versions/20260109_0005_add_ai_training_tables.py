"""Add AI Training/Feedback tables for document parsing

Revision ID: 20260109_0005
Revises: 20260109_0004
Create Date: 2026-01-09

Tables:
- fms_ai_parsing_sessions: Master session record
- fms_ai_parsing_outputs: AI raw output per field
- fms_ai_corrections: User correction history
- fms_ai_customer_rules: Per-customer mapping rules

Also alters:
- fms_customs_exporters: Add matching columns
- fms_customs_importers: Add matching columns
"""
from alembic import op
import sqlalchemy as sa

revision = '20260109_0005'
down_revision = '20260109_0004'
branch_labels = None
depends_on = None


def upgrade():
    # ============================================================
    # AI Parsing Sessions - Master record for each parsing operation
    # ============================================================
    op.create_table(
        'fms_ai_parsing_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Session identification
        sa.Column('session_code', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), default='DRAFT'),  # DRAFT, REVIEW, APPROVED, CANCELLED

        # Source documents
        sa.Column('original_files', sa.JSON),  # [{file_id, filename, storage_path}]
        sa.Column('document_types', sa.JSON),  # ["INVOICE", "BILL_OF_LADING"]

        # AI parsing metadata
        sa.Column('ai_provider_used', sa.String(50)),
        sa.Column('ai_model_used', sa.String(100)),
        sa.Column('ai_confidence', sa.Numeric(5, 4)),
        sa.Column('ai_latency_ms', sa.Integer),
        sa.Column('ai_tokens_used', sa.Integer),

        # Customer context (for learning)
        sa.Column('customer_id', sa.String(36), index=True),
        sa.Column('shipper_name', sa.String(255)),
        sa.Column('shipper_pattern_hash', sa.String(64), index=True),

        # Result tracking
        sa.Column('declaration_id', sa.String(36)),
        sa.Column('total_fields_parsed', sa.Integer, default=0),
        sa.Column('total_fields_corrected', sa.Integer, default=0),
        sa.Column('correction_rate', sa.Numeric(5, 4)),

        # Approval tracking
        sa.Column('approved_at', sa.DateTime),
        sa.Column('approved_by', sa.String(36)),

        # Audit
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.String(36)),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('idx_ai_sessions_status', 'fms_ai_parsing_sessions', ['status'])
    op.create_index('idx_ai_sessions_created', 'fms_ai_parsing_sessions', ['created_at'])

    # ============================================================
    # AI Parsing Outputs - Stores AI's raw output for each field
    # ============================================================
    op.create_table(
        'fms_ai_parsing_outputs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('fms_ai_parsing_sessions.id', ondelete='CASCADE'), nullable=False, index=True),

        # Field identification
        sa.Column('field_category', sa.String(50), nullable=False),  # header, exporter, importer, transport, cargo, item
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('item_index', sa.Integer),  # NULL for header fields

        # AI extracted values
        sa.Column('ai_extracted_value', sa.Text),
        sa.Column('ai_confidence', sa.Numeric(5, 4)),
        sa.Column('ai_source_document', sa.String(50)),
        sa.Column('ai_source_content', sa.Text),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_ai_outputs_field', 'fms_ai_parsing_outputs', ['field_category', 'field_name'])

    # ============================================================
    # AI Corrections - Every user edit is recorded
    # ============================================================
    op.create_table(
        'fms_ai_corrections',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('fms_ai_parsing_sessions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('output_id', sa.String(36), sa.ForeignKey('fms_ai_parsing_outputs.id', ondelete='SET NULL')),

        # Field identification
        sa.Column('field_category', sa.String(50), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('item_index', sa.Integer),

        # Correction details
        sa.Column('original_value', sa.Text),
        sa.Column('corrected_value', sa.Text),
        sa.Column('correction_type', sa.String(30)),  # MANUAL_EDIT, PARTNER_LINK, HS_LOOKUP, DROPDOWN_SELECT

        # For partner linking
        sa.Column('linked_partner_type', sa.String(30)),  # EXPORTER, IMPORTER, LOCATION
        sa.Column('linked_partner_id', sa.String(36)),

        # Context
        sa.Column('correction_reason', sa.String(255)),

        # User tracking
        sa.Column('corrected_by', sa.String(36), nullable=False),
        sa.Column('corrected_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_ai_corrections_field', 'fms_ai_corrections', ['field_category', 'field_name'])

    # ============================================================
    # AI Customer Rules - Per-customer mapping rules
    # ============================================================
    op.create_table(
        'fms_ai_customer_rules',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Customer identification
        sa.Column('customer_id', sa.String(36), index=True),  # NULL = all customers
        sa.Column('shipper_pattern', sa.String(255)),
        sa.Column('shipper_pattern_hash', sa.String(64), index=True),

        # Rule details
        sa.Column('rule_type', sa.String(50), nullable=False),  # FIELD_MAPPING, VALUE_TRANSFORM, DEFAULT_VALUE
        sa.Column('source_field', sa.String(100)),
        sa.Column('target_field', sa.String(100)),
        sa.Column('transform_logic', sa.JSON),

        # Context
        sa.Column('document_type', sa.String(50)),  # NULL = all types
        sa.Column('description', sa.Text),

        # Confidence tracking
        sa.Column('times_applied', sa.Integer, default=0),
        sa.Column('times_overridden', sa.Integer, default=0),
        sa.Column('effectiveness_score', sa.Numeric(5, 4)),

        # Status
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_auto_generated', sa.Boolean, default=False),

        # Audit
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.String(36)),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('idx_ai_rules_type', 'fms_ai_customer_rules', ['rule_type'])

    # ============================================================
    # AI Partner Matches - Track all matching attempts
    # ============================================================
    op.create_table(
        'fms_ai_partner_matches',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('fms_ai_parsing_sessions.id', ondelete='CASCADE'), nullable=False, index=True),

        # Input
        sa.Column('partner_type', sa.String(30), nullable=False),  # EXPORTER, IMPORTER
        sa.Column('extracted_name', sa.Text),
        sa.Column('extracted_address', sa.Text),
        sa.Column('extracted_tax_code', sa.String(50)),
        sa.Column('extracted_country', sa.String(10)),

        # Match results
        sa.Column('match_method', sa.String(30)),  # EXACT, FUZZY, TAX_CODE, ALIAS
        sa.Column('matched_partner_id', sa.String(36)),
        sa.Column('match_confidence', sa.Numeric(5, 4)),
        sa.Column('alternative_matches', sa.JSON),  # [{id, name, confidence}]

        # User action
        sa.Column('user_action', sa.String(20)),  # ACCEPTED, SELECTED_OTHER, CREATE_NEW, SKIPPED
        sa.Column('user_selected_partner_id', sa.String(36)),

        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime),
        sa.Column('resolved_by', sa.String(36)),
    )
    op.create_index('idx_ai_partner_matches_type', 'fms_ai_partner_matches', ['partner_type'])

    # ============================================================
    # Alter existing Customs Partners tables for AI matching
    # ============================================================

    # Add columns to fms_customs_exporters
    op.add_column('fms_customs_exporters', sa.Column('name_normalized', sa.String(255)))
    op.add_column('fms_customs_exporters', sa.Column('name_tokens', sa.Text))  # JSON array
    op.add_column('fms_customs_exporters', sa.Column('name_hash', sa.String(64)))
    op.add_column('fms_customs_exporters', sa.Column('alias_names', sa.JSON))
    op.add_column('fms_customs_exporters', sa.Column('match_priority', sa.Integer, server_default='0'))
    op.add_column('fms_customs_exporters', sa.Column('ai_match_count', sa.Integer, server_default='0'))
    op.add_column('fms_customs_exporters', sa.Column('user_select_count', sa.Integer, server_default='0'))
    op.create_index('idx_exporters_name_hash', 'fms_customs_exporters', ['name_hash'])

    # Add columns to fms_customs_importers
    op.add_column('fms_customs_importers', sa.Column('name_normalized', sa.String(255)))
    op.add_column('fms_customs_importers', sa.Column('name_tokens', sa.Text))
    op.add_column('fms_customs_importers', sa.Column('name_hash', sa.String(64)))
    op.add_column('fms_customs_importers', sa.Column('tax_code_hash', sa.String(64)))
    op.add_column('fms_customs_importers', sa.Column('alias_names', sa.JSON))
    op.add_column('fms_customs_importers', sa.Column('match_priority', sa.Integer, server_default='0'))
    op.add_column('fms_customs_importers', sa.Column('ai_match_count', sa.Integer, server_default='0'))
    op.add_column('fms_customs_importers', sa.Column('user_select_count', sa.Integer, server_default='0'))
    op.create_index('idx_importers_name_hash', 'fms_customs_importers', ['name_hash'])
    op.create_index('idx_importers_tax_code_hash', 'fms_customs_importers', ['tax_code_hash'])


def downgrade():
    # Drop indexes from altered tables
    op.drop_index('idx_importers_tax_code_hash', 'fms_customs_importers')
    op.drop_index('idx_importers_name_hash', 'fms_customs_importers')
    op.drop_index('idx_exporters_name_hash', 'fms_customs_exporters')

    # Drop columns from fms_customs_importers
    op.drop_column('fms_customs_importers', 'user_select_count')
    op.drop_column('fms_customs_importers', 'ai_match_count')
    op.drop_column('fms_customs_importers', 'match_priority')
    op.drop_column('fms_customs_importers', 'alias_names')
    op.drop_column('fms_customs_importers', 'tax_code_hash')
    op.drop_column('fms_customs_importers', 'name_hash')
    op.drop_column('fms_customs_importers', 'name_tokens')
    op.drop_column('fms_customs_importers', 'name_normalized')

    # Drop columns from fms_customs_exporters
    op.drop_column('fms_customs_exporters', 'user_select_count')
    op.drop_column('fms_customs_exporters', 'ai_match_count')
    op.drop_column('fms_customs_exporters', 'match_priority')
    op.drop_column('fms_customs_exporters', 'alias_names')
    op.drop_column('fms_customs_exporters', 'name_hash')
    op.drop_column('fms_customs_exporters', 'name_tokens')
    op.drop_column('fms_customs_exporters', 'name_normalized')

    # Drop new tables
    op.drop_table('fms_ai_partner_matches')
    op.drop_table('fms_ai_customer_rules')
    op.drop_table('fms_ai_corrections')
    op.drop_table('fms_ai_parsing_outputs')
    op.drop_table('fms_ai_parsing_sessions')
