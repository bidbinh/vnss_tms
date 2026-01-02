"""
Migration script to:
1. Merge trailers table into vehicles table
2. Create vehicle_assignments table for history tracking
3. Update drivers table to use tractor_id and trailer_id pointing to vehicles
"""
import psycopg2
from app.core.config import settings

# Parse database URL
db_url = settings.DATABASE_URL.replace("postgresql+psycopg2://", "")
user_pass, host_db = db_url.split("@")
user, password = user_pass.split(":")
host_port, dbname = host_db.split("/")
host, port = host_port.split(":")

print(f"Connecting to PostgreSQL database: {dbname}@{host}:{port}")

conn = psycopg2.connect(
    host=host,
    port=port,
    database=dbname,
    user=user,
    password=password
)

cursor = conn.cursor()

# Step 1: Copy all trailers to vehicles with type='TRAILER'
print("\n=== Step 1: Migrating trailers to vehicles table ===")
try:
    cursor.execute("""
        INSERT INTO vehicles (id, tenant_id, plate_no, type, status, created_at, updated_at)
        SELECT id, tenant_id, plate_no, 'TRAILER', status, created_at, updated_at
        FROM trailers
        WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = trailers.id)
    """)
    cursor.execute("SELECT COUNT(*) FROM trailers")
    trailer_count = cursor.fetchone()[0]
    print(f"  OK: Migrated {trailer_count} trailers to vehicles table with type='TRAILER'")
except Exception as e:
    print(f"  ERROR: {e}")
    conn.rollback()
    raise

conn.commit()

# Step 2: Create vehicle_assignments table
print("\n=== Step 2: Creating vehicle_assignments table ===")
try:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vehicle_assignments (
            id VARCHAR PRIMARY KEY,
            tenant_id VARCHAR NOT NULL,
            driver_id VARCHAR NOT NULL,
            vehicle_id VARCHAR NOT NULL,
            vehicle_type VARCHAR NOT NULL,
            assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
            assigned_by VARCHAR NOT NULL,
            unassigned_at TIMESTAMP,
            unassigned_by VARCHAR,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("  OK: Created vehicle_assignments table")
except Exception as e:
    print(f"  SKIP: {e}")

conn.commit()

# Step 3: Create indexes
print("\n=== Step 3: Creating indexes ===")
indexes = [
    "CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver ON vehicle_assignments(driver_id)",
    "CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id)",
    "CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_tenant ON vehicle_assignments(tenant_id)",
    "CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type)",
]

for idx_sql in indexes:
    try:
        cursor.execute(idx_sql)
        print(f"  OK: {idx_sql.split('idx_')[1].split(' ')[0]}")
    except Exception as e:
        print(f"  SKIP: {e}")

conn.commit()

# Step 4: Migrate current driver assignments to vehicle_assignments table
print("\n=== Step 4: Creating historical records from current driver assignments ===")
try:
    # For tractors (vehicle_id)
    cursor.execute("""
        INSERT INTO vehicle_assignments (id, tenant_id, driver_id, vehicle_id, vehicle_type, assigned_at, assigned_by, notes)
        SELECT
            gen_random_uuid()::text,
            d.tenant_id,
            d.id,
            d.vehicle_id,
            'TRACTOR',
            d.updated_at,
            'system_migration',
            'Migrated from existing driver.vehicle_id'
        FROM drivers d
        WHERE d.vehicle_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM vehicle_assignments va
            WHERE va.driver_id = d.id AND va.vehicle_id = d.vehicle_id AND va.unassigned_at IS NULL
        )
    """)
    tractor_count = cursor.rowcount
    print(f"  OK: Created {tractor_count} tractor assignment records")

    # For trailers (trailer_id)
    cursor.execute("""
        INSERT INTO vehicle_assignments (id, tenant_id, driver_id, vehicle_id, vehicle_type, assigned_at, assigned_by, notes)
        SELECT
            gen_random_uuid()::text,
            d.tenant_id,
            d.id,
            d.trailer_id,
            'TRAILER',
            d.updated_at,
            'system_migration',
            'Migrated from existing driver.trailer_id'
        FROM drivers d
        WHERE d.trailer_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM vehicle_assignments va
            WHERE va.driver_id = d.id AND va.vehicle_id = d.trailer_id AND va.unassigned_at IS NULL
        )
    """)
    trailer_count = cursor.rowcount
    print(f"  OK: Created {trailer_count} trailer assignment records")
except Exception as e:
    print(f"  ERROR: {e}")
    conn.rollback()
    raise

conn.commit()

print("\n=== Migration completed successfully! ===")
print("\nSummary:")
print(f"  - Trailers migrated to vehicles: {trailer_count if 'trailer_count' in locals() else 'N/A'}")
print(f"  - Tractor assignments created: {tractor_count if 'tractor_count' in locals() else 0}")
print(f"  - Trailer assignments created: {trailer_count if 'trailer_count' in locals() else 0}")
print("\nNext steps:")
print("  - The 'trailers' table still exists but data is now in 'vehicles' with type='TRAILER'")
print("  - You can drop the 'trailers' table after verifying everything works")

cursor.close()
conn.close()
