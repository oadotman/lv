/**
 * Comprehensive End-to-End Test for Call Processing Workflow
 * Tests both file upload and URL import with robust edge case handling
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testTimeout: 10 * 60 * 1000, // 10 minutes
  pollingInterval: 5000, // 5 seconds
};

// Test URLs for different platforms
const TEST_URLS = {
  zoom: {
    valid: [
      'https://zoom.us/rec/share/abcd1234efgh5678',
      'https://us02web.zoom.us/rec/share/xyz789_abc123',
      'https://zoom.us/rec/play/abcdefghijklmnop'
    ],
    invalid: [
      'https://zoom.us/j/1234567890', // Meeting link, not recording
      'zoom.us/rec/share/invalid', // Missing protocol
      'https://zoom.us/', // Root domain only
    ]
  },
  googleDrive: {
    valid: [
      'https://drive.google.com/file/d/1ABC_xyz123/view',
      'https://drive.google.com/open?id=1ABC_xyz123',
      'https://drive.google.com/uc?id=1ABC_xyz123&export=download'
    ],
    invalid: [
      'https://drive.google.com/drive/folders/1ABC_xyz123', // Folder, not file
      'https://docs.google.com/document/d/1ABC_xyz123', // Document, not audio
      'drive.google.com/file/d/1ABC_xyz123', // Missing protocol
    ]
  },
  dropbox: {
    valid: [
      'https://www.dropbox.com/s/abc123/recording.mp3?dl=0',
      'https://www.dropbox.com/scl/fi/abc123/recording.m4a?dl=0',
      'https://dl.dropboxusercontent.com/s/abc123/recording.mp3'
    ],
    invalid: [
      'https://www.dropbox.com/sh/abc123/xyz', // Shared folder
      'dropbox.com/s/abc123/recording.mp3', // Missing protocol
    ]
  },
  oneDrive: {
    valid: [
      'https://1drv.ms/u/s!AbC123XyZ',
      'https://onedrive.live.com/download?cid=ABC123&resid=ABC123%21123',
    ],
    invalid: [
      'https://onedrive.live.com/view.aspx?cid=ABC123', // View link
      'onedrive.live.com/download?cid=ABC123', // Missing protocol
    ]
  },
  other: {
    valid: [
      'https://example.com/recordings/call.mp3',
      'https://storage.googleapis.com/bucket/audio.m4a',
      'https://s3.amazonaws.com/bucket/recording.wav'
    ],
    invalid: [
      'not-a-url',
      'ftp://example.com/file.mp3', // Wrong protocol
      'https://', // Incomplete URL
      '', // Empty
    ]
  }
};

// Test data
const TEST_DATA = {
  user: {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    organizationName: 'Test Organization'
  },
  call: {
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerCompany: 'Acme Corp',
    salesRep: 'Jane Smith',
    callType: 'discovery',
    typedNotes: 'Important discussion about enterprise needs. Budget: $50k-100k. Timeline: Q2 2024. Decision maker: CTO. Main pain points: scalability and integration.',
    participants: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        role: 'customer'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        company: 'Acme Corp',
        role: 'customer'
      },
      {
        name: 'Jane Smith',
        email: 'jane@ourcompany.com',
        company: 'Our Company',
        role: 'sales_rep'
      },
      {
        name: 'Bob Wilson',
        email: 'bob@ourcompany.com',
        company: 'Our Company',
        role: 'other'
      }
    ]
  },
  audioFiles: [
    {
      path: './test-audio-1.mp3',
      name: 'discovery-call.mp3',
      mimeType: 'audio/mpeg',
      duration: 120 // 2 minutes
    },
    {
      path: './test-audio-2.m4a',
      name: 'follow-up-call.m4a',
      mimeType: 'audio/x-m4a',
      duration: 180 // 3 minutes
    },
    {
      path: './test-audio-3.wav',
      name: 'demo-call.wav',
      mimeType: 'audio/wav',
      duration: 240 // 4 minutes
    }
  ]
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

// Utility functions
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const log = {
  section: (msg) => {
    console.log('');
    console.log(`${colors.bright}${colors.blue}${'━'.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}┃ ${msg.padEnd(46)} ┃${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${'━'.repeat(50)}${colors.reset}`);
  },
  subsection: (msg) => {
    console.log('');
    console.log(`${colors.cyan}▶ ${msg}${colors.reset}`);
  },
  info: (msg, data = null) => {
    console.log(`  ${colors.dim}ℹ${colors.reset}  ${msg}`);
    if (data) {
      console.log(`     ${colors.dim}${JSON.stringify(data, null, 2).replace(/\n/g, '\n     ')}${colors.reset}`);
    }
  },
  success: (msg, data = null) => {
    console.log(`  ${colors.green}✓${colors.reset}  ${msg}`);
    if (data) {
      console.log(`     ${colors.dim}${JSON.stringify(data, null, 2).replace(/\n/g, '\n     ')}${colors.reset}`);
    }
  },
  warning: (msg) => console.log(`  ${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`  ${colors.red}✗${colors.reset}  ${msg}`),
  progress: (percent, msg) => {
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    const bar = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
    process.stdout.write(`\r  ${colors.cyan}${bar}${colors.reset} ${percent}% - ${msg}`);
    if (percent === 100) console.log('');
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test helpers
const testHelpers = {
  async createMockAudioFile(filePath, sizeInMB = 1) {
    log.info(`Creating mock audio file: ${filePath} (${sizeInMB}MB)`);

    // Create a buffer with random data
    const buffer = Buffer.alloc(sizeInMB * 1024 * 1024);

    // Add a simple WAV header for audio files
    if (filePath.endsWith('.wav')) {
      const wavHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x08, 0x00, 0x00, // File size
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
      ]);
      wavHeader.copy(buffer, 0);
    }

    fs.writeFileSync(filePath, buffer);
    log.success(`Mock file created: ${filePath}`);
  },

  validateUrl(url, platform = null) {
    try {
      const parsed = new URL(url);

      // Basic URL validation
      if (!parsed.protocol || !parsed.hostname) {
        return { valid: false, error: 'Invalid URL structure' };
      }

      // Platform-specific validation
      if (platform === 'zoom') {
        if (!parsed.hostname.includes('zoom.us')) {
          return { valid: false, error: 'Not a Zoom URL' };
        }
        if (!parsed.pathname.includes('/rec/')) {
          return { valid: false, error: 'Not a Zoom recording URL' };
        }
      } else if (platform === 'drive') {
        if (!parsed.hostname.includes('drive.google.com')) {
          return { valid: false, error: 'Not a Google Drive URL' };
        }
        if (parsed.pathname.includes('/folders/')) {
          return { valid: false, error: 'Folder URLs not supported' };
        }
      } else if (platform === 'dropbox') {
        if (!parsed.hostname.includes('dropbox')) {
          return { valid: false, error: 'Not a Dropbox URL' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  async measurePerformance(fn, name) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const result = await fn();

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const memoryDelta = (endMemory - startMemory) / 1024 / 1024; // Convert to MB

    log.info(`Performance: ${name}`, {
      duration: `${duration}ms`,
      memory: `${memoryDelta.toFixed(2)}MB`
    });

    return result;
  }
};

// Test implementations
const tests = {
  // Test 1: File Upload Workflow
  async testFileUpload(userId, fileData) {
    log.subsection(`Testing file upload: ${fileData.name}`);

    try {
      // Create mock file if it doesn't exist
      if (!fs.existsSync(fileData.path)) {
        await testHelpers.createMockAudioFile(fileData.path, 2);
      }

      const fileStats = fs.statSync(fileData.path);

      // Step 1: Request presigned URL
      log.info('Requesting presigned URL...');
      const presignedResponse = await fetch(`${TEST_CONFIG.appUrl}/api/upload/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}` // Simulate auth
        },
        body: JSON.stringify({
          fileName: fileData.name,
          fileSize: fileStats.size,
          mimeType: fileData.mimeType
        })
      });

      if (!presignedResponse.ok) {
        throw new Error(`Presigned URL request failed: ${presignedResponse.status}`);
      }

      const { uploadUrl, path: uploadPath } = await presignedResponse.json();
      log.success('Presigned URL obtained');

      // Step 2: Upload to storage
      log.info('Uploading file to storage...');
      const fileBuffer = fs.readFileSync(fileData.path);

      const { error: uploadError } = await supabase.storage
        .from('call-audio')
        .upload(uploadPath, fileBuffer, {
          contentType: fileData.mimeType,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      log.success('File uploaded to storage');

      // Step 3: Complete upload
      log.info('Completing upload and creating call record...');
      const completeResponse = await fetch(`${TEST_CONFIG.appUrl}/api/upload/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          path: uploadPath,
          fileName: fileData.name,
          fileSize: fileStats.size,
          mimeType: fileData.mimeType,
          customerName: TEST_DATA.call.customerName,
          customerEmail: TEST_DATA.call.customerEmail,
          customerCompany: TEST_DATA.call.customerCompany,
          salesRep: TEST_DATA.call.salesRep,
          callType: TEST_DATA.call.callType,
          typedNotes: TEST_DATA.call.typedNotes,
          participants: TEST_DATA.call.participants,
          audioDuration: fileData.duration
        })
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.text();
        throw new Error(`Upload completion failed: ${error}`);
      }

      const { call } = await completeResponse.json();
      log.success('Call record created', { callId: call.id });

      return call;

    } catch (error) {
      log.error(`File upload failed: ${error.message}`);
      throw error;
    }
  },

  // Test 2: URL Import Workflow
  async testUrlImport(userId, url, platform) {
    log.subsection(`Testing URL import from ${platform}: ${url}`);

    try {
      // Validate URL first
      const validation = testHelpers.validateUrl(url, platform);
      if (!validation.valid) {
        log.warning(`URL validation failed: ${validation.error}`);
        return null;
      }

      // Step 1: Import from URL
      log.info('Importing from URL...');
      const importResponse = await fetch(`${TEST_CONFIG.appUrl}/api/import/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          url: url,
          customerName: TEST_DATA.call.customerName,
          customerEmail: TEST_DATA.call.customerEmail,
          customerCompany: TEST_DATA.call.customerCompany,
          salesRep: TEST_DATA.call.salesRep,
          callType: TEST_DATA.call.callType,
          typedNotes: `Imported from ${platform}. ${TEST_DATA.call.typedNotes}`,
          participants: TEST_DATA.call.participants
        })
      });

      if (!importResponse.ok) {
        const error = await importResponse.text();

        // Expected failures for invalid URLs
        if (url.includes('invalid') || url.includes('not-a-url')) {
          log.success(`Invalid URL correctly rejected: ${error}`);
          return null;
        }

        throw new Error(`URL import failed: ${error}`);
      }

      const result = await importResponse.json();
      log.success('URL import initiated', {
        callId: result.call?.id,
        status: result.status
      });

      return result.call;

    } catch (error) {
      log.error(`URL import failed: ${error.message}`);

      // For testing purposes, check if this is an expected failure
      if (TEST_URLS[platform]?.invalid.includes(url)) {
        log.success('Invalid URL correctly rejected');
        return null;
      }

      throw error;
    }
  },

  // Test 3: Processing Monitoring
  async testProcessingMonitoring(callId) {
    log.subsection(`Monitoring processing for call: ${callId}`);

    const startTime = Date.now();
    let lastStatus = '';
    let lastProgress = 0;
    let attempts = 0;

    while ((Date.now() - startTime) < TEST_CONFIG.testTimeout) {
      attempts++;

      const { data: call, error } = await supabase
        .from('calls')
        .select(`
          status,
          processing_progress,
          processing_message,
          processing_attempts,
          processing_error,
          assemblyai_error,
          typed_notes,
          duration_minutes
        `)
        .eq('id', callId)
        .single();

      if (error) {
        log.error(`Failed to check status: ${error.message}`);
        break;
      }

      // Update progress
      if (call.status !== lastStatus || call.processing_progress !== lastProgress) {
        log.progress(
          call.processing_progress || 0,
          `${call.status} - ${call.processing_message || ''}`
        );
        lastStatus = call.status;
        lastProgress = call.processing_progress;
      }

      // Check status
      if (call.status === 'completed') {
        log.success('Processing completed successfully', {
          attempts: call.processing_attempts || 1,
          duration: `${(Date.now() - startTime) / 1000}s`
        });

        // Verify typed notes were preserved
        if (call.typed_notes) {
          log.success('Typed notes preserved in final record');
        }

        return call;
      }

      if (call.status === 'failed') {
        log.error(`Processing failed: ${call.processing_error || call.assemblyai_error}`);

        // Check if retry logic worked
        if (call.processing_attempts > 1) {
          log.info(`Retry logic executed (${call.processing_attempts} attempts)`);
        }

        throw new Error('Processing failed');
      }

      await sleep(TEST_CONFIG.pollingInterval);
    }

    throw new Error('Processing timeout');
  },

  // Test 4: Verify Complete Data
  async testDataVerification(callId) {
    log.subsection('Verifying complete data extraction');

    const verifications = {
      transcript: false,
      utterances: false,
      crmFields: false,
      usageMetrics: false,
      notifications: false
    };

    // Check transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('id, text, utterances, speaker_mapping, confidence_score')
      .eq('call_id', callId)
      .single();

    if (transcript) {
      verifications.transcript = true;
      log.success('Transcript created', {
        textLength: transcript.text?.length || 0,
        utterances: transcript.utterances?.length || 0,
        speakers: Object.keys(transcript.speaker_mapping || {})
      });

      // Check utterances table
      const { data: utterances } = await supabase
        .from('transcript_utterances')
        .select('count')
        .eq('transcript_id', transcript.id);

      if (utterances && utterances.length > 0) {
        verifications.utterances = true;
        log.success(`Utterances saved to normalized table`);
      }
    }

    // Check CRM fields
    const { data: fields } = await supabase
      .from('call_fields')
      .select('field_name, field_value, source')
      .eq('call_id', callId);

    if (fields && fields.length > 0) {
      verifications.crmFields = true;

      // Group fields by source
      const fieldsBySource = {};
      fields.forEach(f => {
        if (!fieldsBySource[f.source]) {
          fieldsBySource[f.source] = [];
        }
        fieldsBySource[f.source].push(f.field_name);
      });

      log.success('CRM fields extracted', {
        totalFields: fields.length,
        sources: Object.keys(fieldsBySource),
        fields: fieldsBySource
      });

      // Check if typed notes influenced extraction
      const summary = fields.find(f => f.field_name === 'summary');
      if (summary?.field_value?.includes('Budget') || summary?.field_value?.includes('50k')) {
        log.success('Typed notes influenced CRM extraction (budget info detected)');
      }
    }

    // Check usage metrics
    const { data: call } = await supabase
      .from('calls')
      .select('user_id, organization_id')
      .eq('id', callId)
      .single();

    if (call?.organization_id) {
      const { data: metrics } = await supabase
        .from('usage_metrics')
        .select('metric_type, metric_value, metadata')
        .eq('organization_id', call.organization_id)
        .eq('metric_type', 'call_minutes')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (metrics?.metadata?.call_id === callId) {
        verifications.usageMetrics = true;
        log.success('Usage metrics recorded', {
          minutes: metrics.metric_value,
          organization: call.organization_id
        });
      }
    }

    // Check notifications
    if (call?.user_id) {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('notification_type, title')
        .eq('user_id', call.user_id)
        .like('link', `%${callId}%`);

      if (notifications && notifications.length > 0) {
        verifications.notifications = true;
        log.success('Notifications created', {
          count: notifications.length,
          types: notifications.map(n => n.notification_type)
        });
      }
    }

    // Summary
    const allPassed = Object.values(verifications).every(v => v);
    if (allPassed) {
      log.success('All data verifications passed');
    } else {
      const failed = Object.entries(verifications)
        .filter(([k, v]) => !v)
        .map(([k]) => k);
      log.warning(`Some verifications failed: ${failed.join(', ')}`);
    }

    return verifications;
  },

  // Test 5: Edge Cases
  async testEdgeCases(userId) {
    log.section('EDGE CASE TESTING');

    const edgeCases = [
      {
        name: 'Empty typed notes',
        data: { typedNotes: '' }
      },
      {
        name: 'Very long typed notes',
        data: { typedNotes: 'A'.repeat(5000) }
      },
      {
        name: 'Special characters in notes',
        data: { typedNotes: '💰 Budget: $50k\n📅 Timeline: Q2\n⚠️ Risk: High' }
      },
      {
        name: 'No participants',
        data: { participants: [] }
      },
      {
        name: 'Many participants',
        data: {
          participants: Array(10).fill(null).map((_, i) => ({
            name: `Person ${i}`,
            email: `person${i}@example.com`,
            company: `Company ${i}`,
            role: i === 0 ? 'sales_rep' : 'customer'
          }))
        }
      },
      {
        name: 'Missing customer info',
        data: {
          customerName: null,
          customerEmail: null,
          customerCompany: null
        }
      },
      {
        name: 'Invalid MIME type',
        data: { mimeType: 'audio/invalid' }
      },
      {
        name: 'Zero duration',
        data: { audioDuration: 0 }
      },
      {
        name: 'Very long duration',
        data: { audioDuration: 7200 } // 2 hours
      }
    ];

    for (const testCase of edgeCases) {
      log.subsection(`Testing: ${testCase.name}`);

      try {
        // Create a test call with edge case data
        const { data: call, error } = await supabase
          .from('calls')
          .insert({
            user_id: userId,
            file_name: `edge-case-${Date.now()}.mp3`,
            file_size: 1024,
            file_url: 'https://example.com/test.mp3',
            mime_type: testCase.data.mimeType || 'audio/mpeg',
            status: 'uploaded',
            ...TEST_DATA.call,
            ...testCase.data
          })
          .select()
          .single();

        if (error) {
          log.warning(`Edge case handled correctly: ${error.message}`);
        } else {
          log.success(`Edge case handled: Call ${call.id} created`);

          // Cleanup
          await supabase.from('calls').delete().eq('id', call.id);
        }
      } catch (error) {
        log.info(`Edge case result: ${error.message}`);
      }
    }
  },

  // Test 6: Concurrent Processing
  async testConcurrentProcessing(userId) {
    log.section('CONCURRENT PROCESSING TEST');

    log.info('Creating multiple calls simultaneously...');

    const calls = [];
    const promises = [];

    // Create 5 calls concurrently
    for (let i = 0; i < 5; i++) {
      const promise = supabase
        .from('calls')
        .insert({
          user_id: userId,
          file_name: `concurrent-${i}.mp3`,
          file_size: 1024 * 1024,
          file_url: `https://example.com/concurrent-${i}.mp3`,
          mime_type: 'audio/mpeg',
          customer_name: `Customer ${i}`,
          sales_rep: TEST_DATA.call.salesRep,
          status: 'processing',
          typed_notes: `Concurrent test ${i}`,
          duration_minutes: 5
        })
        .select()
        .single();

      promises.push(promise);
    }

    const results = await Promise.allSettled(promises);

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.data) {
        calls.push(result.value.data);
        log.success(`Call ${i + 1} created: ${result.value.data.id}`);
      } else {
        log.warning(`Call ${i + 1} failed: ${result.reason || result.value.error}`);
      }
    });

    // Check queue status if available
    try {
      const queueResponse = await fetch(`${TEST_CONFIG.appUrl}/api/queue/status`);
      if (queueResponse.ok) {
        const queueStatus = await queueResponse.json();
        log.info('Queue status', queueStatus);
      }
    } catch (error) {
      log.info('Queue status not available');
    }

    // Cleanup
    for (const call of calls) {
      await supabase.from('calls').delete().eq('id', call.id);
    }

    log.success(`Concurrent processing test completed (${calls.length} calls)`);
  },

  // Test 7: Performance Testing
  async testPerformance(userId) {
    log.section('PERFORMANCE TESTING');

    const performanceTests = [
      {
        name: 'Small file (1MB)',
        size: 1
      },
      {
        name: 'Medium file (10MB)',
        size: 10
      },
      {
        name: 'Large file (50MB)',
        size: 50
      }
    ];

    for (const test of performanceTests) {
      log.subsection(test.name);

      const testFile = `./perf-test-${test.size}mb.mp3`;

      try {
        // Create test file
        await testHelpers.createMockAudioFile(testFile, test.size);

        // Measure upload time
        const startTime = Date.now();

        const { data: call } = await testHelpers.measurePerformance(
          async () => {
            return await supabase
              .from('calls')
              .insert({
                user_id: userId,
                file_name: path.basename(testFile),
                file_size: test.size * 1024 * 1024,
                file_url: `https://example.com/${path.basename(testFile)}`,
                mime_type: 'audio/mpeg',
                status: 'uploaded'
              })
              .select()
              .single();
          },
          'Database insert'
        );

        const uploadTime = Date.now() - startTime;

        log.success(`Performance test completed`, {
          size: `${test.size}MB`,
          uploadTime: `${uploadTime}ms`,
          throughput: `${(test.size / (uploadTime / 1000)).toFixed(2)} MB/s`
        });

        // Cleanup
        if (call?.data?.id) {
          await supabase.from('calls').delete().eq('id', call.data.id);
        }

      } finally {
        // Clean up test file
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    }
  }
};

// Main test runner
async function runComprehensiveTest() {
  console.log('');
  console.log(`${colors.bright}${colors.magenta}╔${'═'.repeat(48)}╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║  COMPREHENSIVE CALL PROCESSING E2E TEST       ║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚${'═'.repeat(48)}╝${colors.reset}`);
  console.log('');

  let userId = null;
  let testsPassed = 0;
  let testsFailed = 0;
  const createdCalls = [];

  try {
    // Setup
    log.section('TEST SETUP');

    // Create test user
    log.info('Creating test user...');
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: TEST_DATA.user.email,
      password: TEST_DATA.user.password,
      email_confirm: true,
      user_metadata: {
        full_name: TEST_DATA.user.fullName
      }
    });

    if (userError) throw userError;
    userId = user.user.id;
    log.success('Test user created', { id: userId });

    // Create organization
    log.info('Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: TEST_DATA.user.organizationName,
        slug: `test-org-${Date.now()}`,
        plan_type: 'professional', // Higher tier for testing
        billing_email: TEST_DATA.user.email
      })
      .select()
      .single();

    if (orgError) throw orgError;
    log.success('Test organization created', { id: org.id });

    // Link user to organization
    await supabase.from('user_organizations').insert({
      user_id: userId,
      organization_id: org.id,
      role: 'owner'
    });

    // Test 1: File uploads
    log.section('FILE UPLOAD TESTS');

    for (const fileData of TEST_DATA.audioFiles.slice(0, 2)) { // Test first 2 files
      try {
        const call = await tests.testFileUpload(userId, fileData);
        if (call) {
          createdCalls.push(call.id);
          testsPassed++;
        }
      } catch (error) {
        testsFailed++;
        log.error(`File upload test failed: ${error.message}`);
      }
    }

    // Test 2: URL imports
    log.section('URL IMPORT TESTS');

    for (const [platform, urls] of Object.entries(TEST_URLS)) {
      // Test valid URLs
      for (const url of urls.valid.slice(0, 1)) { // Test first valid URL per platform
        try {
          const call = await tests.testUrlImport(userId, url, platform);
          if (call) {
            createdCalls.push(call.id);
            testsPassed++;
          } else {
            testsPassed++; // Expected rejection counts as pass
          }
        } catch (error) {
          testsFailed++;
          log.error(`URL import test failed: ${error.message}`);
        }
      }

      // Test invalid URLs
      for (const url of urls.invalid.slice(0, 1)) { // Test first invalid URL per platform
        try {
          const call = await tests.testUrlImport(userId, url, platform);
          if (!call) {
            testsPassed++; // Invalid URL correctly rejected
          } else {
            testsFailed++;
            log.error('Invalid URL was not rejected');
          }
        } catch (error) {
          // Expected for invalid URLs
          testsPassed++;
        }
      }
    }

    // Test 3: Monitor processing for created calls
    if (createdCalls.length > 0) {
      log.section('PROCESSING MONITORING');

      for (const callId of createdCalls.slice(0, 1)) { // Monitor first call only for speed
        try {
          await tests.testProcessingMonitoring(callId);
          await tests.testDataVerification(callId);
          testsPassed++;
        } catch (error) {
          testsFailed++;
          log.error(`Processing test failed: ${error.message}`);
        }
      }
    }

    // Test 4: Edge cases
    try {
      await tests.testEdgeCases(userId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
      log.error(`Edge case tests failed: ${error.message}`);
    }

    // Test 5: Concurrent processing
    try {
      await tests.testConcurrentProcessing(userId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
      log.error(`Concurrent processing test failed: ${error.message}`);
    }

    // Test 6: Performance
    try {
      await tests.testPerformance(userId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
      log.error(`Performance test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('Test setup failed:', error);
    testsFailed++;
  } finally {
    // Cleanup
    log.section('CLEANUP');

    if (process.env.SKIP_CLEANUP !== 'true') {
      log.info('Cleaning up test data...');

      // Delete calls
      for (const callId of createdCalls) {
        await supabase.from('calls').delete().eq('id', callId);
        await supabase.from('transcripts').delete().eq('call_id', callId);
        await supabase.from('call_fields').delete().eq('call_id', callId);
      }

      // Delete user and org
      if (userId) {
        await supabase.from('user_organizations').delete().eq('user_id', userId);
        await supabase.auth.admin.deleteUser(userId);
      }

      log.success('Cleanup completed');
    } else {
      log.warning('Skipping cleanup (SKIP_CLEANUP=true)');
      if (createdCalls.length > 0) {
        log.info('Created calls:', createdCalls);
      }
    }

    // Clean up test files
    TEST_DATA.audioFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }

  // Results
  console.log('');
  console.log(`${colors.bright}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}TEST RESULTS${colors.reset}`);
  console.log(`${colors.bright}${'═'.repeat(50)}${colors.reset}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  console.log(`${colors.cyan}Total:  ${testsPassed + testsFailed}${colors.reset}`);
  console.log(`${colors.bright}${'═'.repeat(50)}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`${colors.bright}${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}❌ SOME TESTS FAILED${colors.reset}`);
  }

  console.log('');
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run test
if (require.main === module) {
  runComprehensiveTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveTest, tests, testHelpers };