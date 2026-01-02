"""add_gps_provider_tables

Revision ID: add_gps_provider_tables
Revises: add_dispatch_tables
Create Date: 2026-01-01 00:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'add_gps_provider_tables'
down_revision: Union[str, None] = 'add_dispatch_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # GPS Providers - Cấu hình nhà cung cấp GPS
    op.create_table('gps_providers',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Provider info
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('provider_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='binh_anh'),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # API Configuration
        sa.Column('api_base_url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('api_version', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Authentication
        sa.Column('auth_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='api_key'),
        sa.Column('api_key', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('username', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('password', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('access_token', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('refresh_token', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),

        # Custom headers/params
        sa.Column('custom_headers', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('custom_params', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Endpoints
        sa.Column('endpoint_vehicles', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('endpoint_location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('endpoint_history', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('endpoint_alerts', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Sync settings
        sa.Column('sync_interval_seconds', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_realtime', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('websocket_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Status
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='inactive'),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('error_count', sa.Integer(), nullable=False, server_default='0'),

        # Soft delete
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gps_providers_tenant_id', 'gps_providers', ['tenant_id'])
    op.create_index('ix_gps_providers_provider_type', 'gps_providers', ['provider_type'])
    op.create_index('ix_gps_providers_status', 'gps_providers', ['status'])

    # GPS Vehicle Mappings - Mapping xe với GPS device
    op.create_table('gps_vehicle_mappings',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # References
        sa.Column('provider_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('vehicle_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # GPS Provider's vehicle identifier
        sa.Column('gps_device_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('gps_vehicle_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Sync status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_location_at', sa.DateTime(), nullable=True),
        sa.Column('last_latitude', sa.Float(), nullable=True),
        sa.Column('last_longitude', sa.Float(), nullable=True),
        sa.Column('last_speed', sa.Float(), nullable=True),
        sa.Column('last_heading', sa.Float(), nullable=True),
        sa.Column('last_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        sa.ForeignKeyConstraint(['provider_id'], ['gps_providers.id']),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gps_vehicle_mappings_tenant_id', 'gps_vehicle_mappings', ['tenant_id'])
    op.create_index('ix_gps_vehicle_mappings_provider_id', 'gps_vehicle_mappings', ['provider_id'])
    op.create_index('ix_gps_vehicle_mappings_vehicle_id', 'gps_vehicle_mappings', ['vehicle_id'])

    # GPS Sync Logs - Log các lần đồng bộ
    op.create_table('gps_sync_logs',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        sa.Column('provider_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Sync info
        sa.Column('sync_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),

        # Results
        sa.Column('success', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('vehicles_synced', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),

        sa.ForeignKeyConstraint(['provider_id'], ['gps_providers.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gps_sync_logs_tenant_id', 'gps_sync_logs', ['tenant_id'])
    op.create_index('ix_gps_sync_logs_provider_id', 'gps_sync_logs', ['provider_id'])


def downgrade() -> None:
    op.drop_table('gps_sync_logs')
    op.drop_table('gps_vehicle_mappings')
    op.drop_table('gps_providers')
