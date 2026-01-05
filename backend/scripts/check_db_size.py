"""Check database size and table statistics"""
import sys
sys.path.insert(0, '.')

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    # Database size
    result = conn.execute(text("SELECT pg_size_pretty(pg_database_size('tms')) as size"))
    print(f"Database size: {result.fetchone()[0]}")

    # Table counts
    print("\nTable row counts:")
    tables = ['orders', 'drivers', 'vehicles', 'customers', 'sites', 'locations', 'users', 'tenants']
    for table in tables:
        result = conn.execute(text(f"SELECT count(*) FROM {table}"))
        count = result.fetchone()[0]
        print(f"  {table}: {count:,} rows")

    # Table sizes
    print("\nTable sizes:")
    result = conn.execute(text("""
        SELECT relname as table_name,
               pg_size_pretty(pg_total_relation_size(relid)) as total_size
        FROM pg_catalog.pg_statio_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10
    """))
    for row in result:
        print(f"  {row[0]}: {row[1]}")
