# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Order, Site, Location, Driver

with Session(engine) as session:
    existing = session.exec(select(Location)).first()
    tenant_id = str(existing.tenant_id)
    print(f'Tenant ID: {tenant_id}')

    # Find drivers by Vietnamese name
    driver_tuyen = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.name == 'Nguyễn Văn Tuyến'
        )
    ).first()

    driver_vu = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.name == 'Phạm Đức Vụ'
        )
    ).first()

    print(f"Driver Tuyen: {driver_tuyen.id[:8] if driver_tuyen else 'Not found'}")
    print(f"Driver Vu: {driver_vu.id[:8] if driver_vu else 'Not found'}")

    # Create NAM_DINH_VU site under HPPORT location
    loc_hpport = session.exec(
        select(Location).where(Location.tenant_id == tenant_id, Location.code == 'HPPORT')
    ).first()

    site_nam_dinh_vu = session.exec(
        select(Site).where(Site.tenant_id == tenant_id, Site.code == 'NAM_DINH_VU')
    ).first()

    if not site_nam_dinh_vu and loc_hpport:
        site_nam_dinh_vu = Site(
            tenant_id=tenant_id,
            location_id=str(loc_hpport.id),
            company_name='Cang Nam Dinh Vu',
            code='NAM_DINH_VU',
            site_type='PORT',
            detailed_address='Cang Nam Dinh Vu, Hai Phong',
        )
        session.add(site_nam_dinh_vu)
        session.commit()
        session.refresh(site_nam_dinh_vu)
        print(f"Created site: NAM_DINH_VU")
    else:
        print(f"Site NAM_DINH_VU: {'exists' if site_nam_dinh_vu else 'location not found'}")

    # Update orders with correct driver and pickup site
    orders_to_update = [
        ('ADG-176', driver_tuyen, site_nam_dinh_vu),
        ('ADG-177', driver_vu, site_nam_dinh_vu),
        ('ADG-175', driver_vu, None),  # Keep current pickup
    ]

    for order_code, driver, pickup_site in orders_to_update:
        order = session.exec(
            select(Order).where(Order.tenant_id == tenant_id, Order.order_code == order_code)
        ).first()

        if order:
            if driver:
                order.driver_id = str(driver.id)
            if pickup_site:
                order.pickup_site_id = str(pickup_site.id)
            session.add(order)
            print(f"Updated {order_code}: driver={'yes' if driver else 'no'}, pickup={'yes' if pickup_site else 'no'}")

    session.commit()
    print("\nDone!")
