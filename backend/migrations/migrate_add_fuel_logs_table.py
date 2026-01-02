"""
Add fuel_logs table for tracking fuel consumption
Run: python -m migrations.migrate_add_fuel_logs_table
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from app.core.config import settings

def migrate():
    # Convert DATABASE_URL from SQLAlchemy format to psycopg2 format
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        print("Creating fuel_logs table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS fuel_logs (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                date DATE NOT NULL,
                vehicle_id VARCHAR NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
                driver_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
                odometer_km INTEGER NOT NULL,
                actual_liters FLOAT NOT NULL,
                gps_liters FLOAT,
                difference_liters FLOAT,
                unit_price INTEGER NOT NULL,
                discount_price INTEGER,
                total_amount INTEGER NOT NULL,
                note VARCHAR,
                payment_status VARCHAR NOT NULL DEFAULT 'UNPAID',
                station_name VARCHAR,
                station_location VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_fuel_logs_tenant_id
            ON fuel_logs(tenant_id);

            CREATE INDEX IF NOT EXISTS idx_fuel_logs_date
            ON fuel_logs(date);

            CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id
            ON fuel_logs(vehicle_id);

            CREATE INDEX IF NOT EXISTS idx_fuel_logs_driver_id
            ON fuel_logs(driver_id);

            CREATE INDEX IF NOT EXISTS idx_fuel_logs_payment_status
            ON fuel_logs(payment_status);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Created table:")
        print("fuel_logs - Fuel tracking table")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
