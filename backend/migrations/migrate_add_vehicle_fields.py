"""
Add extended vehicle fields
Run: python -m migrations.migrate_add_vehicle_fields
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
        print("Adding extended vehicle fields...")

        # Add new columns
        cur.execute("""
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS code VARCHAR,
            ADD COLUMN IF NOT EXISTS vehicle_type_name VARCHAR,
            ADD COLUMN IF NOT EXISTS manufacturer VARCHAR,
            ADD COLUMN IF NOT EXISTS model VARCHAR,
            ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR,
            ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER,
            ADD COLUMN IF NOT EXISTS chassis_number VARCHAR,
            ADD COLUMN IF NOT EXISTS engine_number VARCHAR,
            ADD COLUMN IF NOT EXISTS curb_weight INTEGER,
            ADD COLUMN IF NOT EXISTS payload_capacity INTEGER,
            ADD COLUMN IF NOT EXISTS gross_weight INTEGER,
            ADD COLUMN IF NOT EXISTS dimensions VARCHAR,
            ADD COLUMN IF NOT EXISTS registration_expiry DATE,
            ADD COLUMN IF NOT EXISTS inactive_reason VARCHAR;
        """)

        # Create index on code field
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_vehicles_code ON vehicles(code);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
