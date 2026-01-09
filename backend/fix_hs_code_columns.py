"""Script to swap product_code and hs_code values in fms_hs_code_catalog table

Current state (wrong):
- hs_code column contains: product_code values (e.g., G2DHY)
- description_en column contains: hs_code values (e.g., 85249100)

Target state (correct):
- hs_code column: actual HS codes (e.g., 85249100)
- product_code column: product codes (e.g., G2DHY)
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment")
    sys.exit(1)

print("Connecting to database...")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # First, check if product_code column exists
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'fms_hs_code_catalog' AND column_name = 'product_code'
    """))

    if not result.fetchone():
        print("Adding 'product_code' column first...")
        conn.execute(text("""
            ALTER TABLE fms_hs_code_catalog
            ADD COLUMN product_code VARCHAR NULL
        """))
        conn.commit()
        print("Column added!")

    # Show current data before swap
    print("\n=== BEFORE SWAP (first 5 rows) ===")
    result = conn.execute(text("""
        SELECT id, hs_code, description_en, product_code, description_vi
        FROM fms_hs_code_catalog
        LIMIT 5
    """))
    for row in result:
        print(f"  hs_code={row[1]}, desc_en={row[2]}, product_code={row[3]}")

    # Swap values:
    # 1. Move current hs_code (which is actually product_code) to product_code column
    # 2. Move current description_en (which is actually hs_code) to hs_code column
    # 3. Clear description_en (or keep it as backup)

    print("\n=== SWAPPING COLUMNS ===")
    print("Step 1: Copy hs_code -> product_code (saving product codes)")
    conn.execute(text("""
        UPDATE fms_hs_code_catalog
        SET product_code = hs_code
        WHERE product_code IS NULL OR product_code = ''
    """))
    conn.commit()

    print("Step 2: Copy description_en -> hs_code (fixing HS codes)")
    conn.execute(text("""
        UPDATE fms_hs_code_catalog
        SET hs_code = description_en
        WHERE description_en IS NOT NULL AND description_en != ''
    """))
    conn.commit()

    print("Step 3: Clear description_en (was temporary storage)")
    conn.execute(text("""
        UPDATE fms_hs_code_catalog
        SET description_en = NULL
    """))
    conn.commit()

    # Show data after swap
    print("\n=== AFTER SWAP (first 5 rows) ===")
    result = conn.execute(text("""
        SELECT id, hs_code, description_en, product_code, description_vi
        FROM fms_hs_code_catalog
        LIMIT 5
    """))
    for row in result:
        print(f"  hs_code={row[1]}, product_code={row[3]}, desc_vi={row[4][:30] if row[4] else 'N/A'}...")

    # Count total
    result = conn.execute(text("SELECT COUNT(*) FROM fms_hs_code_catalog"))
    count = result.scalar()
    print(f"\nTotal records updated: {count}")

print("\nDone! Columns have been swapped successfully.")
