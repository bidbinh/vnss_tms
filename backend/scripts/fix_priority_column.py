"""
Quick Fix: Add missing priority column to orders table
Run this script to fix the error: column orders.priority does not exist
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def main():
    print("=" * 60)
    print("Fix: Add missing columns for TMS Automation")
    print("=" * 60)
    print()
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if priority column exists
        inspector = inspect(engine)
        orders_columns = [col['name'] for col in inspector.get_columns('orders')]
        
        print("Current orders table columns:")
        print(f"  Total: {len(orders_columns)} columns")
        print()
        
        # Priority 1: Add priority column (URGENT FIX)
        if 'priority' not in orders_columns:
            print("❌ Missing: orders.priority")
            print("Adding priority column...")
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority)
            """))
            conn.commit()
            print("✅ Added: orders.priority")
        else:
            print("✅ Column exists: orders.priority")
        
        # Check other Priority 1 fields
        if 'latitude' not in [col['name'] for col in inspector.get_columns('locations')]:
            print("⚠️  Missing: locations.latitude")
            conn.execute(text("ALTER TABLE locations ADD COLUMN latitude FLOAT"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_locations_latitude ON locations(latitude)"))
            conn.commit()
            print("✅ Added: locations.latitude")
        
        if 'longitude' not in [col['name'] for col in inspector.get_columns('locations')]:
            print("⚠️  Missing: locations.longitude")
            conn.execute(text("ALTER TABLE locations ADD COLUMN longitude FLOAT"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_locations_longitude ON locations(longitude)"))
            conn.commit()
            print("✅ Added: locations.longitude")
        
        sites_columns = [col['name'] for col in inspector.get_columns('sites')]
        if 'latitude' not in sites_columns:
            print("⚠️  Missing: sites.latitude")
            conn.execute(text("ALTER TABLE sites ADD COLUMN latitude FLOAT"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sites_latitude ON sites(latitude)"))
            conn.commit()
            print("✅ Added: sites.latitude")
        
        if 'longitude' not in sites_columns:
            print("⚠️  Missing: sites.longitude")
            conn.execute(text("ALTER TABLE sites ADD COLUMN longitude FLOAT"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sites_longitude ON sites(longitude)"))
            conn.commit()
            print("✅ Added: sites.longitude")
        
        if 'geofence_radius_meters' not in sites_columns:
            print("⚠️  Missing: sites.geofence_radius_meters")
            conn.execute(text("""
                ALTER TABLE sites 
                ADD COLUMN geofence_radius_meters INTEGER NOT NULL DEFAULT 100
            """))
            conn.commit()
            print("✅ Added: sites.geofence_radius_meters")
        
        # Priority 2: Add other missing columns
        print()
        print("Checking Priority 2 fields...")
        
        # Vehicles
        vehicles_columns = [col['name'] for col in inspector.get_columns('vehicles')]
        for col in ['current_mileage', 'maintenance_interval_km', 'maintenance_interval_days']:
            if col not in vehicles_columns:
                print(f"⚠️  Missing: vehicles.{col}")
                conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN {col} INTEGER"))
                conn.commit()
                print(f"✅ Added: vehicles.{col}")
        
        # Set default maintenance intervals
        conn.execute(text("""
            UPDATE vehicles
            SET maintenance_interval_km = 10000,
                maintenance_interval_days = 90
            WHERE maintenance_interval_km IS NULL
            AND maintenance_interval_days IS NULL
        """))
        conn.commit()
        
        # Orders - Priority 2 fields
        orders_columns_after = [col['name'] for col in inspector.get_columns('orders')]
        for col in [
            'actual_pickup_at', 'actual_delivery_at',
            'arrived_at_pickup_at', 'arrived_at_delivery_at',
            'original_eta_pickup_at', 'original_eta_delivery_at',
            'weight_kg'
        ]:
            if col not in orders_columns_after:
                print(f"⚠️  Missing: orders.{col}")
                data_type = "FLOAT" if col == "weight_kg" else "TIMESTAMP"
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col} {data_type}"))
                conn.commit()
                print(f"✅ Added: orders.{col}")
        
        # Customers
        customers_columns = [col['name'] for col in inspector.get_columns('customers')]
        if 'auto_accept_enabled' not in customers_columns:
            print("⚠️  Missing: customers.auto_accept_enabled")
            conn.execute(text("""
                ALTER TABLE customers 
                ADD COLUMN auto_accept_enabled BOOLEAN NOT NULL DEFAULT FALSE
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_customers_auto_accept_enabled 
                ON customers(auto_accept_enabled)
            """))
            conn.commit()
            print("✅ Added: customers.auto_accept_enabled")
        
        if 'auto_accept_confidence_threshold' not in customers_columns:
            print("⚠️  Missing: customers.auto_accept_confidence_threshold")
            conn.execute(text("""
                ALTER TABLE customers 
                ADD COLUMN auto_accept_confidence_threshold FLOAT NOT NULL DEFAULT 90.0
            """))
            conn.commit()
            print("✅ Added: customers.auto_accept_confidence_threshold")
        
        if 'delay_alert_threshold_minutes' not in customers_columns:
            print("⚠️  Missing: customers.delay_alert_threshold_minutes")
            conn.execute(text("""
                ALTER TABLE customers 
                ADD COLUMN delay_alert_threshold_minutes INTEGER NOT NULL DEFAULT 15
            """))
            conn.commit()
            print("✅ Added: customers.delay_alert_threshold_minutes")
        
        # Sites - service_time
        if 'service_time_minutes' not in sites_columns:
            print("⚠️  Missing: sites.service_time_minutes")
            conn.execute(text("""
                ALTER TABLE sites 
                ADD COLUMN service_time_minutes INTEGER NOT NULL DEFAULT 30
            """))
            conn.commit()
            print("✅ Added: sites.service_time_minutes")
        
        # Verify
        print()
        print("=" * 60)
        print("Verification:")
        print("=" * 60)
        
        final_orders_columns = [col['name'] for col in inspector.get_columns('orders')]
        if 'priority' in final_orders_columns:
            print("✅ orders.priority column exists - ERROR SHOULD BE FIXED!")
        else:
            print("❌ orders.priority column still missing!")
        
        print()
        print("All columns have been added. Please:")
        print("1. Restart your backend server")
        print("2. Refresh the Orders page")
        print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
