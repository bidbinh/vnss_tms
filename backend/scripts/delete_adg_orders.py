"""Delete ADG orders with code > 223"""
from sqlmodel import Session, text
import sys
sys.path.insert(0, ".")

from app.core.database import engine

with Session(engine) as session:
    # First, show what will be deleted
    result = session.execute(text("""
        SELECT order_code FROM orders
        WHERE order_code ~ '^ADG-[0-9]+$'
          AND CAST(SPLIT_PART(order_code, '-', 2) AS INTEGER) > 223
        ORDER BY CAST(SPLIT_PART(order_code, '-', 2) AS INTEGER)
    """)).fetchall()

    print(f"Orders to delete: {len(result)}")
    for r in result[:10]:
        print(f"  {r[0]}")
    if len(result) > 10:
        print(f"  ... and {len(result)-10} more")

    if len(result) == 0:
        print("Nothing to delete!")
    else:
        # Delete them
        session.execute(text("""
            DELETE FROM orders
            WHERE order_code ~ '^ADG-[0-9]+$'
              AND CAST(SPLIT_PART(order_code, '-', 2) AS INTEGER) > 223
        """))
        session.commit()
        print("Deleted successfully!")
