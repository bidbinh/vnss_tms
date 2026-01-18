"""Check if tenant table has all required columns"""
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
print("CHECK TENANT TABLE COLUMNS")
print("=" * 60)
print()

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Required columns for tenant public info
    required = [
        'id', 'name', 'code', 'logo_url', 'primary_color', 'is_active'
    ]
    
    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        ORDER BY column_name
    """))
    
    existing = {r[0]: {'type': r[1], 'nullable': r[2]} for r in result}
    
    print("Tenant table columns:")
    print()
    all_ok = True
    for col in required:
        if col in existing:
            print(f"  [OK] {col} ({existing[col]['type']})")
        else:
            print(f"  [MISSING] {col}")
            all_ok = False
    
    # Check for sample tenant
    print()
    print("Checking for tenants...")
    result = conn.execute(text("SELECT COUNT(*) FROM tenants"))
    count = result.scalar()
    print(f"  Total tenants: {count}")
    
    if count > 0:
        result = conn.execute(text("SELECT code, name FROM tenants LIMIT 5"))
        tenants = result.fetchall()
        print("  Sample tenants:")
        for code, name in tenants:
            print(f"    - {code}: {name}")
    
    print()
    if all_ok:
        print("[OK] All required columns exist!")
    else:
        print("[ERROR] Some columns are missing!")
