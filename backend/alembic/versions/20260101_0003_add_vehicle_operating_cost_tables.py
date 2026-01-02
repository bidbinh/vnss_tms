"""Add vehicle operating cost tables

Revision ID: add_vehicle_cost_tables
Revises: add_gps_provider_tables
Create Date: 2026-01-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_vehicle_cost_tables'
down_revision = 'add_gps_provider_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Vehicle Operating Costs table
    op.create_table(
        'vehicle_operating_costs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # Vehicle reference (optional - null for general costs)
        sa.Column('vehicle_id', sa.String(36), sa.ForeignKey('vehicles.id'), nullable=True, index=True),

        # Cost classification
        sa.Column('category', sa.String(50), nullable=False, index=True),  # depreciation, insurance, etc.
        sa.Column('cost_type', sa.String(20), nullable=False),  # recurring, variable
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Amount
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, default='VND'),

        # Effective period (for recurring)
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=True),

        # Allocation settings (for recurring)
        sa.Column('allocation_method', sa.String(20), nullable=False, default='monthly'),
        sa.Column('allocation_months', sa.Integer(), nullable=True),

        # For variable costs - specific month/year
        sa.Column('cost_month', sa.Integer(), nullable=True),
        sa.Column('cost_year', sa.Integer(), nullable=True),

        # Additional info
        sa.Column('reference_no', sa.String(100), nullable=True),
        sa.Column('vendor', sa.String(200), nullable=True),
        sa.Column('payment_status', sa.String(20), nullable=False, default='unpaid'),
        sa.Column('paid_amount', sa.Float(), nullable=False, default=0),
        sa.Column('paid_date', sa.Date(), nullable=True),

        # Attachments (JSON array of URLs)
        sa.Column('attachments', sa.Text(), nullable=True),

        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
    )

    # Vehicle Cost Allocations table - pre-calculated monthly allocations
    op.create_table(
        'vehicle_cost_allocations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),

        # References
        sa.Column('cost_id', sa.String(36), sa.ForeignKey('vehicle_operating_costs.id'), nullable=False, index=True),
        sa.Column('vehicle_id', sa.String(36), sa.ForeignKey('vehicles.id'), nullable=True, index=True),

        # Period
        sa.Column('year', sa.Integer(), nullable=False, index=True),
        sa.Column('month', sa.Integer(), nullable=False, index=True),

        # Allocated amount
        sa.Column('allocated_amount', sa.Float(), nullable=False),

        # Denormalized for fast queries
        sa.Column('category', sa.String(50), nullable=False, index=True),
    )

    # Create indexes for common queries
    op.create_index(
        'ix_vehicle_cost_allocations_period',
        'vehicle_cost_allocations',
        ['tenant_id', 'year', 'month']
    )

    op.create_index(
        'ix_vehicle_cost_allocations_vehicle_period',
        'vehicle_cost_allocations',
        ['tenant_id', 'vehicle_id', 'year', 'month']
    )


def downgrade():
    op.drop_index('ix_vehicle_cost_allocations_vehicle_period', 'vehicle_cost_allocations')
    op.drop_index('ix_vehicle_cost_allocations_period', 'vehicle_cost_allocations')
    op.drop_table('vehicle_cost_allocations')
    op.drop_table('vehicle_operating_costs')
