# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Order, Site, Location, Customer, Driver
from datetime import date

with Session(engine) as session:
    existing = session.exec(select(Location)).first()
    tenant_id = str(existing.tenant_id)
    print(f'Tenant ID: {tenant_id}')

    # Get customer ADG
    customer = session.exec(select(Customer).where(Customer.tenant_id == tenant_id, Customer.code == 'ADG')).first()
    print(f"Customer: ADG")

    # Get drivers
    driver_tuyen = session.exec(select(Driver).where(Driver.tenant_id == tenant_id, Driver.name == 'Nguyễn Văn Tuyến')).first()
    driver_vu = session.exec(select(Driver).where(Driver.tenant_id == tenant_id, Driver.name == 'Phạm Đức Vụ')).first()

    # Get existing sites
    site_livabin = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'LIVABIN')).first()

    # Helper to get or create site
    def get_or_create_site(code, company_name, location_code, site_type='PORT', address=''):
        site = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == code)).first()
        if not site:
            loc = session.exec(select(Location).where(Location.tenant_id == tenant_id, Location.code == location_code)).first()
            if loc:
                site = Site(
                    tenant_id=tenant_id,
                    location_id=str(loc.id),
                    company_name=company_name,
                    code=code,
                    site_type=site_type,
                    detailed_address=address,
                )
                session.add(site)
                session.commit()
                session.refresh(site)
                print(f"  Created site: {code}")
        return site

    # Create PORT sites
    site_vip_green = get_or_create_site('VIP_GREEN_PORT', 'Cang VIP Green Port', 'HPPORT', 'PORT', 'VIP Green Port, Hai Phong')
    site_green_port = get_or_create_site('GREEN_PORT', 'Cang Green Port', 'HPPORT', 'PORT', 'Green Port, Hai Phong')
    site_chua_ve = get_or_create_site('CHUA_VE', 'Cang Chua Ve', 'HPPORT', 'PORT', 'Cang Chua Ve, Hai Phong')
    site_hateco = get_or_create_site('HATECO_PORT', 'Cang Hateco', 'HPPORT', 'PORT', 'Hateco Port, Hai Phong')
    site_sitc_dv = get_or_create_site('SITC_DV', 'Depot SITC Dinh Vu', 'HPPORT', 'PORT', 'SITC Dinh Vu')

    # Create CUSTOMER sites
    site_xuan_dat = get_or_create_site('XUAN_DAT', 'Xuan Dat', 'NHUQUYNH', 'CUSTOMER', 'Nhu Quynh, Hung Yen')
    site_son_tung = get_or_create_site('SON_TUNG', 'Son Tung', 'NHUQUYNH', 'CUSTOMER', 'Doi II, Thon Minh Khai, Xa Nhu Quynh, Hung Yen')

    # Orders data - all ASSIGNED
    orders_data = [
        # 19/12
        {
            'order_code': 'ADG-173',
            'driver': driver_tuyen,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'FCIU7232559',
            'cargo_note': 'PP-KR EP300L; 24T/cont; pallet',
            'status': 'ASSIGNED',
            'customer_requested_date': date(2025, 12, 19),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-174',
            'driver': driver_vu,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'TXGU6144528',
            'cargo_note': 'PP-KR EP300L; 24T/cont; pallet',
            'status': 'ASSIGNED',
            'customer_requested_date': date(2025, 12, 19),
            'equipment': '40',
            'qty': 1,
        },
        # 18/12
        {
            'order_code': 'ADG-171',
            'driver': driver_tuyen,
            'pickup_site': site_green_port,
            'delivery_site': site_livabin,
            'port_site': site_sitc_dv,  # Ha rong SITC DV 22/12
            'container_code': 'SKLU1903522',
            'cargo_note': 'HIPS-KR 476L GR21; 19T/cont; xa',
            'status': 'ASSIGNED',
            'customer_requested_date': date(2025, 12, 18),
            'equipment': '20',
            'qty': 1,
        },
        {
            'order_code': 'ADG-172',
            'driver': driver_vu,
            'pickup_site': site_green_port,
            'delivery_site': site_livabin,
            'port_site': site_sitc_dv,  # Ha rong SITC DV 22/12
            'container_code': 'TEMU0911358',
            'cargo_note': 'HIPS-KR 476L GR21; 19T/cont; xa',
            'status': 'ASSIGNED',
            'customer_requested_date': date(2025, 12, 18),
            'equipment': '20',
            'qty': 1,
        },
        # 17/12
        {
            'order_code': 'ADG-169',
            'driver': driver_vu,
            'pickup_site': site_chua_ve,
            'delivery_site': site_xuan_dat,
            'port_site': None,
            'container_code': 'GAOU6132746',
            'cargo_note': 'HDPE-VN H5604F; 27T/cont; pallet',
            'status': 'ASSIGNED',
            'customer_requested_date': date(2025, 12, 17),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-170',
            'driver': driver_tuyen,
            'pickup_site': site_hateco,
            'delivery_site': site_son_tung,
            'port_site': None,
            'container_code': 'TCNU2742811',
            'cargo_note': 'LLDPE-US 2018.AY (ma cu LL1002AY); 24.75T/cont; pallet',
            'status': 'ASSIGNED',
            'customer_requested_date': date(2025, 12, 17),
            'equipment': '40',
            'qty': 1,
        },
    ]

    created = 0
    skipped = 0

    for od in orders_data:
        existing_order = session.exec(
            select(Order).where(Order.tenant_id == tenant_id, Order.order_code == od['order_code'])
        ).first()

        if existing_order:
            print(f"Order {od['order_code']} exists, skipping")
            skipped += 1
            continue

        order = Order(
            tenant_id=tenant_id,
            customer_id=str(customer.id),
            order_code=od['order_code'],
            pickup_site_id=str(od['pickup_site'].id) if od['pickup_site'] else None,
            delivery_site_id=str(od['delivery_site'].id) if od['delivery_site'] else None,
            port_site_id=str(od['port_site'].id) if od['port_site'] else None,
            driver_id=str(od['driver'].id) if od['driver'] else None,
            container_code=od['container_code'],
            equipment=od['equipment'],
            qty=od['qty'],
            cargo_note=od['cargo_note'],
            status=od['status'],
            customer_requested_date=od['customer_requested_date'],
        )
        session.add(order)
        created += 1
        print(f"Created: {od['order_code']} ({od['customer_requested_date'].strftime('%d/%m')})")

    session.commit()
    print(f"\n=== Summary ===")
    print(f"Created: {created} orders")
    print(f"Skipped: {skipped} orders")
