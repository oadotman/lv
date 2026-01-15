#!/usr/bin/env node

/**
 * Configure retention policy cron job for LoadVoice
 * This script generates all necessary configurations
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a secure cron secret
const CRON_SECRET = crypto.randomBytes(32).toString('base64');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createEnvFile() {
  log('\n📋 Creating Environment Variables...', 'blue');

  const envContent = `
# ====================================
# DATA RETENTION SETTINGS
# ====================================

# Audio files deleted after 7 days (saves storage costs)
CALL_RETENTION_DAYS=7

# Transcripts deleted after 30 days
TRANSCRIPT_RETENTION_DAYS=30

# Audit logs anonymized after 90 days
AUDIT_LOG_RETENTION_DAYS=90

# CRM data kept forever (set to 0)
EXTRACTED_FIELDS_RETENTION_DAYS=0

# Call metadata kept forever (set to 0)
METADATA_RETENTION_DAYS=0

# ====================================
# CRON JOB SETTINGS
# ====================================

# Secret key for authenticating cron requests
CRON_SECRET=${CRON_SECRET}

# Enable automated retention cleanup
RETENTION_CLEANUP_ENABLED=true

# Send email notifications before deletion
RETENTION_EMAIL_NOTIFICATIONS=true
`.trim();

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');

  if (fs.existsSync(envPath)) {
    // Append to existing file
    const existingContent = fs.readFileSync(envPath, 'utf8');

    if (existingContent.includes('CRON_SECRET')) {
      log('⚠️  Retention settings already exist in .env.local', 'yellow');
      log('   Skipping environment variable setup', 'yellow');
    } else {
      fs.appendFileSync(envPath, '\n\n' + envContent);
      log('✅ Added retention settings to .env.local', 'green');
    }
  } else {
    // Create new file
    fs.writeFileSync(envPath, envContent);
    log('✅ Created .env.local with retention settings', 'green');
  }

  return CRON_SECRET;
}

function createVercelConfig() {
  log('\n1️⃣  Vercel Cron Configuration', 'cyan');

  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  const cronConfig = {
    path: '/api/cron/retention-cleanup',
    schedule: '0 2 * * *' // Daily at 2 AM UTC
  };

  if (fs.existsSync(vercelJsonPath)) {
    const existing = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));

    if (!existing.crons) {
      existing.crons = [];
    }

    // Check if cron already exists
    const exists = existing.crons.some(c => c.path === cronConfig.path);

    if (!exists) {
      existing.crons.push(cronConfig);
      fs.writeFileSync(vercelJsonPath, JSON.stringify(existing, null, 2));
      log('✅ Added cron to vercel.json', 'green');
    } else {
      log('⚠️  Cron already configured in vercel.json', 'yellow');
    }
  } else {
    // Create new vercel.json
    const newConfig = {
      crons: [cronConfig]
    };
    fs.writeFileSync(vercelJsonPath, JSON.stringify(newConfig, null, 2));
    log('✅ Created vercel.json with cron configuration', 'green');
  }

  log('\n   Vercel will automatically run the retention cleanup daily', 'yellow');
  log('   No additional setup required for Vercel deployment!', 'yellow');
}

function createExternalCronInstructions() {
  log('\n2️⃣  External Cron Service Setup (cron-job.org, EasyCron)', 'cyan');

  log('\n   Configuration:', 'yellow');
  log(`   • URL: https://your-domain.com/api/cron/retention-cleanup`);
  log(`   • Method: POST`);
  log(`   • Headers:`);
  log(`     Authorization: Bearer ${CRON_SECRET}`);
  log(`   • Schedule: 0 2 * * * (Daily at 2:00 AM UTC)`);
  log(`   • Timeout: 300 seconds (5 minutes)`);

  log('\n   Recommended Services:', 'yellow');
  log('   • cron-job.org (Free, reliable)');
  log('   • EasyCron (Free tier available)');
  log('   • Uptime Robot (Can also monitor)');
}

function createPM2Script() {
  log('\n3️⃣  PM2 Cron Script (for VPS deployment)', 'cyan');

  const script = `#!/usr/bin/env node

/**
 * PM2 Cron Script for LoadVoice Retention Cleanup
 * Run with: pm2 start cron-retention.js --cron "0 2 * * *"
 */

const https = require('https');

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
const CRON_SECRET = process.env.CRON_SECRET || '${CRON_SECRET}';

function runRetentionCleanup() {
  console.log('[Cron] Starting retention cleanup at', new Date().toISOString());

  const url = new URL('/api/cron/retention-cleanup', DOMAIN);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${CRON_SECRET}\`
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
`;

  const scriptPath = path.join(process.cwd(), 'scripts', 'cron-retention.js');
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, '755');

  log('✅ Created scripts/cron-retention.js', 'green');
  log('\n   To use with PM2:', 'yellow');
  log('   pm2 start scripts/cron-retention.js --name "retention-cleanup" --cron "0 2 * * *"');
  log('   pm2 save');
  log('   pm2 startup');
}

function createGitHubAction() {
  log('\n4️⃣  GitHub Actions Configuration', 'cyan');

  const workflow = `name: Retention Cleanup

on:
  schedule:
    # Runs daily at 2:00 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest

    steps:
      - name: Run Retention Cleanup
        run: |
          curl -X POST https://your-domain.com/api/cron/retention-cleanup \\
            -H "Authorization: Bearer \${{ secrets.CRON_SECRET }}" \\
            -H "Content-Type: application/json" \\
            --fail \\
            --max-time 300

      - name: Notify on Failure
        if: failure()
        run: |
          echo "Retention cleanup failed. Check logs for details."
          # Add notification logic here (Slack, Discord, email, etc.)
`;

  const workflowDir = path.join(process.cwd(), '.github', 'workflows');

  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }

  const workflowPath = path.join(workflowDir, 'retention-cleanup.yml');
  fs.writeFileSync(workflowPath, workflow);

  log('✅ Created .github/workflows/retention-cleanup.yml', 'green');
  log('\n   ⚠️  Add CRON_SECRET to GitHub repository secrets:', 'yellow');
  log(`   Value: ${CRON_SECRET}`);
}

function createTestScript() {
  log('\n📝 Creating Test Script...', 'blue');

  const testScript = `#!/usr/bin/env node

/**
 * Test script for retention cleanup
 * Usage: node scripts/test-retention.js
 */

const http = require('http');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '${CRON_SECRET}';

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
    'Authorization': \`Bearer \${CRON_SECRET}\`,
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
`;

  const testPath = path.join(process.cwd(), 'scripts', 'test-retention.js');
  fs.writeFileSync(testPath, testScript);
  fs.chmodSync(testPath, '755');

  log('✅ Created scripts/test-retention.js', 'green');
}

function main() {
  log('='.repeat(60), 'blue');
  log('🔧 LoadVoice Retention Policy Cron Configuration', 'blue');
  log('='.repeat(60), 'blue');

  // Create environment variables
  const cronSecret = createEnvFile();

  // Create Vercel configuration
  createVercelConfig();

  // External cron instructions
  createExternalCronInstructions();

  // Create PM2 script
  createPM2Script();

  // Create GitHub Action
  createGitHubAction();

  // Create test script
  createTestScript();

  log('\n' + '='.repeat(60), 'green');
  log('✅ Retention cron configuration complete!', 'green');
  log('='.repeat(60), 'green');

  log('\n📋 Summary:', 'blue');
  log('  ✅ Environment variables configured', 'green');
  log('  ✅ Vercel cron configuration created', 'green');
  log('  ✅ PM2 script generated', 'green');
  log('  ✅ GitHub Action workflow created', 'green');
  log('  ✅ Test script ready', 'green');

  log('\n🚀 Next Steps:', 'blue');
  log('  1. Choose your deployment method:', 'yellow');
  log('     • Vercel: Already configured, will work on deploy');
  log('     • VPS: Use PM2 script');
  log('     • External: Use cron-job.org or similar');
  log('     • GitHub: Add CRON_SECRET to repository secrets');

  log('\n  2. Test locally:', 'yellow');
  log('     npm run dev');
  log('     node scripts/test-retention.js');

  log('\n  3. Monitor first runs in production', 'yellow');

  log('\n💡 Tip: The retention policy will:', 'cyan');
  log('  • Delete audio files after 7 days (saves ~70% storage)');
  log('  • Delete transcripts after 30 days');
  log('  • Keep CRM data and metadata forever');
  log('  • Send email notifications 24 hours before deletion');
}

// Run configuration
main();