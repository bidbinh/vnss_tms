"""
Add rates table
Run: python -m migrations.migrate_add_rates_table
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
        print("Creating rates table...")

        # Create rates table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rates (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                pickup_location_id VARCHAR NOT NULL REFERENCES locations(id),
                delivery_location_id VARCHAR NOT NULL REFERENCES locations(id),
                customer_id VARCHAR REFERENCES customers(id),
                price INTEGER NOT NULL,
                effective_date DATE NOT NULL,
                end_date DATE,
                status VARCHAR NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        # Create indexes
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_rates_tenant_id ON rates(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_rates_pickup_location_id ON rates(pickup_location_id);
            CREATE INDEX IF NOT EXISTS idx_rates_delivery_location_id ON rates(delivery_location_id);
            CREATE INDEX IF NOT EXISTS idx_rates_customer_id ON rates(customer_id);
            CREATE INDEX IF NOT EXISTS idx_rates_effective_date ON rates(effective_date);
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
