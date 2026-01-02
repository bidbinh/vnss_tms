# create_admin_sync.py - Sync version
from sqlmodel import Session, select, SQLModel
from app.db.session import engine
from app.models.user import User
from app.core.security import hash_password

ADMIN_USERNAME = "admin"
ADMIN_FULLNAME = "Admin 9log"
ADMIN_PASSWORD = "Tnt01087"

def main():
    # Create tables
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Check if admin exists
        result = session.exec(select(User).where(User.username == ADMIN_USERNAME))
        user = result.first()

        if user:
            print("Admin user already exists.")
            return

        # Create admin
        admin = User(
            username=ADMIN_USERNAME,
            full_name=ADMIN_FULLNAME,
            role="admin",
            is_active=True,
            password_hash=hash_password(ADMIN_PASSWORD),
        )
        session.add(admin)
        session.commit()
        print(f"✅ Admin created: username={ADMIN_USERNAME} / password={ADMIN_PASSWORD}")

if __name__ == "__main__":
    main()
