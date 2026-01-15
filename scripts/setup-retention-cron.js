#!/usr/bin/env node

/**
 * Setup script for retention policy cron job
 * This script helps configure and test the retention cleanup cron job
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Generate a secure cron secret if not provided
  cronSecret: process.env.CRON_SECRET || crypto.randomBytes(32).toString('base64'),
  domain: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  endpoint: '/api/cron/retention-cleanup',
  schedule: '0 2 * * *', // Daily at 2:00 AM UTC
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test the cron endpoint
 */
async function testCronEndpoint() {
  log('\n📊 Testing Retention Cleanup Cron Endpoint...', 'blue');

  const url = new URL(CONFIG.endpoint, CONFIG.domain);
  const isHttps = url.protocol === 'https:';
  const http = isHttps ? require('https') : require('http');

  return new Promise((resolve, reject) => {
    // First test GET to verify endpoint exists
    http.get(url.toString(), (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✅ Cron endpoint is accessible', 'green');
          const response = JSON.parse(data);

          log('\n📋 Retention Policies:', 'yellow');
          response.policies.forEach(policy => {
            log(`  - ${policy.resource}: ${policy.description}`);
          });

          resolve(true);
        } else {
          log(`❌ Endpoint test failed with status: ${res.statusCode}`, 'red');
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      log(`❌ Connection error: ${err.message}`, 'red');
      reject(err);
    });
  });
}

/**
 * Generate environment variables for .env.local
 */
function generateEnvVars() {
  log('\n🔧 Environment Variables for .env.local:', 'blue');

  const envVars = `
# Data Retention Settings (Days)
CALL_RETENTION_DAYS=7              # Audio files deleted after 7 days
TRANSCRIPT_RETENTION_DAYS=30       # Transcripts deleted after 30 days
AUDIT_LOG_RETENTION_DAYS=90        # Audit logs anonymized after 90 days
EXTRACTED_FIELDS_RETENTION_DAYS=0  # 0 = keep forever (CRM data)
METADATA_RETENTION_DAYS=0          # 0 = keep forever (call metadata)

# Cron Job Settings
CRON_SECRET=${CONFIG.cronSecret}
RETENTION_CLEANUP_ENABLED=true     # Enable automated retention cleanup
RETENTION_EMAIL_NOTIFICATIONS=true # Send email before deletion
`;

  log(envVars, 'yellow');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    log('\n⚠️  .env.local not found. Creating it...', 'yellow');
    fs.writeFileSync(envPath, envVars.trim());
    log('✅ Created .env.local with retention settings', 'green');
  } else {
    log('\n⚠️  .env.local already exists. Please add the above variables manually.', 'yellow');
  }

  return CONFIG.cronSecret;
}

/**
 * Generate cron job configurations for different platforms
 */
function generateCronConfigs() {
  log('\n🚀 Cron Job Setup Instructions:', 'blue');

  // Vercel Cron
  log('\n1️⃣  Vercel Cron (vercel.json):', 'yellow');
  const vercelConfig = {
    crons: [{
      path: CONFIG.endpoint,
      schedule: CONFIG.schedule
    }]
  };
  log(JSON.stringify(vercelConfig, null, 2));

  // External Service (cron-job.org, EasyCron)
  log('\n2️⃣  External Cron Service (cron-job.org, EasyCron):', 'yellow');
  log(`  URL: ${CONFIG.domain}${CONFIG.endpoint}`);
  log(`  Method: POST`);
  log(`  Headers: Authorization: Bearer ${CONFIG.cronSecret}`);
  log(`  Schedule: ${CONFIG.schedule} (Daily at 2:00 AM UTC)`);

  // PM2 Cron Script
  log('\n3️⃣  PM2 Cron (for VPS deployment):', 'yellow');
  const pm2Script = `
const https = require('https');

function runRetentionCleanup() {
  const options = {
    hostname: '${new URL(CONFIG.domain).hostname}',
    path: '${CONFIG.endpoint}',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${CONFIG.cronSecret}'
    }
  };

  const req = https.request(options, (res) => {
    console.log('Retention cleanup status:', res.statusCode);
  });

  req.on('error', (error) => {
    console.error('Retention cleanup error:', error);
  });

  req.end();
}

// Run the cleanup
runRetentionCleanup();
`;

  const cronScriptPath = path.join(process.cwd(), 'scripts', 'cron-retention.js');
  fs.writeFileSync(cronScriptPath, pm2Script.trim());
  log('✅ Created scripts/cron-retention.js', 'green');
  log(`  Run: pm2 start scripts/cron-retention.js --cron "${CONFIG.schedule}"`);

  // GitHub Actions
  log('\n4️⃣  GitHub Actions (.github/workflows/retention-cleanup.yml):', 'yellow');
  const githubAction = `
name: Retention Cleanup

on:
  schedule:
    - cron: '${CONFIG.schedule}'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Run Retention Cleanup
        run: |
          curl -X POST ${CONFIG.domain}${CONFIG.endpoint} \\
            -H "Authorization: Bearer \${{ secrets.CRON_SECRET }}" \\
            -f
`;
  log(githubAction.trim());
  log('  ⚠️  Add CRON_SECRET to GitHub Secrets');
}

/**
 * Create a manual test script
 */
function createTestScript() {
  const testScript = `#!/usr/bin/env node

/**
 * Manual test script for retention cleanup
 * Run this to test the retention cleanup process
 */

const https = require('https');

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '${CONFIG.cronSecret}';

console.log('🧪 Testing Retention Cleanup...');
console.log('Domain:', DOMAIN);

const url = new URL('/api/cron/retention-cleanup', DOMAIN);
const isHttps = url.protocol === 'https:';

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${CRON_SECRET}\`
  }
};

const module = isHttps ? require('https') : require('http');

const req = module.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        console.log('✅ Retention cleanup successful!');
        console.log('Deleted items:', response.deleted);
      } else {
        console.log('⚠️  Cleanup completed with warnings');
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
`;

  const testScriptPath = path.join(process.cwd(), 'scripts', 'test-retention-cleanup.js');
  fs.writeFileSync(testScriptPath, testScript.trim());
  fs.chmodSync(testScriptPath, '755');

  log('\n✅ Created scripts/test-retention-cleanup.js', 'green');
  log('  Run: node scripts/test-retention-cleanup.js', 'yellow');
}

/**
 * Main setup function
 */
async function main() {
  log('=' .repeat(60), 'blue');
  log('🔧 LoadVoice Retention Policy Cron Setup', 'blue');
  log('=' .repeat(60), 'blue');

  try {
    // Test the endpoint
    await testCronEndpoint();

    // Generate environment variables
    const cronSecret = generateEnvVars();

    // Generate cron configurations
    generateCronConfigs();

    // Create test script
    createTestScript();

    log('\n' + '=' .repeat(60), 'green');
    log('✅ Retention cron setup complete!', 'green');
    log('=' .repeat(60), 'green');

    log('\n📝 Next Steps:', 'blue');
    log('1. Add the environment variables to your .env.local file');
    log('2. Choose and configure one of the cron job options above');
    log('3. Test with: node scripts/test-retention-cleanup.js');
    log('4. Monitor the first few runs to ensure everything works');

  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the setup
main();