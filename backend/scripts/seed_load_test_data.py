"""
Seed data cho Load Test

Tạo:
- 3 tenants (công ty vận tải)
- Mỗi tenant: 5 users, 20 drivers, 15 vehicles, 50 customers, 20 sites
- 3000 orders (đủ để test)

Chạy: python scripts/seed_load_test_data.py
"""
import sys
import os

# Fix Unicode output on Windows
sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import string
from datetime import datetime, timedelta
from uuid import uuid4

from sqlmodel import Session, select
from app.db.session import engine
from app.models import Tenant, User, Driver, Vehicle, Customer, Site, Order, Location
from app.models.worker import Worker, WorkerTenantAccess
from app.core.security import hash_password

# Config - Scale for 100 companies stress testing
NUM_TENANTS = 100
USERS_PER_TENANT = 10      # 1,000 total users
DRIVERS_PER_TENANT = 20    # 2,000 total drivers
VEHICLES_PER_TENANT = 15   # 1,500 total vehicles
CUSTOMERS_PER_TENANT = 50  # 5,000 total customers
SITES_PER_TENANT = 20      # 2,000 total sites
ORDERS_PER_TENANT = 1000   # 100,000 total orders

# Vietnamese names
FIRST_NAMES = ["Minh", "Hùng", "Dũng", "Tuấn", "Long", "Hải", "Nam", "Phong", "Đức", "Thành",
               "Lan", "Hương", "Mai", "Linh", "Hà", "Ngọc", "Thảo", "Trang", "Hồng", "Yến"]
LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng"]

COMPANY_PREFIXES = ["Vận Tải", "Logistics", "Container", "Cargo", "Express"]
COMPANY_SUFFIXES = ["Việt Nam", "Sài Gòn", "Miền Nam", "Đông Nam", "Toàn Cầu"]

EQUIPMENT_TYPES = ["20DC", "40DC", "40HC", "45HC", "20RF", "40RF"]
CONTAINER_PREFIXES = ["MSCU", "CMAU", "HLCU", "OOLU", "EISU", "TCNU", "TGHU", "MSKU"]

LOCATIONS = [
    ("Cảng Cát Lái", "Quận 2, TP.HCM"),
    ("Cảng VICT", "Quận 7, TP.HCM"),
    ("Cảng Tân Cảng", "Bình Dương"),
    ("Cảng Hiệp Phước", "Nhà Bè, TP.HCM"),
    ("ICD Phước Long", "Quận 9, TP.HCM"),
    ("ICD Tây Nam", "Bình Chánh, TP.HCM"),
    ("ICD Sóng Thần", "Bình Dương"),
    ("ICD Biên Hòa", "Đồng Nai"),
    ("ICD Long Bình", "Đồng Nai"),
    ("KCN Tân Bình", "Tân Bình, TP.HCM"),
    ("KCN VSIP", "Bình Dương"),
    ("KCN Amata", "Đồng Nai"),
    ("KCN Long Hậu", "Long An"),
    ("KCN Tân Tạo", "Bình Tân, TP.HCM"),
    ("Kho Thủ Đức", "Thủ Đức, TP.HCM"),
    ("Kho Bình Dương", "Thuận An, Bình Dương"),
    ("Depot Cát Lái", "Quận 2, TP.HCM"),
    ("Depot Hiệp Phước", "Nhà Bè, TP.HCM"),
    ("Nhà máy Samsung", "Bắc Ninh"),
    ("Nhà máy Canon", "Bắc Ninh"),
]

ORDER_STATUSES = ["NEW", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "COMPLETED"]
STATUS_WEIGHTS = [0.1, 0.15, 0.2, 0.25, 0.3]  # More completed orders


def random_phone():
    return f"09{random.randint(10000000, 99999999)}"


def random_name():
    return f"{random.choice(LAST_NAMES)} {random.choice(FIRST_NAMES)}"


def random_container():
    prefix = random.choice(CONTAINER_PREFIXES)
    numbers = ''.join(random.choices(string.digits, k=7))
    return f"{prefix}{numbers}"


def random_plate():
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    numbers = random.randint(10000, 99999)
    return f"51C-{numbers}.{letters}"


def seed_data():
    print("=" * 60)
    print("SEEDING LOAD TEST DATA")
    print("=" * 60)

    with Session(engine) as session:
        tenants = []
        all_drivers = {}
        all_sites = {}

        # ===== CREATE TENANTS =====
        print(f"\n[1/7] Creating {NUM_TENANTS} tenants...")
        for i in range(NUM_TENANTS):
            tenant_code = f"LOAD{i+1:02d}"

            # Check if exists
            existing = session.exec(
                select(Tenant).where(Tenant.code == tenant_code)
            ).first()

            if existing:
                print(f"  - Tenant {tenant_code} already exists, skipping...")
                tenants.append(existing)
                continue

            tenant = Tenant(
                id=str(uuid4()),
                code=tenant_code,
                name=f"{random.choice(COMPANY_PREFIXES)} {random.choice(COMPANY_SUFFIXES)} {i+1}",
                email=f"contact@load{i+1}.test",
                phone=random_phone(),
                address=f"{random.randint(1, 999)} Nguyễn Văn Linh, Quận 7, TP.HCM",
                is_active=True,
            )
            session.add(tenant)
            tenants.append(tenant)
            print(f"  + Created tenant: {tenant.code} - {tenant.name}")

        session.commit()
        print(f"  Total tenants: {len(tenants)}")

        # ===== CREATE USERS =====
        print(f"\n[2/7] Creating users ({USERS_PER_TENANT} per tenant)...")
        password_hash = hash_password("123456")
        user_count = 0

        for tenant in tenants:
            for j in range(USERS_PER_TENANT):
                username = f"{tenant.code.lower()}_user{j+1}"

                existing = session.exec(
                    select(User).where(User.username == username)
                ).first()
                if existing:
                    continue

                role = "ADMIN" if j == 0 else random.choice(["DISPATCHER", "OPERATOR", "VIEWER"])
                user = User(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    username=username,
                    email=f"{username}@test.local",
                    password_hash=password_hash,
                    full_name=random_name(),
                    phone=random_phone(),
                    role=role,
                    status="ACTIVE",
                )
                session.add(user)
                user_count += 1

        session.commit()
        print(f"  Created {user_count} users")

        # ===== CREATE DRIVERS =====
        print(f"\n[3/7] Creating drivers ({DRIVERS_PER_TENANT} per tenant)...")
        driver_count = 0

        for tenant in tenants:
            all_drivers[tenant.id] = []
            for j in range(DRIVERS_PER_TENANT):
                driver_name = random_name()
                driver_phone = random_phone()

                existing = session.exec(
                    select(Driver).where(
                        Driver.tenant_id == tenant.id,
                        Driver.phone == driver_phone
                    )
                ).first()
                if existing:
                    all_drivers[tenant.id].append(existing)
                    continue

                driver = Driver(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    name=driver_name,
                    short_name=driver_name.split()[-1] if driver_name else "",
                    phone=driver_phone,
                    license_no=f"B2-{random.randint(100000, 999999)}",
                    status="ACTIVE",
                )
                session.add(driver)
                all_drivers[tenant.id].append(driver)
                driver_count += 1

        session.commit()
        print(f"  Created {driver_count} drivers")

        # ===== CREATE VEHICLES =====
        print(f"\n[4/7] Creating vehicles ({VEHICLES_PER_TENANT} per tenant)...")
        vehicle_count = 0

        for tenant in tenants:
            for j in range(VEHICLES_PER_TENANT):
                plate = random_plate()
                vehicle_code = f"XE{tenant.code[-2:]}{j+1:03d}"

                existing = session.exec(
                    select(Vehicle).where(
                        Vehicle.tenant_id == tenant.id,
                        Vehicle.plate_no == plate
                    )
                ).first()
                if existing:
                    continue

                vehicle = Vehicle(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    code=vehicle_code,
                    plate_no=plate,
                    type=random.choice(["TRACTOR", "TRAILER", "TRUCK"]),
                    status="ACTIVE",
                )
                session.add(vehicle)
                vehicle_count += 1

        session.commit()
        print(f"  Created {vehicle_count} vehicles")

        # ===== CREATE CUSTOMERS =====
        print(f"\n[5/7] Creating customers ({CUSTOMERS_PER_TENANT} per tenant)...")
        customer_count = 0
        all_customers = {}

        for tenant in tenants:
            all_customers[tenant.id] = []
            for j in range(CUSTOMERS_PER_TENANT):
                customer_code = f"KH{tenant.code[-2:]}{j+1:03d}"

                existing = session.exec(
                    select(Customer).where(
                        Customer.tenant_id == tenant.id,
                        Customer.code == customer_code
                    )
                ).first()
                if existing:
                    all_customers[tenant.id].append(existing)
                    continue

                customer = Customer(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    code=customer_code,
                    name=f"Cong ty {random.choice(['TNHH', 'CP', 'XNK'])} {j+1}",
                    phone=random_phone(),
                    email=f"{customer_code.lower()}@customer.test",
                    address=f"{random.randint(1, 500)} Duong {random.randint(1, 30)}, Quan {random.randint(1, 12)}, TP.HCM",
                    is_active=True,
                )
                session.add(customer)
                all_customers[tenant.id].append(customer)
                customer_count += 1

        session.commit()
        print(f"  Created {customer_count} customers")

        # ===== CREATE LOCATIONS & SITES =====
        print(f"\n[6/7] Creating locations & sites ({SITES_PER_TENANT} per tenant)...")
        site_count = 0
        all_locations = {}

        for tenant in tenants:
            all_sites[tenant.id] = []
            all_locations[tenant.id] = []
            locations_sample = random.sample(LOCATIONS, min(SITES_PER_TENANT, len(LOCATIONS)))

            for j, (name, address) in enumerate(locations_sample):
                loc_code = f"LOC{tenant.code[-2:]}{j+1:03d}"
                site_code = f"SITE{tenant.code[-2:]}{j+1:03d}"

                # Check existing location
                existing_loc = session.exec(
                    select(Location).where(
                        Location.tenant_id == tenant.id,
                        Location.code == loc_code
                    )
                ).first()

                if existing_loc:
                    location = existing_loc
                else:
                    location = Location(
                        id=str(uuid4()),
                        tenant_id=tenant.id,
                        code=loc_code,
                        name=name,
                        type=random.choice(["PORT", "ICD", "DEPOT", "WAREHOUSE", "FACTORY"]),
                        district=address.split(",")[0] if "," in address else "",
                        province="TP.HCM",
                        is_active=True,
                    )
                    session.add(location)
                    session.flush()  # Get the ID

                all_locations[tenant.id].append(location)

                # Check existing site
                existing_site = session.exec(
                    select(Site).where(
                        Site.tenant_id == tenant.id,
                        Site.code == site_code
                    )
                ).first()
                if existing_site:
                    all_sites[tenant.id].append(existing_site)
                    continue

                site = Site(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    location_id=location.id,
                    code=site_code,
                    company_name=name,
                    detailed_address=address,
                    site_type=random.choice(["PORT", "ICD", "DEPOT", "WAREHOUSE", "FACTORY"]),
                    status="ACTIVE",
                )
                session.add(site)
                all_sites[tenant.id].append(site)
                site_count += 1

        session.commit()
        print(f"  Created {site_count} sites")

        # ===== CREATE ORDERS =====
        print(f"\n[7/7] Creating orders ({ORDERS_PER_TENANT} per tenant)...")
        order_count = 0
        batch_size = 500  # Larger batch for 100k orders

        for tenant in tenants:
            tenant_drivers = all_drivers.get(tenant.id, [])
            tenant_customers = all_customers.get(tenant.id, [])
            tenant_sites = all_sites.get(tenant.id, [])

            if not tenant_customers or not tenant_sites:
                print(f"  ! Skipping tenant {tenant.code} - no customers or sites")
                continue

            orders_batch = []
            tenant_order_count = 0

            for j in range(ORDERS_PER_TENANT):
                # Random date in last 90 days for more realistic distribution
                days_ago = random.randint(0, 90)
                order_date = datetime.now() - timedelta(days=days_ago)

                # Random status with weights
                status = random.choices(ORDER_STATUSES, weights=STATUS_WEIGHTS)[0]

                # Assign driver if not NEW
                driver = None
                if status != "NEW" and tenant_drivers:
                    driver = random.choice(tenant_drivers)

                # Unique order code with uuid suffix to avoid duplicates
                order_code = f"{tenant.code}-{order_date.strftime('%y%m%d')}-{uuid4().hex[:8].upper()}"

                pickup_site = random.choice(tenant_sites)
                delivery_site = random.choice([s for s in tenant_sites if s.id != pickup_site.id] or tenant_sites)

                order = Order(
                    id=str(uuid4()),
                    tenant_id=tenant.id,
                    order_code=order_code,
                    order_date=order_date.date(),
                    customer_id=random.choice(tenant_customers).id,
                    customer_requested_date=order_date.date() + timedelta(days=random.randint(1, 3)),
                    status=status,
                    driver_id=driver.id if driver else None,
                    pickup_site_id=pickup_site.id,
                    delivery_site_id=delivery_site.id,
                    pickup_text=pickup_site.company_name,
                    delivery_text=delivery_site.company_name,
                    equipment=random.choice(EQUIPMENT_TYPES),
                    container_code=random_container(),
                    qty=1,
                    cargo_note=f"Hang test #{j+1}",
                    freight_charge=random.randint(2000000, 8000000),
                    created_at=order_date,
                )
                orders_batch.append(order)
                order_count += 1
                tenant_order_count += 1

                # Commit in batches
                if len(orders_batch) >= batch_size:
                    session.add_all(orders_batch)
                    session.commit()
                    print(f"    {tenant.code}: {tenant_order_count}/{ORDERS_PER_TENANT} orders...")
                    orders_batch = []

            # Commit remaining
            if orders_batch:
                session.add_all(orders_batch)
                session.commit()

            print(f"  Completed tenant {tenant.code}: {tenant_order_count} orders")

        print(f"  Total created: {order_count} orders")

        # ===== SUMMARY =====
        print("\n" + "=" * 60)
        print("SEED COMPLETE!")
        print("=" * 60)
        print(f"""
Test Accounts (password: 123456):
  - Admin: load01_user1, load02_user1, load03_user1
  - Users: load01_user2, load01_user3, etc.

Data Summary:
  - Tenants:   {len(tenants)}
  - Users:     ~{len(tenants) * USERS_PER_TENANT}
  - Drivers:   ~{len(tenants) * DRIVERS_PER_TENANT}
  - Vehicles:  ~{len(tenants) * VEHICLES_PER_TENANT}
  - Customers: ~{len(tenants) * CUSTOMERS_PER_TENANT}
  - Sites:     ~{len(tenants) * SITES_PER_TENANT}
  - Orders:    ~{order_count}
""")


if __name__ == "__main__":
    seed_data()
