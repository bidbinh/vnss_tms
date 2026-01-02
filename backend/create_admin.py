# create_admin.py
import asyncio
from sqlmodel import SQLModel, select
from app.core.db import engine, get_session
from app.models.user import User
from app.core.security import hash_password

ADMIN_USERNAME = "admin"
ADMIN_FULLNAME = "Admin 9log"
ADMIN_PASSWORD = "Tnt01087"  # đổi sau khi đăng nhập lần đầu

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # get_session() là async generator -> iterate nó
    async for session in get_session():
        exists = await session.exec(select(User).where(User.username == ADMIN_USERNAME))
        user = exists.first()
        if user:
            print("Admin user already exists.")
            break
        u = User(
            username=ADMIN_USERNAME,
            full_name=ADMIN_FULLNAME,
            role="admin",
            is_active=True,
            password_hash=hash_password(ADMIN_PASSWORD),
        )
        session.add(u)
        await session.commit()
        print("✅ Admin created: username=admin / password=Tnt01087")

if __name__ == "__main__":
    asyncio.run(main())
