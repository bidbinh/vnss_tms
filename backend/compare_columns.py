from sqlmodel import Session
from app.db.session import engine
from sqlalchemy import text

# Get model columns
from app.models.fms import FMSShipment
model_cols = set(FMSShipment.__table__.columns.keys())

# Get DB columns
with Session(engine) as s:
    result = s.exec(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'fms_shipments'")).all()
    db_cols = {r[0] for r in result}

missing = model_cols - db_cols
if missing:
    print('Missing in DB:', sorted(missing))
else:
    print('All columns present!')
