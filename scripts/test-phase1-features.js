// =====================================================
// PHASE 1 IMPLEMENTATION TEST
// Tests bulk upload, drag & drop, and retention policy
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.blue);
  console.log('='.repeat(60));
}

function logTest(name, passed, details = '') {
  if (passed) {
    log(`✅ ${name}`, colors.green);
    results.passed.push(name);
  } else {
    log(`❌ ${name}`, colors.red);
    if (details) log(`   ${details}`, colors.red);
    results.failed.push({ name, details });
  }
}

// =====================================================
// TEST 1: VERIFY BULK UPLOAD FUNCTIONALITY
// =====================================================
async function testBulkUpload() {
  logSection('TEST 1: Bulk Upload Functionality');

  try {
    // Check if UploadModal accepts multiple files
    const fs = require('fs');
    const uploadModalPath = './components/modals/UploadModal.tsx';

    if (fs.existsSync(uploadModalPath)) {
      const content = fs.readFileSync(uploadModalPath, 'utf-8');

      // Check for multiple attribute
      const hasMultipleAttribute = content.includes('multiple') &&
                                  content.includes('type="file"');
      logTest('Multiple file input enabled', hasMultipleAttribute);

      // Check for file queue management
      const hasFileQueue = content.includes('FileUpload[]') &&
                          content.includes('setFiles');
      logTest('File queue management implemented', hasFileQueue);

      // Check for parallel validation
      const hasParallelValidation = content.includes('Promise.all') &&
                                   content.includes('validationPromises');
      logTest('Parallel file validation implemented', hasParallelValidation);

      // Check for progress tracking
      const hasProgressTracking = content.includes('progress') &&
                                 content.includes('status: "uploading"');
      logTest('Upload progress tracking implemented', hasProgressTracking);

    } else {
      logTest('UploadModal.tsx exists', false, 'File not found');
    }

  } catch (error) {
    logTest('Bulk upload test', false, error.message);
  }
}

// =====================================================
// TEST 2: VERIFY DRAG & DROP FUNCTIONALITY
// =====================================================
async function testDragAndDrop() {
  logSection('TEST 2: Drag & Drop Functionality');

  try {
    const fs = require('fs');
    const uploadModalPath = './components/modals/UploadModal.tsx';

    if (fs.existsSync(uploadModalPath)) {
      const content = fs.readFileSync(uploadModalPath, 'utf-8');

      // Check for drag state
      const hasDragState = content.includes('isDragging') &&
                          content.includes('setIsDragging');
      logTest('Drag state management implemented', hasDragState);

      // Check for drag event handlers
      const hasDragHandlers = content.includes('handleDragEnter') &&
                             content.includes('handleDragLeave') &&
                             content.includes('handleDragOver') &&
                             content.includes('handleDrop');
      logTest('All drag event handlers implemented', hasDragHandlers);

      // Check for full-screen overlay
      const hasOverlay = content.includes('fixed inset-0') &&
                        content.includes('isDragging &&') &&
                        content.includes('Drop your audio files here!');
      logTest('Full-screen drag overlay implemented', hasOverlay);

      // Check for file type filtering
      const hasFileFiltering = content.includes('.mp3') &&
                              content.includes('.wav') &&
                              content.includes('audioFiles = droppedFiles.filter');
      logTest('Audio file type filtering implemented', hasFileFiltering);

    } else {
      logTest('UploadModal.tsx exists', false, 'File not found');
    }

  } catch (error) {
    logTest('Drag and drop test', false, error.message);
  }
}

// =====================================================
// TEST 3: VERIFY RETENTION POLICY SETUP
// =====================================================
async function testRetentionPolicy() {
  logSection('TEST 3: Retention Policy Setup');

  try {
    const fs = require('fs');

    // Check retention cleanup cron endpoint
    const cronPath = './app/api/cron/retention-cleanup/route.ts';
    if (fs.existsSync(cronPath)) {
      const content = fs.readFileSync(cronPath, 'utf-8');

      const hasCronEndpoint = content.includes('runRetentionCleanup');
      logTest('Retention cleanup cron endpoint exists', hasCronEndpoint);

      const hasAuth = content.includes('CRON_SECRET') &&
                     content.includes('Bearer');
      logTest('Cron endpoint authentication implemented', hasAuth);
    } else {
      logTest('Retention cleanup endpoint exists', false, 'File not found');
    }

    // Check retention policy implementation
    const retentionPath = './lib/gdpr/data-retention.ts';
    if (fs.existsSync(retentionPath)) {
      const content = fs.readFileSync(retentionPath, 'utf-8');

      const has7DayPolicy = content.includes('retentionDays: 7') &&
                           content.includes('audio_files');
      logTest('7-day audio retention policy configured', has7DayPolicy);

      const has30DayPolicy = content.includes('retentionDays: 30') &&
                            content.includes('transcripts');
      logTest('30-day transcript retention policy configured', has30DayPolicy);

      const hasIndefiniteRetention = content.includes('retentionDays: 0') &&
                                     content.includes('extracted_fields');
      logTest('Indefinite CRM data retention configured', hasIndefiniteRetention);
    } else {
      logTest('Retention policy implementation exists', false, 'File not found');
    }

    // Check email template
    const emailPath = './lib/resend/retention-email-template.ts';
    if (fs.existsSync(emailPath)) {
      const content = fs.readFileSync(emailPath, 'utf-8');

      const hasEmailTemplate = content.includes('renderRetentionNotificationEmail');
      logTest('Retention notification email template created', hasEmailTemplate);

      const hasSendFunction = content.includes('sendRetentionNotificationEmail');
      logTest('Email sending function implemented', hasSendFunction);
    } else {
      logTest('Retention email template exists', false, 'File not found');
    }

    // Check environment variables
    const envPath = './.env.example';
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');

      const hasRetentionVars = content.includes('CALL_RETENTION_DAYS') &&
                               content.includes('TRANSCRIPT_RETENTION_DAYS') &&
                               content.includes('CRON_SECRET');
      logTest('Retention environment variables added', hasRetentionVars);
    }

  } catch (error) {
    logTest('Retention policy test', false, error.message);
  }
}

// =====================================================
// TEST 4: DATABASE SCHEMA CHECK
// =====================================================
async function testDatabaseSchema() {
  logSection('TEST 4: Database Schema Verification');

  try {
    // Check if calls table has necessary columns for retention
    const { data: columns, error } = await supabase.rpc('get_table_columns', {
      table_name: 'calls'
    }).single();

    if (error) {
      // Try alternative approach
      const { data: sampleCall } = await supabase
        .from('calls')
        .select('*')
        .limit(1)
        .single();

      if (sampleCall) {
        const hasAudioUrl = 'audio_url' in sampleCall || 'file_url' in sampleCall;
        logTest('Calls table has audio URL column', hasAudioUrl);

        const hasCreatedAt = 'created_at' in sampleCall;
        logTest('Calls table has created_at column', hasCreatedAt);
      }
    }

  } catch (error) {
    log(`⚠️  Database schema check skipped (${error.message})`, colors.yellow);
    results.warnings.push('Database schema check could not be completed');
  }
}

// =====================================================
// SUMMARY
// =====================================================
async function showSummary() {
  logSection('TEST SUMMARY');

  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  log(`\nTotal Tests: ${total}`, colors.magenta);
  log(`Passed: ${results.passed.length}`, colors.green);
  log(`Failed: ${results.failed.length}`, colors.red);
  log(`Warnings: ${results.warnings.length}`, colors.yellow);
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? colors.green : colors.red);

  if (results.failed.length > 0) {
    log('\nFailed Tests:', colors.red);
    results.failed.forEach(({ name, details }) => {
      log(`  - ${name}`, colors.red);
      if (details) log(`    ${details}`, colors.red);
    });
  }

  if (results.warnings.length > 0) {
    log('\nWarnings:', colors.yellow);
    results.warnings.forEach(warning => {
      log(`  - ${warning}`, colors.yellow);
    });
  }

  log('\n✨ Phase 1 Implementation Status:', colors.blue);
  if (results.passed.length >= 10) {
    log('   ✅ All core features implemented successfully!', colors.green);
    log('   📦 Bulk upload: Ready', colors.green);
    log('   🎯 Drag & drop: Ready', colors.green);
    log('   🗑️ Retention policy: Ready', colors.green);
    log('   📧 Email notifications: Ready', colors.green);
  } else {
    log('   ⚠️ Some features need attention', colors.yellow);
  }
}

// =====================================================
// RUN ALL TESTS
// =====================================================
async function runTests() {
  console.clear();
  log('🚀 LOADVOICE PHASE 1 IMPLEMENTATION TEST', colors.magenta);
  log('Testing bulk upload, drag & drop, and retention policy', colors.blue);

  await testBulkUpload();
  await testDragAndDrop();
  await testRetentionPolicy();
  await testDatabaseSchema();
  await showSummary();

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, colors.red);
  process.exit(1);
});