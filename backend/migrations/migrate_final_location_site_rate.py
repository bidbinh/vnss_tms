"""
Final structure: Location (KCN/Ward) + Site (specific address) + Rate (Location-based)
Run: python -m migrations.migrate_final_location_site_rate
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
        print("Step 1: Cleaning up locations table...")

        # Remove unused columns from locations
        cur.execute("""
            ALTER TABLE locations
            DROP COLUMN IF EXISTS company_name,
            DROP COLUMN IF EXISTS detailed_address,
            DROP COLUMN IF EXISTS industrial_zone,
            DROP COLUMN IF EXISTS ward,
            DROP COLUMN IF EXISTS address;
        """)

        print("Step 2: Creating sites table...")

        # Create sites table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sites (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                location_id VARCHAR NOT NULL REFERENCES locations(id),
                company_name VARCHAR NOT NULL,
                code VARCHAR,
                detailed_address VARCHAR NOT NULL,
                contact_name VARCHAR,
                contact_phone VARCHAR,
                note VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        # Create indexes on sites
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_sites_location_id ON sites(location_id);
            CREATE INDEX IF NOT EXISTS idx_sites_code ON sites(code);
        """)

        print("Step 3: Recreating rates table with location_id...")

        # Drop old rates and rate_customers
        cur.execute("DROP TABLE IF EXISTS rate_customers CASCADE;")
        cur.execute("DROP TABLE IF EXISTS rates CASCADE;")

        # Create new rates table
        cur.execute("""
            CREATE TABLE rates (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                pickup_location_id VARCHAR NOT NULL REFERENCES locations(id),
                delivery_location_id VARCHAR NOT NULL REFERENCES locations(id),
                distance_km INTEGER,
                toll_stations INTEGER,
                pricing_type VARCHAR NOT NULL DEFAULT 'CONTAINER',
                price_cont_20 INTEGER,
                price_cont_40 INTEGER,
                price_per_trip INTEGER,
                effective_date DATE NOT NULL,
                end_date DATE,
                status VARCHAR NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        # Create indexes on rates
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_rates_tenant_id ON rates(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_rates_pickup_location_id ON rates(pickup_location_id);
            CREATE INDEX IF NOT EXISTS idx_rates_delivery_location_id ON rates(delivery_location_id);
            CREATE INDEX IF NOT EXISTS idx_rates_pricing_type ON rates(pricing_type);
            CREATE INDEX IF NOT EXISTS idx_rates_effective_date ON rates(effective_date);
        """)

        print("Step 4: Recreating rate_customers junction table...")

        # Recreate rate_customers
        cur.execute("""
            CREATE TABLE rate_customers (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,
                rate_id VARCHAR NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
                customer_id VARCHAR NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(rate_id, customer_id)
            );
        """)

        # Create indexes on rate_customers
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_rate_customers_tenant_id ON rate_customers(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_rate_customers_rate_id ON rate_customers(rate_id);
            CREATE INDEX IF NOT EXISTS idx_rate_customers_customer_id ON rate_customers(customer_id);
        """)

        conn.commit()
        print("[OK] Migration completed successfully")
        print("")
        print("NEW STRUCTURE:")
        print("1. Location: KCN hoặc Phường/Xã (dùng cho tính giá)")
        print("2. Site: Địa chỉ cụ thể (công ty, người liên hệ) → link với Location")
        print("3. Rate: Bảng giá theo Location (pickup_location_id → delivery_location_id)")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
