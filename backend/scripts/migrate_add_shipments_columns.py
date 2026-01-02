import os
import sys
from sqlalchemy import text
from sqlalchemy.engine import create_engine

# Ensure project `backend` path is on sys.path so `app` imports work when running this script
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.core.config import settings


MIGRATION_SQL = '''
-- Add missing columns to shipments for OPS workflow
ALTER TABLE IF EXISTS shipments
    ADD COLUMN IF NOT EXISTS from_port BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_empty_return BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS free_time_days INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';

-- Ensure 1 order -> 1 shipment
CREATE UNIQUE INDEX IF NOT EXISTS ux_shipments_order_id ON shipments(order_id);

-- Add missing columns to orders table
ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS pickup_location_id VARCHAR,
    ADD COLUMN IF NOT EXISTS delivery_location_id VARCHAR,
    ADD COLUMN IF NOT EXISTS branch_id VARCHAR,
    ADD COLUMN IF NOT EXISTS sales_user_id VARCHAR,
    ADD COLUMN IF NOT EXISTS service_type VARCHAR,
    ADD COLUMN IF NOT EXISTS incoterm VARCHAR;

-- Add missing columns to trips table
ALTER TABLE IF EXISTS trips
    ADD COLUMN IF NOT EXISTS assigned_by VARCHAR,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS route_code VARCHAR,
    ADD COLUMN IF NOT EXISTS distance_km FLOAT,
    ADD COLUMN IF NOT EXISTS trailer_id VARCHAR,
    ADD COLUMN IF NOT EXISTS trip_type VARCHAR,
    ADD COLUMN IF NOT EXISTS notes VARCHAR;

-- Fix trip_type to allow NULL (it was NOT NULL in original schema)
ALTER TABLE IF EXISTS trips ALTER COLUMN trip_type DROP NOT NULL;
'''


def run():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("Running migration against:", settings.DATABASE_URL)
        for stmt in MIGRATION_SQL.split(';'):
            s = stmt.strip()
            if not s:
                continue
            print('Executing:', s[:80])
            conn.execute(text(s))
        conn.commit()
    print('Migration complete')


if __name__ == '__main__':
    run()
