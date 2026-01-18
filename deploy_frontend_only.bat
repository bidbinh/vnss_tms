@echo off
REM Deploy ONLY Frontend (slow - 3 minutes)
cd /d %~dp0

echo.
echo === Deploy Frontend Only (3 min) ===
echo.

git add -A
git commit -m "fix: frontend update"
git push origin main

ssh root@103.176.20.95 "cd /home/tms && git pull origin main && cd frontend && npm run build && pm2 restart vnss-tms-frontend"

echo.
echo === Frontend Deployed! ===
pause
