# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Driver, Location

with Session(engine) as session:
    # List all drivers
    drivers = session.exec(select(Driver)).all()
    print("=== DRIVERS ===")
    for d in drivers:
        print(f"  - {d.name} (ID: {d.id[:8]}...)")

    print("\n=== LOCATIONS (PORT type) ===")
    locations = session.exec(select(Location).where(Location.type == 'PORT')).all()
    for loc in locations:
        print(f"  - {loc.code}: {loc.name}")

    print("\n=== ALL LOCATION CODES ===")
    all_locs = session.exec(select(Location)).all()
    for loc in all_locs[:20]:  # Show first 20
        print(f"  - {loc.code}")
