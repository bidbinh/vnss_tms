"""Fix ALL missing columns for TMS automation in one go"""
import os
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
env_local = backend_path / '.env.local'
if env_local.exists():
    load_dotenv(env_local)
else:
    load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms_user:tms_pass@127.0.0.1:5432/tms')
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg")
if "+psycopg" not in DATABASE_URL and "postgresql://" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

print("=" * 60)
print("FIX ALL MISSING COLUMNS FOR TMS AUTOMATION")
print("=" * 60)
print()

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    added_count = 0
    
    # ============================================
    # 1. ORDERS TABLE
    # ============================================
    print("--- Orders Table ---")
    orders_columns = [
        ('priority', 'VARCHAR(20) NOT NULL DEFAULT \'NORMAL\''),
        ('actual_pickup_at', 'TIMESTAMP'),
        ('actual_delivery_at', 'TIMESTAMP'),
        ('arrived_at_pickup_at', 'TIMESTAMP'),
        ('arrived_at_delivery_at', 'TIMESTAMP'),
        ('original_eta_pickup_at', 'TIMESTAMP'),
        ('original_eta_delivery_at', 'TIMESTAMP'),
        ('weight_kg', 'FLOAT'),
    ]
    
    for col, col_type in orders_columns:
        try:
            conn.execute(text(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            print(f"  [OK] orders.{col}")
            added_count += 1
        except Exception as e:
            print(f"  [SKIP] orders.{col} - {e}")
    
    # Create index for priority
    try:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority)"))
    except:
        pass
    
    print()
    
    # ============================================
    # 2. CUSTOMERS TABLE
    # ============================================
    print("--- Customers Table ---")
    customers_columns = [
        ('auto_accept_enabled', 'BOOLEAN NOT NULL DEFAULT FALSE'),
        ('auto_accept_confidence_threshold', 'FLOAT NOT NULL DEFAULT 90.0'),
        ('delay_alert_threshold_minutes', 'INTEGER NOT NULL DEFAULT 15'),
    ]
    
    for col, col_type in customers_columns:
        try:
            conn.execute(text(f"ALTER TABLE customers ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            print(f"  [OK] customers.{col}")
            added_count += 1
        except Exception as e:
            print(f"  [SKIP] customers.{col} - {e}")
    
    # Create index
    try:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_customers_auto_accept_enabled ON customers(auto_accept_enabled)"))
    except:
        pass
    
    print()
    
    # ============================================
    # 3. VEHICLES TABLE
    # ============================================
    print("--- Vehicles Table ---")
    vehicles_columns = [
        ('current_mileage', 'INTEGER'),
        ('maintenance_interval_km', 'INTEGER'),
        ('maintenance_interval_days', 'INTEGER'),
    ]
    
    for col, col_type in vehicles_columns:
        try:
            conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            print(f"  [OK] vehicles.{col}")
            added_count += 1
        except Exception as e:
            print(f"  [SKIP] vehicles.{col} - {e}")
    
    # Set default maintenance intervals
    try:
        conn.execute(text("""
            UPDATE vehicles
            SET maintenance_interval_km = 10000,
                maintenance_interval_days = 90
            WHERE maintenance_interval_km IS NULL
            AND maintenance_interval_days IS NULL
        """))
    except:
        pass
    
    print()
    
    # ============================================
    # 4. LOCATIONS TABLE
    # ============================================
    print("--- Locations Table ---")
    locations_columns = [
        ('latitude', 'FLOAT'),
        ('longitude', 'FLOAT'),
    ]
    
    for col, col_type in locations_columns:
        try:
            conn.execute(text(f"ALTER TABLE locations ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            print(f"  [OK] locations.{col}")
            added_count += 1
        except Exception as e:
            print(f"  [SKIP] locations.{col} - {e}")
    
    # Create indexes
    try:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_locations_latitude ON locations(latitude)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_locations_longitude ON locations(longitude)"))
    except:
        pass
    
    print()
    
    # ============================================
    # 5. SITES TABLE
    # ============================================
    print("--- Sites Table ---")
    sites_columns = [
        ('latitude', 'FLOAT'),
        ('longitude', 'FLOAT'),
        ('geofence_radius_meters', 'INTEGER NOT NULL DEFAULT 100'),
        ('service_time_minutes', 'INTEGER NOT NULL DEFAULT 30'),
    ]
    
    for col, col_type in sites_columns:
        try:
            conn.execute(text(f"ALTER TABLE sites ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            print(f"  [OK] sites.{col}")
            added_count += 1
        except Exception as e:
            print(f"  [SKIP] sites.{col} - {e}")
    
    # Create indexes
    try:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sites_latitude ON sites(latitude)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sites_longitude ON sites(longitude)"))
    except:
        pass
    
    print()
    print("=" * 60)
    print(f"[SUCCESS] Added {added_count} columns!")
    print("=" * 60)
    print()
    print("[!] IMPORTANT: Restart your backend server now!")
