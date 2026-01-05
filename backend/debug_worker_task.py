"""Debug WorkerTask creation - Run this to check what's happening"""
from app.db.session import engine
from sqlmodel import Session, select
from sqlalchemy import and_
from app.models.driver import Driver
from app.models.worker import Worker, WorkerTenantAccess, WorkerTask

print("=" * 60)
print("DEBUG: Worker Task Creation")
print("=" * 60)

with Session(engine) as session:
    # 1. Check all drivers with external_worker_id
    print("\n1. DRIVERS with external_worker_id:")
    drivers = session.exec(select(Driver)).all()
    external_drivers = []
    for d in drivers:
        worker_id = getattr(d, 'external_worker_id', None)
        if worker_id:
            external_drivers.append(d)
            print(f"   ✓ {d.name} (driver_id={d.id}) → worker_id={worker_id}")

    if not external_drivers:
        print("   ❌ NO drivers have external_worker_id set!")
        print("   → You need to link Worker to Driver first")

    # 2. Check Workers
    print("\n2. WORKERS:")
    workers = session.exec(select(Worker)).all()
    for w in workers:
        print(f"   - {w.full_name} (@{w.username}) | id={w.id}")

    # 3. Check WorkerTenantAccess
    print("\n3. WORKER TENANT ACCESS:")
    accesses = session.exec(select(WorkerTenantAccess)).all()
    if accesses:
        for a in accesses:
            print(f"   - worker_id={a.worker_id} → tenant_id={a.tenant_id} | is_active={a.is_active}")
    else:
        print("   ❌ NO WorkerTenantAccess records! Worker accepted invitation?")

    # 4. Check WorkerTasks
    print("\n4. EXISTING WORKER TASKS:")
    tasks = session.exec(select(WorkerTask)).all()
    if tasks:
        for t in tasks:
            print(f"   - {t.task_code} | worker_id={t.worker_id} | status={t.status}")
    else:
        print("   (No tasks yet)")

    # 5. Diagnose issues
    print("\n" + "=" * 60)
    print("DIAGNOSIS:")
    print("=" * 60)

    if not external_drivers:
        print("❌ ISSUE: No drivers linked to workers")
        print("   FIX: Link Driver to Worker via external_worker_id")
    elif not accesses:
        print("❌ ISSUE: Worker hasn't accepted invitation yet")
        print("   FIX: Worker needs to accept invitation first")
    else:
        print("✓ Setup looks OK - WorkerTask should be created on order assign")

        # Check if driver's worker has access
        for d in external_drivers:
            access = session.exec(
                select(WorkerTenantAccess).where(
                    and_(
                        WorkerTenantAccess.worker_id == d.external_worker_id,
                        WorkerTenantAccess.is_active == True,
                    )
                )
            ).first()
            if access:
                print(f"   ✓ Driver '{d.name}' → Worker has active access to tenant {access.tenant_id}")
            else:
                print(f"   ❌ Driver '{d.name}' → Worker has NO active access!")
