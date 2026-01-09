"""Check if customs partner tables exist"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms:tms@localhost:5432/tms')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT tablename FROM pg_tables
        WHERE tablename LIKE 'fms_customs_%'
        ORDER BY tablename
    """))
    tables = result.fetchall()

    print("Customs Partner Tables:")
    for row in tables:
        print(f"  - {row[0]}")

    if not tables:
        print("  No tables found! Migration may not have run.")
