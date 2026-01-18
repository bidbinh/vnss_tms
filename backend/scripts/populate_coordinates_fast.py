"""
Fast script to populate coordinates - batch mode with progress tracking
Optimized for large datasets with better progress reporting
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

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


async def populate_location_coordinates_fast(session: Session, geocoding: any, limit: int = None, batch_size: int = 50):
    """Populate coordinates for Location records with batch processing"""
    query = select(Location).where(
        (Location.latitude == None) | (Location.longitude == None)
    )
    
    if limit:
        query = query.limit(limit)
    
    locations = session.exec(query).all()

    total = len(locations)
    print(f"Found {total} locations without coordinates")
    
    if total == 0:
        print("No locations to process.")
        return

    if limit and total > limit:
        print(f"Processing first {limit} locations...")
    
    updated = 0
    failed = 0
    skipped = 0

    start_time = datetime.now()

    for i, location in enumerate(locations, 1):
        # Progress indicator
        if i % 10 == 0 or i == 1:
            elapsed = (datetime.now() - start_time).total_seconds()
            rate = i / elapsed if elapsed > 0 else 0
            remaining = (total - i) / rate if rate > 0 else 0
            print(f"Progress: {i}/{total} ({i*100//total}%) | Updated: {updated} | Failed: {failed} | ETA: {remaining/60:.1f} min")

        # Build address from location data
        address_parts = [location.name] if location.name else []
        if location.ward:
            address_parts.append(location.ward)
        if location.district:
            address_parts.append(location.district)
        if location.province:
            address_parts.append(location.province)

        if not address_parts:
            skipped += 1
            continue

        address = ", ".join(address_parts)

        # Geocode
        try:
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
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"[ERROR] Location {location.code}: {str(e)}")

        # Commit every batch_size records
        if i % batch_size == 0:
            session.commit()

    session.commit()
    
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n{'='*60}")
    print(f"Location coordinates: {updated} updated, {failed} failed, {skipped} skipped")
    print(f"Time elapsed: {elapsed/60:.1f} minutes")
    print(f"{'='*60}")


async def populate_site_coordinates_fast(session: Session, geocoding: any, limit: int = None, batch_size: int = 50):
    """Populate coordinates for Site records with batch processing"""
    query = select(Site).where(
        (Site.latitude == None) | (Site.longitude == None)
    )
    
    if limit:
        query = query.limit(limit)
    
    sites = session.exec(query).all()

    total = len(sites)
    print(f"\nFound {total} sites without coordinates")
    
    if total == 0:
        print("No sites to process.")
        return

    if limit and total > limit:
        print(f"Processing first {limit} sites...")

    updated = 0
    failed = 0
    skipped = 0

    start_time = datetime.now()

    for i, site in enumerate(sites, 1):
        # Progress indicator
        if i % 10 == 0 or i == 1:
            elapsed = (datetime.now() - start_time).total_seconds()
            rate = i / elapsed if elapsed > 0 else 0
            remaining = (total - i) / rate if rate > 0 else 0
            print(f"Progress: {i}/{total} ({i*100//total}%) | Updated: {updated} | Failed: {failed} | ETA: {remaining/60:.1f} min")

        # Try to get coordinates from linked Location first
        if site.location_id:
            location = session.get(Location, site.location_id)
            if location and location.latitude and location.longitude:
                # Use Location coordinates
                site.latitude = location.latitude
                site.longitude = location.longitude
                session.add(site)
                updated += 1
                continue

        # Otherwise, geocode from detailed_address
        address = site.detailed_address
        if not address:
            failed += 1
            continue

        # Get location info for better geocoding
        location = session.get(Location, site.location_id) if site.location_id else None

        try:
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
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"[ERROR] Site {site.code or site.company_name}: {str(e)}")

        # Commit every batch_size records
        if i % batch_size == 0:
            session.commit()

        # Small delay to respect rate limits (especially for Nominatim)
        await asyncio.sleep(0.5)  # Reduced from 1 second

    session.commit()
    
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n{'='*60}")
    print(f"Site coordinates: {updated} updated, {failed} failed, {skipped} skipped")
    print(f"Time elapsed: {elapsed/60:.1f} minutes")
    print(f"{'='*60}")


async def main():
    """Main function with options"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Populate coordinates for Locations and Sites')
    parser.add_argument('--limit-locations', type=int, help='Limit number of locations to process')
    parser.add_argument('--limit-sites', type=int, help='Limit number of sites to process')
    parser.add_argument('--locations-only', action='store_true', help='Process locations only')
    parser.add_argument('--sites-only', action='store_true', help='Process sites only')
    parser.add_argument('--batch-size', type=int, default=50, help='Batch size for commits (default: 50)')
    
    args = parser.parse_args()

    print("=" * 60)
    print("Populate Coordinates for Locations and Sites (Fast Mode)")
    print("=" * 60)
    print()

    geocoding = get_geocoding_service()

    with Session(engine) as session:
        if not args.sites_only:
            print("Processing Locations...")
            await populate_location_coordinates_fast(
                session, 
                geocoding, 
                limit=args.limit_locations,
                batch_size=args.batch_size
            )

        if not args.locations_only:
            print("\nProcessing Sites...")
            await populate_site_coordinates_fast(
                session, 
                geocoding, 
                limit=args.limit_sites,
                batch_size=args.batch_size
            )

    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
