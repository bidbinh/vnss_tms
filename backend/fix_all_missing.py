"""Fix all missing columns for orders table"""
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
print("FIX ALL MISSING COLUMNS FOR ORDERS")
print("=" * 60)
print()

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    # Columns to add
    columns = {
        'actual_pickup_at': 'TIMESTAMP',
        'actual_delivery_at': 'TIMESTAMP',
        'arrived_at_pickup_at': 'TIMESTAMP',
        'arrived_at_delivery_at': 'TIMESTAMP',
        'original_eta_pickup_at': 'TIMESTAMP',
        'original_eta_delivery_at': 'TIMESTAMP',
        'weight_kg': 'FLOAT'
    }
    
    print("Checking existing columns...")
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
    """))
    existing = {r[0] for r in result}
    
    added = []
    for col, col_type in columns.items():
        if col not in existing:
            print(f"Adding {col}...")
            conn.execute(text(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            added.append(col)
        else:
            print(f"[OK] {col} already exists")
    
    if added:
        print()
        print(f"[SUCCESS] Added {len(added)} columns: {', '.join(added)}")
    else:
        print()
        print("[OK] All columns already exist!")
    
    print()
    print("=" * 60)
    print("[DONE] All columns fixed!")
    print("=" * 60)
    print()
    print("[!] IMPORTANT: Restart your backend server now!")
