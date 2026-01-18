# ============================================
# VNSS TMS - Quick Deploy Script (Windows)
# Deploy chỉ những thay đổi, không rebuild từ đầu
# ============================================

param(
    [string]$Target = "all",
    [string]$Message = "update: quick deploy"
)

$VPS_HOST = "root@103.176.20.95"
$VPS_PATH = "/home/tms"

# Colors
function Write-Color($Text, $Color) {
    Write-Host $Text -ForegroundColor $Color
}

Write-Host ""
Write-Color "============================================" Cyan
Write-Color "  VNSS TMS - Quick Deploy" Cyan
Write-Color "============================================" Cyan
Write-Host ""

# ============================================
# Step 1: Git commit & push
# ============================================
Write-Color "[1/4] Committing and pushing changes..." Yellow

git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Color "ERROR: git add failed" Red
    exit 1
}

git commit -m "$Message"
# Ignore error if nothing to commit

git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Color "ERROR: git push failed" Red
    exit 1
}

Write-Color "OK - Code pushed to repository" Green
Write-Host ""

# ============================================
# Step 2: Pull on server
# ============================================
Write-Color "[2/4] Pulling code on server..." Yellow

ssh $VPS_HOST "cd $VPS_PATH && git pull origin main"
if ($LASTEXITCODE -ne 0) {
    Write-Color "ERROR: git pull failed on server" Red
    exit 1
}

Write-Color "OK - Code pulled on server" Green
Write-Host ""

# ============================================
# Step 3: Deploy Backend (if needed)
# ============================================
if ($Target -eq "all" -or $Target -eq "backend") {
    Write-Color "[3/4] Restarting backend..." Yellow
    
    ssh $VPS_HOST "sudo systemctl restart vnss-tms-backend"
    if ($LASTEXITCODE -ne 0) {
        Write-Color "ERROR: Backend restart failed" Red
        exit 1
    }
    
    # Wait and check
    Start-Sleep -Seconds 2
    $status = ssh $VPS_HOST "sudo systemctl is-active vnss-tms-backend"
    if ($status -eq "active") {
        Write-Color "OK - Backend is running" Green
    } else {
        Write-Color "WARNING - Backend status: $status" Yellow
    }
} else {
    Write-Color "[3/4] Skipping backend (target=$Target)" Gray
}
Write-Host ""

# ============================================
# Step 4: Deploy Frontend (if needed)
# ============================================
if ($Target -eq "all" -or $Target -eq "frontend") {
    Write-Color "[4/4] Building and restarting frontend..." Yellow
    Write-Color "      (This takes ~2-3 minutes)" Gray
    
    $buildResult = ssh $VPS_HOST "cd $VPS_PATH/frontend && npm run build 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Color "ERROR: Frontend build failed" Red
        Write-Host $buildResult
        exit 1
    }
    
    ssh $VPS_HOST "pm2 restart vnss-tms-frontend"
    if ($LASTEXITCODE -ne 0) {
        Write-Color "ERROR: PM2 restart failed" Red
        exit 1
    }
    
    Write-Color "OK - Frontend deployed" Green
} else {
    Write-Color "[4/4] Skipping frontend (target=$Target)" Gray
}
Write-Host ""

# ============================================
# Summary
# ============================================
Write-Color "============================================" Cyan
Write-Color "  DEPLOY COMPLETED!" Green
Write-Color "============================================" Cyan
Write-Host ""
Write-Host "  Frontend: https://9log.tech"
Write-Host "  Backend:  https://api.9log.tech"
Write-Host ""
Write-Color "  Check logs:" Gray
Write-Host "    Backend:  ssh $VPS_HOST 'journalctl -u vnss-tms-backend -f'"
Write-Host "    Frontend: ssh $VPS_HOST 'pm2 logs vnss-tms-frontend'"
Write-Host ""
