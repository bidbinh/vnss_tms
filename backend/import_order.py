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

    # Parse order data
    order_data = {
        'order_code': 'ADG-178',
        'customer_code': 'ADG',
        'driver_name': 'Tuyến',  # Search by partial name
        'pickup_site_code': 'LIVABIN',
        'delivery_location': 'KCNDONGVAN2',
        'delivery_company': 'CTY KAILO',
        'delivery_address': 'BEN TRONG KHU SON ATA, KCN DONG VAN 2, P. DUY MINH, TX. DUY TIEN, HA NAM',
        'contact_name': 'A.THIEN PHUC',
        'contact_phone': '0904662118',
        'cargo_note': 'LLDPE-KR UF1002EH (22T/KIEN)',
        'status': 'DELIVERED',
        'customer_requested_date': date(2025, 12, 20),
        'equipment': '40',
        'qty': 1,
    }

    # Find customer ADG
    customer = session.exec(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.code == order_data['customer_code']
        )
    ).first()

    if not customer:
        print(f"ERROR: Customer {order_data['customer_code']} not found")
        sys.exit(1)
    print(f"Found customer: {customer.code}")

    # Find driver by partial name
    driver = session.exec(
        select(Driver).where(
            Driver.tenant_id == tenant_id,
            Driver.name.ilike(f"%{order_data['driver_name']}%")
        )
    ).first()

    if driver:
        print(f"Found driver ID: {driver.id}")
    else:
        print(f"WARNING: Driver not found")

    # Find pickup site (LIVABIN)
    pickup_site = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.code == order_data['pickup_site_code']
        )
    ).first()

    if pickup_site:
        print(f"Found pickup site: {pickup_site.code}")
    else:
        print(f"WARNING: Pickup site not found")

    # Find or create delivery site (CTY KAILO at KCN Dong Van 2)
    delivery_site = session.exec(
        select(Site).where(
            Site.tenant_id == tenant_id,
            Site.company_name.ilike(f"%KAILO%")
        )
    ).first()

    if not delivery_site:
        # Find location KCN Dong Van 2
        delivery_location = session.exec(
            select(Location).where(
                Location.tenant_id == tenant_id,
                Location.code == order_data['delivery_location']
            )
        ).first()

        if delivery_location:
            print(f"Found delivery location: {delivery_location.code}")
            # Create new site for KAILO
            delivery_site = Site(
                tenant_id=tenant_id,
                location_id=str(delivery_location.id),
                company_name=order_data['delivery_company'],
                code='KAILO',
                site_type='CUSTOMER',
                detailed_address=order_data['delivery_address'],
                contact_name=order_data['contact_name'],
                contact_phone=order_data['contact_phone'],
            )
            session.add(delivery_site)
            session.commit()
            session.refresh(delivery_site)
            print(f"Created delivery site: KAILO")
        else:
            print(f"ERROR: Delivery location not found")
            sys.exit(1)
    else:
        print(f"Found delivery site: {delivery_site.code}")

    # Check if order already exists
    existing_order = session.exec(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.order_code == order_data['order_code']
        )
    ).first()

    if existing_order:
        print(f"Order {order_data['order_code']} already exists, skipping")
        sys.exit(0)

    # Create order
    order = Order(
        tenant_id=tenant_id,
        customer_id=str(customer.id),
        order_code=order_data['order_code'],
        pickup_site_id=str(pickup_site.id) if pickup_site else None,
        delivery_site_id=str(delivery_site.id) if delivery_site else None,
        driver_id=str(driver.id) if driver else None,
        equipment=order_data['equipment'],
        qty=order_data['qty'],
        cargo_note=order_data['cargo_note'],
        status=order_data['status'],
        customer_requested_date=order_data['customer_requested_date'],
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    print(f"\n=== Order Created ===")
    print(f"Order Code: {order.order_code}")
    print(f"Status: {order.status}")
    print(f"Date: {order.customer_requested_date}")
