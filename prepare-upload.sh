#!/bin/bash

# Script to prepare LoadVoice for upload to VPS
echo "======================================="
echo "PREPARING LOADVOICE FOR VPS UPLOAD"
echo "======================================="

# Files/folders to exclude from upload
cat > .uploadignore << 'EOF'
node_modules/
.next/
.git/
.env.local
*.log
.DS_Store
screenshots/
scripts/diagnose-memory-usage.sh
scripts/find-missing-memory.sh
scripts/vps-analysis.sh
build-*.log
test-*.js
*.md
EOF

echo ""
echo "📦 Files to upload to VPS:"
echo "--------------------------"
echo "✓ All source code files"
echo "✓ package.json & package-lock.json"
echo "✓ .env.production (IMPORTANT!)"
echo "✓ ecosystem.config.js"
echo "✓ next.config.js"
echo "✓ tsconfig.json"
echo "✓ public/ folder"
echo "✓ app/ folder"
echo "✓ components/ folder"
echo "✓ lib/ folder"
echo "✓ content/ folder"
echo "✓ hooks/ folder"
echo "✓ supabase/ folder"
echo ""
echo "❌ NOT uploading:"
echo "-----------------"
echo "× node_modules/ (will install on server)"
echo "× .next/ (will build on server)"
echo "× .git/ (not needed)"
echo "× screenshots/ (not needed)"
echo "× test files"
echo ""

echo "======================================="
echo "UPLOAD COMMANDS:"
echo "======================================="
echo ""
echo "Option 1: Using rsync (RECOMMENDED):"
echo "------------------------------------"
echo "rsync -avz --exclude-from='.uploadignore' \\"
echo "  ./ root@YOUR_VPS_IP:/var/www/loadvoice/"
echo ""
echo "Option 2: Using tar + scp:"
echo "--------------------------"
echo "# Create archive (run locally):"
echo "tar czf loadvoice.tar.gz \\"
echo "  --exclude='node_modules' \\"
echo "  --exclude='.next' \\"
echo "  --exclude='.git' \\"
echo "  --exclude='screenshots' \\"
echo "  --exclude='*.log' \\"
echo "  ./"
echo ""
echo "# Upload to VPS:"
echo "scp loadvoice.tar.gz root@YOUR_VPS_IP:/var/www/"
echo ""
echo "# Extract on VPS:"
echo "cd /var/www && tar xzf loadvoice.tar.gz -C loadvoice/"
echo ""
echo "Option 3: Using git (if you have a repo):"
echo "-----------------------------------------"
echo "# On VPS:"
echo "cd /var/www/loadvoice"
echo "git clone YOUR_REPO_URL ."
echo ""

echo "======================================="
echo "IMPORTANT REMINDERS:"
echo "======================================="
echo "1. Make sure .env.production is uploaded!"
echo "2. Update YOUR_VPS_IP with actual IP"
echo "3. Files are about 50MB without node_modules"
echo "4. Upload will take 2-5 minutes on average connection"
echo ""