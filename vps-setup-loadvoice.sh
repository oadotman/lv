#!/bin/bash

# =====================================================
# LOADVOICE SETUP SCRIPT FOR YOUR VPS
# Run this AFTER uploading files to /var/www/loadvoice
# =====================================================

set -e

echo "================================================"
echo "🚀 LOADVOICE SETUP ON VPS (WITH SYNQALL)"
echo "================================================"
echo ""

# Check current memory
echo "📊 Current Memory Status:"
free -h
echo ""

# Navigate to LoadVoice directory
cd /var/www/loadvoice

# Step 1: Install dependencies
echo "1️⃣ Installing Node dependencies..."
echo "-----------------------------------"
npm ci --production=false
echo "✅ Dependencies installed"
echo ""

# Step 2: Copy production environment
echo "2️⃣ Setting up environment..."
echo "-----------------------------"
if [ -f ".env.production" ]; then
    cp .env.production .env.local
    echo "✅ Environment configured"
else
    echo "❌ ERROR: .env.production not found!"
    echo "   Please upload .env.production file"
    exit 1
fi
echo ""

# Step 3: Build the application
echo "3️⃣ Building LoadVoice..."
echo "------------------------"
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo "✅ Build completed"
echo ""

# Step 4: Create PM2 ecosystem file for LoadVoice
echo "4️⃣ Creating PM2 configuration..."
echo "---------------------------------"
cat > /var/www/loadvoice/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'loadvoice',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/loadvoice',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001  // Different port from Synqall (3000)
      },
      max_memory_restart: '2G',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false
    }
  ]
};
EOF
echo "✅ PM2 config created"
echo ""

# Step 5: Create logs directory
echo "5️⃣ Creating logs directory..."
echo "-----------------------------"
mkdir -p /var/www/loadvoice/logs
echo "✅ Logs directory created"
echo ""

# Step 6: Configure Nginx for LoadVoice
echo "6️⃣ Configuring Nginx..."
echo "-----------------------"
cat > /etc/nginx/sites-available/loadvoice << 'EOF'
# LoadVoice Configuration
server {
    listen 80;
    server_name loadvoice.com www.loadvoice.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name loadvoice.com www.loadvoice.com;

    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/loadvoice.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/loadvoice.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # File upload limit for audio files
    client_max_body_size 500M;
    client_body_buffer_size 50M;

    # Timeouts for audio processing
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;

    # Proxy to LoadVoice app on port 3001
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static {
        alias /var/www/loadvoice/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /public {
        alias /var/www/loadvoice/public;
        expires 30d;
        add_header Cache-Control "public";
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/loadvoice /etc/nginx/sites-enabled/
echo "✅ Nginx configured"
echo ""

# Step 7: Test Nginx configuration
echo "7️⃣ Testing Nginx configuration..."
echo "----------------------------------"
nginx -t
echo "✅ Nginx config valid"
echo ""

# Step 8: Reload Nginx
echo "8️⃣ Reloading Nginx..."
echo "---------------------"
systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

# Step 9: Start LoadVoice with PM2
echo "9️⃣ Starting LoadVoice with PM2..."
echo "----------------------------------"
cd /var/www/loadvoice
pm2 delete loadvoice 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo "✅ LoadVoice started"
echo ""

# Step 10: Setup SSL with Certbot
echo "🔐 Setting up SSL certificate..."
echo "--------------------------------"
echo "Run this command to get SSL certificate:"
echo "certbot --nginx -d loadvoice.com -d www.loadvoice.com"
echo ""

# Step 11: Show status
echo "📊 Current Status:"
echo "------------------"
pm2 list
echo ""

echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Both apps are now running:"
echo "-----------------------------"
echo "• Synqall:   http://localhost:3000 → synqall.com"
echo "• LoadVoice: http://localhost:3001 → loadvoice.com"
echo ""
echo "📝 Useful commands:"
echo "-------------------"
echo "• View LoadVoice logs:  pm2 logs loadvoice"
echo "• View Synqall logs:    pm2 logs synqall"
echo "• View all processes:   pm2 status"
echo "• Restart LoadVoice:    pm2 restart loadvoice"
echo "• Monitor resources:    pm2 monit"
echo ""
echo "⚠️  Next steps:"
echo "---------------"
echo "1. Update DNS records for loadvoice.com to point to this VPS"
echo "2. Run certbot for SSL certificate"
echo "3. Test the application at https://loadvoice.com"
echo "4. Update Supabase allowed URLs to include loadvoice.com"
echo "5. Update Paddle webhook URLs"
echo ""
echo "✨ LoadVoice is ready to go!"