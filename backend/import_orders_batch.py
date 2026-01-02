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
    # Get tenant_id
    existing = session.exec(select(Location)).first()
    tenant_id = str(existing.tenant_id) if existing else None
    print(f'Tenant ID: {tenant_id}')

    if not tenant_id:
        print('ERROR: No tenant_id found')
        sys.exit(1)

    # Find customer ADG
    customer = session.exec(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.code == 'ADG'
        )
    ).first()
    if not customer:
        print("ERROR: Customer ADG not found")
        sys.exit(1)
    print(f"Found customer: ADG")

    # Find drivers
    driver_tuyen = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.name.ilike("%Tuyen%")
        )
    ).first()

    driver_vu = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.name.ilike("%Vu%")
        )
    ).first()

    print(f"Driver Tuyen: {'Found' if driver_tuyen else 'Not found'}")
    print(f"Driver Vu: {'Found' if driver_vu else 'Not found'}")

    # Helper function to find or create site
    def get_or_create_site(code, company_name, location_code, address='', contact_name='', contact_phone=''):
        site = session.exec(
            select(Site).where(
                Site.tenant_id == tenant_id,
                Site.code == code
            )
        ).first()

        if not site:
            location = session.exec(
                select(Location).where(
                    Location.tenant_id == tenant_id,
                    Location.code == location_code
                )
            ).first()

            if location:
                site = Site(
                    tenant_id=tenant_id,
                    location_id=str(location.id),
                    company_name=company_name,
                    code=code,
                    site_type='CUSTOMER',
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

    # Get existing sites
    site_livabin = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'LIVABIN')).first()
    site_nam_dinh_vu = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code.ilike('%NAM_DINH_VU%'))).first()

    # Create NAM DINH VU site if not exists
    if not site_nam_dinh_vu:
        site_nam_dinh_vu = get_or_create_site('NAM_DINH_VU', 'Cang Nam Dinh Vu', 'HAIPHONG', 'Cang Nam Dinh Vu, Hai Phong')

    # Create 53 Duc Giang site if not exists
    site_53_duc_giang = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'CHI_NHAN_53_DUC_GIANG')).first()

    # Create Medlog Minh Phuong PORT site if not exists
    site_medlog = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'MEDLOG_MINH_PHUONG')).first()
    if not site_medlog:
        # Find a PORT location or create under HAIPHONG
        site_medlog = Site(
            tenant_id=tenant_id,
            location_id=str(site_livabin.location_id) if site_livabin else None,
            company_name='Medlog Minh Phuong',
            code='MEDLOG_MINH_PHUONG',
            site_type='PORT',
            detailed_address='Depot Medlog Minh Phuong',
        )
        session.add(site_medlog)
        session.commit()
        session.refresh(site_medlog)
        print(f"Created PORT site: MEDLOG_MINH_PHUONG")

    # Orders to import
    orders_data = [
        # 176) A Tuyen: NAM DINH VU -> LIVABIN ->(ha rong Medlog Minh Phuong)- TXGU5569580
        {
            'order_code': 'ADG-176',
            'driver': driver_tuyen,
            'pickup_site': site_nam_dinh_vu,
            'delivery_site': site_livabin,
            'port_site': site_medlog,
            'container_code': 'TXGU5569580',
            'cargo_note': 'HDPE-US HM6015; 24.75T/cont; pallet',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 20),
            'equipment': '40',
            'qty': 1,
        },
        # 177) A Vu: NAM DINH VU -> LIVABIN ->(ha rong Medlog Minh Phuong)- MSMU5454445
        {
            'order_code': 'ADG-177',
            'driver': driver_vu,
            'pickup_site': site_nam_dinh_vu,
            'delivery_site': site_livabin,
            'port_site': site_medlog,
            'container_code': 'MSMU5454445',
            'cargo_note': 'HDPE-US HM6015; 24.75T/cont',
            'status': 'IN_TRANSIT',  # Dang tra vo
            'customer_requested_date': date(2025, 12, 20),
            'equipment': '40',
            'qty': 1,
        },
        # 175) A Vu: LIVABIN - 53 Duc Giang
        {
            'order_code': 'ADG-175',
            'driver': driver_vu,
            'pickup_site': site_livabin,
            'delivery_site': site_53_duc_giang,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PET-CN YS-C01 (13B / 14.950KG) + PET-CN YS-W01 (7B / 8.050KG) - PGH CTY HNSG CHO CTY THANH DAT (MST: 0101165907)',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 19),
            'equipment': '40',
            'qty': 1,
        },
    ]

    created = 0
    skipped = 0

    for od in orders_data:
        # Check if order already exists
        existing_order = session.exec(
            select(Order).where(
                Order.tenant_id == tenant_id,
                Order.order_code == od['order_code']
            )
        ).first()

        if existing_order:
            print(f"Order {od['order_code']} already exists, skipping")
            skipped += 1
            continue

        # Create order
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
        print(f"Created: {od['order_code']} - {od['status']}")

    session.commit()

    print(f"\n=== Summary ===")
    print(f"Created: {created} orders")
    print(f"Skipped: {skipped} orders")
