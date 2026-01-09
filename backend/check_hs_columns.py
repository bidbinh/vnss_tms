"""Check actual columns in fms_hs_codes table"""
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
sys.path.insert(0, os.getcwd())

from sqlalchemy import inspect
from app.db.session import engine

with engine.connect() as connection:
    inspector = inspect(connection)
    cols = inspector.get_columns('fms_hs_codes')
    print(f"Total columns: {len(cols)}")
    print("Columns:")
    for c in cols:
        print(f"  - {c['name']}: {c['type']}")
