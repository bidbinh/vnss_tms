"""
Fix Worker-Driver link and ensure WorkerTask is created

Run: python fix_worker_driver_link.py
"""
from app.db.session import engine
from sqlmodel import Session, select
from sqlalchemy import and_
from app.models import Driver, Tenant
from app.models.driver import DriverSource
from app.models.worker import Worker, WorkerTenantAccess, WorkerTask

def main():
    print("=" * 70)
    print("FIX: Worker-Driver Link")
    print("=" * 70)

    with Session(engine) as session:
        # 1. List all Workers
        workers = session.exec(select(Worker)).all()
        print(f"\n1. WORKERS ({len(workers)} total):")
        for w in workers:
            print(f"   - {w.full_name} (@{w.username}) | id={w.id}")

        # 2. List all WorkerTenantAccess
        accesses = session.exec(select(WorkerTenantAccess)).all()
        print(f"\n2. WORKER TENANT ACCESS ({len(accesses)} total):")
        for a in accesses:
            tenant = session.get(Tenant, a.tenant_id)
            worker = session.get(Worker, a.worker_id)
            print(f"   - Worker: {worker.username if worker else 'N/A'} → Tenant: {tenant.name if tenant else a.tenant_id}")
            print(f"     role={a.role}, is_active={a.is_active}")

        # 3. List all Drivers (check external_worker_id)
        drivers = session.exec(select(Driver)).all()
        print(f"\n3. DRIVERS ({len(drivers)} total):")
        for d in drivers:
            ext_id = getattr(d, 'external_worker_id', None)
            source = getattr(d, 'source', 'N/A')
            print(f"   - {d.name} | source={source} | external_worker_id={ext_id}")

        # 4. Fix: Link Driver to Worker if matching name/phone exists
        print("\n" + "=" * 70)
        print("4. AUTO-FIX: Linking Drivers to Workers")
        print("=" * 70)

        fixed_count = 0
        for access in accesses:
            if not access.is_active:
                continue

            if access.role != "DRIVER":
                print(f"   Skip: Worker access role is {access.role}, not DRIVER")
                continue

            worker = session.get(Worker, access.worker_id)
            if not worker:
                continue

            tenant_id = access.tenant_id

            # Find driver in this tenant that should be linked
            # Try by external_worker_id first
            existing_link = session.exec(
                select(Driver).where(
                    and_(
                        Driver.tenant_id == tenant_id,
                        Driver.external_worker_id == worker.id,
                    )
                )
            ).first()

            if existing_link:
                print(f"   ✓ Worker @{worker.username} already linked to Driver '{existing_link.name}'")
                continue

            # Find by phone or name match
            potential_driver = None

            if worker.phone:
                potential_driver = session.exec(
                    select(Driver).where(
                        and_(
                            Driver.tenant_id == tenant_id,
                            Driver.phone == worker.phone,
                            Driver.external_worker_id == None,
                        )
                    )
                ).first()

            if not potential_driver:
                # Try by name
                potential_driver = session.exec(
                    select(Driver).where(
                        and_(
                            Driver.tenant_id == tenant_id,
                            Driver.name == worker.full_name,
                            Driver.external_worker_id == None,
                        )
                    )
                ).first()

            if potential_driver:
                print(f"   → Linking Worker @{worker.username} to existing Driver '{potential_driver.name}'")
                potential_driver.external_worker_id = worker.id
                potential_driver.external_worker_username = worker.username
                potential_driver.source = DriverSource.EXTERNAL
                session.add(potential_driver)
                fixed_count += 1
            else:
                # Create new driver for this worker
                print(f"   → Creating new Driver for Worker @{worker.username}")
                new_driver = Driver(
                    tenant_id=tenant_id,
                    name=worker.full_name or worker.username,
                    phone=worker.phone or "",
                    source=DriverSource.EXTERNAL,
                    external_worker_id=worker.id,
                    external_worker_username=worker.username,
                    status="ACTIVE",
                    license_number=worker.license_number,
                    license_class=worker.license_class,
                )
                session.add(new_driver)
                fixed_count += 1

        if fixed_count > 0:
            session.commit()
            print(f"\n   ✓ Fixed {fixed_count} driver-worker links")
        else:
            print("\n   (No fixes needed)")

        # 5. Final verification
        print("\n" + "=" * 70)
        print("5. FINAL VERIFICATION")
        print("=" * 70)

        drivers_with_link = session.exec(
            select(Driver).where(Driver.external_worker_id != None)
        ).all()

        print(f"\nDrivers with external_worker_id: {len(drivers_with_link)}")
        for d in drivers_with_link:
            worker = session.get(Worker, d.external_worker_id) if d.external_worker_id else None
            print(f"   - {d.name} (tenant={d.tenant_id[:8]}...) → Worker @{worker.username if worker else 'N/A'}")

        # Check WorkerTasks
        tasks = session.exec(select(WorkerTask)).all()
        print(f"\nWorkerTasks: {len(tasks)}")
        for t in tasks:
            print(f"   - {t.task_code} | {t.title} | status={t.status}")

        print("\n" + "=" * 70)
        print("DONE! Now try assigning an order to the external driver.")
        print("=" * 70)


if __name__ == "__main__":
    main()
