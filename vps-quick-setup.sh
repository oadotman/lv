#!/bin/bash

# LoadVoice VPS Quick Setup Script
# Run this script on a fresh Ubuntu 20.04+ VPS to set up LoadVoice

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LoadVoice VPS Quick Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., loadvoice.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo -e "\n${YELLOW}Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

echo -e "\n${YELLOW}Step 2: Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo -e "\n${YELLOW}Step 3: Installing build essentials...${NC}"
apt-get install -y build-essential git nginx certbot python3-certbot-nginx

echo -e "\n${YELLOW}Step 4: Installing PM2...${NC}"
npm install -g pm2

echo -e "\n${YELLOW}Step 5: Creating application directory...${NC}"
mkdir -p /var/www/loadvoice
cd /var/www/loadvoice

echo -e "\n${YELLOW}Step 6: Cloning repository...${NC}"
echo "Enter your Git repository URL (or press Enter to skip):"
read -p "> " GIT_REPO
if [ ! -z "$GIT_REPO" ]; then
    git clone $GIT_REPO .
else
    echo -e "${YELLOW}Skipping git clone. You'll need to upload files manually.${NC}"
fi

echo -e "\n${YELLOW}Step 7: Creating production environment file...${NC}"
cat > .env.production << EOF
# LoadVoice Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://$DOMAIN
NEXT_PUBLIC_APP_VERSION=1.0.0

# Supabase (You need to fill these in)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# AI Services (You need to fill these in)
ASSEMBLYAI_API_KEY=your_assemblyai_key
OPENAI_API_KEY=your_openai_key

# Temporary placeholders (configure later)
TWILIO_ACCOUNT_SID=temp_not_configured
TWILIO_AUTH_TOKEN=temp_not_configured
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=re_temp_not_configured
PADDLE_API_KEY=temp_not_configured

# Security (Generate new!)
PARTNER_JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF

echo -e "${GREEN}Created .env.production - PLEASE EDIT THIS FILE!${NC}"

echo -e "\n${YELLOW}Step 8: Installing dependencies...${NC}"
npm install --production

echo -e "\n${YELLOW}Step 9: Building application...${NC}"
npm run build

echo -e "\n${YELLOW}Step 10: Setting up Nginx...${NC}"
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    client_max_body_size 500M;
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo -e "\n${YELLOW}Step 11: Starting application with PM2...${NC}"
pm2 start npm --name "loadvoice" -- start
pm2 save
pm2 startup systemd

echo -e "\n${YELLOW}Step 12: Setting up SSL certificate...${NC}"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

echo -e "\n${YELLOW}Step 13: Setting up firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "\n${YELLOW}Step 14: Creating helpful commands...${NC}"
cat > /usr/local/bin/loadvoice << 'EOF'
#!/bin/bash
case "$1" in
    logs)
        pm2 logs loadvoice
        ;;
    restart)
        pm2 restart loadvoice
        ;;
    status)
        pm2 status
        ;;
    update)
        cd /var/www/loadvoice
        git pull
        npm install
        npm run build
        pm2 restart loadvoice
        ;;
    *)
        echo "Usage: loadvoice {logs|restart|status|update}"
        ;;
esac
EOF
chmod +x /usr/local/bin/loadvoice

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ LoadVoice VPS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. Edit the environment file:"
echo "   nano /var/www/loadvoice/.env.production"
echo ""
echo "2. Add your Supabase credentials (REQUIRED)"
echo "3. Add your AI service keys (REQUIRED)"
echo ""
echo "4. Restart the application:"
echo "   loadvoice restart"
echo ""
echo "5. Check the logs:"
echo "   loadvoice logs"
echo ""
echo "6. Your site should be available at:"
echo "   https://$DOMAIN"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  loadvoice logs    - View application logs"
echo "  loadvoice restart - Restart the application"
echo "  loadvoice status  - Check application status"
echo "  loadvoice update  - Pull latest code and restart"
echo ""
echo -e "${GREEN}Once your site is live, you can apply for:${NC}"
echo "  - Twilio account at twilio.com"
echo "  - Paddle account at paddle.com"
echo "  - Resend account at resend.com"
echo ""