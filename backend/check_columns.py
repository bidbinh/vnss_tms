from sqlmodel import Session
from app.db.session import engine
from sqlalchemy import text

with Session(engine) as s:
    result = s.exec(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'fms_shipments' ORDER BY ordinal_position")).all()
    for r in result:
        print(r[0])
