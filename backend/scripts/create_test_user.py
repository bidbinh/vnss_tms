import os
import sys
from sqlalchemy import text
from sqlalchemy.engine import create_engine
from sqlmodel import Session, select

# Ensure project `backend` path is on sys.path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.core.config import settings
from app.models.user import User
from app.core.security import hash_password


def create_test_user():
    engine = create_engine(settings.DATABASE_URL)
    
    with Session(engine) as session:
        # Check if admin already exists
        existing = session.exec(
            select(User).where(User.username == "admin")
        ).first()
        
        if existing:
            print("Admin user already exists")
            return
        
        # Create admin user
        admin = User(
            username="admin",
            full_name="Admin User",
            email="admin@example.com",
            role="admin",
            is_active=True,
            tenant_id="TENANT_DEMO",
            password_hash=hash_password("admin123"),
        )
        session.add(admin)
        session.commit()
        print("✅ Admin user created: admin / admin123")


if __name__ == "__main__":
    create_test_user()
