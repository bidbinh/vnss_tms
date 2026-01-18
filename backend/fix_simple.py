"""Simple fix script - minimal dependencies"""
import os
import sys

# Try to find database URL
try:
    from dotenv import load_dotenv
    env_local = os.path.join(os.path.dirname(__file__), '.env.local')
    if os.path.exists(env_local):
        load_dotenv(env_local)
    else:
        load_dotenv()
except:
    pass

db_url = os.getenv("DATABASE_URL", "postgresql+psycopg://tms:tms@localhost:5432/tms")

# Convert to sync URL if needed
if "+asyncpg" in db_url:
    db_url = db_url.replace("+asyncpg", "+psycopg")
if "+psycopg" not in db_url and "postgresql://" in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://")

print("=" * 60)
print("QUICK FIX: Add priority column")
print("=" * 60)
print()
print(f"Database: {db_url.split('@')[1] if '@' in db_url else '...'}")
print()

try:
    from sqlalchemy import create_engine, text
    
    engine = create_engine(db_url)
    
    with engine.begin() as conn:
        print("Adding priority column...")
        conn.execute(text("""
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        """))
        
        print("Creating index...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority)
        """))
        
        print()
        print("✅ SUCCESS!")
        print()
        print("⚠️  IMPORTANT: Restart backend server now!")
        
except ImportError:
    print("❌ sqlalchemy not installed")
    print()
    print("Please run:")
    print("  pip install sqlalchemy psycopg2-binary")
    print()
    print("OR run SQL directly: backend/QUICK_FIX.sql")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    print()
    print("Please run SQL directly: backend/QUICK_FIX.sql")
    sys.exit(1)
