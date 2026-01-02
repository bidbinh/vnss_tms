"""
Seed Senbang/Senko and additional rates
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

# New locations to create
LOCATIONS = [
    ('DAICUONGKIMBANGHANAM', 'Đại Cường, Kim Bảng', 'WARD', 'Kim Bảng', 'Hà Nam'),
    ('THACHTHATHANOI', 'Thạch Thất', 'WARD', 'Thạch Thất', 'Hà Nội'),
    ('PHUMINHPHUXUYEN', 'Phú Minh, Phú Xuyên', 'WARD', 'Phú Xuyên', 'Hà Nội'),
    ('KCNQUATDONG', 'KCN Quất Động', 'INDUSTRIAL_ZONE', 'Thường Tín', 'Hà Nội'),
    ('BINHGIANGHAIDUONG', 'Bình Giang', 'WARD', 'Bình Giang', 'Hải Dương'),
    ('KCNTANQUANG', 'KCN Tân Quang', 'INDUSTRIAL_ZONE', 'Văn Lâm', 'Hưng Yên'),
    ('CONGLUANVANGIANG', 'Công Luận, Văn Giang', 'WARD', 'Văn Giang', 'Hưng Yên'),
    ('TRUNGTRACVANLAM', 'Trưng Trắc, Văn Lâm', 'WARD', 'Văn Lâm', 'Hưng Yên'),
    ('CCNMINHPHUONG', 'CCN Minh Phương', 'INDUSTRIAL_ZONE', 'Vĩnh Tường', 'Vĩnh Phúc'),
    ('KCNDINHTRAM', 'KCN Đình Trám', 'INDUSTRIAL_ZONE', 'Việt Yên', 'Bắc Giang'),
    ('CCNGIAKHE', 'CCN Gia Khê', 'INDUSTRIAL_ZONE', 'Bắc Giang', 'Bắc Giang'),
    ('KCNTHANHLIEM', 'KCN Thanh Liêm', 'INDUSTRIAL_ZONE', 'Thanh Liêm', 'Hà Nam'),
]

# Senbang rates: (delivery_code, km, toll, price)
SENBANG_RATES = [
    ('THUANTHANH', None, 1, 2600000),
    ('MAODIENTHUANTHANH', None, 1, 2600000),
    ('NGUYETDUCTHUANTHANH', None, 1, 2600000),
    ('KCNCHAUSON', None, 2, 3600000),
    ('KCNDONGVAN2', None, 2, 3600000),
    ('DAICUONGKIMBANGHANAM', None, 2, 3600000),
    ('THACHTHATHANOI', None, 1, 3200000),
    ('PHUMINHPHUXUYEN', 60, 1, 3000000),
    ('YENVIENGIALAM', None, 1, 2900000),
    ('KCNQUATDONG', 55, 1, 3000000),
    ('THANHOAI', None, 1, 3000000),
    ('BINHGIANGHAIDUONG', None, 0, 2900000),
    ('TANQUANGVANLAM', None, 1, 1600000),
    ('KCNPHONOIA', None, 1, 1600000),
    ('KCNTANQUANG', None, 1, 1600000),
    ('CONGLUANVANGIANG', None, 0, 1600000),
    ('TRUNGTRACVANLAM', None, 1, 1600000),
    ('KCNYENMY2', 5, 0, 1600000),
    ('CCNMINHPHUONG', None, 2, 4100000),
]

# Livabin additional rates
LIVABIN_RATES = [
    ('KCNDINHTRAM', 45, 1, 3000000),
    ('CCNGIAKHE', 80, 1, 3600000),
    ('KCNTHANHLIEM', 80, 2, 3600000),
]


def get_or_create_location(session, code, name, loc_type, district, province):
    existing = session.exec(
        select(Location).where(Location.tenant_id == TENANT_ID, Location.code == code)
    ).first()
    if existing:
        return existing

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
    print(f'  Created location: {code}')
    return loc


def create_trip_rate(session, pickup_id, delivery_id, km, toll, price):
    existing = session.exec(
        select(Rate).where(
            Rate.tenant_id == TENANT_ID,
            Rate.pickup_location_id == pickup_id,
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
        return 'updated'

    rate = Rate(
        tenant_id=TENANT_ID,
        pickup_location_id=pickup_id,
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
    return 'created'


def main():
    print("=" * 60)
    print("Seeding Senbang/Senko and Additional Rates")
    print("=" * 60)

    with Session(engine) as session:
        # Create new locations
        print("\n1. Creating locations...")
        loc_created = 0
        for code, name, loc_type, district, province in LOCATIONS:
            existing = session.exec(
                select(Location).where(Location.tenant_id == TENANT_ID, Location.code == code)
            ).first()
            if not existing:
                get_or_create_location(session, code, name, loc_type, district, province)
                loc_created += 1
        print(f"Created {loc_created} new locations")

        # Get pickup locations
        senbang = session.exec(
            select(Location).where(Location.tenant_id == TENANT_ID, Location.code == 'SEBANG/SENKO')
        ).first()
        livabin = session.exec(
            select(Location).where(Location.tenant_id == TENANT_ID, Location.code == 'LIVABIN')
        ).first()

        if not senbang:
            print("ERROR: SEBANG/SENKO not found")
            return
        if not livabin:
            print("ERROR: LIVABIN not found")
            return

        print(f"\nPickup 1: {senbang.name}")
        print(f"Pickup 2: {livabin.name}")

        # Create Senbang rates
        print("\n2. Creating Senbang rates...")
        created = 0
        updated = 0
        for delivery_code, km, toll, price in SENBANG_RATES:
            delivery = session.exec(
                select(Location).where(Location.tenant_id == TENANT_ID, Location.code == delivery_code)
            ).first()
            if not delivery:
                print(f"  Skip: {delivery_code} not found")
                continue

            result = create_trip_rate(session, senbang.id, delivery.id, km, toll, price)
            if result == 'created':
                created += 1
            else:
                updated += 1
        print(f"Senbang: Created {created}, Updated {updated}")

        # Create Livabin additional rates
        print("\n3. Creating Livabin additional rates...")
        created = 0
        updated = 0
        for delivery_code, km, toll, price in LIVABIN_RATES:
            delivery = session.exec(
                select(Location).where(Location.tenant_id == TENANT_ID, Location.code == delivery_code)
            ).first()
            if not delivery:
                print(f"  Skip: {delivery_code} not found")
                continue

            result = create_trip_rate(session, livabin.id, delivery.id, km, toll, price)
            if result == 'created':
                created += 1
            else:
                updated += 1
        print(f"Livabin: Created {created}, Updated {updated}")

        print("\n" + "=" * 60)
        print("Done!")
        print("=" * 60)


if __name__ == "__main__":
    main()
