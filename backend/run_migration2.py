import os
os.chdir('d:\\vnss_tms\\backend')

from alembic.config import Config
from alembic import command

try:
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("Migration completed successfully!")
except Exception as e:
    print(f"Migration error: {e}")
