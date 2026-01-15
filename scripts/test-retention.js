#!/usr/bin/env node

/**
 * Test script for retention cleanup
 * Usage: node scripts/test-retention.js
 */

const http = require('http');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '/n9XWxGY/VuopksExFbgQlg2tlDXTMtSDtMpMq9ymq0=';

console.log('🧪 Testing Retention Cleanup');
console.log('Domain:', DOMAIN);
console.log('');

const url = new URL('/api/cron/retention-cleanup', DOMAIN);
const isHttps = url.protocol === 'https:';
const module = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 3000),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json'
  }
};

console.log('📡 Sending request to:', url.href);
console.log('');

const req = module.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📊 Response Status:', res.statusCode);

    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('✅ Retention cleanup successful!');
        console.log('');
        console.log('Results:');
        console.log('  • Audio files deleted:', response.deleted?.audioFiles || 0);
        console.log('  • Transcripts deleted:', response.deleted?.transcripts || 0);
        console.log('  • Audit logs anonymized:', response.deleted?.auditLogs || 0);
        console.log('  • Deletion requests:', response.deletionRequestsProcessed || 0);

        if (response.errors && response.errors.length > 0) {
          console.log('');
          console.log('⚠️  Warnings:', response.errors.length);
          response.errors.forEach(err => {
            console.log('  •', err);
          });
        }
      } else {
        console.log('❌ Cleanup failed');
        console.log('Response:', response);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('');
  console.log('Make sure the development server is running:');
  console.log('  npm run dev');
});

req.end();
