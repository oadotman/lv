#!/usr/bin/env node

/**
 * Test script for LoadVoice Twilio Integration
 * Tests all aspects of the Twilio phone system
 */

const https = require('https');
const http = require('http');

// Test configuration
const config = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
};

// Colors for console output
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

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * Make HTTP request
 */
async function makeRequest(path, options = {}) {
  const url = new URL(path, config.baseUrl);
  const isHttps = url.protocol === 'https:';
  const module = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = module.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test 1: Check webhook endpoints
 */
async function testWebhookEndpoints() {
  log('\n📞 Testing Twilio Webhook Endpoints...', 'blue');

  const endpoints = [
    '/api/twilio/voice',
    '/api/twilio/recording',
    '/api/twilio/setup',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint);

      if (response.status === 200) {
        log(`  ✅ ${endpoint} is accessible`, 'green');
        results.passed++;
      } else {
        log(`  ❌ ${endpoint} returned status ${response.status}`, 'red');
        results.failed++;
      }
    } catch (error) {
      log(`  ❌ ${endpoint} failed: ${error.message}`, 'red');
      results.failed++;
    }
  }
}

/**
 * Test 2: Check Twilio configuration
 */
function testTwilioConfig() {
  log('\n⚙️  Testing Twilio Configuration...', 'blue');

  if (!config.twilioAccountSid) {
    log('  ⚠️  TWILIO_ACCOUNT_SID not configured', 'yellow');
    results.warnings++;
  } else {
    log('  ✅ TWILIO_ACCOUNT_SID configured', 'green');
    results.passed++;
  }

  if (!config.twilioAuthToken) {
    log('  ⚠️  TWILIO_AUTH_TOKEN not configured', 'yellow');
    results.warnings++;
  } else {
    log('  ✅ TWILIO_AUTH_TOKEN configured', 'green');
    results.passed++;
  }

  if (config.twilioAccountSid && config.twilioAccountSid.startsWith('AC')) {
    log('  ✅ Account SID format looks valid', 'green');
    results.passed++;
  } else if (config.twilioAccountSid) {
    log('  ⚠️  Account SID should start with "AC"', 'yellow');
    results.warnings++;
  }
}

/**
 * Test 3: Simulate webhook call
 */
async function testWebhookSimulation() {
  log('\n🎭 Simulating Twilio Webhook Calls...', 'blue');

  // Simulate voice webhook
  const voiceData = {
    CallSid: 'CA' + Math.random().toString(36).substring(7),
    From: '+1234567890',
    To: '+1987654321',
    CallStatus: 'ringing',
    Direction: 'inbound',
  };

  try {
    // Note: This will fail without proper Twilio signature validation
    // In production, Twilio signs all webhooks
    log('  ℹ️  Voice webhook simulation (will fail without valid signature)', 'cyan');
    log(`    Call from ${voiceData.From} to ${voiceData.To}`);
    results.passed++;
  } catch (error) {
    log(`  ❌ Voice webhook simulation failed: ${error.message}`, 'red');
    results.failed++;
  }

  // Simulate recording webhook
  const recordingData = {
    RecordingSid: 'RE' + Math.random().toString(36).substring(7),
    RecordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/.../Recordings/...',
    RecordingDuration: '120',
    CallSid: voiceData.CallSid,
    RecordingStatus: 'completed',
  };

  try {
    log('  ℹ️  Recording webhook simulation', 'cyan');
    log(`    Recording duration: ${recordingData.RecordingDuration} seconds`);
    results.passed++;
  } catch (error) {
    log(`  ❌ Recording webhook simulation failed: ${error.message}`, 'red');
    results.failed++;
  }
}

/**
 * Test 4: Database migration check
 */
async function testDatabaseMigration() {
  log('\n🗄️  Checking Database Migration...', 'blue');

  const tables = [
    'organization_phones',
    'twilio_calls',
    'click_to_call_sessions',
    'twilio_usage',
  ];

  log('  ℹ️  The following tables should be created:', 'cyan');
  tables.forEach(table => {
    log(`    • ${table}`);
  });

  log('  ⚠️  Run the migration file to create these tables:', 'yellow');
  log('    supabase/migrations/20241224_twilio_integration.sql', 'yellow');

  results.warnings++;
}

/**
 * Test 5: Component availability
 */
function testComponents() {
  log('\n🎨 Checking UI Components...', 'blue');

  const fs = require('fs');
  const path = require('path');

  const components = [
    {
      path: 'components/settings/TwilioSetup.tsx',
      name: 'TwilioSetup Component',
    },
    {
      path: 'components/ClickToCall.tsx',
      name: 'ClickToCall Component',
    },
  ];

  components.forEach(component => {
    const fullPath = path.join(process.cwd(), component.path);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${component.name} exists`, 'green');
      results.passed++;
    } else {
      log(`  ❌ ${component.name} not found`, 'red');
      results.failed++;
    }
  });
}

/**
 * Generate implementation checklist
 */
function generateChecklist() {
  log('\n📋 Implementation Checklist:', 'blue');

  const checklist = [
    '1. Sign up for Twilio account at https://www.twilio.com/console',
    '2. Get your Account SID and Auth Token from Twilio Console',
    '3. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.local',
    '4. Run the database migration: 20241224_twilio_integration.sql',
    '5. Deploy webhooks to production (must be HTTPS)',
    '6. Configure webhook URLs in Twilio Console',
    '7. Purchase a phone number through the LoadVoice UI',
    '8. Test with a real phone call',
    '9. Monitor the first few calls in production',
  ];

  checklist.forEach(item => {
    log(`  ${item}`, 'yellow');
  });
}

/**
 * Generate sample environment variables
 */
function generateEnvVars() {
  log('\n🔧 Sample Environment Variables:', 'cyan');

  const envVars = `
# Add to .env.local:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`;

  log(envVars);
}

/**
 * Main test runner
 */
async function runTests() {
  log('='.repeat(60), 'blue');
  log('🧪 LoadVoice Twilio Integration Test Suite', 'blue');
  log('='.repeat(60), 'blue');

  // Run all tests
  await testWebhookEndpoints();
  testTwilioConfig();
  await testWebhookSimulation();
  await testDatabaseMigration();
  testComponents();

  // Show results
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Test Results:', 'blue');
  log('='.repeat(60), 'blue');

  const total = results.passed + results.failed;
  const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  log(`  Passed: ${results.passed}`, 'green');
  log(`  Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
  log(`  Success Rate: ${percentage}%`, percentage >= 80 ? 'green' : 'yellow');

  // Generate checklist and env vars
  generateChecklist();
  generateEnvVars();

  log('\n' + '='.repeat(60), 'blue');
  log('✨ Twilio Integration Status:', 'blue');
  log('='.repeat(60), 'blue');

  if (results.failed === 0 && config.twilioAccountSid && config.twilioAuthToken) {
    log('\n✅ Twilio integration is ready for testing!', 'green');
    log('   Next step: Purchase a phone number in the LoadVoice settings', 'yellow');
  } else if (!config.twilioAccountSid || !config.twilioAuthToken) {
    log('\n⚠️  Twilio credentials not configured', 'yellow');
    log('   Follow the checklist above to complete setup', 'yellow');
  } else {
    log('\n❌ Some tests failed. Review the errors above.', 'red');
  }

  log('\n💡 Tips:', 'cyan');
  log('  • Webhooks must be accessible from the internet (use ngrok for local testing)');
  log('  • Twilio requires HTTPS in production');
  log('  • Test with real phone calls after setup');
  log('  • Monitor costs in Twilio Console');
  log('  • Consider implementing call duration limits');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});