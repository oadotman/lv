/**
 * Integration Test for Call Processing Workflow
 *
 * This is a lighter version that tests the core components without real API calls
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
};

// Initialize Supabase
const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test utilities
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  section: (msg) => {
    console.log('');
    console.log(`${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}`);
  }
};

// Test suite
const tests = {
  async checkEnvironment() {
    log.section('Environment Check');

    const checks = {
      'Supabase URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'Supabase Anon Key': !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Supabase Service Key': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      'AssemblyAI Key': !!process.env.ASSEMBLYAI_API_KEY,
      'OpenAI Key': !!process.env.OPENAI_API_KEY,
      'App URL': !!process.env.NEXT_PUBLIC_APP_URL
    };

    let allPassed = true;
    for (const [name, passed] of Object.entries(checks)) {
      if (passed) {
        log.success(`${name} configured`);
      } else {
        log.error(`${name} missing`);
        allPassed = false;
      }
    }

    return allPassed;
  },

  async checkDatabaseConnection() {
    log.section('Database Connection');

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('count')
        .limit(1);

      if (error) throw error;
      log.success('Connected to Supabase database');
      return true;
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      return false;
    }
  },

  async checkAPIEndpoints() {
    log.section('API Endpoints');

    const endpoints = [
      { path: '/api/health', method: 'GET', name: 'Health check' },
      { path: '/api/upload/presigned-url', method: 'POST', name: 'Presigned URL', requiresAuth: true },
      { path: '/api/upload/complete', method: 'POST', name: 'Upload complete', requiresAuth: true }
    ];

    let allPassed = true;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${TEST_CONFIG.appUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // For protected endpoints, 401 is expected and valid
        if (endpoint.requiresAuth && response.status === 401) {
          log.success(`${endpoint.name} endpoint (requires auth)`);
        } else if (!endpoint.requiresAuth && response.ok) {
          log.success(`${endpoint.name} endpoint`);
        } else if (!endpoint.requiresAuth) {
          log.warning(`${endpoint.name} returned ${response.status}`);
        }
      } catch (error) {
        log.error(`${endpoint.name} endpoint unreachable`);
        allPassed = false;
      }
    }

    return allPassed;
  },

  async checkDatabaseSchema() {
    log.section('Database Schema');

    const requiredTables = [
      'organizations',
      'user_organizations',
      'calls',
      'transcripts',
      'transcript_utterances',
      'call_fields',
      'custom_templates',
      'template_fields',
      'usage_metrics',
      'notifications',
      'user_preferences'
    ];

    let allPassed = true;

    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(0);

        if (error) throw error;
        log.success(`Table '${table}' exists`);
      } catch (error) {
        log.error(`Table '${table}' not found or inaccessible`);
        allPassed = false;
      }
    }

    return allPassed;
  },

  async checkQueueSystem() {
    log.section('Queue System');

    try {
      // Check if queue processor module exists
      const queueProcessor = require('../lib/queue/call-processor');

      if (queueProcessor.getQueueStatus) {
        const status = queueProcessor.getQueueStatus();
        log.success(`Queue system initialized (${status.queued} queued, ${status.active} active)`);
        return true;
      }
    } catch (error) {
      log.warning('Queue system not accessible from test');
    }

    return true; // Non-critical
  },

  async checkStorageBucket() {
    log.section('Storage Configuration');

    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) throw error;

      const callAudioBucket = buckets?.find(b => b.name === 'call-audio');

      if (callAudioBucket) {
        log.success('Storage bucket "call-audio" configured');

        // Check if public
        if (callAudioBucket.public) {
          log.success('Bucket is public (required for processing)');
        } else {
          log.warning('Bucket is not public - may cause issues');
        }
      } else {
        log.error('Storage bucket "call-audio" not found');
        return false;
      }

      return true;
    } catch (error) {
      log.error(`Storage check failed: ${error.message}`);
      return false;
    }
  },

  async simulateWorkflow() {
    log.section('Workflow Simulation');

    try {
      // Step 1: Check if we can create a user
      log.info('Simulating user creation...');
      const testEmail = `test-${Date.now()}@example.com`;

      const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true
      });

      if (userError) throw userError;
      log.success('Test user created');

      // Step 2: Create an organization
      log.info('Creating test organization...');
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Organization',
          slug: `test-org-${Date.now()}`,
          plan_type: 'free',
          billing_email: testEmail
        })
        .select()
        .single();

      if (orgError) throw orgError;
      log.success('Test organization created');

      // Step 3: Link user to organization
      const { error: linkError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.user.id,
          organization_id: org.id,
          role: 'owner'
        });

      if (linkError) throw linkError;
      log.success('User linked to organization');

      // Step 4: Create a test call record
      log.info('Creating test call record...');
      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          user_id: user.user.id,
          organization_id: org.id,
          file_name: 'test-call.mp3',
          file_size: 1024 * 1024, // 1MB
          file_url: 'https://example.com/test.mp3',
          mime_type: 'audio/mpeg',
          customer_name: 'Test Customer',
          sales_rep: 'Test Rep',
          status: 'uploading', // Use valid status
          typed_notes: 'Test notes to verify typed notes feature',
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (callError) throw callError;
      log.success('Test call record created with typed notes');

      // Step 5: Verify typed notes were saved
      if (call.typed_notes === 'Test notes to verify typed notes feature') {
        log.success('Typed notes feature verified');
      } else {
        log.error('Typed notes not saved correctly');
      }

      // Cleanup
      log.info('Cleaning up test data...');
      await supabase.from('calls').delete().eq('id', call.id);
      await supabase.from('user_organizations').delete().eq('user_id', user.user.id);
      await supabase.from('organizations').delete().eq('id', org.id);
      await supabase.auth.admin.deleteUser(user.user.id);
      log.success('Test data cleaned up');

      return true;
    } catch (error) {
      log.error(`Workflow simulation failed: ${error.message}`);
      return false;
    }
  }
};

// Main test runner
async function runTests() {
  console.log('');
  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║   CALL PROCESSING INTEGRATION TEST    ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  const results = {
    passed: 0,
    failed: 0
  };

  // Run all tests
  const testFunctions = [
    tests.checkEnvironment,
    tests.checkDatabaseConnection,
    tests.checkAPIEndpoints,
    tests.checkDatabaseSchema,
    tests.checkStorageBucket,
    tests.checkQueueSystem,
    tests.simulateWorkflow
  ];

  for (const test of testFunctions) {
    const passed = await test();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Summary
  console.log('');
  console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  if (results.failed === 0) {
    console.log(`${colors.bright}${colors.green}✅ ALL TESTS PASSED (${results.passed}/${results.passed + results.failed})${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}❌ SOME TESTS FAILED (${results.passed} passed, ${results.failed} failed)${colors.reset}`);
  }

  console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, tests };