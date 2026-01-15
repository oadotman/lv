/**
 * LoadVoice Complete End-to-End Testing Suite
 * Tests all critical user flows with real API calls
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const TEST_ORG_ID = 'test-org-' + Date.now();
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  log(title, 'cyan');
  console.log('═'.repeat(60));
}

function logTest(name) {
  log(`\n▶ Testing: ${name}`, 'magenta');
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

function logMetric(name, value, target = null) {
  const status = target && value > target ? 'red' : 'green';
  const targetStr = target ? ` (target: <${target})` : '';
  log(`  • ${name}: ${value}${targetStr}`, status);
}

// Performance tracking
const performanceMetrics = {
  extractionTimes: [],
  apiResponseTimes: [],
  dbQueryTimes: [],
  pageLoadTimes: []
};

async function measureTime(fn, metricName) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;

    if (metricName && performanceMetrics[metricName]) {
      performanceMetrics[metricName].push(duration);
    }

    return { result, duration, success: true };
  } catch (error) {
    const duration = Date.now() - start;
    return { error, duration, success: false };
  }
}

// Test data generators
function generateShipperCallData() {
  return {
    transcript: `
      Hello, this is Sarah from Global Logistics Inc.
      I need to schedule a shipment pickup.

      We have 35,000 pounds of automotive parts that need to move from
      Detroit, Michigan to Atlanta, Georgia.

      Pickup address is 4567 Industrial Parkway, Detroit, MI 48201.
      Delivery is going to 8910 Distribution Center Drive, Atlanta, GA 30301.

      Pickup needs to be tomorrow morning between 8 AM and noon.
      Delivery deadline is Friday by 5 PM.

      This will require a dry van, 53-footer. No special equipment needed,
      but the driver needs to check in at the security gate.

      We're looking at a rate of around $3,200 for this load.
      Our reference number is PO-2024-1234.

      My contact number is 313-555-0100 and email is sarah@globallogistics.com.
    `,
    metadata: {
      duration: 180,
      callType: 'shipper',
      recordedAt: new Date().toISOString()
    }
  };
}

function generateCarrierCallData() {
  return {
    transcript: `
      Hi there, this is Tom from Reliable Transport.
      Our MC number is 567890, DOT number is 7654321.

      I'm calling about the Detroit to Atlanta load you posted.
      We can handle that for $2,850.

      I've got a driver available - James Wilson. His phone is 555-444-3333.
      He's got a clean 53' dry van, truck number 4521, trailer T-9087.

      He can pick up tomorrow morning at 9 AM sharp and deliver by
      Thursday afternoon, definitely before your Friday deadline.

      Please send the rate confirmation to dispatch@reliabletransport.com.
      Our billing email is accounting@reliabletransport.com.

      We'll need the standard quick pay terms - 2% discount if paid within 5 days.
    `,
    metadata: {
      duration: 150,
      callType: 'carrier',
      recordedAt: new Date().toISOString()
    }
  };
}

function generateCheckCallData() {
  return {
    transcript: `
      Quick update on load number ${Date.now()}.

      Driver picked up this morning at 9:15 AM from Detroit.
      Everything loaded smoothly, got 35,000 pounds confirmed.

      He's currently on I-75 southbound, just passed through Cincinnati.
      About 400 miles to go to Atlanta.

      ETA is looking good for tomorrow afternoon around 2 PM.
      No issues, no delays. Weather's been clear.

      Driver will call when he's an hour out from delivery.
    `,
    metadata: {
      duration: 60,
      callType: 'check_call',
      recordedAt: new Date().toISOString()
    }
  };
}

// Test Cases
async function testDatabaseSchema() {
  logTest('Database Schema Validation');

  const requiredTables = [
    { name: 'loads', critical: true },
    { name: 'carriers', critical: true },
    { name: 'shippers', critical: true },
    { name: 'lanes', critical: false },
    { name: 'rate_confirmations', critical: false },
    { name: 'extraction_mappings', critical: false },
    { name: 'extraction_inbox', critical: true },
    { name: 'load_status_history', critical: false }
  ];

  let criticalPass = true;
  let allPass = true;

  for (const table of requiredTables) {
    const { error } = await supabase
      .from(table.name)
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      if (table.critical) {
        logError(`Critical table '${table.name}' is missing`);
        criticalPass = false;
      } else {
        logWarning(`Optional table '${table.name}' is missing`);
      }
      allPass = false;
    } else {
      logSuccess(`Table '${table.name}' exists`);
    }
  }

  return { criticalPass, allPass };
}

async function testFreightExtraction() {
  logTest('Freight-Specific AI Extraction');

  const shipperData = generateShipperCallData();
  const carrierData = generateCarrierCallData();

  // Test shipper call extraction
  const { result: shipperExtraction, duration: shipperTime } = await measureTime(async () => {
    const response = await fetch(`${API_BASE_URL}/api/extraction/freight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: shipperData.transcript,
        callType: 'shipper',
        organizationId: TEST_ORG_ID
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return await response.json();
  }, 'extractionTimes');

  if (shipperExtraction) {
    logSuccess('Shipper call extracted');
    logMetric('Extraction time', `${shipperTime}ms`, 60000);
    logMetric('Fields extracted', Object.keys(shipperExtraction.data || {}).length);
  } else {
    logError('Shipper extraction failed');
  }

  // Test carrier call extraction
  const { result: carrierExtraction, duration: carrierTime } = await measureTime(async () => {
    const response = await fetch(`${API_BASE_URL}/api/extraction/freight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: carrierData.transcript,
        callType: 'carrier',
        organizationId: TEST_ORG_ID
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return await response.json();
  }, 'extractionTimes');

  if (carrierExtraction) {
    logSuccess('Carrier call extracted');
    logMetric('Extraction time', `${carrierTime}ms`, 60000);
    logMetric('MC number captured', carrierExtraction.data?.carrier?.mc_number ? 'Yes' : 'No');
  } else {
    logError('Carrier extraction failed');
  }

  return { shipperExtraction, carrierExtraction };
}

async function testCRMIntegration(extractionData) {
  logTest('CRM Auto-Population & Integration');

  if (!extractionData.shipperExtraction || !extractionData.carrierExtraction) {
    logWarning('Skipping CRM tests due to extraction failures');
    return null;
  }

  // Test saving extraction to load
  const { result: load, duration: saveTime } = await measureTime(async () => {
    const response = await fetch(`${API_BASE_URL}/api/extraction/save-to-load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extraction: extractionData.shipperExtraction,
        organizationId: TEST_ORG_ID
      })
    });

    if (!response.ok) {
      throw new Error(`Save to load failed: ${response.status}`);
    }

    return await response.json();
  }, 'apiResponseTimes');

  if (load) {
    logSuccess(`Load created: ${load.load_number}`);
    logMetric('Save time', `${saveTime}ms`, 2000);
  } else {
    logError('Failed to save extraction to load');
  }

  // Test carrier auto-population
  const { result: carrier, duration: carrierTime } = await measureTime(async () => {
    const mcNumber = extractionData.carrierExtraction.data?.carrier?.mc_number;
    if (!mcNumber) return null;

    // Check if carrier exists
    const { data: existing } = await supabase
      .from('carriers')
      .select('*')
      .eq('mc_number', mcNumber)
      .single();

    if (existing) {
      logSuccess(`Carrier found: ${existing.company_name}`);
      return existing;
    }

    // Create new carrier
    const { data: newCarrier, error } = await supabase
      .from('carriers')
      .insert({
        organization_id: TEST_ORG_ID,
        ...extractionData.carrierExtraction.data.carrier,
        auto_created: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return newCarrier;
  }, 'dbQueryTimes');

  if (carrier) {
    logSuccess('Carrier auto-populated successfully');
    logMetric('Carrier lookup/create time', `${carrierTime}ms`, 500);
  }

  return { load, carrier };
}

async function testLoadWorkflow(loadId) {
  logTest('Load Status Workflow');

  if (!loadId) {
    logWarning('No load ID available for workflow testing');
    return false;
  }

  const workflow = [
    { from: 'needs_carrier', to: 'dispatched', action: 'Assign carrier' },
    { from: 'dispatched', to: 'in_transit', action: 'Mark picked up' },
    { from: 'in_transit', to: 'delivered', action: 'Mark delivered' },
    { from: 'delivered', to: 'completed', action: 'Complete load' }
  ];

  for (const step of workflow) {
    const { success, duration } = await measureTime(async () => {
      const { error } = await supabase
        .from('loads')
        .update({
          status: step.to,
          updated_at: new Date().toISOString()
        })
        .eq('id', loadId);

      if (error) throw error;

      // Log status change
      await supabase
        .from('load_status_history')
        .insert({
          load_id: loadId,
          from_status: step.from,
          to_status: step.to,
          changed_at: new Date().toISOString(),
          changed_by: 'test-suite'
        });
    }, 'dbQueryTimes');

    if (success) {
      logSuccess(`${step.action}: ${step.from} → ${step.to} (${duration}ms)`);
    } else {
      logError(`Failed: ${step.action}`);
      return false;
    }
  }

  return true;
}

async function testRateConfirmation(loadId) {
  logTest('Rate Confirmation Generation');

  if (!loadId) {
    logWarning('No load ID available for rate confirmation');
    return null;
  }

  const { result: rateCon, duration } = await measureTime(async () => {
    const response = await fetch(`${API_BASE_URL}/api/loads/${loadId}/rate-con`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Rate con generation failed: ${response.status}`);
    }

    return await response.json();
  }, 'apiResponseTimes');

  if (rateCon) {
    logSuccess(`Rate confirmation generated: ${rateCon.confirmation_number}`);
    logMetric('Generation time', `${duration}ms`, 3000);
    logMetric('PDF created', rateCon.pdf_url ? 'Yes' : 'No');
  } else {
    logError('Rate confirmation generation failed');
  }

  return rateCon;
}

async function testPerformanceTargets() {
  logTest('Performance Validation');

  const targets = {
    extractionTimes: { name: 'Average extraction', target: 60000, critical: true },
    apiResponseTimes: { name: 'Average API response', target: 2000, critical: false },
    dbQueryTimes: { name: 'Average DB query', target: 100, critical: false },
    pageLoadTimes: { name: 'Average page load', target: 1000, critical: false }
  };

  let allTargetsMet = true;

  for (const [metric, config] of Object.entries(targets)) {
    const times = performanceMetrics[metric];
    if (times.length === 0) continue;

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const metTarget = avg <= config.target;

    if (!metTarget) {
      if (config.critical) {
        logError(`${config.name}: ${avg}ms (target: <${config.target}ms) - CRITICAL`);
        allTargetsMet = false;
      } else {
        logWarning(`${config.name}: ${avg}ms (target: <${config.target}ms)`);
      }
    } else {
      logSuccess(`${config.name}: ${avg}ms (target: <${config.target}ms)`);
    }
  }

  // Calculate end-to-end time
  const totalAvg = Object.values(performanceMetrics)
    .flat()
    .reduce((a, b) => a + b, 0) /
    Object.values(performanceMetrics).flat().length;

  logMetric('Overall average response', `${Math.round(totalAvg)}ms`);

  return allTargetsMet;
}

async function testUXElements() {
  logTest('UX Polish & Responsiveness');

  const uiTests = [
    {
      name: 'Dashboard loads under 1 second',
      endpoint: '/api/dashboard/snapshot',
      targetMs: 1000
    },
    {
      name: 'Search returns instantly',
      endpoint: '/api/loads?search=test',
      targetMs: 500
    },
    {
      name: 'Filter response time',
      endpoint: '/api/loads?status=in_transit',
      targetMs: 500
    }
  ];

  let allPass = true;

  for (const test of uiTests) {
    const { success, duration } = await measureTime(async () => {
      const response = await fetch(`${API_BASE_URL}${test.endpoint}`, {
        headers: { 'X-Organization-Id': TEST_ORG_ID }
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return await response.json();
    }, 'pageLoadTimes');

    if (success && duration <= test.targetMs) {
      logSuccess(`${test.name}: ${duration}ms`);
    } else {
      logError(`${test.name}: ${duration}ms (target: <${test.targetMs}ms)`);
      allPass = false;
    }
  }

  return allPass;
}

async function cleanupTestData() {
  logTest('Test Data Cleanup');

  try {
    // Clean up in reverse dependency order
    const tables = [
      'rate_confirmations',
      'load_status_history',
      'extraction_inbox',
      'loads',
      'carriers',
      'shippers'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', TEST_ORG_ID);

      if (!error) {
        logSuccess(`Cleaned ${table}`);
      }
    }

    return true;
  } catch (error) {
    logError(`Cleanup failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runCompleteTests() {
  console.clear();
  log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         LoadVoice Complete Testing Suite                   ║
║                                                            ║
║   Phase 5: Testing & Polish | Phase 6: Launch Prep        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `, 'cyan');

  const startTime = Date.now();
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };

  // 1. Database Validation
  logSection('1. DATABASE SCHEMA VALIDATION');
  const dbResult = await testDatabaseSchema();
  if (dbResult.criticalPass) {
    testResults.passed.push('Database Schema');
  } else {
    testResults.failed.push('Database Schema');
    log('\n⚠️ Critical tables missing. Cannot continue.', 'red');
    return;
  }

  // 2. Extraction Testing
  logSection('2. FREIGHT EXTRACTION ENGINE');
  const extractionData = await testFreightExtraction();
  if (extractionData.shipperExtraction && extractionData.carrierExtraction) {
    testResults.passed.push('Freight Extraction');
  } else {
    testResults.failed.push('Freight Extraction');
  }

  // 3. CRM Integration
  logSection('3. CRM AUTO-POPULATION');
  const crmData = await testCRMIntegration(extractionData);
  if (crmData && crmData.load) {
    testResults.passed.push('CRM Integration');
  } else {
    testResults.failed.push('CRM Integration');
  }

  // 4. Load Workflow
  logSection('4. LOAD STATUS WORKFLOW');
  const workflowSuccess = await testLoadWorkflow(crmData?.load?.id);
  if (workflowSuccess) {
    testResults.passed.push('Load Workflow');
  } else {
    testResults.failed.push('Load Workflow');
  }

  // 5. Document Generation
  logSection('5. RATE CONFIRMATION GENERATION');
  const rateCon = await testRateConfirmation(crmData?.load?.id);
  if (rateCon) {
    testResults.passed.push('Rate Confirmation');
  } else {
    testResults.failed.push('Rate Confirmation');
  }

  // 6. Performance Testing
  logSection('6. PERFORMANCE VALIDATION');
  const perfTargetsMet = await testPerformanceTargets();
  if (perfTargetsMet) {
    testResults.passed.push('Performance Targets');
  } else {
    testResults.warnings.push('Performance Targets');
  }

  // 7. UX Testing
  logSection('7. UX POLISH & RESPONSIVENESS');
  const uxPass = await testUXElements();
  if (uxPass) {
    testResults.passed.push('UX Elements');
  } else {
    testResults.warnings.push('UX Elements');
  }

  // Cleanup
  logSection('8. CLEANUP');
  await cleanupTestData();

  // Final Summary
  const totalTime = Date.now() - startTime;
  logSection('TEST SUMMARY');

  console.log('\n' + '─'.repeat(40));
  log(`✓ Passed: ${testResults.passed.length} tests`, 'green');
  for (const test of testResults.passed) {
    log(`  • ${test}`, 'green');
  }

  if (testResults.warnings.length > 0) {
    console.log('\n' + '─'.repeat(40));
    log(`⚠ Warnings: ${testResults.warnings.length} tests`, 'yellow');
    for (const test of testResults.warnings) {
      log(`  • ${test}`, 'yellow');
    }
  }

  if (testResults.failed.length > 0) {
    console.log('\n' + '─'.repeat(40));
    log(`✗ Failed: ${testResults.failed.length} tests`, 'red');
    for (const test of testResults.failed) {
      log(`  • ${test}`, 'red');
    }
  }

  console.log('\n' + '─'.repeat(40));
  log(`Total execution time: ${(totalTime / 1000).toFixed(2)}s`, 'blue');

  // Launch readiness
  console.log('\n' + '═'.repeat(60));
  if (testResults.failed.length === 0) {
    log('🚀 LAUNCH READY: All critical tests passed!', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Update Paddle pricing configuration', 'white');
    log('  2. Deploy to production', 'white');
    log('  3. Begin beta user recruitment', 'white');
  } else {
    log('⚠️ NOT READY: Fix failed tests before launch', 'red');
    log(`\n${testResults.failed.length} critical issues need resolution`, 'yellow');
  }
  console.log('═'.repeat(60) + '\n');
}

// Check if running directly
if (require.main === module) {
  runCompleteTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runCompleteTests };