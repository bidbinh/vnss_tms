"""Fix missing vehicles columns"""
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
print("FIX VEHICLES TABLE COLUMNS")
print("=" * 60)
print()

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    print("Adding missing columns to vehicles table...")
    print()
    
    # Add columns
    print("1. Adding current_mileage...")
    conn.execute(text("""
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS current_mileage INTEGER
    """))
    print("   [OK] Column added")
    
    print("2. Adding maintenance_interval_km...")
    conn.execute(text("""
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS maintenance_interval_km INTEGER
    """))
    print("   [OK] Column added")
    
    print("3. Adding maintenance_interval_days...")
    conn.execute(text("""
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER
    """))
    print("   [OK] Column added")
    
    # Set default maintenance intervals for existing vehicles
    print("4. Setting default maintenance intervals...")
    conn.execute(text("""
        UPDATE vehicles
        SET maintenance_interval_km = 10000,
            maintenance_interval_days = 90
        WHERE maintenance_interval_km IS NULL
        AND maintenance_interval_days IS NULL
    """))
    print("   [OK] Default values set")
    
    # Verify
    print()
    print("Verifying...")
    result = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'vehicles' 
        AND column_name IN ('current_mileage', 'maintenance_interval_km', 'maintenance_interval_days')
        ORDER BY column_name
    """))
    
    rows = result.fetchall()
    for row in rows:
        print(f"   [OK] {row[0]} ({row[1]})")
    
    print()
    print("=" * 60)
    print("[SUCCESS] All vehicles columns added!")
    print("=" * 60)
    print()
    print("[!] IMPORTANT: Restart your backend server now!")
