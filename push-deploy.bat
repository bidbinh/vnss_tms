@echo off
echo ========================================
echo    PUSH AND DEPLOY vnss_tms
echo ========================================
echo.

echo [1/3] Committing changes...
git add .
git commit -m "Deploy %date:~-4%-%date:~4,2%-%date:~7,2% %time:~0,5%" 2>nul || echo No changes to commit

echo.
echo [2/3] Pushing to remote...
git push origin main

echo.
echo [3/3] Deploying on server...
ssh root@130.176.20.95 "cd /home/tms && chmod +x deploy.sh && ./deploy.sh"

echo.
echo ========================================
echo    DEPLOY COMPLETED!
echo ========================================
pause
