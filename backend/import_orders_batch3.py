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
    site_chua_ve = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'CHUA_VE')).first()
    site_vip_green = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'VIP_GREEN_PORT')).first()

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

    # Create needed sites
    site_nam_dinh_vu = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'NAM_DINH_VU')).first()
    site_sebang1 = get_or_create_site('SEBANG1', 'Cang Sebang 1', 'HPPORT', 'PORT', 'Sebang 1, Hai Phong')

    # Customer sites
    site_do_dat = get_or_create_site('DO_DAT', 'CTY Do Dat', 'NINHBINH', 'CUSTOMER',
        'KCN Chau Son, Phuong Phu Van, tinh Ninh Binh', 'Chi Huyen', '0964888916')
    site_khai_than = get_or_create_site('KHAI_THAN', 'CTY Khai Than - Kho Khai Thua', 'BACGIANG', 'CUSTOMER',
        'Cum CN Gia Khe, TT. Doi Ngo, H. Luc Nam, T. Bac Giang', 'C Nhung', '0904828258')
    site_bao_son = get_or_create_site('BAO_SON', 'Bao Son', 'BACNINH', 'CUSTOMER',
        'Khu B, KCN Thuan Thanh 3, tinh Bac Ninh')
    site_khanh_ha = get_or_create_site('KHANH_HA', 'CTY Khanh Ha', 'VINHPHUC', 'CUSTOMER',
        'Khu Doi Am, X.Vinh Tuong, Vinh Phuc', 'Chi Luan', '0989930369')
    site_nguyen_ngoc = get_or_create_site('NGUYEN_NGOC', 'Nguyen Ngoc', 'HAIPHONG', 'CUSTOMER',
        'Lo CNO7 cum CN Ky Son, phuong Tan Hung, TP Hai Phong')
    site_pnc = get_or_create_site('PNC', 'Cong ty PNC', 'NINHBINH', 'CUSTOMER',
        'KCN Chau Son, Phuong Phu Van, tinh Ninh Binh', 'Chi Huyen', '0964888916')

    # Orders data
    orders_data = [
        # 17/12
        {
            'order_code': 'ADG-168',
            'driver': driver_vu,
            'pickup_site': site_chua_ve,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'DRYU9979675',
            'cargo_note': 'LLDPE-VN L1210F; 27T/cont; pallet; (han lenh 16/12)',
            'status': 'COMPLETED',
            'customer_requested_date': date(2025, 12, 17),
            'equipment': '40',
            'qty': 1,
        },
        # 16/12
        {
            'order_code': 'ADG-167',
            'driver': driver_vu,
            'pickup_site': site_chua_ve,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'DRYU9970934',
            'cargo_note': 'LLDPE-VN L1210F; 27T/cont; pallet',
            'status': 'DELIVERED',  # Đang trả vỏ
            'customer_requested_date': date(2025, 12, 16),
            'equipment': '40',
            'qty': 1,
        },
        # 15/12
        {
            'order_code': 'ADG-164',
            'driver': driver_vu,
            'pickup_site': site_livabin,
            'delivery_site': site_do_dat,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PP-CN L5E89 (27T/BAO DO) - BBGH CTY DO DAT',
            'status': 'IN_TRANSIT',  # Đang giao hàng
            'customer_requested_date': date(2025, 12, 15),
            'equipment': '40',
            'qty': 1,
        },
        # 13/12
        {
            'order_code': 'ADG-160',
            'driver': driver_tuyen,
            'pickup_site': site_vip_green,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'EMCU6143705',
            'cargo_note': 'ABS-KR GP-22 NR; 19T/cont; xa',
            'status': 'DELIVERED',  # Chưa trả vỏ
            'customer_requested_date': date(2025, 12, 13),
            'equipment': '20',
            'qty': 1,
        },
        {
            'order_code': 'ADG-163',
            'driver': driver_vu,
            'pickup_site': site_sebang1,
            'delivery_site': site_khai_than,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PP-KR GY130 (28T/XA)',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 13),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-161',
            'driver': driver_vu,
            'pickup_site': site_chua_ve,
            'delivery_site': site_bao_son,
            'port_site': None,
            'container_code': 'DRYU9971360',
            'cargo_note': 'LLDPE-VN L1221FA; 27T/cont; pallet',
            'status': 'COMPLETED',  # Chưa trả vỏ
            'customer_requested_date': date(2025, 12, 12),  # Giao 12/12
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-166',
            'driver': driver_tuyen,
            'pickup_site': site_livabin,
            'delivery_site': site_khanh_ha,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PVC-CN WH1000F (27T/KIEN) - CHO TIEN BAO HA HANG (BBGH TIN HUNG)',
            'status': 'IN_TRANSIT',  # Đang giao hàng
            'customer_requested_date': date(2025, 12, 16),
            'equipment': '40',
            'qty': 1,
        },
        {
            'order_code': 'ADG-165',
            'driver': driver_vu,
            'pickup_site': site_chua_ve,
            'delivery_site': site_nguyen_ngoc,
            'port_site': None,
            'container_code': 'DRYU9955441',
            'cargo_note': 'LLDPE-VN L1221FA; 27T/cont; pallet',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 13),  # Giao sometime around 13-16/12
            'equipment': '40',
            'qty': 1,
        },
        # 12/12
        {
            'order_code': 'ADG-159',
            'driver': driver_tuyen,
            'pickup_site': site_livabin,
            'delivery_site': site_pnc,
            'port_site': None,
            'container_code': None,
            'cargo_note': 'PP-CN L5E89 (27T/BAO DO)',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 12),
            'equipment': '40',
            'qty': 1,
        },
        # 11/12
        {
            'order_code': 'ADG-158',
            'driver': driver_vu,
            'pickup_site': site_nam_dinh_vu,
            'delivery_site': site_livabin,
            'port_site': None,
            'container_code': 'BMOU3175811',
            'cargo_note': 'GPPS-CN STL525; 28T/cont; xa',
            'status': 'DELIVERED',
            'customer_requested_date': date(2025, 12, 11),
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
