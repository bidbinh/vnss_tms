@echo off
cd /d D:\vnss_tms\backend
set DATABASE_URL=postgresql+psycopg://tms_user:tms_pass@127.0.0.1:5432/tms
D:\vnss_tms\backend\.venv\Scripts\python.exe -m alembic upgrade head
pause
