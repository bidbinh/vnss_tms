"""Seed initial users for testing"""
from sqlmodel import Session, select
from app.db.session import engine
from app.models import User, Tenant
from app.core.security import hash_password
import uuid

def seed_users():
    with Session(engine) as session:
        # Check if tenant exists
        tenant = session.exec(select(Tenant)).first()
        if not tenant:
            tenant = Tenant(
                id=str(uuid.uuid4()),
                code="TH",
                name="Tín Hưng Logistics",
                tax_code="0123456789"
            )
            session.add(tenant)
            session.commit()
            session.refresh(tenant)
            print(f"OK Created tenant: {tenant.name}")
        else:
            print(f"OK Using existing tenant: {tenant.name}")

        # Check if admin1 exists
        admin = session.exec(select(User).where(User.username == "admin1")).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                username="admin1",
                password_hash=hash_password("123456"),
                role="ADMIN"
            )
            session.add(admin)
            session.commit()
            print(f"OK Created admin user: admin1 / 123456")
        else:
            print(f"OK Admin user already exists: admin1")

        # Create dispatcher user
        dispatcher = session.exec(select(User).where(User.username == "dispatcher1")).first()
        if not dispatcher:
            dispatcher = User(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                username="dispatcher1",
                password_hash=hash_password("123456"),
                role="DISPATCHER"
            )
            session.add(dispatcher)
            session.commit()
            print(f"OK Created dispatcher user: dispatcher1 / 123456")
        else:
            print(f"OK Dispatcher user already exists: dispatcher1")

        # Create customer user
        customer = session.exec(select(User).where(User.username == "customer1")).first()
        if not customer:
            customer = User(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                username="customer1",
                password_hash=hash_password("123456"),
                role="CUSTOMER"
            )
            session.add(customer)
            session.commit()
            print(f"OK Created customer user: customer1 / 123456")
        else:
            print(f"OK Customer user already exists: customer1")

        print("\nSUCCESS Seed completed!")
        print("You can now login with:")
        print("  - admin1 / 123456 (ADMIN)")
        print("  - dispatcher1 / 123456 (DISPATCHER)")
        print("  - customer1 / 123456 (CUSTOMER)")

if __name__ == "__main__":
    seed_users()
