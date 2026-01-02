"""
Migration script to add customer_requested_date to orders table
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

print("\nAdding customer_requested_date column to orders table...")

try:
    cursor.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_requested_date TIMESTAMP")
    print("  OK: customer_requested_date column added")
except Exception as e:
    print(f"  SKIP: {e}")

conn.commit()
cursor.close()
conn.close()

print("\nMigration completed successfully!")
