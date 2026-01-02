"""
Redesign Location with detailed address fields and Rate with container/trip pricing
Run: python -m migrations.migrate_location_and_rate_redesign
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
        print("Step 1: Adding detailed address fields to locations table...")

        # Add new address fields to locations
        cur.execute("""
            ALTER TABLE locations
            ADD COLUMN IF NOT EXISTS company_name VARCHAR,
            ADD COLUMN IF NOT EXISTS detailed_address VARCHAR,
            ADD COLUMN IF NOT EXISTS industrial_zone VARCHAR,
            ADD COLUMN IF NOT EXISTS ward VARCHAR,
            ADD COLUMN IF NOT EXISTS district VARCHAR;
        """)

        # Create indexes on new location fields for rate matching
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_locations_industrial_zone ON locations(industrial_zone);
            CREATE INDEX IF NOT EXISTS idx_locations_ward ON locations(ward);
            CREATE INDEX IF NOT EXISTS idx_locations_district ON locations(district);
            CREATE INDEX IF NOT EXISTS idx_locations_province ON locations(province);
        """)

        print("Step 2: Dropping old rates table (will be recreated with new structure)...")

        # Drop rate_customers first (foreign key constraint)
        cur.execute("DROP TABLE IF EXISTS rate_customers CASCADE;")

        # Drop rates table
        cur.execute("DROP TABLE IF EXISTS rates CASCADE;")

        print("Step 3: Creating new rates table with container/trip pricing...")

        # Create new rates table
        cur.execute("""
            CREATE TABLE rates (
                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                tenant_id VARCHAR NOT NULL,

                -- Route matching by zone/ward (not specific location)
                pickup_industrial_zone VARCHAR,
                pickup_ward VARCHAR,
                pickup_district VARCHAR,
                pickup_province VARCHAR,

                delivery_industrial_zone VARCHAR,
                delivery_ward VARCHAR,
                delivery_district VARCHAR,
                delivery_province VARCHAR,

                -- Route characteristics
                distance_km INTEGER,
                toll_stations INTEGER,

                -- Pricing type and values
                pricing_type VARCHAR NOT NULL DEFAULT 'CONTAINER',
                price_cont_20 INTEGER,
                price_cont_40 INTEGER,
                price_per_trip INTEGER,

                -- Effective period
                effective_date DATE NOT NULL,
                end_date DATE,

                -- Status
                status VARCHAR NOT NULL DEFAULT 'ACTIVE',

                -- Timestamps
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        # Create indexes on rates
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_rates_tenant_id ON rates(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_rates_pickup_industrial_zone ON rates(pickup_industrial_zone);
            CREATE INDEX IF NOT EXISTS idx_rates_pickup_ward ON rates(pickup_ward);
            CREATE INDEX IF NOT EXISTS idx_rates_delivery_industrial_zone ON rates(delivery_industrial_zone);
            CREATE INDEX IF NOT EXISTS idx_rates_delivery_ward ON rates(delivery_ward);
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
        print("IMPORTANT NOTES:")
        print("1. All existing rates data has been deleted (clean slate)")
        print("2. Locations table now has detailed address fields")
        print("3. Rates now match by KCN/Ward instead of specific locations")
        print("4. Rates support both container-based and trip-based pricing")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
