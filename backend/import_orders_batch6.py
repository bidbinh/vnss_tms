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
    site_hict = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'HICT')).first()
    site_hai_long = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'HAI_LONG')).first()

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
    loc_phutho = get_or_create_location('PHUTHO', 'Phu Tho')
    loc_myhao = get_or_create_location('MYHAO', 'My Hao, Hung Yen')

    # Create needed sites
    print("\n=== Creating Sites ===")

    # Get Tan Vu and Lach Huyen ports
    site_tan_vu = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'TAN_VU')).first()
    if not site_tan_vu:
        site_tan_vu = get_or_create_site('TAN_VU', 'Cang Tan Vu', 'HPPORT', 'PORT', 'Cang Tan Vu, Hai Phong')

    site_lach_huyen = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'LACH_HUYEN')).first()
    if not site_lach_huyen:
        site_lach_huyen = get_or_create_site('LACH_HUYEN', 'Cang Lach Huyen', 'LACHHUYEN', 'PORT', 'Cang Lach Huyen, Hai Phong')

    # Customer sites
    site_viet_nhat = get_or_create_site('VIET_NHAT', 'CTY Nhua Viet Nhat', 'HADONG', 'CUSTOMER', 'Ha Dong, Ha Noi')
    site_dong_a = get_or_create_site('DONG_A', 'Mang BV Dong A', 'MYHAO', 'CUSTOMER', 'Ngoc Lam, My Hao, Hung Yen')
    site_nhat_minh = get_or_create_site('NHAT_MINH', 'Nhat Minh', 'PHUTHO', 'CUSTOMER', 'Xa Binh Nguyen, tinh Phu Tho')

    # Orders data
    orders_data = [
        # 8/12
        {
            'order_code': 'ADG-148',
            'driver': driver_vu,
            'pickup_site': site_lach_huyen,
            'delivery_site': site_hai_long,
            'port_site': None,
            'container_code': 'FCIU5857130',
            'cargo_note': 'PET-CN YS-C01; 23T/cont; banh',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 8),
            'equipment': '20',
            'qty': 1,
        },
        # 6/12
        {
            'order_code': 'ADG-147',
            'driver': driver_tuyen,
            'pickup_site': site_livabin,
            'delivery_site': site_viet_nhat,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PP-KR GJ-150 (21.35T XA)',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 6),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-145',
            'driver': driver_tuyen,
            'pickup_site': site_tan_vu,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'WHSU5014087',
            'cargo_note': 'ABS-CN HA-714; 27T/cont; pallet',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 6),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-146',
            'driver': driver_vu,
            'pickup_site': site_vip_green,
            'delivery_site': site_dong_a,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'LLDPE-SA CD18N; 24.75T/cont',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 6),
            'equipment': '40',
            'qty': 1,
        },
        # 5/12
        {
            'order_code': 'ADG-144',
            'driver': driver_vu,
            'pickup_site': site_tan_vu,
            'delivery_site': site_nhat_minh,
            'port_site': None,
            'container_code': 'MRSU4017991',
            'cargo_note': 'PVC-TH SG660; 25T/cont; xa',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 5),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-143',
            'driver': driver_tuyen,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'BEAU5060859',
            'cargo_note': 'LLDPE-SA CD18N; 24.75T/cont; pallet',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 5),
            'equipment': '40',
            'qty': 2,
        },
        # 4/12
        {
            'order_code': 'ADG-142',
            'driver': driver_vu,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'TXGU5817964',
            'cargo_note': 'LLDPE-SA CD18N; 24.75T/cont; pallet',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 4),
            'equipment': '40',
            'qty': 2,
        },
        {
            'order_code': 'ADG-141',
            'driver': driver_tuyen,
            'pickup_site': site_hict,
            'delivery_site': site_hai_long,
            'port_site': None,
            'container_code': 'OOLU0441317',
            'cargo_note': 'PET-CN YS-C01; 23T/cont; banh; Xuat hoa don Ha rong ve HNSG',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 4),
            'equipment': '20',
            'qty': 1,
        },
        {
            'order_code': 'ADG-140',
            'driver': driver_vu,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'BEAU5060859',
            'cargo_note': 'LLDPE-SA CD18N; 24.75T/cont; pallet - HUY',
            'status': 'REJECTED',  # HUY
            'customer_requested_date': date(2025, 12, 4),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-139',
            'driver': driver_vu,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'EGSU9673204',
            'cargo_note': 'LLDPE-SA CD18N; 24.75T/cont; pallet',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 4),
            'equipment': '40',
            'qty': 1,
        },
        # 3/12
        {
            'order_code': 'ADG-138',
            'driver': driver_vu,
            'pickup_site': site_tan_vu,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'WHLU5820657',
            'cargo_note': 'ABS-CN HA-714; 27T/cont; xa',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 3),
            'equipment': '40',
            'qty': 1,
        },
        # 2/12
        {
            'order_code': 'ADG-136',
            'driver': driver_vu,
            'pickup_site': site_tan_vu,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'MRSU3823230',
            'cargo_note': 'GPPS-CN 525; 28T/cont; xa',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 2),
            'equipment': '40',
            'qty': 1,
        },
        # 1/12
        {
            'order_code': 'ADG-137',
            'driver': driver_vu,
            'pickup_site': site_hict,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'FCIU4817370',
            'cargo_note': 'PET-CN YS-C01; 23T/cont; banh; Xuat hoa don Ha rong ve HNSG',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 1),
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
        print(f"Created: {od['order_code']} ({od['customer_requested_date'].strftime('%d/%m')}) - {od['status']}")

    session.commit()
    print(f"\n=== Summary ===")
    print(f"Created: {created} orders")
    print(f"Skipped: {skipped} orders")
