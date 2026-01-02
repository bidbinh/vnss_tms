"""
Add driver salary settings and related fields
Run: python -m migrations.migrate_add_driver_salary
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
        print("Creating driver_salary_settings table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS driver_salary_settings (
                id VARCHAR PRIMARY KEY,
                tenant_id VARCHAR NOT NULL,

                -- Distance-based salary (From Port)
                port_0_50km INTEGER DEFAULT 0,
                port_51_100km INTEGER DEFAULT 0,
                port_101_150km INTEGER DEFAULT 0,
                port_151_200km INTEGER DEFAULT 0,
                port_201_plus_km INTEGER DEFAULT 0,

                -- Distance-based salary (From Warehouse/Customer)
                warehouse_0_50km INTEGER DEFAULT 0,
                warehouse_51_100km INTEGER DEFAULT 0,
                warehouse_101_150km INTEGER DEFAULT 0,
                warehouse_151_200km INTEGER DEFAULT 0,
                warehouse_201_plus_km INTEGER DEFAULT 0,

                -- Additional fees
                port_gate_fee INTEGER DEFAULT 50000,
                flatbed_tarp_fee INTEGER DEFAULT 0,
                warehouse_to_customer_bonus INTEGER DEFAULT 0,

                -- Daily trip bonuses
                second_trip_bonus INTEGER DEFAULT 500000,
                third_trip_bonus INTEGER DEFAULT 700000,

                -- Monthly trip count bonuses
                bonus_45_50_trips INTEGER DEFAULT 1000000,
                bonus_51_54_trips INTEGER DEFAULT 1500000,
                bonus_55_plus_trips INTEGER DEFAULT 2000000,

                -- Holiday multiplier
                holiday_multiplier FLOAT DEFAULT 2.0,

                status VARCHAR DEFAULT 'ACTIVE',
                note VARCHAR,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_driver_salary_settings_tenant
            ON driver_salary_settings(tenant_id);
        """)

        print("Adding base_salary to drivers table...")

        cur.execute("""
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS base_salary INTEGER DEFAULT 5000000;
        """)

        print("Adding distance_km to orders table...")

        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS distance_km INTEGER;
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Changes:")
        print("- Created driver_salary_settings table")
        print("- Added base_salary field to drivers table (default: 5,000,000 VND)")
        print("- Added distance_km field to orders table")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
