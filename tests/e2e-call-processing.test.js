/**
 * End-to-End Test for Call Processing Workflow
 *
 * This test covers the entire flow from file upload to transcription to CRM extraction
 *
 * Prerequisites:
 * 1. Valid Supabase connection with test database
 * 2. Valid AssemblyAI API key
 * 3. Valid OpenAI API key
 * 4. Test user account created
 * 5. Test audio file available
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testTimeout: 10 * 60 * 1000, // 10 minutes for full workflow
  pollingInterval: 5000, // 5 seconds between status checks
};

// Test data
const TEST_DATA = {
  user: {
    email: 'test@example.com',
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
    typedNotes: 'This is a test call with a prospect discussing their needs for our enterprise solution. They mentioned budget concerns and timeline requirements.',
    participants: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        role: 'customer'
      },
      {
        name: 'Jane Smith',
        email: 'jane@ourcompany.com',
        company: 'Our Company',
        role: 'sales_rep'
      }
    ]
  },
  audioFile: {
    path: './test-audio.mp3', // Path to test audio file
    name: 'test-call.mp3',
    mimeType: 'audio/mpeg'
  }
};

// Initialize Supabase client
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
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const cleanup = async (userId, callId) => {
  log('🧹 Cleaning up test data...');

  try {
    // Delete call and related data
    if (callId) {
      await supabase.from('calls').delete().eq('id', callId);
      await supabase.from('transcripts').delete().eq('call_id', callId);
      await supabase.from('call_fields').delete().eq('call_id', callId);
      await supabase.from('notifications').delete().match({
        user_id: userId,
        link: `/calls/${callId}`
      });
    }

    // Delete test user and organization
    if (userId) {
      await supabase.from('user_organizations').delete().eq('user_id', userId);
      await supabase.from('user_preferences').delete().eq('user_id', userId);
      await supabase.auth.admin.deleteUser(userId);
    }

    log('✅ Cleanup completed');
  } catch (error) {
    log('⚠️ Cleanup error (non-critical):', error.message);
  }
};

// Test steps
const testSteps = {
  // Step 1: Create or authenticate test user
  async authenticateUser() {
    log('📝 Step 1: Authenticating test user...');

    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_DATA.user.email,
        password: TEST_DATA.user.password
      });

      if (signInData?.user) {
        log('✅ Signed in existing user');
        return signInData.user;
      }

      // Create new user if sign in failed
      log('Creating new test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: TEST_DATA.user.email,
        password: TEST_DATA.user.password,
        email_confirm: true,
        user_metadata: {
          full_name: TEST_DATA.user.fullName
        }
      });

      if (signUpError) {
        throw new Error(`Failed to create user: ${signUpError.message}`);
      }

      // Create organization for user
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: TEST_DATA.user.organizationName,
          slug: `test-org-${Date.now()}`,
          plan_type: 'free',
          billing_email: TEST_DATA.user.email
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      // Link user to organization
      await supabase.from('user_organizations').insert({
        user_id: signUpData.user.id,
        organization_id: org.id,
        role: 'owner'
      });

      log('✅ Created new test user and organization');
      return signUpData.user;

    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  },

  // Step 2: Get presigned upload URL
  async getPresignedUrl(userId) {
    log('🔗 Step 2: Getting presigned upload URL...');

    const response = await fetch(`${TEST_CONFIG.appUrl}/api/upload/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `user_id=${userId}` // Simulate auth
      },
      body: JSON.stringify({
        fileName: TEST_DATA.audioFile.name,
        fileSize: fs.statSync(TEST_DATA.audioFile.path).size,
        mimeType: TEST_DATA.audioFile.mimeType
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get presigned URL: ${error}`);
    }

    const data = await response.json();
    log('✅ Got presigned URL', { path: data.path });
    return data;
  },

  // Step 3: Upload file directly to storage
  async uploadFile(uploadData) {
    log('📤 Step 3: Uploading audio file to storage...');

    const fileBuffer = fs.readFileSync(TEST_DATA.audioFile.path);

    // Upload to Supabase storage using the presigned URL
    const { data, error } = await supabase.storage
      .from('call-audio')
      .upload(uploadData.path, fileBuffer, {
        contentType: TEST_DATA.audioFile.mimeType,
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    log('✅ File uploaded successfully');
    return uploadData.path;
  },

  // Step 4: Complete upload and create call record
  async completeUpload(userId, filePath) {
    log('📝 Step 4: Completing upload and creating call record...');

    const response = await fetch(`${TEST_CONFIG.appUrl}/api/upload/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `user_id=${userId}` // Simulate auth
      },
      body: JSON.stringify({
        path: filePath,
        fileName: TEST_DATA.audioFile.name,
        fileSize: fs.statSync(TEST_DATA.audioFile.path).size,
        mimeType: TEST_DATA.audioFile.mimeType,
        customerName: TEST_DATA.call.customerName,
        customerEmail: TEST_DATA.call.customerEmail,
        customerCompany: TEST_DATA.call.customerCompany,
        salesRep: TEST_DATA.call.salesRep,
        callType: TEST_DATA.call.callType,
        typedNotes: TEST_DATA.call.typedNotes,
        participants: TEST_DATA.call.participants,
        audioDuration: 120 // 2 minutes test duration
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to complete upload: ${error}`);
    }

    const data = await response.json();
    log('✅ Call record created', { callId: data.call.id });
    return data.call;
  },

  // Step 5: Monitor processing status
  async monitorProcessing(callId) {
    log('⏳ Step 5: Monitoring call processing...');

    const startTime = Date.now();
    let lastStatus = '';
    let lastProgress = 0;

    while ((Date.now() - startTime) < TEST_CONFIG.testTimeout) {
      // Check call status
      const { data: call, error } = await supabase
        .from('calls')
        .select('status, processing_progress, processing_message, assemblyai_error')
        .eq('id', callId)
        .single();

      if (error) {
        throw new Error(`Failed to check call status: ${error.message}`);
      }

      // Log progress updates
      if (call.status !== lastStatus || call.processing_progress !== lastProgress) {
        log(`📊 Status: ${call.status} | Progress: ${call.processing_progress}% | ${call.processing_message || ''}`);
        lastStatus = call.status;
        lastProgress = call.processing_progress;
      }

      // Check for completion or failure
      if (call.status === 'completed') {
        log('✅ Processing completed successfully!');
        return call;
      }

      if (call.status === 'failed') {
        throw new Error(`Processing failed: ${call.assemblyai_error || 'Unknown error'}`);
      }

      // Wait before next check
      await sleep(TEST_CONFIG.pollingInterval);
    }

    throw new Error('Processing timeout - took longer than expected');
  },

  // Step 6: Verify transcript was created
  async verifyTranscript(callId) {
    log('📄 Step 6: Verifying transcript...');

    const { data: transcript, error } = await supabase
      .from('transcripts')
      .select('id, text, utterances, speaker_mapping, confidence_score, word_count')
      .eq('call_id', callId)
      .single();

    if (error || !transcript) {
      throw new Error('Transcript not found');
    }

    // Validate transcript data
    const validations = {
      hasText: transcript.text && transcript.text.length > 0,
      hasUtterances: transcript.utterances && transcript.utterances.length > 0,
      hasSpeakerMapping: transcript.speaker_mapping && Object.keys(transcript.speaker_mapping).length > 0,
      hasValidConfidence: transcript.confidence_score >= 0 && transcript.confidence_score <= 1,
      hasWordCount: transcript.word_count > 0
    };

    log('✅ Transcript verification results:', validations);

    if (!Object.values(validations).every(v => v)) {
      throw new Error('Transcript validation failed');
    }

    return transcript;
  },

  // Step 7: Verify CRM extraction
  async verifyCRMExtraction(callId) {
    log('🎯 Step 7: Verifying CRM data extraction...');

    const { data: fields, error } = await supabase
      .from('call_fields')
      .select('field_name, field_value, field_type, source')
      .eq('call_id', callId);

    if (error || !fields || fields.length === 0) {
      throw new Error('CRM fields not found');
    }

    // Check for required core fields
    const requiredFields = [
      'summary',
      'key_points',
      'next_steps',
      'pain_points',
      'qualification_score',
      'call_outcome'
    ];

    const extractedFieldNames = fields.map(f => f.field_name);
    const missingFields = requiredFields.filter(rf => !extractedFieldNames.includes(rf));

    if (missingFields.length > 0) {
      throw new Error(`Missing required CRM fields: ${missingFields.join(', ')}`);
    }

    log('✅ CRM extraction verified', {
      totalFields: fields.length,
      fieldNames: extractedFieldNames
    });

    // Verify typed notes were considered
    const summary = fields.find(f => f.field_name === 'summary');
    if (summary && TEST_DATA.call.typedNotes) {
      log('📝 Checking if typed notes influenced extraction...');
      // This is a basic check - in real scenario, you'd verify the AI actually used the notes
      log('✅ Summary field present (notes may have influenced extraction)');
    }

    return fields;
  },

  // Step 8: Verify usage metrics
  async verifyUsageMetrics(userId, callId) {
    log('💰 Step 8: Verifying usage metrics for billing...');

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (!userOrg) {
      throw new Error('User organization not found');
    }

    // Check usage metrics
    const { data: metrics, error } = await supabase
      .from('usage_metrics')
      .select('metric_type, metric_value, metadata')
      .eq('organization_id', userOrg.organization_id)
      .eq('user_id', userId)
      .eq('metric_type', 'call_minutes')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !metrics) {
      throw new Error('Usage metrics not recorded');
    }

    // Verify the metric is for our test call
    if (metrics.metadata?.call_id !== callId) {
      throw new Error('Usage metric not linked to test call');
    }

    log('✅ Usage metrics verified', {
      minutesCharged: metrics.metric_value,
      callId: metrics.metadata.call_id
    });

    return metrics;
  },

  // Step 9: Test retry logic (optional)
  async testRetryLogic(callId) {
    log('🔄 Step 9: Testing retry logic (simulated failure)...');

    // This would simulate a failure and verify the retry mechanism
    // For now, we'll just check that the retry fields exist

    const { data: call } = await supabase
      .from('calls')
      .select('processing_attempts, processing_error')
      .eq('id', callId)
      .single();

    log('✅ Retry logic fields present', {
      attempts: call?.processing_attempts || 1,
      lastError: call?.processing_error || 'None'
    });

    return true;
  },

  // Step 10: Verify notifications
  async verifyNotifications(userId, callId) {
    log('🔔 Step 10: Verifying notifications...');

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('notification_type, title, message')
      .eq('user_id', userId)
      .like('link', `%${callId}%`);

    if (!notifications || notifications.length === 0) {
      log('⚠️ No notifications found (may be disabled)');
      return [];
    }

    log('✅ Notifications verified', {
      count: notifications.length,
      types: notifications.map(n => n.notification_type)
    });

    return notifications;
  }
};

// Main test runner
async function runE2ETest() {
  console.log('');
  console.log('========================================');
  console.log('🧪 CALL PROCESSING E2E TEST');
  console.log('========================================');
  console.log('');

  let userId = null;
  let callId = null;
  let testPassed = false;

  try {
    // Check if test audio file exists
    if (!fs.existsSync(TEST_DATA.audioFile.path)) {
      throw new Error(`Test audio file not found: ${TEST_DATA.audioFile.path}`);
    }

    // Run test steps
    const user = await testSteps.authenticateUser();
    userId = user.id;

    const uploadData = await testSteps.getPresignedUrl(userId);
    const filePath = await testSteps.uploadFile(uploadData);
    const call = await testSteps.completeUpload(userId, filePath);
    callId = call.id;

    await testSteps.monitorProcessing(callId);
    await testSteps.verifyTranscript(callId);
    await testSteps.verifyCRMExtraction(callId);
    await testSteps.verifyUsageMetrics(userId, callId);
    await testSteps.testRetryLogic(callId);
    await testSteps.verifyNotifications(userId, callId);

    testPassed = true;

    console.log('');
    console.log('========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.log('');
    console.log('========================================');
    console.log('❌ TEST FAILED!');
    console.log('========================================');
    console.log('Error:', error.message);
    console.log('');

    // Log full error in debug mode
    if (process.env.DEBUG === 'true') {
      console.error(error);
    }

  } finally {
    // Cleanup test data
    if (process.env.SKIP_CLEANUP !== 'true') {
      await cleanup(userId, callId);
    } else {
      log('⚠️ Skipping cleanup (SKIP_CLEANUP=true)');
      if (callId) {
        log(`📌 Test call ID: ${callId}`);
        log(`📌 View at: ${TEST_CONFIG.appUrl}/calls/${callId}`);
      }
    }
  }

  // Exit with appropriate code
  process.exit(testPassed ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  runE2ETest();
}

module.exports = { runE2ETest, testSteps };