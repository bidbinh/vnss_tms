from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms:tms@localhost:5432/tms')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text('SELECT declaration_no, foreign_partner_name, bl_no, registration_date FROM fms_customs_declarations LIMIT 5'))
    rows = result.fetchall()
    print("Data in fms_customs_declarations:")
    for row in rows:
        print(f"  declaration_no={row[0]}, foreign_partner_name={row[1]}, bl_no={row[2]}, registration_date={row[3]}")
