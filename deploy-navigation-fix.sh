#!/bin/bash

echo "🚀 Deploying Navigation Fix to Production..."

# Server details
SERVER="root@datalix.eu"
REMOTE_PATH="/var/www/loadvoice"

echo "📦 Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

echo "✅ Build successful"

echo "📤 Uploading files to server..."

# Copy the entire built application
scp -r .next/standalone/* $SERVER:$REMOTE_PATH/
scp -r .next/static $SERVER:$REMOTE_PATH/.next/
scp -r public $SERVER:$REMOTE_PATH/

# Copy updated source files for the navigation fix
scp app/page.tsx $SERVER:$REMOTE_PATH/app/
scp -r app/landing $SERVER:$REMOTE_PATH/app/
scp components/layout/AuthLayout.tsx $SERVER:$REMOTE_PATH/components/layout/
scp app/login/page.tsx $SERVER:$REMOTE_PATH/app/login/
scp app/signup/page.tsx $SERVER:$REMOTE_PATH/app/signup/
scp app/invite/\[token\]/page.tsx $SERVER:$REMOTE_PATH/app/invite/\[token\]/
scp lib/AuthContext.tsx $SERVER:$REMOTE_PATH/lib/
scp app/api/auth/signup/route.ts $SERVER:$REMOTE_PATH/app/api/auth/signup/

echo "🔄 Restarting application on server..."
ssh $SERVER "cd $REMOTE_PATH && pm2 restart loadvoice"

echo "✅ Deployment complete!"
echo ""
echo "📝 Summary of changes deployed:"
echo "1. Root path (/) now redirects authenticated users to /dashboard"
echo "2. Created separate /landing page for marketing"
echo "3. Updated AuthLayout to always show sidebar for authenticated users"
echo "4. Fixed all login/signup redirects to go to /dashboard"
echo "5. Fixed team invitation flow with proper organization linking"
echo "6. Navigation sidebar will now ALWAYS appear for logged-in users"
echo ""
echo "🌐 Your application is now live at https://loadvoice.com"
echo "👥 The navigation issue has been resolved!"