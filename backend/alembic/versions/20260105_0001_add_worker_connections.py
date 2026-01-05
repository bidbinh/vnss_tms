"""Add worker connections and dispatcher orders tables

Revision ID: add_worker_connections
Revises: add_worker_task_role_fields
Create Date: 2026-01-05

Tables:
- worker_connections: Kết nối giữa Dispatcher và Driver
- dispatcher_orders: Đơn hàng của Dispatcher
- dispatcher_order_sequences: Sequence mã đơn cho mỗi Dispatcher
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_worker_connections'
down_revision: Union[str, None] = 'add_worker_task_role_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. worker_connections table
    op.create_table(
        'worker_connections',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Relationship
        sa.Column('dispatcher_id', sa.String(36), nullable=False, index=True),
        sa.Column('driver_id', sa.String(36), nullable=False, index=True),
        sa.Column('initiated_by', sa.String(20), nullable=False, server_default='DISPATCHER'),

        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING', index=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('responded_at', sa.String(30), nullable=True),
        sa.Column('decline_reason', sa.Text(), nullable=True),

        # Payment settings
        sa.Column('enable_payment_tracking', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('default_payment_per_order', sa.Float(), nullable=True),

        # Stats
        sa.Column('total_orders_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_amount_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_amount_pending', sa.Float(), nullable=False, server_default='0'),

        # Rating
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('total_ratings', sa.Integer(), nullable=False, server_default='0'),
    )

    # Unique constraint: one connection per dispatcher-driver pair
    op.create_unique_constraint(
        'uq_worker_connection_pair',
        'worker_connections',
        ['dispatcher_id', 'driver_id']
    )

    # 2. dispatcher_orders table
    op.create_table(
        'dispatcher_orders',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Owner & Assignment
        sa.Column('dispatcher_id', sa.String(36), nullable=False, index=True),
        sa.Column('driver_id', sa.String(36), nullable=True, index=True),
        sa.Column('connection_id', sa.String(36), nullable=True),

        # Order identification
        sa.Column('order_code', sa.String(50), nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='DRAFT', index=True),

        # Customer info
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('customer_phone', sa.String(50), nullable=True),
        sa.Column('customer_company', sa.String(255), nullable=True),

        # Pickup
        sa.Column('pickup_address', sa.Text(), nullable=True),
        sa.Column('pickup_contact', sa.String(100), nullable=True),
        sa.Column('pickup_phone', sa.String(50), nullable=True),
        sa.Column('pickup_time', sa.String(30), nullable=True),

        # Delivery
        sa.Column('delivery_address', sa.Text(), nullable=True),
        sa.Column('delivery_contact', sa.String(100), nullable=True),
        sa.Column('delivery_phone', sa.String(50), nullable=True),
        sa.Column('delivery_time', sa.String(30), nullable=True),

        # Cargo
        sa.Column('equipment', sa.String(10), nullable=True),
        sa.Column('container_code', sa.String(50), nullable=True),
        sa.Column('cargo_description', sa.Text(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),

        # Revenue & Payment
        sa.Column('freight_charge', sa.Float(), nullable=True),
        sa.Column('driver_payment', sa.Float(), nullable=True),
        sa.Column('payment_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('paid_at', sa.String(30), nullable=True),

        # Notes
        sa.Column('dispatcher_notes', sa.Text(), nullable=True),
        sa.Column('driver_notes', sa.Text(), nullable=True),

        # Timeline
        sa.Column('assigned_at', sa.String(30), nullable=True),
        sa.Column('accepted_at', sa.String(30), nullable=True),
        sa.Column('started_at', sa.String(30), nullable=True),
        sa.Column('completed_at', sa.String(30), nullable=True),
    )

    # 3. dispatcher_order_sequences table
    op.create_table(
        'dispatcher_order_sequences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('dispatcher_id', sa.String(36), nullable=False, index=True),
        sa.Column('prefix', sa.String(10), nullable=False, server_default='DO'),
        sa.Column('last_seq', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_table('dispatcher_order_sequences')
    op.drop_table('dispatcher_orders')
    op.drop_table('worker_connections')
