#!/bin/bash

# LoadVoice VPS Deployment Script
# This script automates the deployment of LoadVoice to a VPS
# Run this on your LOCAL machine to deploy to your VPS

set -e

# ========================================
# CONFIGURATION - UPDATE THESE VALUES
# ========================================
VPS_USER="root"                           # Your VPS username
VPS_HOST="your-vps-ip-or-domain"         # Your VPS IP or domain
VPS_PATH="/var/www/loadvoice"            # Path on VPS where app will be deployed
LOCAL_PATH="."                            # Local path to your LoadVoice project
DOMAIN="yourdomain.com"                  # Your domain name

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 LoadVoice VPS Deployment Script${NC}"
echo "========================================"

# Check if configuration is updated
if [ "$VPS_HOST" = "your-vps-ip-or-domain" ]; then
    echo -e "${RED}❌ Error: Please update the configuration variables in this script${NC}"
    echo "Edit this file and update:"
    echo "  - VPS_HOST: Your VPS IP address or domain"
    echo "  - VPS_USER: Your VPS username (usually 'root' or your username)"
    echo "  - DOMAIN: Your actual domain name"
    exit 1
fi

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Build the application locally
echo -e "\n${YELLOW}Step 1: Building application locally...${NC}"
npm run build
check_status "Local build completed"

# Step 2: Create deployment bundle
echo -e "\n${YELLOW}Step 2: Creating deployment bundle...${NC}"
tar czf loadvoice-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    --exclude=.env.local \
    --exclude=*.log \
    --exclude=loadvoice-deploy.tar.gz \
    .

check_status "Deployment bundle created"

# Step 3: Copy bundle to VPS
echo -e "\n${YELLOW}Step 3: Copying files to VPS...${NC}"
scp loadvoice-deploy.tar.gz ${VPS_USER}@${VPS_HOST}:/tmp/
check_status "Files copied to VPS"

# Step 4: Deploy on VPS
echo -e "\n${YELLOW}Step 4: Deploying on VPS...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
    set -e

    # Create app directory if it doesn't exist
    mkdir -p /var/www/loadvoice
    cd /var/www/loadvoice

    # Backup existing deployment
    if [ -d ".next" ]; then
        echo "Backing up existing deployment..."
        tar czf backup-$(date +%Y%m%d-%H%M%S).tar.gz .next package.json
    fi

    # Extract new deployment
    tar xzf /tmp/loadvoice-deploy.tar.gz
    rm /tmp/loadvoice-deploy.tar.gz

    # Install dependencies
    echo "Installing dependencies..."
    npm install --production

    # Build the application
    echo "Building application..."
    npm run build

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        npm install -g pm2
    fi

    # Start or restart the application
    if pm2 list | grep -q "loadvoice"; then
        echo "Restarting LoadVoice..."
        pm2 restart loadvoice
    else
        echo "Starting LoadVoice..."
        pm2 start npm --name "loadvoice" -- start
        pm2 save
        pm2 startup systemd -u $USER --hp $HOME
    fi

    echo "✅ Deployment complete!"
ENDSSH

check_status "VPS deployment completed"

# Step 5: Clean up local bundle
echo -e "\n${YELLOW}Step 5: Cleaning up...${NC}"
rm loadvoice-deploy.tar.gz
check_status "Cleanup completed"

# Step 6: Verify deployment
echo -e "\n${YELLOW}Step 6: Verifying deployment...${NC}"
echo "Checking application status..."
ssh ${VPS_USER}@${VPS_HOST} "pm2 status"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your application is now running on your VPS!"
echo ""
echo "Next steps:"
echo "1. Configure Nginx if not already done"
echo "2. Set up SSL certificate with Let's Encrypt"
echo "3. Update your .env.production file on the VPS"
echo "4. Visit https://${DOMAIN} to verify"
echo ""
echo "Useful commands:"
echo "  SSH to VPS: ssh ${VPS_USER}@${VPS_HOST}"
echo "  View logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs loadvoice'"
echo "  Restart app: ssh ${VPS_USER}@${VPS_HOST} 'pm2 restart loadvoice'"