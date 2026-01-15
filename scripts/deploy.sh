#!/bin/bash

# Deploy script for VNSS TMS
# Usage: ./scripts/deploy.sh [backend|frontend|all]

set -e  # Exit on error

DEPLOY_TARGET=${1:-all}
REMOTE_HOST="9log.tech"
REMOTE_DIR="~/apps/vnss_tms"

echo "🚀 Deploying VNSS TMS to production..."
echo "Target: $DEPLOY_TARGET"
echo ""

deploy_backend() {
    echo "📦 Deploying Backend..."
    ssh $REMOTE_HOST << 'ENDSSH'
        cd ~/apps/vnss_tms
        echo "📥 Pulling latest code..."
        git pull

        cd backend
        echo "🔧 Activating virtual environment..."
        source venv/bin/activate

        echo "📦 Installing dependencies..."
        pip install -r requirements.txt -q

        echo "🗄️ Running database migrations..."
        alembic upgrade head

        echo "♻️ Restarting backend service..."
        sudo systemctl restart vnss-tms-backend

        echo "✅ Backend deployed successfully!"
ENDSSH
}

deploy_frontend() {
    echo "🎨 Deploying Frontend..."
    ssh $REMOTE_HOST << 'ENDSSH'
        cd ~/apps/vnss_tms/frontend

        echo "📦 Installing dependencies..."
        npm install

        echo "🏗️ Building frontend..."
        npm run build

        echo "♻️ Restarting frontend service..."
        pm2 restart vnss-tms-frontend

        echo "✅ Frontend deployed successfully!"
ENDSSH
}

case $DEPLOY_TARGET in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        echo ""
        deploy_frontend
        ;;
    *)
        echo "❌ Invalid target: $DEPLOY_TARGET"
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed!"
echo "🌐 Backend: https://api.9log.tech"
echo "🌐 Frontend: https://9log.tech"
