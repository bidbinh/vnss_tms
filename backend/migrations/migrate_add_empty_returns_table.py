"""
Add empty_returns table for tracking empty container returns
Also adds port_name field to orders table
Run: python -m migrations.migrate_add_empty_returns_table
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
        print("Adding port_name field to orders table...")

        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS port_name VARCHAR;
        """)

        print("Creating empty_returns table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS empty_returns (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                return_date DATE NOT NULL,
                port_name VARCHAR NOT NULL,
                total_amount INTEGER DEFAULT 0,
                payer VARCHAR,
                seal_number VARCHAR,
                return_location VARCHAR,
                notes VARCHAR,
                return_slip VARCHAR,
                invoice VARCHAR,
                cleaning_receipt VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_empty_returns_tenant_id
            ON empty_returns(tenant_id);

            CREATE INDEX IF NOT EXISTS idx_empty_returns_order_id
            ON empty_returns(order_id);

            CREATE INDEX IF NOT EXISTS idx_empty_returns_return_date
            ON empty_returns(return_date);

            CREATE INDEX IF NOT EXISTS idx_empty_returns_status
            ON empty_returns(status);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Changes:")
        print("- Added port_name field to orders table")
        print("- Created empty_returns table for tracking empty container returns")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
