"""Check actual schema of fms_hs_codes table"""
import os
import sys
os.chdir('d:\\vnss_tms\\backend')
sys.path.insert(0, os.getcwd())

from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'fms_hs_codes'
        ORDER BY ordinal_position
    """))
    print("Columns in fms_hs_codes table:")
    print("-" * 60)
    for row in result:
        print(f"{row[0]:30} | {row[1]:15} | {row[2]}")
