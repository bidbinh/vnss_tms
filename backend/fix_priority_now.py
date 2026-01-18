"""FIX PRIORITY COLUMN NOW - Simple script based on existing patterns"""
import os
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add current directory to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Load .env
from dotenv import load_dotenv
env_local = backend_path / '.env.local'
if env_local.exists():
    load_dotenv(env_local)
else:
    load_dotenv()

# Get DATABASE_URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms_user:tms_pass@127.0.0.1:5432/tms')

# Convert to sync URL if needed
if "+asyncpg" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+asyncpg", "+psycopg")
if "+psycopg" not in DATABASE_URL and "postgresql://" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

print("=" * 60)
print("FIX PRIORITY COLUMN")
print("=" * 60)
print(f"Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else '...'}")
print()

try:
    from sqlalchemy import create_engine, text
    
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        print("1. Adding priority column...")
        conn.execute(text("""
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        """))
        print("   [OK] Column added")
        
        print("2. Creating index...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority)
        """))
        print("   [OK] Index created")
        
        print()
        print("3. Verifying...")
        result = conn.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'priority'
        """))
        row = result.fetchone()
        
        if row:
            print(f"   [OK] Verified: {row[0]} ({row[1]}, default: {row[2]})")
        else:
            print("   [ERROR] Column not found!")
        
        print()
        print("=" * 60)
        print("[SUCCESS] FIX COMPLETED!")
        print("=" * 60)
        print()
        print("[!] IMPORTANT: Restart your backend server now!")
        print()
        
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print()
    print("Please install: pip install sqlalchemy psycopg2-binary python-dotenv")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
