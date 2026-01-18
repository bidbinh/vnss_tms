@echo off
REM Deploy ONLY Backend (fast - 30 seconds)
cd /d %~dp0

echo.
echo === Deploy Backend Only (30s) ===
echo.

git add -A
git commit -m "fix: backend update"
git push origin main

ssh root@103.176.20.95 "cd /home/tms && git pull origin main && sudo systemctl restart vnss-tms-backend"

echo.
echo === Backend Deployed! ===
pause
