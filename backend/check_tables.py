import sys
sys.stdout.reconfigure(encoding='utf-8')

from app.db.session import engine
from sqlalchemy import inspect

try:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    fms_tables = [t for t in tables if 'fms' in t.lower()]
    print(f"FMS Tables found: {len(fms_tables)}")
    for t in fms_tables:
        print(f"  - {t}")

    # Check specifically for hs_code_catalog
    if 'fms_hs_code_catalog' in tables:
        print("\nfms_hs_code_catalog: EXISTS")
    else:
        print("\nfms_hs_code_catalog: NOT FOUND")
        print("\nAvailable tables with 'hs' in name:")
        for t in tables:
            if 'hs' in t.lower():
                print(f"  - {t}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
