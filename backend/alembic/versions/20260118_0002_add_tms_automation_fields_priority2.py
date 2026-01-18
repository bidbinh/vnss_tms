"""Add TMS Automation fields - Priority 2 (Important)

Revision ID: 20260118_0002
Revises: 20260118_0001
Create Date: 2026-01-18 11:00:00

This migration adds important fields needed for TMS automation:
- Vehicle maintenance fields (current_mileage, maintenance intervals)
- Order actual times (actual_pickup_at, actual_delivery_at, arrived_at_*)
- Customer auto-accept configuration

These fields are required for:
- Auto-maintenance scheduling
- GPS-based status detection
- Auto-acceptance per customer
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '20260118_0002'
down_revision: Union[str, None] = '20260118_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================
    # 1. VEHICLES - Add maintenance fields
    # ============================================
    op.add_column('vehicles',
        sa.Column('current_mileage', sa.Integer(), nullable=True)
    )
    op.add_column('vehicles',
        sa.Column('maintenance_interval_km', sa.Integer(), nullable=True)
    )
    op.add_column('vehicles',
        sa.Column('maintenance_interval_days', sa.Integer(), nullable=True)
    )

    # Set default values for existing vehicles
    op.execute("""
        UPDATE vehicles
        SET maintenance_interval_km = 10000,
            maintenance_interval_days = 90
        WHERE maintenance_interval_km IS NULL
        AND maintenance_interval_days IS NULL
    """)

    # ============================================
    # 2. ORDERS - Add actual times
    # ============================================
    op.add_column('orders',
        sa.Column('actual_pickup_at', sa.DateTime(), nullable=True)
    )
    op.add_column('orders',
        sa.Column('actual_delivery_at', sa.DateTime(), nullable=True)
    )
    op.add_column('orders',
        sa.Column('arrived_at_pickup_at', sa.DateTime(), nullable=True)
    )
    op.add_column('orders',
        sa.Column('arrived_at_delivery_at', sa.DateTime(), nullable=True)
    )
    op.add_column('orders',
        sa.Column('original_eta_pickup_at', sa.DateTime(), nullable=True)
    )
    op.add_column('orders',
        sa.Column('original_eta_delivery_at', sa.DateTime(), nullable=True)
    )
    op.add_column('orders',
        sa.Column('weight_kg', sa.Float(), nullable=True)
    )

    # ============================================
    # 3. CUSTOMERS - Add auto-accept config
    # ============================================
    op.add_column('customers',
        sa.Column('auto_accept_enabled', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column('customers',
        sa.Column('auto_accept_confidence_threshold', sa.Float(), nullable=False, server_default='90.0')
    )
    op.add_column('customers',
        sa.Column('delay_alert_threshold_minutes', sa.Integer(), nullable=False, server_default='15')
    )
    op.create_index('ix_customers_auto_accept_enabled', 'customers', ['auto_accept_enabled'], unique=False)

    # ============================================
    # 4. SITES - Add service time
    # ============================================
    op.add_column('sites',
        sa.Column('service_time_minutes', sa.Integer(), nullable=False, server_default='30')
    )


def downgrade() -> None:
    # Remove service time from sites
    op.drop_column('sites', 'service_time_minutes')

    # Remove auto-accept config from customers
    op.drop_index('ix_customers_auto_accept_enabled', table_name='customers')
    op.drop_column('customers', 'delay_alert_threshold_minutes')
    op.drop_column('customers', 'auto_accept_confidence_threshold')
    op.drop_column('customers', 'auto_accept_enabled')

    # Remove actual times from orders
    op.drop_column('orders', 'weight_kg')
    op.drop_column('orders', 'original_eta_delivery_at')
    op.drop_column('orders', 'original_eta_pickup_at')
    op.drop_column('orders', 'arrived_at_delivery_at')
    op.drop_column('orders', 'arrived_at_pickup_at')
    op.drop_column('orders', 'actual_delivery_at')
    op.drop_column('orders', 'actual_pickup_at')

    # Remove maintenance fields from vehicles
    op.drop_column('vehicles', 'maintenance_interval_days')
    op.drop_column('vehicles', 'maintenance_interval_km')
    op.drop_column('vehicles', 'current_mileage')
