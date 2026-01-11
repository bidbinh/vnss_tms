from pathlib import Path
from sqlalchemy import create_engine, text
from app.core.config import settings
import sys


def main():
    # Allow specifying migration file as argument, otherwise apply latest
    migration_name = sys.argv[1] if len(sys.argv) > 1 else "002_add_driver_id_to_orders.sql"
    
    sql_file = Path(__file__).with_name("migrations") / migration_name
    if not sql_file.exists():
        print("Migration SQL file not found:", sql_file)
        return 1

    sql = sql_file.read_text(encoding="utf-8")

    engine = create_engine(settings.DATABASE_URL)
    print("Connecting to:", settings.DATABASE_URL)
    print(f"Applying migration: {migration_name}")
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        print("Migration applied successfully")
        return 0
    except Exception as e:
        print("Migration failed:", e)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
