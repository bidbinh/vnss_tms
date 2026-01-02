"""
Seed Rates Data - Import rate pricing from spreadsheet data
"""
import sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')

from datetime import date
from app.db.session import engine
from sqlmodel import Session, select
from app.models.location import Location
from app.models.rate import Rate

TENANT_ID = "TENANT_DEMO"

# Locations data from the rate sheet
# Format: code, name, type, ward, district, province
LOCATIONS_DATA = [
    # Ports (pickup points)
    ("LACHHUYEN", "Cụm Cảng Lạch Huyện", "PORT", None, "Cát Hải", "Hải Phòng"),

    # Industrial Zones (delivery points)
    ("QUEVO", "KCN Quế Võ", "INDUSTRIAL_ZONE", "Nam Sơn", "Quế Võ", "Bắc Ninh"),
    ("PHONOIA", "KCN Phố Nối A", "INDUSTRIAL_ZONE", "Như Quỳnh", "Văn Lâm", "Hưng Yên"),
    ("PHONOIB", "KCN Phố Nối B", "INDUSTRIAL_ZONE", "Liêu Xá", "Yên Mỹ", "Hưng Yên"),

    # Warehouses/Depots (for trip-based pricing)
    ("LIVABIN", "Livabin, Hưng Yên", "WAREHOUSE", None, None, "Hưng Yên"),
    ("THUANTHANH", "Thuận Thành", "WARD", None, "Thuận Thành", "Bắc Ninh"),
]

# Container-based rates (hàng cảng)
# Format: pickup_code, delivery_code, distance_km, toll_stations, price_cont_20, price_cont_40
CONTAINER_RATES_DATA = [
    ("LACHHUYEN", "QUEVO", 122, 0, 4700000, 4900000),
    ("LACHHUYEN", "PHONOIA", 116, 1, 4200000, 4400000),
    ("LACHHUYEN", "PHONOIB", 112, 1, 4200000, 4400000),
]

# Trip-based rates (hàng kho)
# Format: pickup_code, delivery_code, distance_km, toll_stations, price_per_trip
TRIP_RATES_DATA = [
    ("LIVABIN", "THUANTHANH", None, 1, 2600000),
]


def get_or_create_location(session: Session, code: str, name: str, loc_type: str,
                           ward: str = None, district: str = None, province: str = None) -> Location:
    """Get existing location or create new one"""
    stmt = select(Location).where(
        Location.tenant_id == TENANT_ID,
        Location.code == code
    )
    existing = session.exec(stmt).first()

    if existing:
        print(f"  Location exists: {code} - {existing.name}")
        return existing

    loc = Location(
        tenant_id=TENANT_ID,
        code=code,
        name=name,
        type=loc_type,
        ward=ward,
        district=district,
        province=province,
        is_active=True,
    )
    session.add(loc)
    session.commit()
    session.refresh(loc)
    print(f"  Created location: {code} - {name}")
    return loc


def create_container_rate(session: Session, pickup_id: str, delivery_id: str,
                          distance_km: int, toll_stations: int, price_20: int, price_40: int) -> Rate:
    """Create container-based rate record"""
    stmt = select(Rate).where(
        Rate.tenant_id == TENANT_ID,
        Rate.pickup_location_id == pickup_id,
        Rate.delivery_location_id == delivery_id,
        Rate.pricing_type == "CONTAINER",
        Rate.status == "ACTIVE"
    )
    existing = session.exec(stmt).first()

    if existing:
        print(f"  Rate exists: updating prices")
        existing.distance_km = distance_km
        existing.toll_stations = toll_stations
        existing.price_cont_20 = price_20
        existing.price_cont_40 = price_40
        session.commit()
        return existing

    rate = Rate(
        tenant_id=TENANT_ID,
        pickup_location_id=pickup_id,
        delivery_location_id=delivery_id,
        distance_km=distance_km,
        toll_stations=toll_stations,
        pricing_type="CONTAINER",
        price_cont_20=price_20,
        price_cont_40=price_40,
        effective_date=date.today(),
        status="ACTIVE",
    )
    session.add(rate)
    session.commit()
    session.refresh(rate)
    return rate


def create_trip_rate(session: Session, pickup_id: str, delivery_id: str,
                     distance_km: int, toll_stations: int, price_per_trip: int) -> Rate:
    """Create trip-based rate record (for warehouse cargo)"""
    stmt = select(Rate).where(
        Rate.tenant_id == TENANT_ID,
        Rate.pickup_location_id == pickup_id,
        Rate.delivery_location_id == delivery_id,
        Rate.pricing_type == "TRIP",
        Rate.status == "ACTIVE"
    )
    existing = session.exec(stmt).first()

    if existing:
        print(f"  Rate exists: updating price")
        existing.distance_km = distance_km
        existing.toll_stations = toll_stations
        existing.price_per_trip = price_per_trip
        session.commit()
        return existing

    rate = Rate(
        tenant_id=TENANT_ID,
        pickup_location_id=pickup_id,
        delivery_location_id=delivery_id,
        distance_km=distance_km,
        toll_stations=toll_stations,
        pricing_type="TRIP",
        price_per_trip=price_per_trip,
        effective_date=date.today(),
        status="ACTIVE",
    )
    session.add(rate)
    session.commit()
    session.refresh(rate)
    return rate


def main():
    print("=" * 60)
    print("Seeding Rates Data")
    print("=" * 60)

    with Session(engine) as session:
        # Step 1: Create/Get Locations
        print("\n1. Creating Locations...")
        location_map = {}
        for code, name, loc_type, ward, district, province in LOCATIONS_DATA:
            loc = get_or_create_location(session, code, name, loc_type, ward, district, province)
            location_map[code] = loc.id

        # Step 2: Create Container Rates (hàng cảng)
        print("\n2. Creating Container Rates (hàng cảng)...")
        for pickup_code, delivery_code, distance_km, toll_stations, price_20, price_40 in CONTAINER_RATES_DATA:
            pickup_id = location_map.get(pickup_code)
            delivery_id = location_map.get(delivery_code)

            if not pickup_id or not delivery_id:
                print(f"  ERROR: Missing location for {pickup_code} -> {delivery_code}")
                continue

            rate = create_container_rate(
                session, pickup_id, delivery_id,
                distance_km, toll_stations, price_20, price_40
            )
            print(f"  Rate: {pickup_code} -> {delivery_code}: 20ft={price_20:,}, 40ft={price_40:,}")

        # Step 3: Create Trip Rates (hàng kho)
        print("\n3. Creating Trip Rates (hàng kho)...")
        for pickup_code, delivery_code, distance_km, toll_stations, price_per_trip in TRIP_RATES_DATA:
            pickup_id = location_map.get(pickup_code)
            delivery_id = location_map.get(delivery_code)

            if not pickup_id or not delivery_id:
                print(f"  ERROR: Missing location for {pickup_code} -> {delivery_code}")
                continue

            rate = create_trip_rate(
                session, pickup_id, delivery_id,
                distance_km, toll_stations, price_per_trip
            )
            print(f"  Rate: {pickup_code} -> {delivery_code}: {price_per_trip:,}/chuyến")

        print("\n" + "=" * 60)
        print("Done! Rates imported successfully.")
        print("=" * 60)


if __name__ == "__main__":
    main()
