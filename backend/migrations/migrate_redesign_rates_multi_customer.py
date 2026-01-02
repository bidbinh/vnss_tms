"""
Redesign rates to support multiple customers per rate
Run: python -m migrations.migrate_redesign_rates_multi_customer
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
        print("Redesigning rates system for multi-customer support...")

        # Create rate_customers junction table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rate_customers (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                rate_id VARCHAR NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
                customer_id VARCHAR NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(rate_id, customer_id)
            );
        """)

        # Create indexes
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_rate_customers_tenant_id ON rate_customers(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_rate_customers_rate_id ON rate_customers(rate_id);
            CREATE INDEX IF NOT EXISTS idx_rate_customers_customer_id ON rate_customers(customer_id);
        """)

        # Migrate existing data: if rate has customer_id, create junction record
        print("Migrating existing customer assignments...")
        cur.execute("""
            INSERT INTO rate_customers (tenant_id, rate_id, customer_id)
            SELECT tenant_id, id, customer_id
            FROM rates
            WHERE customer_id IS NOT NULL;
        """)

        # Drop customer_id column from rates table
        print("Removing customer_id column from rates table...")
        cur.execute("""
            ALTER TABLE rates DROP COLUMN IF EXISTS customer_id;
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
