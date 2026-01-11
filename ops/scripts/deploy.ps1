# TMS Deployment Script for Windows
# Usage: .\deploy.ps1 [backend|frontend|all]

param(
    [string]$Target = "all"
)

$VPS_HOST = "root@103.176.20.95"
$VPS_PATH = "/home/tms"
$LOCAL_PATH = "D:\vnss_tms"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TMS Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Deploy-Backend {
    Write-Host "[1/3] Uploading backend..." -ForegroundColor Yellow
    scp -r "$LOCAL_PATH\backend" "${VPS_HOST}:${VPS_PATH}/"

    Write-Host "[2/3] Rebuilding backend container..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml up -d --build backend"

    Write-Host "[3/3] Checking status..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml ps backend"

    Write-Host "Backend deployed successfully!" -ForegroundColor Green
}

function Deploy-Frontend {
    Write-Host "[1/3] Uploading frontend..." -ForegroundColor Yellow
    scp -r "$LOCAL_PATH\frontend" "${VPS_HOST}:${VPS_PATH}/"

    Write-Host "[2/3] Rebuilding frontend container..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml up -d --build frontend"

    Write-Host "[3/3] Checking status..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml ps frontend"

    Write-Host "Frontend deployed successfully!" -ForegroundColor Green
}

function Deploy-All {
    Write-Host "[1/4] Uploading backend..." -ForegroundColor Yellow
    scp -r "$LOCAL_PATH\backend" "${VPS_HOST}:${VPS_PATH}/"

    Write-Host "[2/4] Uploading frontend..." -ForegroundColor Yellow
    scp -r "$LOCAL_PATH\frontend" "${VPS_HOST}:${VPS_PATH}/"

    Write-Host "[3/4] Rebuilding containers..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml up -d --build backend frontend"

    Write-Host "[4/4] Checking status..." -ForegroundColor Yellow
    ssh $VPS_HOST "cd $VPS_PATH/ops && docker compose -f docker-compose.prod.yml ps"

    Write-Host "All services deployed successfully!" -ForegroundColor Green
}

switch ($Target.ToLower()) {
    "backend" { Deploy-Backend }
    "frontend" { Deploy-Frontend }
    "all" { Deploy-All }
    default {
        Write-Host "Usage: .\deploy.ps1 [backend|frontend|all]" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "  Website: https://9log.tech" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
