#!/bin/bash

# Auto Deploy Script for VNSS TMS
# This script will be uploaded to server and executed there

set -e  # Exit on error

echo "========================================="
echo "🚀 VNSS TMS Auto Deploy Started"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to app directory
cd ~/apps/vnss_tms || { echo "❌ Failed to cd to ~/apps/vnss_tms"; exit 1; }

echo "📂 Current directory: $(pwd)"
echo ""

# ==========================================
# STEP 1: Pull latest code
# ==========================================
echo "${YELLOW}[1/5] Pulling latest code from GitHub...${NC}"
git pull origin main || { echo "${RED}❌ Git pull failed${NC}"; exit 1; }
echo "${GREEN}✅ Code pulled successfully${NC}"
echo ""

# ==========================================
# STEP 2: Deploy Backend
# ==========================================
echo "${YELLOW}[2/5] Deploying Backend...${NC}"
cd backend

# Activate virtual environment
echo "   🔧 Activating virtual environment..."
source venv/bin/activate || { echo "${RED}❌ Failed to activate venv${NC}"; exit 1; }

# Install dependencies
echo "   📦 Installing Python dependencies..."
pip install -r requirements.txt -q || { echo "${RED}❌ Failed to install dependencies${NC}"; exit 1; }

# Run migrations
echo "   🗄️  Running database migrations..."
alembic upgrade head || { echo "${RED}❌ Migration failed${NC}"; exit 1; }

# Restart backend service
echo "   ♻️  Restarting backend service..."
sudo systemctl restart vnss-tms-backend || { echo "${RED}❌ Failed to restart backend${NC}"; exit 1; }

# Check backend status
sleep 2
if sudo systemctl is-active --quiet vnss-tms-backend; then
    echo "${GREEN}✅ Backend deployed and running${NC}"
else
    echo "${RED}❌ Backend service is not running${NC}"
    sudo systemctl status vnss-tms-backend --no-pager -l
    exit 1
fi
echo ""

# ==========================================
# STEP 3: Deploy Frontend
# ==========================================
echo "${YELLOW}[3/5] Deploying Frontend...${NC}"
cd ../frontend

# Install dependencies
echo "   📦 Installing npm dependencies..."
npm install || { echo "${RED}❌ Failed to install npm packages${NC}"; exit 1; }

# Build frontend
echo "   🏗️  Building frontend (this may take a minute)..."
npm run build || { echo "${RED}❌ Frontend build failed${NC}"; exit 1; }

# Restart frontend service
echo "   ♻️  Restarting frontend service..."
pm2 restart vnss-tms-frontend || { echo "${RED}❌ Failed to restart frontend${NC}"; exit 1; }

# Check frontend status
sleep 2
if pm2 list | grep -q "vnss-tms-frontend.*online"; then
    echo "${GREEN}✅ Frontend deployed and running${NC}"
else
    echo "${RED}❌ Frontend service is not online${NC}"
    pm2 list
    exit 1
fi
echo ""

# ==========================================
# STEP 4: Verify Deployment
# ==========================================
echo "${YELLOW}[4/5] Verifying deployment...${NC}"

# Check backend health
echo "   🔍 Checking backend health..."
if curl -s -f https://api.9log.tech/health > /dev/null; then
    echo "${GREEN}   ✅ Backend API is responding${NC}"
else
    echo "${RED}   ❌ Backend API is not responding${NC}"
fi

# Check frontend
echo "   🔍 Checking frontend..."
if curl -s -f -I https://9log.tech | grep -q "200 OK"; then
    echo "${GREEN}   ✅ Frontend is responding${NC}"
else
    echo "${RED}   ❌ Frontend is not responding${NC}"
fi
echo ""

# ==========================================
# STEP 5: Summary
# ==========================================
echo "${YELLOW}[5/5] Deployment Summary${NC}"
echo "========================================="
echo ""
echo "📊 Service Status:"
echo "   Backend:  $(sudo systemctl is-active vnss-tms-backend)"
echo "   Frontend: $(pm2 list | grep vnss-tms-frontend | awk '{print $10}')"
echo ""
echo "🌐 URLs:"
echo "   Frontend: ${GREEN}https://9log.tech${NC}"
echo "   Backend:  ${GREEN}https://api.9log.tech${NC}"
echo "   Driver Payroll: ${GREEN}https://9log.tech/hrm/driver-payroll${NC}"
echo ""
echo "📝 Recent logs:"
echo "   Backend:  sudo journalctl -u vnss-tms-backend -f --lines=50"
echo "   Frontend: pm2 logs vnss-tms-frontend --lines 50"
echo ""
echo "========================================="
echo "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "========================================="
