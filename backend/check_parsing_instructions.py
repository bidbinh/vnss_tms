"""Check parsing instructions table"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms:tms@localhost:5432/tms')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'fms_parsing_instructions'
        ORDER BY ordinal_position
    """))
    print('fms_parsing_instructions columns:')
    for row in result:
        print(f'  - {row[0]}: {row[1]}')
