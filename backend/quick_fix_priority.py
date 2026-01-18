"""
QUICK FIX: Add priority column to orders table
Fix error: column orders.priority does not exist
"""
import sys
from pathlib import Path

backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

try:
    from sqlalchemy import create_engine, text
    from app.core.config import settings
    
    print("=" * 60)
    print("QUICK FIX: Add priority column")
    print("=" * 60)
    print()
    
    # Create engine
    print(f"Connecting to database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else '...'}")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.begin() as conn:
        # Add priority column
        print("Adding priority column to orders table...")
        conn.execute(text("""
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        """))
        
        # Create index
        print("Creating index...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_orders_priority ON orders(priority)
        """))
        
        print()
        print("✅ SUCCESS! Priority column added.")
        print()
        print("NEXT STEPS:")
        print("1. RESTART your backend server (IMPORTANT!)")
        print("2. Refresh the Orders page in browser")
        print("3. The error should be gone!")
        print("=" * 60)
        
except Exception as e:
    print()
    print("=" * 60)
    print(f"❌ ERROR: {e}")
    print("=" * 60)
    print()
    print("ALTERNATIVE: Run SQL directly in PostgreSQL:")
    print()
    print("ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';")
    print("CREATE INDEX ix_orders_priority ON orders(priority);")
    print()
    import traceback
    traceback.print_exc()
    sys.exit(1)
