"""
Migration: Update driver_salary_settings table with new fields
- Add effective_start_date and effective_end_date
- Add configurable distance bracket fields
"""

import psycopg2
from app.core.config import settings


def migrate():
    """Add new fields to driver_salary_settings table"""
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Add date fields
        cur.execute("""
            ALTER TABLE driver_salary_settings
            ADD COLUMN IF NOT EXISTS effective_start_date DATE,
            ADD COLUMN IF NOT EXISTS effective_end_date DATE;
        """)

        # Add configurable distance bracket fields
        cur.execute("""
            ALTER TABLE driver_salary_settings
            ADD COLUMN IF NOT EXISTS distance_bracket_1 INTEGER DEFAULT 50,
            ADD COLUMN IF NOT EXISTS distance_bracket_2 INTEGER DEFAULT 100,
            ADD COLUMN IF NOT EXISTS distance_bracket_3 INTEGER DEFAULT 150,
            ADD COLUMN IF NOT EXISTS distance_bracket_4 INTEGER DEFAULT 200;
        """)

        conn.commit()
        print("Migration completed successfully")
        print("   - Added effective_start_date and effective_end_date")
        print("   - Added distance_bracket_1, distance_bracket_2, distance_bracket_3, distance_bracket_4")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
