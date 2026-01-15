#!/bin/bash

# LoadVoice VPS Deployment Script - Direct SSH Commands
# Similar to your synqall deployment workflow

echo "🚀 Starting LoadVoice deployment to VPS..."

# SSH into the server and execute deployment commands
ssh root@datalix.eu << 'EOF'

# Navigate to LoadVoice directory
cd /var/www/loadvoice

echo "====================================================="
echo "📦 Step 1: Pulling latest changes from GitHub..."
echo "====================================================="
git pull origin main

# Check if Redis is running (required for queue processing)
echo "====================================================="
echo "🔍 Step 2: Checking Redis status..."
echo "====================================================="
if ! systemctl is-active --quiet redis-server; then
    echo "⚠️ Redis is not running. Starting Redis..."
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
else
    echo "✅ Redis is running"
fi

# Clean build directories
echo "====================================================="
echo "🧹 Step 3: Cleaning build directories..."
echo "====================================================="
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "====================================================="
echo "📦 Step 4: Installing dependencies..."
echo "====================================================="
npm ci --production=false

# Build with increased memory allocation
echo "====================================================="
echo "🔨 Step 5: Building LoadVoice application..."
echo "====================================================="
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Exiting..."
    exit 1
fi

# Copy standalone files if using output: 'standalone' in next.config.js
if [ -d ".next/standalone" ]; then
    echo "====================================================="
    echo "📋 Step 6: Copying static files to standalone..."
    echo "====================================================="
    cp -r public .next/standalone/
    cp -r .next/static .next/standalone/.next/
fi

# Restart PM2 processes
echo "====================================================="
echo "♻️ Step 7: Restarting PM2 processes..."
echo "====================================================="

# Check if LoadVoice PM2 process exists
if pm2 list | grep -q "loadvoice"; then
    pm2 restart loadvoice
else
    pm2 start ecosystem.config.js --only loadvoice
fi

# If using multiple workers
if pm2 list | grep -q "loadvoice-worker"; then
    pm2 restart loadvoice-worker
fi

# Save PM2 process list and configure startup
pm2 save
pm2 startup systemd -u root --hp /root

# Check deployment status
echo "====================================================="
echo "✅ Step 8: Checking deployment status..."
echo "====================================================="
pm2 status

# Verify the app is running
sleep 5
curl -I http://localhost:3000 || echo "⚠️ Application may still be starting..."

echo "====================================================="
echo "✅ LoadVoice deployment complete!"
echo "====================================================="
echo "🌐 Application should be available at: https://loadvoice.datalix.eu"

# Show logs (last 50 lines)
echo ""
echo "📋 Recent application logs:"
pm2 logs loadvoice --lines 50 --nostream

EOF

echo ""
echo "🎉 Deployment script finished!"
echo ""
echo "Next steps:"
echo "1. Check that the application is running: https://loadvoice.datalix.eu"
echo "2. Verify Twilio webhooks are accessible"
echo "3. Monitor logs with: ssh root@datalix.eu 'pm2 logs loadvoice'"