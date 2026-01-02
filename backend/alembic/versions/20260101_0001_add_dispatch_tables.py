"""add_dispatch_tables

Revision ID: add_dispatch_tables
Revises: 0dc8550924a9
Create Date: 2026-01-01 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'add_dispatch_tables'
down_revision: Union[str, None] = '0dc8550924a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # VehicleGPS - Real-time GPS tracking
    op.create_table('vehicle_gps',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('vehicle_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('driver_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('speed', sa.Float(), nullable=True),
        sa.Column('heading', sa.Float(), nullable=True),
        sa.Column('address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('work_status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='available'),
        sa.Column('current_trip_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('current_order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('eta_destination', sa.DateTime(), nullable=True),
        sa.Column('destination_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('remaining_km', sa.Float(), nullable=True),
        sa.Column('gps_timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
        sa.ForeignKeyConstraint(['current_trip_id'], ['trips.id'], ),
        sa.ForeignKeyConstraint(['current_order_id'], ['orders.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_vehicle_gps_tenant_id', 'vehicle_gps', ['tenant_id'])
    op.create_index('ix_vehicle_gps_vehicle_id', 'vehicle_gps', ['vehicle_id'])
    op.create_index('ix_vehicle_gps_driver_id', 'vehicle_gps', ['driver_id'])
    op.create_index('ix_vehicle_gps_work_status', 'vehicle_gps', ['work_status'])

    # DispatchLog - Activity logs
    op.create_table('dispatch_logs',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('log_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('trip_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('vehicle_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('driver_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_ai', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column('ai_reason', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dispatch_logs_tenant_id', 'dispatch_logs', ['tenant_id'])
    op.create_index('ix_dispatch_logs_log_type', 'dispatch_logs', ['log_type'])

    # DispatchAlert - Alerts/Warnings
    op.create_table('dispatch_alerts',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('alert_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('severity', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='warning'),
        sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('trip_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('vehicle_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('driver_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('message', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('resolution_note', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_auto', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dispatch_alerts_tenant_id', 'dispatch_alerts', ['tenant_id'])
    op.create_index('ix_dispatch_alerts_alert_type', 'dispatch_alerts', ['alert_type'])
    op.create_index('ix_dispatch_alerts_severity', 'dispatch_alerts', ['severity'])
    op.create_index('ix_dispatch_alerts_is_resolved', 'dispatch_alerts', ['is_resolved'])

    # AIDecision - AI decisions pending approval
    op.create_table('ai_decisions',
        sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('decision_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('order_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('trip_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('vehicle_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('driver_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('reasoning', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('decision_data', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('review_note', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_decisions_tenant_id', 'ai_decisions', ['tenant_id'])
    op.create_index('ix_ai_decisions_decision_type', 'ai_decisions', ['decision_type'])
    op.create_index('ix_ai_decisions_status', 'ai_decisions', ['status'])


def downgrade() -> None:
    op.drop_table('ai_decisions')
    op.drop_table('dispatch_alerts')
    op.drop_table('dispatch_logs')
    op.drop_table('vehicle_gps')
