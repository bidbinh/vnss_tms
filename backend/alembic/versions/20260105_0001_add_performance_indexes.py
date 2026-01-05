"""Add performance indexes for load testing

Revision ID: perf_indexes_001
Revises:
Create Date: 2026-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'perf_indexes_001'
down_revision: Union[str, None] = 'migrate_to_actors'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL with IF NOT EXISTS for PostgreSQL
    conn = op.get_bind()

    # Orders table - most queried
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_orders_tenant_status ON orders(tenant_id, status)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_orders_tenant_date ON orders(tenant_id, order_date)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_orders_driver_id ON orders(driver_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_orders_customer_id ON orders(customer_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders(created_at)"))

    # Drivers table
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_drivers_tenant_status ON drivers(tenant_id, status)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_drivers_phone ON drivers(phone)"))

    # Vehicles table
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_vehicles_tenant_status ON vehicles(tenant_id, status)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_vehicles_plate_no ON vehicles(plate_no)"))

    # Customers table
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_customers_tenant_active ON customers(tenant_id, is_active)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_customers_code ON customers(code)"))

    # Sites table
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_sites_tenant_status ON sites(tenant_id, status)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_sites_location_id ON sites(location_id)"))

    # Users table
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_tenant_status ON users(tenant_id, status)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_phone ON users(phone)"))

    # Locations table
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_locations_tenant_active ON locations(tenant_id, is_active)"))


def downgrade() -> None:
    # Orders
    op.drop_index('ix_orders_tenant_status', table_name='orders')
    op.drop_index('ix_orders_tenant_date', table_name='orders')
    op.drop_index('ix_orders_driver_id', table_name='orders')
    op.drop_index('ix_orders_customer_id', table_name='orders')
    op.drop_index('ix_orders_created_at', table_name='orders')

    # Drivers
    op.drop_index('ix_drivers_tenant_status', table_name='drivers')
    op.drop_index('ix_drivers_phone', table_name='drivers')

    # Vehicles
    op.drop_index('ix_vehicles_tenant_status', table_name='vehicles')
    op.drop_index('ix_vehicles_plate_no', table_name='vehicles')

    # Customers
    op.drop_index('ix_customers_tenant_active', table_name='customers')
    op.drop_index('ix_customers_code', table_name='customers')

    # Sites
    op.drop_index('ix_sites_tenant_status', table_name='sites')
    op.drop_index('ix_sites_location_id', table_name='sites')

    # Users
    op.drop_index('ix_users_tenant_status', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_phone', table_name='users')

    # Locations
    op.drop_index('ix_locations_tenant_active', table_name='locations')
