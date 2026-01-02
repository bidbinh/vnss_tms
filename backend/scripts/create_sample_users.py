"""
Script to create sample users for testing the User Management feature.
Run this script after setting up the database.

Usage:
    cd backend
    .venv/Scripts/python scripts/create_sample_users.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.db.session import engine
from app.models import User
from app.models.user import UserRole, UserStatus
from app.core.security import hash_password


def create_sample_users():
    """Create sample users for each role"""

    # Sample users data
    users_data = [
        {
            "username": "admin",
            "password": "admin123",
            "full_name": "Nguyen Van Admin",
            "email": "admin@vnss.vn",
            "phone": "0901234001",
            "role": UserRole.ADMIN.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Quan tri vien he thong",
        },
        {
            "username": "dieuphoi1",
            "password": "dieuphoi123",
            "full_name": "Tran Thi Dieu Phoi",
            "email": "dieuphoi1@vnss.vn",
            "phone": "0901234002",
            "role": UserRole.DISPATCHER.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Nhan vien dieu phoi chinh",
        },
        {
            "username": "dieuphoi2",
            "password": "dieuphoi123",
            "full_name": "Le Van Phoi",
            "email": "dieuphoi2@vnss.vn",
            "phone": "0901234003",
            "role": UserRole.DISPATCHER.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Nhan vien dieu phoi phu",
        },
        {
            "username": "ketoan1",
            "password": "ketoan123",
            "full_name": "Pham Thi Ke Toan",
            "email": "ketoan1@vnss.vn",
            "phone": "0901234004",
            "role": UserRole.ACCOUNTANT.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Ke toan truong",
        },
        {
            "username": "ketoan2",
            "password": "ketoan123",
            "full_name": "Vo Van Toan",
            "email": "ketoan2@vnss.vn",
            "phone": "0901234005",
            "role": UserRole.ACCOUNTANT.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Ke toan vien",
        },
        {
            "username": "nhansu1",
            "password": "nhansu123",
            "full_name": "Hoang Thi Nhan Su",
            "email": "hr@vnss.vn",
            "phone": "0901234006",
            "role": UserRole.HR.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Truong phong nhan su",
        },
        {
            "username": "taixe1",
            "password": "taixe123",
            "full_name": "Nguyen Van Tai",
            "email": "taixe1@vnss.vn",
            "phone": "0901234007",
            "role": UserRole.DRIVER.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Tai xe xe dau keo",
        },
        {
            "username": "taixe2",
            "password": "taixe123",
            "full_name": "Tran Van Xe",
            "email": "taixe2@vnss.vn",
            "phone": "0901234008",
            "role": UserRole.DRIVER.value,
            "status": UserStatus.ACTIVE.value,
            "notes": "Tai xe xe container",
        },
        {
            "username": "taixe3",
            "password": "taixe123",
            "full_name": "Le Van Lai",
            "email": "taixe3@vnss.vn",
            "phone": "0901234009",
            "role": UserRole.DRIVER.value,
            "status": UserStatus.INACTIVE.value,
            "notes": "Tai xe tam nghi",
        },
        {
            "username": "suspended_user",
            "password": "test123",
            "full_name": "User Bi Khoa",
            "email": "suspended@vnss.vn",
            "phone": "0901234010",
            "role": UserRole.DISPATCHER.value,
            "status": UserStatus.SUSPENDED.value,
            "notes": "Tai khoan bi khoa do vi pham",
        },
    ]

    with Session(engine) as session:
        created_count = 0
        skipped_count = 0

        for user_data in users_data:
            # Check if user already exists
            existing = session.exec(
                select(User).where(User.username == user_data["username"])
            ).first()

            if existing:
                print(f"  [SKIP] User '{user_data['username']}' already exists")
                skipped_count += 1
                continue

            # Create new user
            user = User(
                username=user_data["username"],
                password_hash=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                email=user_data["email"],
                phone=user_data["phone"],
                role=user_data["role"],
                status=user_data["status"],
                notes=user_data["notes"],
                tenant_id="TENANT_DEMO",  # Default tenant
            )

            session.add(user)
            print(f"  [CREATE] User '{user_data['username']}' ({user_data['role']})")
            created_count += 1

        session.commit()

        print("\n" + "="*50)
        print(f"Summary: Created {created_count} users, Skipped {skipped_count}")
        print("="*50)

        # Print login info
        print("\nSample login credentials:")
        print("-" * 50)
        print(f"{'Username':<15} {'Password':<15} {'Role':<15}")
        print("-" * 50)
        for user_data in users_data:
            if user_data["status"] == UserStatus.ACTIVE.value:
                print(f"{user_data['username']:<15} {user_data['password']:<15} {user_data['role']:<15}")


if __name__ == "__main__":
    print("\n" + "="*50)
    print("Creating sample users for TMS...")
    print("="*50 + "\n")

    try:
        create_sample_users()
        print("\nDone!")
    except Exception as e:
        print(f"\nError: {e}")
        raise
