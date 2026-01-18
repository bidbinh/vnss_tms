"""Fix missing customers columns"""
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
print("FIX CUSTOMERS TABLE COLUMNS")
print("=" * 60)
print()

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    print("Adding missing columns to customers table...")
    print()
    
    # Add columns
    print("1. Adding auto_accept_enabled...")
    conn.execute(text("""
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS auto_accept_enabled BOOLEAN NOT NULL DEFAULT FALSE
    """))
    print("   [OK] Column added")
    
    print("2. Adding auto_accept_confidence_threshold...")
    conn.execute(text("""
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS auto_accept_confidence_threshold FLOAT NOT NULL DEFAULT 90.0
    """))
    print("   [OK] Column added")
    
    print("3. Adding delay_alert_threshold_minutes...")
    conn.execute(text("""
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS delay_alert_threshold_minutes INTEGER NOT NULL DEFAULT 15
    """))
    print("   [OK] Column added")
    
    print("4. Creating index...")
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_customers_auto_accept_enabled 
        ON customers(auto_accept_enabled)
    """))
    print("   [OK] Index created")
    
    # Verify
    print()
    print("Verifying...")
    result = conn.execute(text("""
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'customers' 
        AND column_name IN ('auto_accept_enabled', 'auto_accept_confidence_threshold', 'delay_alert_threshold_minutes')
        ORDER BY column_name
    """))
    
    rows = result.fetchall()
    for row in rows:
        print(f"   [OK] {row[0]} ({row[1]}, default: {row[2]})")
    
    print()
    print("=" * 60)
    print("[SUCCESS] All customers columns added!")
    print("=" * 60)
    print()
    print("[!] IMPORTANT: Restart your backend server now!")
