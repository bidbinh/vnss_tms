#!/bin/bash
# Deploy script for vnss_tms
# Run on server: ./deploy.sh

set -e

cd /home/tms

echo "========================================"
echo "🚀 DEPLOYING vnss_tms"
echo "========================================"

echo ""
echo "[1/5] Pulling latest code..."
git pull origin main

echo ""
echo "[2/5] Restarting backend..."
docker compose restart backend

echo ""
echo "[3/5] Building frontend..."
cd frontend
npm install --silent
npm run build

echo ""
echo "[4/5] Restarting frontend..."
pm2 restart frontend 2>/dev/null || pm2 start "npm run start" --name frontend

echo ""
echo "========================================"
echo "✅ DEPLOY COMPLETED!"
echo "========================================"
echo ""
echo "Check logs:"
echo "  Backend:  docker compose logs -f backend"
echo "  Frontend: pm2 logs frontend"
echo ""
