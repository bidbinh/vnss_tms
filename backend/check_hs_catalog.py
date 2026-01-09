"""Check hs_code_catalog table for product codes"""
import sys
sys.path.insert(0, '.')

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://tms:tms@localhost:5432/tms")
print(f"Connecting to: {DATABASE_URL[:50]}...")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Count total records
    result = conn.execute(text("SELECT COUNT(*) FROM hs_code_catalog"))
    total = result.scalar()
    print(f"Total HS code records: {total}")

    # Count records with product_code
    result = conn.execute(text("SELECT COUNT(*) FROM hs_code_catalog WHERE product_code IS NOT NULL"))
    with_product = result.scalar()
    print(f"Records with product_code: {with_product}")

    # Sample data
    print("\n--- Sample data with product_code ---")
    result = conn.execute(text("""
        SELECT product_code, hs_code, description_vi
        FROM hs_code_catalog
        WHERE product_code IS NOT NULL
        LIMIT 10
    """))
    rows = result.fetchall()
    if rows:
        for row in rows:
            desc = row[2][:50] if row[2] else ""
            print(f"  {row[0]} => HS: {row[1]} | {desc}")
    else:
        print("  (no records with product_code)")

    # Sample data without product_code
    print("\n--- Sample data (all) ---")
    result = conn.execute(text("""
        SELECT hs_code, product_code, description_vi
        FROM hs_code_catalog
        LIMIT 10
    """))
    rows = result.fetchall()
    for row in rows:
        desc = row[2][:40] if row[2] else ""
        print(f"  HS: {row[0]} | PC: {row[1]} | {desc}")
