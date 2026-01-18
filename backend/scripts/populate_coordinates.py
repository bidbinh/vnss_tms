"""
Script to populate coordinates for existing Location and Site records

Usage:
    python -m scripts.populate_coordinates

This script:
1. Finds all Location records without coordinates
2. Finds all Site records without coordinates
3. Geocodes them using GeocodingService
4. Updates database with coordinates
"""
import asyncio
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlmodel import Session, select
from app.db.session import engine
from app.models import Location, Site
from app.services.geocoding import get_geocoding_service


async def populate_location_coordinates(session: Session, geocoding: any):
    """Populate coordinates for Location records"""
    locations = session.exec(
        select(Location).where(
            (Location.latitude == None) | (Location.longitude == None)
        )
    ).all()

    print(f"Found {len(locations)} locations without coordinates")

    updated = 0
    failed = 0

    for location in locations:
        # Build address from location data
        address_parts = [location.name]
        if location.ward:
            address_parts.append(location.ward)
        if location.district:
            address_parts.append(location.district)
        if location.province:
            address_parts.append(location.province)

        address = ", ".join(address_parts)

        # Geocode
        coords = await geocoding.geocode(
            address=address,
            district=location.district,
            province=location.province,
            country="Vietnam"
        )

        if coords:
            location.latitude = coords[0]
            location.longitude = coords[1]
            session.add(location)
            updated += 1
            print(f"[OK] Geocoded Location {location.code}: {address} -> ({coords[0]}, {coords[1]})")
        else:
            failed += 1
            print(f"[FAIL] Failed to geocode Location {location.code}: {address}")

        # Commit every 10 records to avoid rate limits
        if updated % 10 == 0:
            session.commit()

    session.commit()
    print(f"\nLocation coordinates: {updated} updated, {failed} failed")


async def populate_site_coordinates(session: Session, geocoding: any):
    """Populate coordinates for Site records"""
    sites = session.exec(
        select(Site).where(
            (Site.latitude == None) | (Site.longitude == None)
        )
    ).all()

    print(f"\nFound {len(sites)} sites without coordinates")

    updated = 0
    failed = 0

    for site in sites:
        # Try to get coordinates from linked Location first
        if site.location_id:
            location = session.get(Location, site.location_id)
            if location and location.latitude and location.longitude:
                # Use Location coordinates
                site.latitude = location.latitude
                site.longitude = location.longitude
                session.add(site)
                updated += 1
                print(f"[OK] Site {site.code or site.company_name}: Using Location coordinates ({site.latitude}, {site.longitude})")
                continue

        # Otherwise, geocode from detailed_address
        address = site.detailed_address
        if not address:
            failed += 1
            print(f"[FAIL] Site {site.code or site.company_name}: No address")
            continue

        # Get location info for better geocoding
        location = session.get(Location, site.location_id) if site.location_id else None

        coords = await geocoding.geocode(
            address=address,
            district=location.district if location else None,
            province=location.province if location else None,
            country="Vietnam"
        )

        if coords:
            site.latitude = coords[0]
            site.longitude = coords[1]
            session.add(site)
            updated += 1
            print(f"[OK] Geocoded Site {site.code or site.company_name}: {address} -> ({coords[0]}, {coords[1]})")
        else:
            failed += 1
            print(f"[FAIL] Failed to geocode Site {site.code or site.company_name}: {address}")

        # Commit every 10 records to avoid rate limits
        if updated % 10 == 0:
            session.commit()

        # Small delay to respect rate limits (especially for Nominatim)
        await asyncio.sleep(1)

    session.commit()
    print(f"\nSite coordinates: {updated} updated, {failed} failed")


async def main():
    """Main function"""
    print("=" * 60)
    print("Populate Coordinates for Locations and Sites")
    print("=" * 60)

    geocoding = get_geocoding_service()

    with Session(engine) as session:
        # Populate Location coordinates
        await populate_location_coordinates(session, geocoding)

        # Populate Site coordinates
        await populate_site_coordinates(session, geocoding)

    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
