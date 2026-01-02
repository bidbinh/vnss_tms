# change_admin_password.py
from sqlmodel import select, Session
from app.db.session import engine
from app.models.user import User
from app.core.security import hash_password

NEW_PASSWORD = "Tnt01087"

def main():
    with Session(engine) as session:
        result = session.exec(select(User).where(User.username == "admin"))
        user = result.first()
        if not user:
            print("Admin user not found!")
            return

        user.password_hash = hash_password(NEW_PASSWORD)
        session.add(user)
        session.commit()
        print(f"Password changed for admin to: {NEW_PASSWORD}")

if __name__ == "__main__":
    main()
