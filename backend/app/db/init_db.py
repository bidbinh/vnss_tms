from sqlmodel import SQLModel
from app.db.session import engine
from app.models import Tenant, Customer, Order, OrderSequence

def init_db():
    SQLModel.metadata.create_all(engine)

if __name__ == "__main__":
    init_db()
