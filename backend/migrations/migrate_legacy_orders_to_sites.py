"""
Migrate legacy orders from location-based to site-based
Creates Sites for existing orders with pickup_location_id/delivery_location_id
Run: python -m migrations.migrate_legacy_orders_to_sites
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import create_engine, Session, select
from app.core.config import settings
from app.models import Order, Location, Site
import uuid

def migrate():
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        print("Finding orders with legacy location IDs...")

        # Get all orders with pickup_location_id but no pickup_site_id
        orders = session.exec(
            select(Order).where(
                Order.pickup_location_id != None,
                Order.pickup_site_id == None
            )
        ).all()

        print(f"Found {len(orders)} orders to migrate")

        # Group orders by location
        location_orders = {}
        for order in orders:
            if order.pickup_location_id not in location_orders:
                location_orders[order.pickup_location_id] = []
            location_orders[order.pickup_location_id].append(order)

        print(f"Found {len(location_orders)} unique pickup locations")

        # Create sites for each location
        site_map = {}  # location_id -> site_id

        for location_id, loc_orders in location_orders.items():
            location = session.get(Location, location_id)
            if not location:
                print(f"Warning: Location {location_id} not found, skipping...")
                continue

            # Check if site already exists for this location
            existing_site = session.exec(
                select(Site).where(
                    Site.location_id == location_id,
                    Site.tenant_id == location.tenant_id
                ).limit(1)
            ).first()

            if existing_site:
                site_id = existing_site.id
                print(f"Using existing site for location {location.code}")
            else:
                # Create a default site for this location
                # Set site_type based on location type
                site_type = "PORT" if location.type == "PORT" else "CUSTOMER"

                site = Site(
                    id=str(uuid.uuid4()),
                    tenant_id=location.tenant_id,
                    location_id=location_id,
                    company_name=f"{location.name} - General",
                    code=f"SITE_{location.code}",
                    site_type=site_type,
                    detailed_address=location.name,
                    status="ACTIVE"
                )
                session.add(site)
                site_id = site.id
                print(f"Created site for location {location.code}")

            site_map[location_id] = site_id

        # Commit sites
        session.commit()
        print(f"Created/found {len(site_map)} sites")

        # Update orders
        updated = 0
        for order in orders:
            if order.pickup_location_id in site_map:
                order.pickup_site_id = site_map[order.pickup_location_id]
                session.add(order)
                updated += 1

                if updated % 100 == 0:
                    print(f"Updated {updated} orders...")

        session.commit()
        print(f"[OK] Migration completed - Updated {updated} orders")
        print(f"  - Created {len(site_map)} sites")
        print(f"  - Migrated {updated} orders from pickup_location_id to pickup_site_id")

if __name__ == "__main__":
    migrate()
