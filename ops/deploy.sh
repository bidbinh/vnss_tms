#!/bin/bash
# =============================================================================
# Deploy Script cho 9log ERP System
# =============================================================================
# Usage:
#   ./deploy.sh              # Deploy full (backend + frontend)
#   ./deploy.sh backend      # Deploy only backend
#   ./deploy.sh frontend     # Deploy only frontend
#   ./deploy.sh migrate      # Run migrations only
# =============================================================================

set -e  # Dừng ngay khi có lỗi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/tms"
OPS_DIR="${PROJECT_ROOT}/ops"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
BACKEND_DIR="${PROJECT_ROOT}/backend"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Kiểm tra environment variables
# =============================================================================
check_env() {
    log_info "Kiểm tra environment variables..."

    local env_file="${OPS_DIR}/.env"
    local missing_vars=()

    # Các biến bắt buộc
    local required_vars=(
        "DATABASE_URL"
        "SECRET_KEY"
        "REDIS_URL"
    )

    # Các biến khuyến nghị (warning nếu thiếu)
    local recommended_vars=(
        "ANTHROPIC_API_KEY"
        "TELEGRAM_BOT_TOKEN"
    )

    if [ ! -f "$env_file" ]; then
        log_error "File .env không tồn tại tại: $env_file"
        log_info "Tạo file .env từ .env.example..."
        cp "${BACKEND_DIR}/.env.example" "$env_file"
        log_warning "Vui lòng cập nhật các giá trị trong $env_file"
        exit 1
    fi

    # Kiểm tra biến bắt buộc
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" || [ -z "$(grep "^${var}=" "$env_file" | cut -d'=' -f2-)" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Thiếu các biến môi trường bắt buộc:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi

    # Kiểm tra biến khuyến nghị
    for var in "${recommended_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" || [ -z "$(grep "^${var}=" "$env_file" | cut -d'=' -f2-)" ]; then
            log_warning "Biến $var chưa được cấu hình (không bắt buộc)"
        fi
    done

    log_success "Environment variables OK"
}

# =============================================================================
# Pull code mới từ git
# =============================================================================
pull_code() {
    log_info "Pull code từ git..."
    cd "$PROJECT_ROOT"

    # Stash local changes nếu có
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Có thay đổi local, đang stash..."
        git stash
    fi

    git pull origin main
    log_success "Pull code thành công"
}

# =============================================================================
# Deploy Backend
# =============================================================================
deploy_backend() {
    log_info "Deploying backend..."
    cd "$OPS_DIR"

    # Sync .env từ ops sang backend nếu cần
    if [ -f "${OPS_DIR}/.env" ]; then
        log_info "Syncing .env file..."
        # Merge .env files - ops/.env có priority cao hơn
        cat "${BACKEND_DIR}/.env.example" > "${OPS_DIR}/.env.merged"
        if [ -f "${OPS_DIR}/.env" ]; then
            # Append ops/.env values (override)
            cat "${OPS_DIR}/.env" >> "${OPS_DIR}/.env.merged"
        fi
    fi

    # Rebuild backend container
    log_info "Rebuilding backend container..."
    docker compose build --no-cache backend

    # Restart backend
    log_info "Restarting backend..."
    docker compose up -d backend

    # Chờ backend khởi động
    log_info "Waiting for backend to start..."
    sleep 10

    # Health check
    local max_retries=30
    local retry=0
    while [ $retry -lt $max_retries ]; do
        if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
            log_success "Backend is healthy"
            return 0
        fi
        retry=$((retry + 1))
        log_info "Waiting for backend... ($retry/$max_retries)"
        sleep 2
    done

    log_error "Backend health check failed!"
    docker compose logs --tail=50 backend
    exit 1
}

# =============================================================================
# Run Database Migrations
# =============================================================================
run_migrations() {
    log_info "Running database migrations..."
    cd "$OPS_DIR"

    # Kiểm tra backend container đang chạy
    if ! docker compose ps backend | grep -q "Up"; then
        log_error "Backend container không chạy. Khởi động trước..."
        docker compose up -d backend
        sleep 10
    fi

    # Run migrations
    docker compose exec -T backend alembic upgrade head

    if [ $? -eq 0 ]; then
        log_success "Migrations completed"
    else
        log_error "Migration failed!"
        exit 1
    fi
}

# =============================================================================
# Deploy Frontend
# =============================================================================
deploy_frontend() {
    log_info "Deploying frontend..."
    cd "$FRONTEND_DIR"

    # Install dependencies nếu package.json thay đổi
    log_info "Installing dependencies..."
    npm install

    # Build frontend
    log_info "Building frontend..."
    npm run build

    # Restart PM2
    log_info "Restarting PM2..."
    if pm2 list | grep -q "frontend"; then
        pm2 restart frontend
    else
        pm2 start npm --name "frontend" -- start
    fi

    # Health check
    sleep 5
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_warning "Frontend health check failed, checking logs..."
        pm2 logs frontend --lines 20
    fi
}

# =============================================================================
# Full Deploy
# =============================================================================
deploy_full() {
    log_info "=========================================="
    log_info "Starting full deployment..."
    log_info "=========================================="

    check_env
    pull_code
    deploy_backend
    run_migrations
    deploy_frontend

    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "=========================================="

    # Show status
    echo ""
    log_info "Services status:"
    cd "$OPS_DIR"
    docker compose ps
    echo ""
    pm2 status
}

# =============================================================================
# Rollback (nếu cần)
# =============================================================================
rollback() {
    log_warning "Rolling back to previous version..."
    cd "$PROJECT_ROOT"

    # Get previous commit
    local prev_commit=$(git rev-parse HEAD~1)
    log_info "Rolling back to: $prev_commit"

    git checkout "$prev_commit"

    deploy_backend
    deploy_frontend

    log_success "Rollback completed"
}

# =============================================================================
# Main
# =============================================================================
case "${1:-full}" in
    "full")
        deploy_full
        ;;
    "backend")
        check_env
        deploy_backend
        run_migrations
        ;;
    "frontend")
        deploy_frontend
        ;;
    "migrate")
        run_migrations
        ;;
    "rollback")
        rollback
        ;;
    "check")
        check_env
        ;;
    *)
        echo "Usage: $0 {full|backend|frontend|migrate|rollback|check}"
        exit 1
        ;;
esac
