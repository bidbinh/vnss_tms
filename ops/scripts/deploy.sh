#!/bin/bash

# ===========================================
# VNSS TMS Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  VNSS TMS Deployment Script${NC}"
echo -e "${GREEN}=========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo -e "${YELLOW}Copy .env.production.example to .env.production and configure it first.${NC}"
    exit 1
fi

# Load environment variables
source .env.production

# Check required variables
if [ -z "$DOMAIN" ] || [ -z "$SECRET_KEY" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: Required environment variables not set!${NC}"
    echo -e "${YELLOW}Please configure DOMAIN, SECRET_KEY, and DB_PASSWORD in .env.production${NC}"
    exit 1
fi

echo -e "${GREEN}Domain: $DOMAIN${NC}"

# Update nginx config with domain
echo -e "${YELLOW}Updating nginx configuration...${NC}"
sed -i "s/YOUR_DOMAIN.com/$DOMAIN/g" nginx/nginx.conf

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p nginx/ssl

# Step 1: Start without SSL first (for Let's Encrypt verification)
echo -e "${YELLOW}Starting services without SSL...${NC}"
cp nginx/nginx.init.conf nginx/nginx.conf.backup
cp nginx/nginx.init.conf nginx/nginx.conf

docker-compose -f docker-compose.prod.yml --env-file .env.production up -d db redis minio
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend frontend nginx

echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 15

# Step 2: Get SSL Certificate
echo -e "${YELLOW}Obtaining SSL certificate from Let's Encrypt...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production run --rm certbot \
    certonly --webroot -w /var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Step 3: Update nginx with SSL config
echo -e "${YELLOW}Enabling SSL configuration...${NC}"
cp nginx/nginx.conf.backup nginx/nginx.init.conf
# The main nginx.conf already has SSL, just reload
docker-compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "Your app is now available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "MinIO Console (internal only):"
echo -e "  http://localhost:9001"
echo ""
echo -e "${YELLOW}Important: Make sure your domain DNS points to this server's IP${NC}"
