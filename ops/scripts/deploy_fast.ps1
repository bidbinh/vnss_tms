# TMS Fast Deployment Script
# Excludes node_modules and .next for faster upload

param(
    [string]$Target = "frontend"
)

$VPS_HOST = "root@103.176.20.95"
$VPS_PATH = "/home/tms"
$LOCAL_PATH = "D:\vnss_tms"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TMS Fast Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Target -eq "frontend") {
    Write-Host "[1/4] Creating frontend archive (excluding node_modules, .next)..." -ForegroundColor Yellow
    Set-Location $LOCAL_PATH
    tar --exclude='frontend/node_modules' --exclude='frontend/.next' -czf frontend.tar.gz frontend
    $size = (Get-Item frontend.tar.gz).Length / 1MB
    Write-Host "Archive created: $([math]::Round($size, 2)) MB"

    Write-Host "[2/4] Uploading archive to server..." -ForegroundColor Yellow
    scp frontend.tar.gz "${VPS_HOST}:${VPS_PATH}/"

    Write-Host "[3/4] Extracting on server and rebuilding..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH && rm -rf frontend_backup && mv frontend frontend_backup 2>/dev/null; tar -xzf frontend.tar.gz && rm frontend.tar.gz && cd ops && docker compose -f docker-compose.prod.yml up -d --build frontend"

    Write-Host "[4/4] Checking status..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml ps frontend"

    # Cleanup local archive
    Remove-Item "$LOCAL_PATH\frontend.tar.gz" -ErrorAction SilentlyContinue

} elseif ($Target -eq "backend") {
    Write-Host "[1/4] Creating backend archive (excluding .venv, __pycache__)..." -ForegroundColor Yellow
    Set-Location $LOCAL_PATH
    tar --exclude='backend/.venv' --exclude='backend/__pycache__' --exclude='backend/.pytest_cache' -czf backend.tar.gz backend
    $size = (Get-Item backend.tar.gz).Length / 1MB
    Write-Host "Archive created: $([math]::Round($size, 2)) MB"

    Write-Host "[2/4] Uploading archive to server..." -ForegroundColor Yellow
    scp backend.tar.gz "${VPS_HOST}:${VPS_PATH}/"

    Write-Host "[3/4] Extracting on server and rebuilding..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH && rm -rf backend_backup && mv backend backend_backup 2>/dev/null; tar -xzf backend.tar.gz && rm backend.tar.gz && cd ops && docker compose -f docker-compose.prod.yml up -d --build backend"

    Write-Host "[4/4] Checking status..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml ps backend"

    # Cleanup local archive
    Remove-Item "$LOCAL_PATH\backend.tar.gz" -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "  Website: https://9log.tech" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
