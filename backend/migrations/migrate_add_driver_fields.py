"""
Add extended driver fields
Run: python -m migrations.migrate_add_driver_fields
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
        print("Adding extended driver fields...")

        # Add new columns
        cur.execute("""
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS short_name VARCHAR,
            ADD COLUMN IF NOT EXISTS date_of_birth DATE,
            ADD COLUMN IF NOT EXISTS citizen_id VARCHAR,
            ADD COLUMN IF NOT EXISTS license_expiry DATE,
            ADD COLUMN IF NOT EXISTS bank_account VARCHAR,
            ADD COLUMN IF NOT EXISTS bank_name VARCHAR,
            ADD COLUMN IF NOT EXISTS work_status VARCHAR;
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
