@echo off
REM ============================================
REM VNSS TMS - Quick Deploy (Double-click to run)
REM ============================================

cd /d %~dp0

echo.
echo ============================================
echo   VNSS TMS - Quick Deploy
echo ============================================
echo.

REM Check if message provided
set MESSAGE=%1
if "%MESSAGE%"=="" set MESSAGE=update: quick deploy

echo [1/4] Committing changes...
git add -A
git commit -m "%MESSAGE%"
git push origin main

echo.
echo [2/4] Pulling on server...
ssh root@103.176.20.95 "cd /home/tms && git pull origin main"

echo.
echo [3/4] Restarting backend...
ssh root@103.176.20.95 "sudo systemctl restart vnss-tms-backend"

echo.
echo [4/4] Building frontend (2-3 minutes)...
ssh root@103.176.20.95 "cd /home/tms/frontend && npm run build && pm2 restart vnss-tms-frontend"

echo.
echo ============================================
echo   DEPLOY COMPLETED!
echo ============================================
echo.
echo   Frontend: https://9log.tech
echo   Backend:  https://api.9log.tech
echo.

pause
