@echo off
chcp 65001 >nul
echo ========================================
echo   Invoice Automation Tool - GFORTUNE
echo ========================================
echo.

cd /d "%~dp0"

if "%1"=="" (
    echo Usage:
    echo   run.bat debug                    - Chay che do debug (xem browser)
    echo   run.bat NH5932291 JXLU6143159    - Tao hoa don voi so phieu thu va container
    echo.
    echo Vi du:
    echo   run.bat debug
    echo   run.bat NH5932291 JXLU6143159
    echo.
    pause
    exit /b
)

if "%1"=="debug" (
    echo Dang chay che do DEBUG...
    C:\Users\ADMIN\AppData\Local\Programs\Python\Python311\python.exe main.py --depot GFORTUNE --debug
) else (
    if "%2"=="" (
        echo LOI: Can nhap ca so phieu thu va so container
        echo Vi du: run.bat NH5932291 JXLU6143159
        pause
        exit /b
    )
    echo Dang tao hoa don...
    echo   So phieu thu: %1
    echo   So container: %2
    echo.
    C:\Users\ADMIN\AppData\Local\Programs\Python\Python311\python.exe main.py --depot GFORTUNE --receipt %1 --container %2
)

echo.
pause
