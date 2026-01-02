"""
Update orders and empty_returns tables to use Site instead of Location/text
- Add pickup_site_id, delivery_site_id, port_site_id to orders
- Change port_name to port_site_id in empty_returns
Run: python -m migrations.migrate_update_order_site_fields
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
        print("Adding site-based fields to orders table...")

        cur.execute("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS pickup_site_id VARCHAR REFERENCES sites(id),
            ADD COLUMN IF NOT EXISTS delivery_site_id VARCHAR REFERENCES sites(id),
            ADD COLUMN IF NOT EXISTS port_site_id VARCHAR REFERENCES sites(id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_orders_pickup_site_id
            ON orders(pickup_site_id);

            CREATE INDEX IF NOT EXISTS idx_orders_delivery_site_id
            ON orders(delivery_site_id);

            CREATE INDEX IF NOT EXISTS idx_orders_port_site_id
            ON orders(port_site_id);
        """)

        print("Removing port_name from orders table...")
        cur.execute("""
            ALTER TABLE orders
            DROP COLUMN IF EXISTS port_name;
        """)

        print("Updating empty_returns table to use port_site_id...")

        # Drop old empty_returns table and recreate with correct schema
        cur.execute("""
            DROP TABLE IF EXISTS empty_returns;
        """)

        cur.execute("""
            CREATE TABLE empty_returns (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                return_date DATE NOT NULL,
                port_site_id VARCHAR NOT NULL REFERENCES sites(id),
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

            CREATE INDEX IF NOT EXISTS idx_empty_returns_port_site_id
            ON empty_returns(port_site_id);

            CREATE INDEX IF NOT EXISTS idx_empty_returns_status
            ON empty_returns(status);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("Changes:")
        print("- Added pickup_site_id, delivery_site_id, port_site_id to orders table")
        print("- Removed port_name from orders table")
        print("- Updated empty_returns table to use port_site_id instead of port_name")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
