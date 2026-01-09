from sqlalchemy import inspect
from app.db.session import engine

inspector = inspect(engine)
cols = [c['name'] for c in inspector.get_columns('fms_hs_codes')]

with open('cols_output.txt', 'w') as f:
    f.write("Columns in fms_hs_codes:\n")
    for col in sorted(cols):
        f.write(f"  - {col}\n")
print("Output written to cols_output.txt")
