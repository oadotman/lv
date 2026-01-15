#!/usr/bin/env node

/**
 * PM2 Cron Script for LoadVoice Retention Cleanup
 * Run with: pm2 start cron-retention.js --cron "0 2 * * *"
 */

const https = require('https');

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
const CRON_SECRET = process.env.CRON_SECRET || '/n9XWxGY/VuopksExFbgQlg2tlDXTMtSDtMpMq9ymq0=';

function runRetentionCleanup() {
  console.log('[Cron] Starting retention cleanup at', new Date().toISOString());

  const url = new URL('/api/cron/retention-cleanup', DOMAIN);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`
    },
    timeout: 300000 // 5 minutes
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('[Cron] Status:', res.statusCode);

      if (res.statusCode === 200) {
        try {
          const result = JSON.parse(data);
          console.log('[Cron] Success! Deleted:', result.deleted);
        } catch (e) {
          console.log('[Cron] Response:', data);
        }
      } else {
        console.error('[Cron] Error response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('[Cron] Request error:', error);
  });

  req.on('timeout', () => {
    console.error('[Cron] Request timeout');
    req.destroy();
  });

  req.end();
}

// Run the cleanup
runRetentionCleanup();
