"""Check drivers with external_worker_id"""
from app.db.session import engine
from sqlmodel import Session, select
from app.models.driver import Driver

with Session(engine) as session:
    drivers = session.exec(select(Driver)).all()
    for d in drivers:
        worker_id = getattr(d, 'external_worker_id', None)
        print(f"Driver: {d.name} | external_worker_id: {worker_id}")
