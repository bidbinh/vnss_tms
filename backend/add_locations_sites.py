# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Location, Site

with Session(engine) as session:
    existing = session.exec(select(Location)).first()
    tenant_id = str(existing.tenant_id)
    print(f'Tenant ID: {tenant_id}')

    # Helper to create location
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

    # Helper to create site
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

    # Create needed locations
    print("\n=== Creating Locations ===")
    loc_ninhbinh = get_or_create_location('NINHBINH', 'Ninh Binh')
    loc_bacgiang = get_or_create_location('BACGIANG', 'Bac Giang')
    loc_bacninh = get_or_create_location('BACNINH', 'Bac Ninh')
    loc_vinhphuc = get_or_create_location('VINHPHUC', 'Vinh Phuc')
    loc_haiphong = get_or_create_location('HAIPHONG', 'Hai Phong')
    loc_nhuquynh = get_or_create_location('NHUQUYNH', 'Nhu Quynh, Hung Yen')

    # Create needed sites
    print("\n=== Creating Sites ===")
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

    print("\n=== Done ===")
