"""Simple script to create admin user"""
import sys
from sqlmodel import Session, select
from app.db.session import engine
from app.models import User, Tenant
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    with Session(engine) as session:
        # Get tenant
        tenant = session.exec(select(Tenant)).first()
        if not tenant:
            print("ERROR: No tenant found. Run seed_users.py first")
            return

        # Delete existing admin1
        existing = session.exec(select(User).where(User.username == "admin1")).first()
        if existing:
            session.delete(existing)
            session.commit()
            print("Deleted existing admin1")

        # Create new admin with simple password
        import uuid
        admin = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            username="admin1",
            password_hash=pwd_context.hash("123456"),
            role="ADMIN"
        )

        session.add(admin)
        session.commit()
        print(f"Created admin1 with password: 123456")
        print(f"Password hash: {admin.password_hash[:20]}...")

if __name__ == "__main__":
    create_admin()
