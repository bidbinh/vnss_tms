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
    print(f"Driver Tuyen: {driver_tuyen.id[:8] if driver_tuyen else 'Not found'}")
    print(f"Driver Vu: {driver_vu.id[:8] if driver_vu else 'Not found'}")

    # Get existing sites
    site_livabin = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'LIVABIN')).first()
    site_vip_green = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'VIP_GREEN_PORT')).first()
    site_nam_dinh_vu = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'NAM_DINH_VU')).first()
    site_khai_than = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'KHAI_THAN')).first()

    # Helper to get or create location
    def get_or_create_location(code, name, loc_type='CUSTOMER'):
        loc = session.exec(select(Location).where(Location.tenant_id == tenant_id, Location.code == code)).first()
        if not loc:
            loc = Location(
                tenant_id=tenant_id,
                code=code,
                name=name,
                type=loc_type,
            )
            session.add(loc)
            session.commit()
            session.refresh(loc)
            print(f"  Created location: {code}")
        return loc

    # Helper to get or create site
    def get_or_create_site(code, company_name, location_code, site_type='CUSTOMER', address='', contact_name='', contact_phone=''):
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
                    contact_name=contact_name,
                    contact_phone=contact_phone,
                )
                session.add(site)
                session.commit()
                session.refresh(site)
                print(f"  Created site: {code}")
            else:
                print(f"  WARNING: Location {location_code} not found for site {code}")
                return None
        return site

    # Create locations if needed
    print("\n=== Creating Locations ===")
    loc_hoangmai = get_or_create_location('HOANGMAI', 'Hoang Mai, Ha Noi')

    # Create needed sites
    print("\n=== Creating Sites ===")
    site_hict = get_or_create_site('HICT', 'Cang HICT', 'HPPORT', 'PORT', 'HICT, Hai Phong')

    site_anh_thong = get_or_create_site('ANH_THONG', 'Anh Thong', 'LONGBIEN', 'CUSTOMER',
        'Viet Hung, Long Bien, Ha Noi (doi dien Vien KSND Quan Long Bien cu)')

    site_hai_long = get_or_create_site('HAI_LONG', 'Hai Long', 'HOANGMAI', 'CUSTOMER',
        'Yen So, Hoang Mai, Ha Noi')

    # Orders data
    orders_data = [
        # 10/12
        {
            'order_code': 'ADG-155',
            'driver': driver_vu,
            'pickup_site': site_nam_dinh_vu,
            'delivery_site': site_anh_thong,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'GPPS-CN STL525; 28T/cont; xa',
            'status': 'DELIVERED',  # Chua tra rong
            'customer_requested_date': date(2025, 12, 10),
            'equipment': '40',
            'qty': 1,
        },
        # 9/12
        {
            'order_code': 'ADG-149',
            'driver': driver_tuyen,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'EITU1294304',
            'cargo_note': 'LLDPE-KR UF1002EH; 22T/cont; pallet',
            'status': 'IN_TRANSIT',  # Dang lay hang, giao 10/12
            'customer_requested_date': date(2025, 12, 9),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-150',
            'driver': driver_tuyen,
            'pickup_site': site_livabin,
            'delivery_site': site_khai_than,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PP-KR GY130 (28T/XA)',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 9),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-153',
            'driver': driver_vu,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'EITU1923618',
            'cargo_note': 'LLDPE-KR UF1002EH; 22T/cont; pallet',
            'status': 'DELIVERED',  # Dang tra vo
            'customer_requested_date': date(2025, 12, 9),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-151',
            'driver': driver_tuyen,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'TLLU7554269',
            'cargo_note': 'LLDPE-KR UF1002EH; 22T/cont; pallet',
            'status': 'DELIVERED',  # Chua tra vo
            'customer_requested_date': date(2025, 12, 9),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-152',
            'driver': driver_vu,
            'pickup_site': site_hict,
            'delivery_site': site_hai_long,
            'port_site': None,
            'container_code': 'CSNU2396502',
            'cargo_note': 'PET-CN YS-C01; 23T/cont; banh',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 9),
            'equipment': '20',
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
        print(f"Created: {od['order_code']} ({od['customer_requested_date'].strftime('%d/%m')}) - {od['status']}")

    session.commit()
    print(f"\n=== Summary ===")
    print(f"Created: {created} orders")
    print(f"Skipped: {skipped} orders")
