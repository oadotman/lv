#!/bin/bash
# =====================================================
# SYNQALL DEPLOYMENT SCRIPT FOR PRODUCTION
# Run this on the server after pulling from GitHub
# =====================================================

set -e

echo "🚀 SynQall Deployment Script"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/synqall"
NGINX_AVAILABLE="/etc/nginx/sites-available/synqall.com"
NGINX_ENABLED="/etc/nginx/sites-enabled/synqall.com"

echo -e "${YELLOW}Step 1: Installing dependencies${NC}"
cd $APP_DIR
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}Step 2: Building application${NC}"
npm run build
echo -e "${GREEN}✓ Application built${NC}"

echo -e "${YELLOW}Step 3: Checking .next/standalone/server.js${NC}"
if [ ! -f "$APP_DIR/.next/standalone/server.js" ]; then
    echo -e "${RED}Error: server.js not found in .next/standalone/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Standalone server ready${NC}"

echo -e "${YELLOW}Step 3b: Copying server files to standalone${NC}"
# Copy server files (required for Next.js standalone mode)
cp -r $APP_DIR/.next/server $APP_DIR/.next/standalone/.next/server
echo -e "${GREEN}✓ Server files copied${NC}"

echo -e "${YELLOW}Step 3c: Copying static assets to standalone${NC}"
# Copy static assets and public files to standalone directory
cp -r $APP_DIR/.next/static $APP_DIR/.next/standalone/.next/static
cp -r $APP_DIR/public $APP_DIR/.next/standalone/public
echo -e "${GREEN}✓ Static assets copied${NC}"

echo -e "${YELLOW}Step 4: Updating Nginx configuration${NC}"
sudo cp $APP_DIR/synqall.nginx.conf $NGINX_AVAILABLE
sudo ln -sf $NGINX_AVAILABLE $NGINX_ENABLED

# Remove conflicting configs
sudo rm -f /etc/nginx/sites-enabled/synqall
sudo rm -f /etc/nginx/sites-enabled/default

echo -e "${GREEN}✓ Nginx config updated${NC}"

echo -e "${YELLOW}Step 5: Testing Nginx configuration${NC}"
sudo nginx -t
echo -e "${GREEN}✓ Nginx config valid${NC}"

echo -e "${YELLOW}Step 6: Reloading Nginx${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

echo -e "${YELLOW}Step 7: Managing PM2 process${NC}"
# Check if PM2 is running
if pm2 list | grep -q "synqall"; then
    echo "Stopping existing PM2 process..."
    pm2 stop synqall
    pm2 delete synqall
fi

# Start with PM2 config
pm2 start $APP_DIR/synqall-pm2.config.js
pm2 save

echo -e "${GREEN}✓ PM2 process started${NC}"

echo -e "${YELLOW}Step 8: Verifying deployment${NC}"
sleep 3

# Check PM2 status
pm2 status

# Test local connection
echo "Testing local connection..."
if curl -s http://localhost:3000/ > /dev/null; then
    echo -e "${GREEN}✓ App responding on localhost:3000${NC}"
else
    echo -e "${RED}✗ App not responding on localhost:3000${NC}"
    exit 1
fi

# Test HTTPS connection
echo "Testing HTTPS connection..."
if curl -s -I https://synqall.com/ | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Site accessible at https://synqall.com${NC}"
else
    echo -e "${YELLOW}⚠ Check HTTPS manually${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "View logs: pm2 logs synqall"
echo "Check status: pm2 status"
echo "Visit: https://synqall.com"
echo ""
