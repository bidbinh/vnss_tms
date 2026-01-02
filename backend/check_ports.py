# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Site

with Session(engine) as session:
    # Get all PORT sites
    port_sites = session.exec(select(Site).where(Site.site_type == 'PORT')).all()
    print(f'PORT sites count: {len(port_sites)}')
    for s in port_sites:
        print(f'  Code: {s.code}, Status: {s.status}')

    print()

    # Get all site types
    all_sites = session.exec(select(Site)).all()
    types = {}
    for s in all_sites:
        types[s.site_type] = types.get(s.site_type, 0) + 1
    print('All site types:')
    for t, count in types.items():
        print(f'  - {t}: {count}')
