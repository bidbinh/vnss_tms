"""
Migration script to add tractor_id column to drivers table
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

print("\nAdding tractor_id column to drivers table...")

try:
    cursor.execute("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tractor_id VARCHAR")
    print("  OK: tractor_id column added")
except Exception as e:
    print(f"  SKIP: {e}")

conn.commit()

# Copy vehicle_id to tractor_id for backward compatibility
print("\nCopying vehicle_id to tractor_id...")
try:
    cursor.execute("UPDATE drivers SET tractor_id = vehicle_id WHERE vehicle_id IS NOT NULL AND tractor_id IS NULL")
    rows_updated = cursor.rowcount
    print(f"  OK: {rows_updated} rows updated")
except Exception as e:
    print(f"  ERROR: {e}")

conn.commit()

print("\nCreating index...")
try:
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_drivers_tractor ON drivers(tractor_id)")
    print("  OK: idx_drivers_tractor")
except Exception as e:
    print(f"  SKIP: {e}")

conn.commit()
cursor.close()
conn.close()

print("\nMigration completed successfully!")
