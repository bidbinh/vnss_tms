"""
Migration script to add vehicle_id to drivers table
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

print("\nAdding vehicle_id column to drivers table...")

migrations = [
    ("vehicle_id", "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR"),
    ("license_no", "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_no VARCHAR"),
]

for column_name, sql in migrations:
    try:
        cursor.execute(sql)
        print(f"  OK: {column_name}")
    except Exception as e:
        print(f"  SKIP: {column_name} - {e}")

conn.commit()

print("\nCreating index...")
try:
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_drivers_vehicle ON drivers(vehicle_id)")
    print("  OK: idx_drivers_vehicle")
except Exception as e:
    print(f"  SKIP: {e}")

conn.commit()
cursor.close()
conn.close()

print("\nMigration completed successfully!")
