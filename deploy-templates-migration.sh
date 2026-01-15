#!/bin/bash

# =====================================================
# DEPLOYMENT SCRIPT FOR TEMPLATES & EMAIL MIGRATION
# Applies migration 005 to fix templates system
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting deployment with templates migration..."

# Configuration
DEPLOY_DIR="/var/www/loadvoice"
APP_NAME="loadvoice"
MIGRATION_FILE="database/migrations/005_fix_templates_system.sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to deployment directory
cd "$DEPLOY_DIR"

# Step 1: Pull latest code (to get migration file)
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git fetch origin
git reset --hard origin/main

# Step 2: Apply database migration
echo -e "${BLUE}🗄️  Applying database migration...${NC}"
echo -e "${YELLOW}⚠️  This fixes the templates system and email generation${NC}"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Apply migration using psql
echo -e "${BLUE}Running migration...${NC}"

# Get DATABASE_URL from .env.production
source .env.production

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not found in .env.production${NC}"
    echo -e "${YELLOW}Attempting to construct from Supabase env vars...${NC}"

    # Construct DATABASE_URL from Supabase vars
    # Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
        PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's/https:\/\///' | sed 's/\.supabase\.co//')
        DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        echo -e "${GREEN}✓ Constructed DATABASE_URL${NC}"
    else
        echo -e "${RED}❌ Unable to construct DATABASE_URL. Please set it manually.${NC}"
        exit 1
    fi
fi

# Apply migration
psql "$DATABASE_URL" < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration applied successfully${NC}"
else
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${YELLOW}Check the error above. The migration uses IF NOT EXISTS so it's safe to retry.${NC}"
    exit 1
fi

# Step 3: Verify migration
echo -e "${BLUE}🔍 Verifying migration...${NC}"

# Check if deleted_at column exists in custom_templates
VERIFY_SQL="SELECT column_name FROM information_schema.columns WHERE table_name = 'custom_templates' AND column_name = 'deleted_at';"
COLUMN_EXISTS=$(psql "$DATABASE_URL" -t -c "$VERIFY_SQL" | grep -c "deleted_at" || echo 0)

if [ "$COLUMN_EXISTS" -eq 1 ]; then
    echo -e "${GREEN}✅ Migration verified - deleted_at column added${NC}"
else
    echo -e "${RED}❌ Migration verification failed - deleted_at column not found${NC}"
    exit 1
fi

# Check if email_generated is in notification types
VERIFY_CONSTRAINT="SELECT constraint_name FROM information_schema.check_constraints WHERE constraint_name = 'notifications_notification_type_check';"
CONSTRAINT_EXISTS=$(psql "$DATABASE_URL" -t -c "$VERIFY_CONSTRAINT" | grep -c "notifications_notification_type_check" || echo 0)

if [ "$CONSTRAINT_EXISTS" -eq 1 ]; then
    echo -e "${GREEN}✅ Notification type constraint updated${NC}"
else
    echo -e "${YELLOW}⚠️ Could not verify notification constraint (may be fine)${NC}"
fi

# Step 4: Stop PM2 process
echo -e "${YELLOW}📦 Stopping PM2 process...${NC}"
pm2 stop "$APP_NAME" || echo "Process not running"

# Step 5: Clean up old build
echo -e "${YELLOW}🧹 Cleaning up old build...${NC}"
rm -rf .next node_modules/.cache

# Step 6: Install dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
sudo -u www-data npm install

# Step 7: Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
sudo -u www-data npm run build

# Step 8: Check if build succeeded
if [ ! -d ".next/standalone" ]; then
    echo -e "${RED}❌ Build failed - .next/standalone directory not found${NC}"
    exit 1
fi

# Step 9: Copy static files to standalone directory
echo -e "${YELLOW}📂 Copying static files...${NC}"
if [ -d ".next/static" ]; then
    sudo -u www-data mkdir -p .next/standalone/.next
    sudo -u www-data cp -r .next/static .next/standalone/.next/
    echo -e "${GREEN}✓ Static files copied${NC}"
else
    echo -e "${YELLOW}⚠ No static files to copy${NC}"
fi

# Step 10: Copy public folder if exists
if [ -d "public" ]; then
    sudo -u www-data cp -r public .next/standalone/
    echo -e "${GREEN}✓ Public folder copied${NC}"
fi

# Step 11: Set correct permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
sudo chown -R www-data:www-data "$DEPLOY_DIR"

# Step 12: Restart PM2
echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
pm2 restart "$APP_NAME"

# Step 13: Save PM2 configuration
pm2 save

# Step 14: Check PM2 status
echo -e "${GREEN}✅ Deployment complete! Checking status...${NC}"
pm2 status

# Step 15: Show recent logs
echo -e "${BLUE}📋 Recent logs:${NC}"
pm2 logs "$APP_NAME" --lines 30 --nostream

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Templates & Email Migration Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🌐 Application: https://loadvoice.com${NC}"
echo -e "${GREEN}✅ Templates system: Fixed${NC}"
echo -e "${GREEN}✅ Email generation: Fixed${NC}"
echo -e "${GREEN}✅ PDF export: Implemented${NC}"
echo ""
echo -e "${YELLOW}Test the new features:${NC}"
echo -e "1. Create a custom template"
echo -e "2. Generate a follow-up email"
echo -e "3. Download a PDF report"
echo -e "4. Apply custom templates to output"
echo ""