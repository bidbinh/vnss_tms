"""
Migration: Expand distance brackets from 4 to 12
- Drop old 4-bracket columns
- Add new 12-bracket threshold columns
- Add new 13-level salary columns for port and warehouse
"""

import psycopg2
from app.core.config import settings


def migrate():
    """Expand distance brackets from 4 to 12"""
    db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Drop old columns (4 brackets)
        cur.execute("""
            ALTER TABLE driver_salary_settings
            DROP COLUMN IF EXISTS port_0_50km,
            DROP COLUMN IF EXISTS port_51_100km,
            DROP COLUMN IF EXISTS port_101_150km,
            DROP COLUMN IF EXISTS port_151_200km,
            DROP COLUMN IF EXISTS port_201_plus_km,
            DROP COLUMN IF EXISTS warehouse_0_50km,
            DROP COLUMN IF EXISTS warehouse_51_100km,
            DROP COLUMN IF EXISTS warehouse_101_150km,
            DROP COLUMN IF EXISTS warehouse_151_200km,
            DROP COLUMN IF EXISTS warehouse_201_plus_km;
        """)

        # Add 12 bracket thresholds
        cur.execute("""
            ALTER TABLE driver_salary_settings
            ADD COLUMN IF NOT EXISTS distance_bracket_5 INTEGER DEFAULT 50,
            ADD COLUMN IF NOT EXISTS distance_bracket_6 INTEGER DEFAULT 60,
            ADD COLUMN IF NOT EXISTS distance_bracket_7 INTEGER DEFAULT 80,
            ADD COLUMN IF NOT EXISTS distance_bracket_8 INTEGER DEFAULT 100,
            ADD COLUMN IF NOT EXISTS distance_bracket_9 INTEGER DEFAULT 120,
            ADD COLUMN IF NOT EXISTS distance_bracket_10 INTEGER DEFAULT 150,
            ADD COLUMN IF NOT EXISTS distance_bracket_11 INTEGER DEFAULT 200,
            ADD COLUMN IF NOT EXISTS distance_bracket_12 INTEGER DEFAULT 250;
        """)

        # Update existing brackets to new defaults
        cur.execute("""
            UPDATE driver_salary_settings
            SET distance_bracket_1 = 10,
                distance_bracket_2 = 20,
                distance_bracket_3 = 30,
                distance_bracket_4 = 40
            WHERE distance_bracket_1 = 50;
        """)

        # Add 13 salary levels for PORT
        cur.execute("""
            ALTER TABLE driver_salary_settings
            ADD COLUMN IF NOT EXISTS port_bracket_1 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_2 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_3 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_4 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_5 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_6 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_7 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_8 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_9 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_10 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_11 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_12 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS port_bracket_13 INTEGER DEFAULT 0;
        """)

        # Add 13 salary levels for WAREHOUSE
        cur.execute("""
            ALTER TABLE driver_salary_settings
            ADD COLUMN IF NOT EXISTS warehouse_bracket_1 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_2 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_3 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_4 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_5 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_6 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_7 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_8 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_9 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_10 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_11 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_12 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS warehouse_bracket_13 INTEGER DEFAULT 0;
        """)

        conn.commit()
        print("Migration completed successfully")
        print("   - Dropped old 4-bracket salary columns")
        print("   - Added 8 new distance bracket thresholds (5-12)")
        print("   - Added 13 port salary bracket columns")
        print("   - Added 13 warehouse salary bracket columns")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
