"""
FIX ALL MISSING COLUMNS
Fix all missing columns for TMS automation including:
- orders.priority (fixes current error)
- orders.actual_pickup_at, actual_delivery_at, etc.
- locations.latitude, longitude
- sites.latitude, longitude, geofence_radius_meters
- vehicles.current_mileage, maintenance_interval_*
- customers.auto_accept_*
"""
import sys
from pathlib import Path

backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def check_and_add_column(conn, table_name, column_name, column_def):
    """Check if column exists and add if missing"""
    inspector = inspect(conn.engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    
    if column_name not in columns:
        print(f"  ❌ Missing: {table_name}.{column_name}")
        conn.execute(text(f"ALTER TABLE {table_name} {column_def}"))
        conn.commit()
        print(f"  ✅ Added: {table_name}.{column_name}")
        return True
    else:
        print(f"  ✅ Exists: {table_name}.{column_name}")
        return False

def main():
    print("=" * 60)
    print("FIX ALL MISSING COLUMNS FOR TMS AUTOMATION")
    print("=" * 60)
    print()
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        inspector = inspect(engine)
        
        with engine.begin() as conn:
            print("Checking and fixing columns...")
            print()
            
            any_changes = False
            
            # PRIORITY 1: Critical fields
            print("--- Priority 1: Critical Fields ---")
            
            # Orders.priority (FIXES CURRENT ERROR)
            if check_and_add_column(
                conn, 'orders', 'priority',
                "ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'"
            ):
                any_changes = True
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority)"))
            
            # Locations
            check_and_add_column(conn, 'locations', 'latitude', "ADD COLUMN latitude FLOAT")
            check_and_add_column(conn, 'locations', 'longitude', "ADD COLUMN longitude FLOAT")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_locations_latitude ON locations(latitude)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_locations_longitude ON locations(longitude)"))
            
            # Sites
            check_and_add_column(conn, 'sites', 'latitude', "ADD COLUMN latitude FLOAT")
            check_and_add_column(conn, 'sites', 'longitude', "ADD COLUMN longitude FLOAT")
            check_and_add_column(conn, 'sites', 'geofence_radius_meters', "ADD COLUMN geofence_radius_meters INTEGER NOT NULL DEFAULT 100")
            check_and_add_column(conn, 'sites', 'service_time_minutes', "ADD COLUMN service_time_minutes INTEGER NOT NULL DEFAULT 30")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sites_latitude ON sites(latitude)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sites_longitude ON sites(longitude)"))
            
            print()
            print("--- Priority 2: Important Fields ---")
            
            # Orders - actual times
            for col in ['actual_pickup_at', 'actual_delivery_at', 'arrived_at_pickup_at', 
                       'arrived_at_delivery_at', 'original_eta_pickup_at', 'original_eta_delivery_at']:
                if check_and_add_column(conn, 'orders', col, f"ADD COLUMN {col} TIMESTAMP"):
                    any_changes = True
            
            # Orders - weight
            if check_and_add_column(conn, 'orders', 'weight_kg', "ADD COLUMN weight_kg FLOAT"):
                any_changes = True
            
            # Vehicles
            check_and_add_column(conn, 'vehicles', 'current_mileage', "ADD COLUMN current_mileage INTEGER")
            check_and_add_column(conn, 'vehicles', 'maintenance_interval_km', "ADD COLUMN maintenance_interval_km INTEGER")
            check_and_add_column(conn, 'vehicles', 'maintenance_interval_days', "ADD COLUMN maintenance_interval_days INTEGER")
            
            # Set default maintenance intervals
            conn.execute(text("""
                UPDATE vehicles
                SET maintenance_interval_km = 10000,
                    maintenance_interval_days = 90
                WHERE maintenance_interval_km IS NULL
                AND maintenance_interval_days IS NULL
            """))
            
            # Customers
            if check_and_add_column(conn, 'customers', 'auto_accept_enabled', "ADD COLUMN auto_accept_enabled BOOLEAN NOT NULL DEFAULT FALSE"):
                any_changes = True
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_customers_auto_accept_enabled ON customers(auto_accept_enabled)"))
            
            check_and_add_column(conn, 'customers', 'auto_accept_confidence_threshold', "ADD COLUMN auto_accept_confidence_threshold FLOAT NOT NULL DEFAULT 90.0")
            check_and_add_column(conn, 'customers', 'delay_alert_threshold_minutes', "ADD COLUMN delay_alert_threshold_minutes INTEGER NOT NULL DEFAULT 15")
            
            # Verify
            print()
            print("=" * 60)
            print("VERIFICATION:")
            print("=" * 60)
            
            orders_columns = [col['name'] for col in inspector.get_columns('orders')]
            critical_fields = ['priority', 'actual_pickup_at', 'actual_delivery_at']
            
            all_good = True
            for field in critical_fields:
                if field in orders_columns:
                    print(f"✅ orders.{field} - OK")
                else:
                    print(f"❌ orders.{field} - MISSING!")
                    all_good = False
            
            print()
            if all_good:
                print("=" * 60)
                print("✅ ALL COLUMNS ADDED SUCCESSFULLY!")
                print("=" * 60)
                print()
                print("⚠️  IMPORTANT: You MUST restart your backend server now!")
                print()
                print("After restarting:")
                print("1. Refresh the Orders page in browser")
                print("2. The error should be gone!")
            else:
                print("⚠️  Some columns are still missing. Please check errors above.")
            
            print("=" * 60)
            
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ ERROR: {e}")
        print("=" * 60)
        print()
        print("Please check:")
        print("1. Database connection settings in .env")
        print("2. Database is running")
        print("3. You have permissions to alter tables")
        print()
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
