// =====================================================
// RETENTION CLEANUP CRON JOB
// Runs daily via PM2 to clean up old data
// =====================================================

// Load environment variables from .env.production
require('dotenv').config({ path: '.env.production' });

const https = require('https');

const CRON_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://synqall.com') + '/api/cron/retention-cleanup';
const CRON_SECRET = process.env.CRON_SECRET;

console.log('[Cron] ========================================');
console.log('[Cron] Retention cleanup cron job starting');
console.log('[Cron] Time:', new Date().toISOString());
console.log('[Cron] URL:', CRON_URL);
console.log('[Cron] Has secret:', !!CRON_SECRET);
console.log('[Cron] ========================================');

if (!CRON_SECRET) {
  console.error('[Cron] ERROR: CRON_SECRET environment variable is not set!');
  process.exit(1);
}

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json',
    'User-Agent': 'PM2-Cron/1.0'
  },
  timeout: 30000 // 30 second timeout
};

const req = https.request(CRON_URL, options, (res) => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('[Cron] Response status:', res.statusCode);
    console.log('[Cron] Response data:', data);

    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log('[Cron] ========================================');
        console.log('[Cron] Cleanup completed successfully');
        console.log('[Cron] Deleted:', result.deleted);
        console.log('[Cron] Errors:', result.errors?.length || 0);
        console.log('[Cron] ========================================');
        process.exit(0);
      } catch (e) {
        console.error('[Cron] Failed to parse response:', e);
        process.exit(1);
      }
    } else {
      console.error('[Cron] Cleanup failed with status:', res.statusCode);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('[Cron] Request error:', error);
  process.exit(1);
});

req.end();
