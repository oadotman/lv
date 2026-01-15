#!/usr/bin/env node

/**
 * Phase 1 Scale and Reliability Test Script
 * Tests the critical fixes implemented for production readiness
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
};

/**
 * Test 1: Redis Connection and Bull Queue
 */
async function testRedisAndQueue() {
  log('\n========================================', 'bright');
  log('TEST 1: Redis and Bull Queue', 'bright');
  log('========================================', 'bright');

  try {
    // Test queue health endpoint
    const response = await fetch('http://localhost:3000/api/health/queue');
    const data = await response.json();

    if (data.status === 'healthy') {
      success('Queue health check passed');
      success(`Redis connected with ${data.redis.latency}ms latency`);
      testResults.passed++;
    } else {
      error('Queue health check failed');
      error(`Redis status: ${data.redis.error || 'disconnected'}`);
      testResults.failed++;
    }

    // Check queue stats
    if (data.queue && data.queue.stats) {
      info(`Queue stats: ${data.queue.stats.waiting} waiting, ${data.queue.stats.active} active`);

      if (data.queue.stats.failed > 100) {
        warning('High number of failed jobs detected');
        testResults.warnings++;
      }
    }

  } catch (err) {
    error(`Queue test failed: ${err.message}`);
    testResults.failed++;
  }
}

/**
 * Test 2: Database Indexes Performance
 */
async function testDatabaseIndexes() {
  log('\n========================================', 'bright');
  log('TEST 2: Database Indexes', 'bright');
  log('========================================', 'bright');

  try {
    // Check if indexes exist
    const { data: indexes, error: indexError } = await supabase.rpc('analyze_index_usage');

    if (indexError) {
      error(`Failed to analyze indexes: ${indexError.message}`);
      testResults.failed++;
      return;
    }

    // Check for critical indexes
    const criticalIndexes = [
      'idx_calls_org_status_created',
      'idx_carriers_org_last_used',
      'idx_loads_status_created',
      'idx_transcripts_call_id',
    ];

    const foundIndexes = indexes.map(i => i.indexname);
    let allCriticalFound = true;

    for (const indexName of criticalIndexes) {
      if (foundIndexes.includes(indexName)) {
        success(`Critical index found: ${indexName}`);
      } else {
        error(`Missing critical index: ${indexName}`);
        allCriticalFound = false;
      }
    }

    if (allCriticalFound) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

    // Check index usage
    const unusedIndexes = indexes.filter(i => i.idx_scan === 0 && !i.is_primary);
    if (unusedIndexes.length > 0) {
      warning(`${unusedIndexes.length} unused indexes found`);
      testResults.warnings++;
    }

  } catch (err) {
    error(`Index test failed: ${err.message}`);
    testResults.failed++;
  }
}

/**
 * Test 3: Query Limits Implementation
 */
async function testQueryLimits() {
  log('\n========================================', 'bright');
  log('TEST 3: Query Limits', 'bright');
  log('========================================', 'bright');

  try {
    // Test carriers API with pagination
    const carriersResponse = await fetch('http://localhost:3000/api/carriers?page=1&pageSize=10');
    const carriersData = await carriersResponse.json();

    if (carriersData.carriers && carriersData.pagination) {
      const returnedCount = carriersData.carriers.length;
      const requestedSize = 10;

      if (returnedCount <= requestedSize) {
        success(`Carriers API respects limits: ${returnedCount}/${requestedSize} returned`);
        testResults.passed++;
      } else {
        error(`Carriers API exceeded limit: ${returnedCount}/${requestedSize} returned`);
        testResults.failed++;
      }

      // Check for performance metadata
      if (carriersData.performance) {
        info(`Query performance: ${carriersData.performance.countType} count used`);
        if (carriersData.performance.countType === 'estimated') {
          success('Using estimated count for performance');
        }
      }
    } else {
      error('Carriers API missing pagination data');
      testResults.failed++;
    }

    // Test calls API with limits
    const callsResponse = await fetch('http://localhost:3000/api/calls?page=1&pageSize=20');
    const callsData = await callsResponse.json();

    if (callsData.calls && callsData.pagination) {
      const returnedCount = callsData.calls.length;
      if (returnedCount <= 20) {
        success(`Calls API respects limits: ${returnedCount}/20 returned`);
        testResults.passed++;
      } else {
        error(`Calls API exceeded limit: ${returnedCount}/20 returned`);
        testResults.failed++;
      }
    }

  } catch (err) {
    error(`Query limits test failed: ${err.message}`);
    testResults.failed++;
  }
}

/**
 * Test 4: Async Call Processing
 */
async function testAsyncProcessing() {
  log('\n========================================', 'bright');
  log('TEST 4: Async Call Processing', 'bright');
  log('========================================', 'bright');

  try {
    // Create a test call
    const { data: testCall, error: createError } = await supabase
      .from('calls')
      .insert({
        file_name: 'test-scale-audio.mp3',
        file_url: 'https://example.com/test.mp3',
        file_size: 1024 * 1024 * 5, // 5MB
        status: 'uploaded',
        organization_id: '00000000-0000-0000-0000-000000000000', // Test org
      })
      .select()
      .single();

    if (createError) {
      error(`Failed to create test call: ${createError.message}`);
      testResults.failed++;
      return;
    }

    info(`Created test call: ${testCall.id}`);

    // Queue for processing using async endpoint
    const processResponse = await fetch(
      `http://localhost:3000/api/calls/${testCall.id}/process-async`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const processData = await processResponse.json();

    if (processData.success && processData.jobId) {
      success(`Call queued successfully with job ID: ${processData.jobId}`);
      info(`Priority: ${processData.priority}`);
      testResults.passed++;

      // Check job status
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `http://localhost:3000/api/calls/${testCall.id}/process-async?jobId=${processData.jobId}`
      );
      const statusData = await statusResponse.json();

      if (statusData.status) {
        info(`Job status: ${statusData.status}, Progress: ${statusData.progress}%`);
      }
    } else {
      error('Failed to queue call for processing');
      testResults.failed++;
    }

    // Cleanup
    await supabase.from('calls').delete().eq('id', testCall.id);

  } catch (err) {
    error(`Async processing test failed: ${err.message}`);
    testResults.failed++;
  }
}

/**
 * Test 5: Connection Pool Performance
 */
async function testConnectionPool() {
  log('\n========================================', 'bright');
  log('TEST 5: Connection Pool', 'bright');
  log('========================================', 'bright');

  try {
    // Simulate concurrent queries
    const queries = [];
    const queryCount = 20;

    info(`Testing ${queryCount} concurrent queries...`);

    const startTime = Date.now();

    for (let i = 0; i < queryCount; i++) {
      queries.push(
        supabase
          .from('organizations')
          .select('id, name')
          .limit(1)
      );
    }

    const results = await Promise.allSettled(queries);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (successful === queryCount) {
      success(`All ${queryCount} queries completed in ${duration}ms`);
      success(`Average: ${(duration / queryCount).toFixed(2)}ms per query`);
      testResults.passed++;
    } else {
      warning(`${successful}/${queryCount} queries successful, ${failed} failed`);
      if (successful > queryCount * 0.8) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }

    // Check for timeout issues
    if (duration > 10000) {
      warning('Queries took longer than 10 seconds - possible performance issue');
      testResults.warnings++;
    }

  } catch (err) {
    error(`Connection pool test failed: ${err.message}`);
    testResults.failed++;
  }
}

/**
 * Test 6: Bulk Operation Limits
 */
async function testBulkLimits() {
  log('\n========================================', 'bright');
  log('TEST 6: Bulk Operation Limits', 'bright');
  log('========================================', 'bright');

  try {
    // Try to delete more than the allowed batch size
    const largeBatch = Array.from({ length: 150 }, (_, i) => `test-id-${i}`);

    const response = await fetch('http://localhost:3000/api/calls', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callIds: largeBatch }),
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.error.includes('exceeds maximum')) {
        success('Bulk delete properly enforces batch size limit');
        info(`Max batch size: ${data.maxBatchSize}`);
        testResults.passed++;
      } else {
        error('Unexpected error for large batch');
        testResults.failed++;
      }
    } else {
      error('Large batch not rejected as expected');
      testResults.failed++;
    }

  } catch (err) {
    error(`Bulk limits test failed: ${err.message}`);
    testResults.failed++;
  }
}

/**
 * Test 7: Query Timeout Protection
 */
async function testTimeoutProtection() {
  log('\n========================================', 'bright');
  log('TEST 7: Query Timeout Protection', 'bright');
  log('========================================', 'bright');

  try {
    // Test with a very broad search that could timeout
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/carriers?search=a', {
      signal: AbortSignal.timeout(15000), // 15 second client timeout
    });

    const duration = Date.now() - startTime;

    if (response.status === 504) {
      success('Query timeout protection working');
      info(`Timed out after ${duration}ms`);
      testResults.passed++;
    } else if (response.ok) {
      const data = await response.json();
      if (duration < 10000) {
        success(`Query completed quickly: ${duration}ms`);
        if (data.performance) {
          info(`Returned ${data.performance.returnedCount} results`);
        }
        testResults.passed++;
      } else {
        warning(`Query took ${duration}ms - close to timeout`);
        testResults.warnings++;
      }
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      warning('Client-side timeout reached');
      testResults.warnings++;
    } else {
      error(`Timeout test failed: ${err.message}`);
      testResults.failed++;
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n' + '='.repeat(50), 'bright');
  log('PHASE 1 SCALE & RELIABILITY TESTS', 'bright');
  log('='.repeat(50), 'bright');

  await testRedisAndQueue();
  await testDatabaseIndexes();
  await testQueryLimits();
  await testAsyncProcessing();
  await testConnectionPool();
  await testBulkLimits();
  await testTimeoutProtection();

  // Summary
  log('\n' + '='.repeat(50), 'bright');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(50), 'bright');

  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;

  if (testResults.passed > 0) {
    success(`Passed: ${testResults.passed}/${total} tests`);
  }
  if (testResults.failed > 0) {
    error(`Failed: ${testResults.failed}/${total} tests`);
  }
  if (testResults.warnings > 0) {
    warning(`Warnings: ${testResults.warnings}`);
  }

  info(`Pass rate: ${passRate}%`);

  if (passRate >= 80) {
    log('\n✨ Phase 1 implementation successful!', 'green');
  } else if (passRate >= 50) {
    log('\n⚠️ Phase 1 partially implemented - review failed tests', 'yellow');
  } else {
    log('\n❌ Phase 1 implementation needs work', 'red');
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});