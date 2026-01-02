from sqlmodel import Session
from app.db.session import engine
from sqlalchemy import text

with Session(engine) as s:
    result = s.exec(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'fms_bills_of_lading'")).all()
    cols = [r[0] for r in result]
    print('Columns:', len(cols))
    
    if 'bl_status' in cols and 'status' not in cols:
        s.exec(text('ALTER TABLE fms_bills_of_lading RENAME COLUMN bl_status TO status'))
        s.commit()
        print('Renamed bl_status to status')
    elif 'status' in cols:
        print('status column already exists')
    else:
        s.exec(text("ALTER TABLE fms_bills_of_lading ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT'"))
        s.commit()
        print('Added status column')
