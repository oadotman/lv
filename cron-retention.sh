#!/bin/bash
# =====================================================
# RETENTION CLEANUP CRON JOB (Shell Script)
# Runs daily via PM2 to clean up old data
# =====================================================

# Load environment variables
source /var/www/synqall/.env.production

CRON_URL="https://synqall.com/api/cron/retention-cleanup"

echo "[Cron] ========================================"
echo "[Cron] Retention cleanup cron job starting"
echo "[Cron] Time: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
echo "[Cron] URL: $CRON_URL"
echo "[Cron] Has secret: $([ -n "$CRON_SECRET" ] && echo "true" || echo "false")"
echo "[Cron] ========================================"

if [ -z "$CRON_SECRET" ]; then
  echo "[Cron] ERROR: CRON_SECRET environment variable is not set!"
  exit 1
fi

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$CRON_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 60)

# Extract status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "[Cron] Response status: $HTTP_CODE"
echo "[Cron] Response data: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "[Cron] ========================================"
  echo "[Cron] Cleanup completed successfully"
  echo "[Cron] ========================================"
  exit 0
else
  echo "[Cron] Cleanup failed with status: $HTTP_CODE"
  exit 1
fi
