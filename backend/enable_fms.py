import sys
sys.stdout.reconfigure(encoding='utf-8')
from sqlmodel import Session, select
from app.db.session import engine
from app.models import Tenant
import json

with Session(engine) as s:
    tenants = s.exec(select(Tenant)).all()
    for t in tenants:
        print(f'Tenant ID: {t.id}')
        print(f'  Current modules: {t.enabled_modules}')
        
        # Update enabled_modules to include fms
        if t.enabled_modules:
            try:
                modules = json.loads(t.enabled_modules)
            except:
                modules = ['tms']
        else:
            modules = ['tms']
        
        if 'fms' not in modules:
            modules.append('fms')
            t.enabled_modules = json.dumps(modules)
            s.add(t)
            print(f'  Updated to: {modules}')
        else:
            print(f'  FMS already enabled')
    
    s.commit()
    print('Done!')
