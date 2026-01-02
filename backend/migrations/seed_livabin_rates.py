"""
Seed Livabin Trip Rates
"""
import sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')

from datetime import date
from app.db.session import engine
from sqlmodel import Session, select
from app.models.location import Location
from app.models.rate import Rate

TENANT_ID = 'TENANT_DEMO'

# Locations to create if not exist
# Format: (code, name, type, district, province)
LOCATIONS = [
    ('ANBINHTHUANTHANH', 'An Bình, Thuận Thành', 'WARD', 'Thuận Thành', 'Bắc Ninh'),
    ('MAODIENTHUANTHANH', 'Mão Điền, Thuận Thành', 'WARD', 'Thuận Thành', 'Bắc Ninh'),
    ('NGUYETDUCTHUANTHANH', 'Nguyệt Đức, Thuận Thành', 'WARD', 'Thuận Thành', 'Bắc Ninh'),
    ('KCNCHAUKHE2', 'KCN Châu Khê 2', 'INDUSTRIAL_ZONE', 'Từ Sơn', 'Bắc Ninh'),
    ('KCNQUEVO2', 'KCN Quế Võ 2', 'INDUSTRIAL_ZONE', 'Quế Võ', 'Bắc Ninh'),
    ('KCNQUEVO3', 'KCN Quế Võ 3', 'INDUSTRIAL_ZONE', 'Quế Võ', 'Bắc Ninh'),
    ('KCNSONGKHE', 'KCN Song Khê', 'INDUSTRIAL_ZONE', 'Bắc Giang', 'Bắc Giang'),
    ('KCNTHUANTHANH3', 'KCN Thuận Thành 3', 'INDUSTRIAL_ZONE', 'Thuận Thành', 'Bắc Ninh'),
    ('KCNCHAUSON', 'KCN Châu Sơn', 'INDUSTRIAL_ZONE', 'Phủ Lý', 'Hà Nam'),
    ('LONGBIEN', 'Long Biên', 'WARD', 'Long Biên', 'Hà Nội'),
    ('THUONGTIN', 'Thường Tín', 'WARD', 'Thường Tín', 'Hà Nội'),
    ('KIEUKYGIALAM', 'Kiêu Kỵ, Gia Lâm', 'WARD', 'Gia Lâm', 'Hà Nội'),
    ('NGOCLAMLONGBIEN', 'Ngọc Lâm, Long Biên', 'WARD', 'Long Biên', 'Hà Nội'),
    ('PHUDONGGIALAM', 'Phù Đổng, Gia Lâm', 'WARD', 'Gia Lâm', 'Hà Nội'),
    ('YENVIENGIALAM', 'Yên Viên, Gia Lâm', 'WARD', 'Gia Lâm', 'Hà Nội'),
    ('KCNPHUNGHIA', 'KCN Phú Nghĩa', 'INDUSTRIAL_ZONE', 'Chương Mỹ', 'Hà Nội'),
    ('THANHOAI', 'Thanh Oai', 'WARD', 'Thanh Oai', 'Hà Nội'),
    ('KIMTHANH', 'Kim Thành', 'WARD', 'Kim Thành', 'Hải Dương'),
    ('VINHHUNGBINHGIANG', 'Vĩnh Hưng, Bình Giang', 'WARD', 'Bình Giang', 'Hải Dương'),
    ('ANTHANGANLAO', 'An Thắng, An Lão', 'WARD', 'An Lão', 'Hải Phòng'),
    ('KCNLUONGSON', 'KCN Lương Sơn', 'INDUSTRIAL_ZONE', 'Lương Sơn', 'Hòa Bình'),
    ('VANGIANGHUNGYEN', 'Văn Giang', 'WARD', 'Văn Giang', 'Hưng Yên'),
    ('VANLAMHUNGYEN', 'Văn Lâm', 'WARD', 'Văn Lâm', 'Hưng Yên'),
    ('DISUMYHAO', 'Dị Sử, Mỹ Hào', 'WARD', 'Mỹ Hào', 'Hưng Yên'),
    ('LACDAOVANLAM', 'Lạc Đạo, Văn Lâm', 'WARD', 'Văn Lâm', 'Hưng Yên'),
    ('NHUQUYNH', 'Như Quỳnh', 'WARD', 'Văn Lâm', 'Hưng Yên'),
    ('PHUTHINHKIMDONG', 'Phú Thịnh, Kim Động', 'WARD', 'Kim Động', 'Hưng Yên'),
    ('TANQUANGVANLAM', 'Tân Quang, Văn Lâm', 'WARD', 'Văn Lâm', 'Hưng Yên'),
    ('KCNPHONOIA', 'KCN Phố Nối A', 'INDUSTRIAL_ZONE', 'Văn Lâm', 'Hưng Yên'),
    ('KCNTHANGLONG2', 'KCN Thăng Long 2', 'INDUSTRIAL_ZONE', 'Văn Lâm', 'Hưng Yên'),
    ('KCNYENMY2', 'KCN Yên Mỹ 2', 'INDUSTRIAL_ZONE', 'Yên Mỹ', 'Hưng Yên'),
    ('YENMYHUNGYEN', 'Yên Mỹ', 'WARD', 'Yên Mỹ', 'Hưng Yên'),
    ('TRUONGTHINAMDINH', 'Trường Thi, Nam Định', 'WARD', 'TP Nam Định', 'Nam Định'),
    ('VINHNGHEAN', 'Vinh', 'WARD', 'TP Vinh', 'Nghệ An'),
    ('VIETXUANVINHTUONGVINHPHUC', 'Việt Xuân, Vĩnh Tường', 'WARD', 'Vĩnh Tường', 'Vĩnh Phúc'),
    ('CCNYENDONG', 'CCN Yên Đồng', 'INDUSTRIAL_ZONE', 'Yên Lạc', 'Vĩnh Phúc'),
]

# Rates data: (delivery_code, km, toll, price)
RATES = [
    ('ANBINHTHUANTHANH', None, 1, 2600000),
    ('MAODIENTHUANTHANH', None, 1, 2600000),
    ('NGUYETDUCTHUANTHANH', None, 1, 2600000),
    ('KCNCHAUKHE2', None, 1, 2800000),
    ('KCNQUEVO2', None, 1, 2900000),
    ('KCNQUEVO3', None, 1, 2900000),
    ('KCNSONGKHE', None, 1, 3500000),
    ('KCNTHUANTHANH3', None, 1, 2600000),
    ('KCNCHAUSON', 70, 2, 3600000),
    ('LONGBIEN', None, 1, 2900000),
    ('THUONGTIN', None, 1, 3000000),
    ('KIEUKYGIALAM', None, 1, 2600000),
    ('NGOCLAMLONGBIEN', None, 1, 2900000),
    ('PHUDONGGIALAM', 21, 1, 2800000),
    ('YENVIENGIALAM', None, 1, 2800000),
    ('KCNPHUNGHIA', None, 1, 3200000),
    ('THANHOAI', None, 1, 3000000),
    ('KIMTHANH', None, 0, 2900000),
    ('VINHHUNGBINHGIANG', None, 0, 2900000),
    ('ANTHANGANLAO', None, 1, 3700000),
    ('KCNLUONGSON', None, 2, 3500000),
    ('VANGIANGHUNGYEN', None, 0, 1600000),
    ('VANLAMHUNGYEN', None, 1, 1600000),
    ('DISUMYHAO', None, 0, 1600000),
    ('LACDAOVANLAM', None, 1, 1600000),
    ('NHUQUYNH', None, 1, 1600000),
    ('PHUTHINHKIMDONG', None, None, 2800000),
    ('TANQUANGVANLAM', None, 1, 1600000),
    ('KCNPHONOIA', None, 1, 1600000),
    ('KCNTHANGLONG2', None, 0, 1600000),
    ('KCNYENMY2', 9, 0, 1600000),
    ('YENMYHUNGYEN', 10, 0, 1600000),
    ('TRUONGTHINAMDINH', None, None, 3300000),
    ('VINHNGHEAN', None, None, 8425925),
    ('VIETXUANVINHTUONGVINHPHUC', None, 2, 4100000),
    ('CCNYENDONG', None, 2, 4100000),
]


def main():
    print("=" * 60)
    print("Seeding Livabin Trip Rates")
    print("=" * 60)

    with Session(engine) as session:
        # Get LIVABIN
        livabin = session.exec(
            select(Location).where(Location.tenant_id == TENANT_ID, Location.code == 'LIVABIN')
        ).first()
        if not livabin:
            print('ERROR: LIVABIN not found')
            return
        print(f'Pickup: {livabin.name}')

        # Create locations
        print('\n1. Creating locations...')
        loc_map = {'LIVABIN': livabin.id}
        created = 0
        for code, name, loc_type, district, province in LOCATIONS:
            existing = session.exec(
                select(Location).where(Location.tenant_id == TENANT_ID, Location.code == code)
            ).first()
            if existing:
                loc_map[code] = existing.id
            else:
                loc = Location(
                    tenant_id=TENANT_ID,
                    code=code,
                    name=name,
                    type=loc_type,
                    district=district,
                    province=province,
                    is_active=True
                )
                session.add(loc)
                session.commit()
                session.refresh(loc)
                loc_map[code] = loc.id
                created += 1
                print(f'  Created: {code}')
        print(f'Total: {created} new locations')

        # Create rates
        print('\n2. Creating rates...')
        rate_created = 0
        rate_updated = 0
        for delivery_code, km, toll, price in RATES:
            delivery_id = loc_map.get(delivery_code)
            if not delivery_id:
                print(f'  Skip: {delivery_code} not found')
                continue

            existing = session.exec(
                select(Rate).where(
                    Rate.tenant_id == TENANT_ID,
                    Rate.pickup_location_id == livabin.id,
                    Rate.delivery_location_id == delivery_id,
                    Rate.pricing_type == 'TRIP',
                    Rate.status == 'ACTIVE'
                )
            ).first()

            if existing:
                existing.distance_km = km
                existing.toll_stations = toll
                existing.price_per_trip = price
                session.commit()
                rate_updated += 1
            else:
                rate = Rate(
                    tenant_id=TENANT_ID,
                    pickup_location_id=livabin.id,
                    delivery_location_id=delivery_id,
                    distance_km=km,
                    toll_stations=toll,
                    pricing_type='TRIP',
                    price_per_trip=price,
                    effective_date=date.today(),
                    status='ACTIVE',
                )
                session.add(rate)
                session.commit()
                rate_created += 1

        print(f'Created: {rate_created}, Updated: {rate_updated}')
        print("\n" + "=" * 60)
        print("Done!")
        print("=" * 60)


if __name__ == "__main__":
    main()
