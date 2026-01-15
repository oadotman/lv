#!/bin/bash
# =====================================================
# LOADVOICE DEPLOYMENT SCRIPT FOR DATALIX DEBIAN
# =====================================================

set -e

echo "🚀 LoadVoice Deployment Script for Datalix Debian"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_USER="loadvoice"
APP_DIR="/var/www/loadvoice"
DOMAIN="loadvoice.com"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Installing Node.js 20.x${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs build-essential git

echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"

echo -e "${YELLOW}Step 2: Installing Nginx${NC}"
apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✓ Nginx installed${NC}"

echo -e "${YELLOW}Step 3: Creating application user${NC}"
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -s /bin/bash -d "$APP_DIR" "$APP_USER"
    usermod -aG www-data "$APP_USER"
    echo -e "${GREEN}✓ User created: $APP_USER${NC}"
else
    echo -e "${GREEN}✓ User already exists: $APP_USER${NC}"
fi

echo -e "${YELLOW}Step 4: Setting up application directory${NC}"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
echo -e "${GREEN}✓ Directory created: $APP_DIR${NC}"

echo -e "${YELLOW}Step 5: Installing Certbot for SSL${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓ Certbot installed${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Server preparation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Upload your application code to $APP_DIR"
echo "2. Copy .env.example to .env.production and configure"
echo "3. Run: cd $APP_DIR && npm ci --only=production"
echo "4. Run: npm run build"
echo "5. Copy calliq.service to /etc/systemd/system/"
echo "6. Copy nginx.conf to /etc/nginx/sites-available/calliq"
echo "7. Run: systemctl enable calliq && systemctl start calliq"
echo "8. Run: certbot --nginx -d $DOMAIN"
echo ""
echo -e "${YELLOW}For full instructions, see DEPLOYMENT.md${NC}"
