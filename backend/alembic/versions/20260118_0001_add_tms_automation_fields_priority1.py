"""Add TMS Automation fields - Priority 1 (Critical)

Revision ID: 20260118_0001
Revises: 20260117_0002
Create Date: 2026-01-18 10:00:00

This migration adds critical fields needed for TMS automation:
- Location coordinates (latitude, longitude)
- Site coordinates and geofence radius
- Order priority field

These fields are required for:
- Distance calculation
- GPS-based status detection
- Route optimization
- Auto-acceptance priority
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '20260118_0001'
down_revision: Union[str, None] = '20260117_0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================
    # 1. LOCATIONS - Add coordinates
    # ============================================
    op.add_column('locations',
        sa.Column('latitude', sa.Float(), nullable=True)
    )
    op.add_column('locations',
        sa.Column('longitude', sa.Float(), nullable=True)
    )
    op.create_index('ix_locations_latitude', 'locations', ['latitude'], unique=False)
    op.create_index('ix_locations_longitude', 'locations', ['longitude'], unique=False)

    # ============================================
    # 2. SITES - Add coordinates and geofence
    # ============================================
    op.add_column('sites',
        sa.Column('latitude', sa.Float(), nullable=True)
    )
    op.add_column('sites',
        sa.Column('longitude', sa.Float(), nullable=True)
    )
    op.add_column('sites',
        sa.Column('geofence_radius_meters', sa.Integer(), nullable=False, server_default='100')
    )
    op.create_index('ix_sites_latitude', 'sites', ['latitude'], unique=False)
    op.create_index('ix_sites_longitude', 'sites', ['longitude'], unique=False)

    # ============================================
    # 3. ORDERS - Add priority field
    # ============================================
    op.add_column('orders',
        sa.Column('priority', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False, server_default='NORMAL')
    )
    op.create_index('ix_orders_priority', 'orders', ['priority'], unique=False)


def downgrade() -> None:
    # Remove priority from orders
    op.drop_index('ix_orders_priority', table_name='orders')
    op.drop_column('orders', 'priority')

    # Remove geofence and coordinates from sites
    op.drop_index('ix_sites_longitude', table_name='sites')
    op.drop_index('ix_sites_latitude', table_name='sites')
    op.drop_column('sites', 'geofence_radius_meters')
    op.drop_column('sites', 'longitude')
    op.drop_column('sites', 'latitude')

    # Remove coordinates from locations
    op.drop_index('ix_locations_longitude', table_name='locations')
    op.drop_index('ix_locations_latitude', table_name='locations')
    op.drop_column('locations', 'longitude')
    op.drop_column('locations', 'latitude')
