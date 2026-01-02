# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Order, Site

with Session(engine) as session:
    existing = session.exec(select(Site)).first()
    tenant_id = str(existing.tenant_id)
    print(f'Tenant ID: {tenant_id}')

    # Get sites
    site_do_dat = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'DO_DAT')).first()
    site_khai_than = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'KHAI_THAN')).first()
    site_bao_son = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'BAO_SON')).first()
    site_khanh_ha = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'KHANH_HA')).first()
    site_nguyen_ngoc = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'NGUYEN_NGOC')).first()
    site_pnc = session.exec(select(Site).where(Site.tenant_id == tenant_id, Site.code == 'PNC')).first()

    print(f"DO_DAT: {site_do_dat.id[:8] if site_do_dat else 'Not found'}")
    print(f"KHAI_THAN: {site_khai_than.id[:8] if site_khai_than else 'Not found'}")
    print(f"BAO_SON: {site_bao_son.id[:8] if site_bao_son else 'Not found'}")
    print(f"KHANH_HA: {site_khanh_ha.id[:8] if site_khanh_ha else 'Not found'}")
    print(f"NGUYEN_NGOC: {site_nguyen_ngoc.id[:8] if site_nguyen_ngoc else 'Not found'}")
    print(f"PNC: {site_pnc.id[:8] if site_pnc else 'Not found'}")

    # Update orders
    orders_to_fix = [
        ('ADG-164', site_do_dat),      # LIVABIN -> DO_DAT
        ('ADG-163', site_khai_than),   # SEBANG1 -> KHAI_THAN
        ('ADG-161', site_bao_son),     # CHUA_VE -> BAO_SON
        ('ADG-166', site_khanh_ha),    # LIVABIN -> KHANH_HA
        ('ADG-165', site_nguyen_ngoc), # CHUA_VE -> NGUYEN_NGOC
        ('ADG-159', site_pnc),         # LIVABIN -> PNC
    ]

    for order_code, delivery_site in orders_to_fix:
        order = session.exec(
            select(Order).where(Order.tenant_id == tenant_id, Order.order_code == order_code)
        ).first()

        if order and delivery_site:
            order.delivery_site_id = str(delivery_site.id)
            session.add(order)
            print(f"Updated {order_code} delivery_site to {delivery_site.code}")
        else:
            print(f"SKIP {order_code}: order={order is not None}, site={delivery_site is not None}")

    session.commit()
    print("\n=== Done ===")
