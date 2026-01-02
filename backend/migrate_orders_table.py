"""
Migration script to add new columns to orders table.
This adds the columns needed for the updated Order model.
"""
import psycopg2
from app.core.config import settings

# Parse database URL
# Format: postgresql+psycopg2://user:pass@host:port/dbname
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

print("\nAdding new columns to orders table...")

migrations = [
    ("created_by_user_id", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR"),
    ("pickup_text", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_text TEXT"),
    ("delivery_text", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_text TEXT"),
    ("equipment", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS equipment VARCHAR"),
    ("qty", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1"),
    ("container_code", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS container_code VARCHAR"),
    ("cargo_note", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS cargo_note TEXT"),
    ("empty_return_note", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS empty_return_note TEXT"),
    ("dispatcher_id", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatcher_id VARCHAR"),
    ("driver_id", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id VARCHAR"),
    ("eta_pickup_at", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_pickup_at TIMESTAMP"),
    ("eta_delivery_at", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_delivery_at TIMESTAMP"),
    ("reject_reason", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS reject_reason TEXT"),
]

for column_name, sql in migrations:
    try:
        cursor.execute(sql)
        print(f"  OK: {column_name}")
    except Exception as e:
        print(f"  SKIP: {column_name} - {e}")

conn.commit()

print("\nCreating indexes...")
indexes = [
    "CREATE INDEX IF NOT EXISTS idx_orders_created_by_user ON orders(created_by_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_dispatcher ON orders(dispatcher_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id)",
]

for sql in indexes:
    try:
        cursor.execute(sql)
        print(f"  OK")
    except Exception as e:
        print(f"  SKIP: {e}")

conn.commit()
cursor.close()
conn.close()

print("\nMigration completed successfully!")
print("You can now use the updated Order model.")
