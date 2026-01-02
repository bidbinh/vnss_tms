"""
Add ward field to locations table
Run: python -m migrations.migrate_add_location_ward
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
        print("Adding ward field to locations table...")

        cur.execute("""
            ALTER TABLE locations
            ADD COLUMN IF NOT EXISTS ward VARCHAR;
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_locations_ward
            ON locations(ward);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Changes:")
        print("- Added ward field to locations table (nullable)")
        print("- Created index on ward field")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
