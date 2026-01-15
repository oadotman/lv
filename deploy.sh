#!/bin/bash

# =====================================================
# AUTOMATED DEPLOYMENT SCRIPT FOR LOADVOICE
# Pulls latest code, installs dependencies, builds, and restarts
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Configuration
DEPLOY_DIR="/var/www/loadvoice"
APP_NAME="loadvoice"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to deployment directory
cd "$DEPLOY_DIR"

# Step 1: Stop PM2 process
echo -e "${YELLOW}📦 Stopping PM2 process...${NC}"
pm2 stop "$APP_NAME" || echo "Process not running"

# Step 2: Pull latest code from GitHub
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git fetch origin
git reset --hard origin/main

# Step 3: Clean up old build
echo -e "${YELLOW}🧹 Cleaning up old build...${NC}"
rm -rf .next node_modules/.cache

# Step 4: Install dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
sudo -u www-data npm install

# Step 5: Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
sudo -u www-data npm run build

# Step 6: Check if build succeeded
if [ ! -d ".next/standalone" ]; then
    echo -e "${RED}❌ Build failed - .next/standalone directory not found${NC}"
    exit 1
fi

# Step 7: Copy static files to standalone directory
echo -e "${YELLOW}📂 Copying static files...${NC}"
if [ -d ".next/static" ]; then
    sudo -u www-data mkdir -p .next/standalone/.next
    sudo -u www-data cp -r .next/static .next/standalone/.next/
    echo -e "${GREEN}✓ Static files copied${NC}"
else
    echo -e "${YELLOW}⚠ No static files to copy${NC}"
fi

# Step 8: Copy public folder if exists
if [ -d "public" ]; then
    sudo -u www-data cp -r public .next/standalone/
    echo -e "${GREEN}✓ Public folder copied${NC}"
fi

# Step 9: Set correct permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
sudo chown -R www-data:www-data "$DEPLOY_DIR"

# Step 10: Restart PM2
echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
pm2 restart "$APP_NAME"

# Step 11: Save PM2 configuration
pm2 save

# Step 12: Check PM2 status
echo -e "${GREEN}✅ Deployment complete! Checking status...${NC}"
pm2 status
pm2 logs "$APP_NAME" --lines 20 --nostream

echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${GREEN}🌐 Application should be running at https://loadvoice.com${NC}"
