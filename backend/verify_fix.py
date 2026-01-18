"""Verify that all columns have been added"""
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
print("VERIFY COLUMNS IN ORDERS TABLE")
print("=" * 60)
print()

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Required columns
    required = [
        'priority',
        'actual_pickup_at',
        'actual_delivery_at',
        'arrived_at_pickup_at',
        'arrived_at_delivery_at',
        'original_eta_pickup_at',
        'original_eta_delivery_at',
        'weight_kg'
    ]
    
    # Build IN clause manually
    placeholders = ','.join([f"'{col}'" for col in required])
    result = conn.execute(text(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
        AND column_name IN ({placeholders})
    """))
    
    existing = {r[0] for r in result}
    
    print("Required columns status:")
    print()
    all_ok = True
    for col in required:
        if col in existing:
            print(f"  [OK] {col}")
        else:
            print(f"  [MISSING] {col}")
            all_ok = False
    
    print()
    if all_ok:
        print("=" * 60)
        print("[SUCCESS] All required columns exist!")
        print("=" * 60)
        print()
        print("Backend should work now. If you still see errors:")
        print("1. Stop backend (Ctrl+C)")
        print("2. Start backend again:")
        print("   cd d:\\vnss_tms\\backend")
        print("   .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload")
        print("3. Refresh browser page (F5)")
    else:
        print("=" * 60)
        print("[ERROR] Some columns are missing!")
        print("=" * 60)
        print()
        print("Run: python fix_all_missing.py")
