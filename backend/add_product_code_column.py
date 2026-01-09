"""Script to add product_code column to fms_hs_code_catalog table"""
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

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check if column exists
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'fms_hs_code_catalog' AND column_name = 'product_code'
    """))

    if result.fetchone():
        print("Column 'product_code' already exists in fms_hs_code_catalog")
    else:
        print("Adding 'product_code' column to fms_hs_code_catalog...")
        conn.execute(text("""
            ALTER TABLE fms_hs_code_catalog
            ADD COLUMN product_code VARCHAR NULL
        """))
        conn.commit()
        print("Column added successfully!")

        # Create index
        print("Creating index on product_code...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_fms_hs_code_catalog_product_code
            ON fms_hs_code_catalog (product_code)
        """))
        conn.commit()
        print("Index created successfully!")

print("Done!")
