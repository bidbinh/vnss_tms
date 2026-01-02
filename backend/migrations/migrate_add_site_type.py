"""
Add site_type field to sites table
Run: python -m migrations.migrate_add_site_type
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
        print("Adding site_type field to sites table...")

        cur.execute("""
            ALTER TABLE sites
            ADD COLUMN IF NOT EXISTS site_type VARCHAR NOT NULL DEFAULT 'CUSTOMER';
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_sites_site_type
            ON sites(site_type);
        """)

        print("Updating existing PORT sites based on location type...")

        # Update sites that belong to PORT locations to have site_type = 'PORT'
        cur.execute("""
            UPDATE sites
            SET site_type = 'PORT'
            WHERE location_id IN (
                SELECT id FROM locations WHERE type = 'PORT'
            );
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Changes:")
        print("- Added site_type field to sites table (default: CUSTOMER)")
        print("- Created index on site_type")
        print("- Updated existing PORT location sites to site_type = 'PORT'")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
