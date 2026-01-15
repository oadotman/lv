#!/bin/bash

# Deployment script to remove Inngest and update the application
# Run this on your VPS: bash deploy-remove-inngest.sh

set -e  # Exit on error

echo "=================================================="
echo "DEPLOYMENT: Removing Inngest and Updating App"
echo "=================================================="

cd /var/www/loadvoice

echo ""
echo "Step 1: Stopping PM2 processes..."
pm2 stop all

echo ""
echo "Step 2: Deleting Inngest PM2 process..."
pm2 delete inngest || echo "Inngest process not found (already deleted)"

echo ""
echo "Step 3: Pulling latest code from Git..."
git pull origin main

echo ""
echo "Step 4: Installing dependencies (this will remove Inngest)..."
npm install

echo ""
echo "Step 5: Building the application..."
npm run build

echo ""
echo "Step 6: Copying static files to standalone..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/

echo ""
echo "Step 7: Starting loadvoice application..."
pm2 start loadvoice

echo ""
echo "Step 8: Saving PM2 configuration..."
pm2 save

echo ""
echo "Step 9: Checking PM2 status..."
pm2 status

echo ""
echo "=================================================="
echo "DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "Summary:"
echo "- Inngest has been removed from PM2"
echo "- Latest code deployed"
echo "- Application rebuilt without Inngest"
echo "- Only 'loadvoice' process should be running now"
echo ""
echo "Check logs with: pm2 logs loadvoice --lines 50"
