import sys
sys.path.insert(0, '.')
from app.db.session import engine
from sqlmodel import Session, select
from app.models import Site, Location

# Get tenant_id from existing data
with Session(engine) as session:
    existing_location = session.exec(select(Location)).first()
    tenant_id = str(existing_location.tenant_id) if existing_location else None
    print(f'Tenant ID: {tenant_id}')

    if not tenant_id:
        print('ERROR: No tenant_id found')
        sys.exit(1)

    # Sites data to import
    # Location, Company Name, Site Code, Type, Address
    sites_data = [
        {'location_code': 'LONGBIEN', 'company_name': 'Chị Nhàn, 53 Đức Giang', 'site_code': 'CHI_NHAN_53_DUC_GIANG', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'KCNPHONOIQuang', 'company_name': 'Chị Nhàn, KCN Tân Quang', 'site_code': 'CHI_NHAN_KCN_TAN_QUANG', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'PHUMINHPHUXUYEN', 'company_name': 'CÔNG TY TNHH SUNRISE COLOURS VIỆT NAM', 'site_code': 'SUNRISE_COLOURS', 'site_type': 'CUSTOMER', 'address': 'TIỂU KHU ĐƯỜNG'},
        {'location_code': 'THUONGTIN', 'company_name': 'CÔNG TY CỔ PHẦN CVN QUỐC TẾ', 'site_code': 'CVN', 'site_type': 'CUSTOMER', 'address': 'Thắng Lợi, Thường Tín, Hà Nội'},
        {'location_code': 'PHUDONGGIALAM', 'company_name': 'CÔNG TY TNHH ĐẦU TƯ VÀ SẢN XUẤT NHỰA THUẬN PHÁT', 'site_code': 'NHUA_THUAN_PHAT', 'site_type': 'CUSTOMER', 'address': 'Số 71 Dốc Lã, Xã Phù Đổng, TP Hà Nội'},
        {'location_code': 'VINHHUNGBINHGIANG', 'company_name': 'CÔNG TY CỔ PHẦN XNK NAM THÁI SƠN', 'site_code': 'NAM_THAI_SON', 'site_type': 'CUSTOMER', 'address': 'Thôn Phương Độ'},
        {'location_code': 'ANTHANGANLAO', 'company_name': 'CÔNG TY TNHH ĐẦU TƯ SẢN XUẤT THANH SƠN', 'site_code': 'THANH_SON', 'site_type': 'CUSTOMER', 'address': 'THÔN QUYẾT TIẾN 1 (TẠI NHÀ ÔNG NGUYỄN VĂN TÙNG)'},
        {'location_code': 'PHUTHINHKIMDONG', 'company_name': 'CÔNG TY TNHH SẢN XUẤT NHỰA THỌ VINH', 'site_code': 'THO_VINH', 'site_type': 'CUSTOMER', 'address': 'Thôn Quảng Lạc'},
        {'location_code': 'DISUMYHAO', 'company_name': 'Sebang, Hưng Yên', 'site_code': 'SEBANG', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'DISUMYHAO', 'company_name': 'Senko, Hưng Yên', 'site_code': 'SENKO', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'KCNPHONOIA', 'company_name': 'Livabin, Hưng Yên', 'site_code': 'LIVABIN', 'site_type': 'CUSTOMER', 'address': 'Thôn An Lạc'},
        {'location_code': 'LACDAOVANLAM', 'company_name': 'CÔNG TY TNHH SẢN XUẤT VÀ THƯƠNG MẠI ĐỨC THIỆN', 'site_code': 'DUC_THIEN', 'site_type': 'CUSTOMER', 'address': 'THÔN NGỌC, X.LẠC ĐẠO, H. VĂN LÂM, T. HƯNG YÊN'},
        {'location_code': 'KCNPHONOIA', 'company_name': 'CÔNG TY CỔ PHẦN ĐẦU TƯ PHÚ KHANG', 'site_code': 'PHU_KHANG', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'KCNPHONOIB', 'company_name': 'CÔNG TY TNHH THƯƠNG MẠI VÀ SẢN XUẤT NHỰA HOÀN MỸ', 'site_code': 'NHUA_HOAN_MY', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'YENMYHUNGYEN', 'company_name': 'CÔNG TY CỔ PHẦN NHỰA HÀ NỘI', 'site_code': 'NHUA_HA_NOI', 'site_type': 'CUSTOMER', 'address': 'Thôn Ông Hảo (Đối diện cổng KCN Thăng Long 2. cách chân cầu mỹ hào 1km)'},
        {'location_code': 'HOANLONGHUNGYEN', 'company_name': 'CÔNG TY CỔ PHẦN POLYSTAR', 'site_code': 'POLYSTAR', 'site_type': 'CUSTOMER', 'address': 'Thôn Kênh Cầu, Xã Hoàn Long, Tỉnh Hưng Yên'},
        {'location_code': 'KCNTHANGLONG2', 'company_name': 'CÔNG TY CỔ PHẦN NHỰA HÀ NỘI, KCN Thăng Long 2', 'site_code': 'NHUA_HA_NOI_KCN_THANG_LONG_2', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'VINHNGHEAN', 'company_name': 'CÔNG TY CỔ PHẦN TLD VIỆT NAM, Vinh, Nghệ An', 'site_code': 'TLD_NGHE_AN', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'VIETXUANVINHTUONGVINHPHUC', 'company_name': 'CÔNG TY TNHH THƯƠNG MẠI KHÁNH HÀ', 'site_code': 'KHANH_HA', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'CCNYENDONG', 'company_name': 'CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ SẢN XUẤT KHẢI THÀNH', 'site_code': 'KHAI_THANH', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'CCNMINHPHUONG', 'company_name': 'CÔNG TY CỔ PHẦN SẢN XUẤT VÀ THƯƠNG MẠI MÀNG NHỰA VIỆT NAM', 'site_code': 'MANG_NHUA', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'NHUQUYNH', 'company_name': 'CÔNG TY TNHH SẢN XUẤT VÀ THƯƠNG MẠI NHỰA PLASTIC ĐỨC MINH', 'site_code': 'DUC_MINH', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'KCNCHAUSON', 'company_name': 'NVKD ĐỖ ĐẠT (SÔNG HÀN), KCN Châu Sơn', 'site_code': 'DO_DAT_CHAU_SON', 'site_type': 'CUSTOMER', 'address': 'KCN Châu Sơn, Phường Phù Vân, tỉnh Ninh Bình'},
        {'location_code': 'NHUQUYNH', 'company_name': 'NVKD ĐỖ ĐẠT (SÔNG HÀN), CÔNG NGHỆ & MÔI TRƯỜNG', 'site_code': 'DO_DAT_CONG_NGHE_MOI_TRUONG', 'site_type': 'CUSTOMER', 'address': 'CÔNG NGHỆ & MÔI TRƯỜNG NK: HDPE-VN H5604F (27T/KIỆN) - Km 15+600, quốc lộ 5, Xã Như Quỳnh, Hưng Yên, Việt Nam. SĐT 090 4225005'},
        {'location_code': 'NHUQUYNH', 'company_name': 'NVKD ĐỖ ĐẠT (SÔNG HÀN), Thôn Minh Khai', 'site_code': 'DO_DAT_MINH_KHAI', 'site_type': 'CUSTOMER', 'address': ''},
        {'location_code': 'KCNQUATDONG', 'company_name': 'NVKD ĐỖ ĐẠT (SÔNG HÀN), KCN Quất Động', 'site_code': 'DO_DAT_KCN_QUAT_DONG', 'site_type': 'CUSTOMER', 'address': 'KCN Quất Động'},
        {'location_code': 'CCNGIAKHE', 'company_name': 'CÔNG TY TNHH KHẢI THẦN VIỆT NAM', 'site_code': 'KHAI_THAN_CCN_GIA_KHE', 'site_type': 'CUSTOMER', 'address': '(越南启明有限公司), Thôn Già Khê, Lục Nam, Bắc Giang 02043, Vietnam'},
        {'location_code': 'KCNDINHTRAM', 'company_name': 'CÔNG TY TNHH KHẢI THẦN VIỆT NAM', 'site_code': 'KHAI_THAN_KCN_DINH_TRAM', 'site_type': 'CUSTOMER', 'address': 'Lô A1, A2 KCN Đình Trám, P. Nếnh, TX. Việt Yên, T. Bắc Giang'},
        {'location_code': 'KCNTHANHLIEM', 'company_name': 'CÔNG TY TNHH THƯƠNG MẠI - DỊCH VỤ TÂN HIỆP PHÁT', 'site_code': 'TAN_HIEP_PHAT', 'site_type': 'CUSTOMER', 'address': 'Lô I-CN-5, KCN Thanh Liêm, P. Thanh Tuyền, TP Phủ Lý, Hà Nam'},
    ]

    imported = 0
    skipped = 0
    not_found = 0

    for row in sites_data:
        # Find location
        location = session.exec(
            select(Location).where(
                Location.tenant_id == tenant_id,
                Location.code == row['location_code']
            )
        ).first()

        if not location:
            print(f"WARNING: Location {row['location_code']} not found, skipping {row['site_code']}")
            not_found += 1
            continue

        # Check if site exists
        existing = session.exec(
            select(Site).where(
                Site.tenant_id == tenant_id,
                Site.code == row['site_code']
            )
        ).first()

        if existing:
            print(f"Site {row['site_code']} already exists, skipping")
            skipped += 1
            continue

        # Create site with empty string for address if empty
        site = Site(
            tenant_id=tenant_id,
            location_id=str(location.id),
            company_name=row['company_name'],
            code=row['site_code'],
            site_type=row['site_type'],
            detailed_address=row['address'] if row['address'] else ''
        )
        session.add(site)
        imported += 1
        print(f"Created site: {row['site_code']}")

    session.commit()
    print(f'\n=== Summary ===')
    print(f'Successfully imported: {imported} sites')
    print(f'Skipped (already exists): {skipped}')
    print(f'Location not found: {not_found}')
