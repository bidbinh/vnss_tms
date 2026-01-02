# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Order, Site, Location

with Session(engine) as session:
    existing = session.exec(select(Location)).first()
    tenant_id = str(existing.tenant_id)
    print(f'Tenant ID: {tenant_id}')

    # Create HAI_LONG site
    site_hai_long = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'HAI_LONG')).first()
    if not site_hai_long:
        loc_hoangmai = session.exec(select(Location).where(Location.tenant_id == tenant_id, Location.code == 'HOANGMAI')).first()
        if loc_hoangmai:
            site_hai_long = Site(
                tenant_id=tenant_id,
                location_id=str(loc_hoangmai.id),
                company_name='Hai Long',
                code='HAI_LONG',
                site_type='CUSTOMER',
                detailed_address='Yen So, Hoang Mai, Ha Noi',
            )
            session.add(site_hai_long)
            session.commit()
            session.refresh(site_hai_long)
            print(f"Created site: HAI_LONG")

    # Update ADG-152 delivery site
    order = session.exec(select(Order).where(Order.tenant_id == tenant_id, Order.order_code == 'ADG-152')).first()
    if order and site_hai_long:
        order.delivery_site_id = str(site_hai_long.id)
        session.add(order)
        session.commit()
        print(f"Updated ADG-152 delivery_site to HAI_LONG")

    print("\n=== Done ===")
