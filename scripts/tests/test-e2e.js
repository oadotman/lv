// =====================================================
// END-TO-END TEST SUITE FOR CALLIQ
// Tests critical workflows to identify issues
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testUserEmail: 'test-user@example.com',
  testUserPassword: 'TestPassword123!',
  testTeamMemberEmail: 'test-member@example.com',
  testAudioFile: 'test-audio.mp3', // You'll need to have this file
  testRecordingUrl: 'https://example.com/test-recording.mp3'
};

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName) {
  log(`\n▶ ${testName}`, 'blue');
}

function logSuccess(message) {
  log(`  ✅ ${message}`, 'green');
}

function logError(message) {
  log(`  ❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`  ℹ️  ${message}`, 'magenta');
}

// =====================================================
// TEST 1: CALL PROCESSING VIA FILE UPLOAD
// =====================================================

async function testCallProcessingViaUpload() {
  logSection('TEST 1: CALL PROCESSING VIA FILE UPLOAD');

  try {
    // Step 1: Check if user exists and sign in
    logTest('Step 1: Authentication');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.testUserEmail,
      password: TEST_CONFIG.testUserPassword
    });

    if (authError) {
      logError(`Authentication failed: ${authError.message}`);
      logInfo('Please ensure test user exists or create one first');
      return false;
    }

    const userId = authData.user.id;
    logSuccess(`Authenticated as user: ${userId}`);

    // Step 2: Check organization and usage limits
    logTest('Step 2: Organization & Usage Check');

    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          plan_type,
          max_minutes_monthly,
          current_period_start,
          current_period_end
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!userOrg) {
      logWarning('User has no organization');
      return false;
    }

    const org = userOrg.organizations;
    logSuccess(`User belongs to organization: ${org.name} (${org.plan_type})`);
    logInfo(`Plan limits: ${org.max_minutes_monthly} minutes/month`);

    // Check current usage
    const { count: callCount } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .gte('created_at', org.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    logInfo(`Current period usage: ${callCount || 0} calls processed`);

    // Step 3: Test template creation and selection
    logTest('Step 3: Template Creation');

    const templateName = `Test Template ${Date.now()}`;
    const { data: template, error: templateError } = await supabase
      .from('custom_templates')
      .insert({
        user_id: userId,
        organization_id: org.id,
        name: templateName,
        description: 'E2E Test Template',
        field_count: 3,
        category: 'custom',
        is_active: true
      })
      .select()
      .single();

    if (templateError) {
      logError(`Template creation failed: ${templateError.message}`);
    } else {
      logSuccess(`Created template: ${template.id}`);

      // Add template fields
      const { error: fieldsError } = await supabase
        .from('template_fields')
        .insert([
          {
            template_id: template.id,
            field_name: 'test_field_1',
            field_type: 'text',
            sort_order: 0
          },
          {
            template_id: template.id,
            field_name: 'test_field_2',
            field_type: 'number',
            sort_order: 1
          }
        ]);

      if (fieldsError) {
        logError(`Template fields creation failed: ${fieldsError.message}`);
      } else {
        logSuccess('Template fields added');
      }
    }

    // Step 4: Simulate file upload
    logTest('Step 4: File Upload Simulation');

    const formData = new FormData();

    // Create a test audio file (you'd need a real file in production)
    const testAudioContent = new Blob(['test audio content'], { type: 'audio/mpeg' });
    const testFile = new File([testAudioContent], 'test-call.mp3', { type: 'audio/mpeg' });

    formData.append('file', testFile);
    formData.append('customerName', 'Test Customer');
    formData.append('customerEmail', 'customer@test.com');
    formData.append('salesRep', 'Test Rep');
    formData.append('callDate', new Date().toISOString());
    if (template) {
      formData.append('templateId', template.id);
    }

    // Note: This will fail without a real audio file
    logWarning('File upload test requires real audio file - skipping actual upload');
    logInfo('In production, upload would trigger processing queue');

    // Step 5: Check processing queue status
    logTest('Step 5: Processing Queue Check');

    const queueResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/health`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    });

    if (queueResponse.ok) {
      logSuccess('API health check passed');
    } else {
      logWarning('API health check failed');
    }

    // Step 6: Verify call fields extraction
    logTest('Step 6: Field Extraction Verification');

    // Get most recent call for user
    const { data: recentCall } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentCall) {
      logInfo(`Recent call found: ${recentCall.id} (${recentCall.status})`);

      // Check if template was applied
      if (recentCall.template_id) {
        logSuccess(`Template applied: ${recentCall.template_id}`);

        // Check extracted fields
        const { data: fields } = await supabase
          .from('call_fields')
          .select('*')
          .eq('call_id', recentCall.id);

        if (fields && fields.length > 0) {
          logSuccess(`${fields.length} fields extracted`);

          const templateFields = fields.filter(f => f.template_id);
          const coreFields = fields.filter(f => !f.template_id);

          logInfo(`Core fields: ${coreFields.length}`);
          logInfo(`Template-specific fields: ${templateFields.length}`);
        } else {
          logWarning('No fields extracted yet');
        }
      } else {
        logInfo('No template was used for this call');
      }

      // Check for processing errors
      if (recentCall.processing_error) {
        logError(`Processing error: ${recentCall.processing_error}`);
      }
      if (recentCall.processing_attempts > 0) {
        logWarning(`Processing attempts: ${recentCall.processing_attempts}`);
      }
    } else {
      logInfo('No recent calls found');
    }

    // Cleanup
    if (template) {
      await supabase
        .from('custom_templates')
        .delete()
        .eq('id', template.id);
      logInfo('Test template cleaned up');
    }

    return true;

  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

// =====================================================
// TEST 2: CALL PROCESSING VIA URL IMPORT
// =====================================================

async function testCallProcessingViaURL() {
  logSection('TEST 2: CALL PROCESSING VIA URL IMPORT');

  try {
    logTest('Step 1: URL Import Validation');

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logError('No active session');
      return false;
    }

    // Test URL validation
    const testUrls = [
      'https://zoom.us/rec/share/test123',
      'https://drive.google.com/file/d/test/view',
      'https://www.dropbox.com/s/test/recording.mp4',
      'invalid-url'
    ];

    for (const url of testUrls) {
      logInfo(`Testing URL: ${url}`);

      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/calls/import-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          url: url,
          customerName: 'URL Test Customer',
          salesRep: 'URL Test Rep'
        })
      });

      if (response.ok) {
        logSuccess(`URL accepted: ${url}`);
        const result = await response.json();
        if (result.call) {
          logInfo(`Call created: ${result.call.id}`);
        }
      } else {
        const error = await response.json();
        logWarning(`URL rejected: ${error.error || 'Unknown error'}`);
      }
    }

    return true;

  } catch (error) {
    logError(`URL import test failed: ${error.message}`);
    return false;
  }
}

// =====================================================
// TEST 3: TEAM INVITATION FLOW
// =====================================================

async function testTeamInvitationFlow() {
  logSection('TEST 3: TEAM INVITATION FLOW');

  try {
    logTest('Step 1: Get Admin User Organization');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logError('No active session');
      return false;
    }

    const { data: adminOrg } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organizations (*)
      `)
      .eq('user_id', session.user.id)
      .single();

    if (!adminOrg || adminOrg.role !== 'owner' && adminOrg.role !== 'admin') {
      logWarning('User is not an admin/owner');
      return false;
    }

    const org = adminOrg.organizations;
    logSuccess(`Admin of organization: ${org.name}`);
    logInfo(`Current members: ${org.max_members} max`);

    // Step 2: Check current member count
    logTest('Step 2: Member Count Validation');

    const { count: memberCount } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    logInfo(`Current members: ${memberCount}/${org.max_members}`);

    if (memberCount >= org.max_members) {
      logWarning('Organization at member limit');
      return false;
    }

    // Step 3: Send invitation
    logTest('Step 3: Send Team Invitation');

    const inviteEmail = `test-invite-${Date.now()}@example.com`;

    const inviteResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/teams/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        email: inviteEmail,
        role: 'member',
        organizationId: org.id
      })
    });

    if (!inviteResponse.ok) {
      const error = await inviteResponse.json();
      logError(`Invitation failed: ${error.error}`);
      return false;
    }

    const inviteResult = await inviteResponse.json();
    logSuccess(`Invitation sent to: ${inviteEmail}`);
    logInfo(`Invitation token: ${inviteResult.invitation?.token || 'Hidden'}`);

    // Step 4: Check invitation in database
    logTest('Step 4: Verify Invitation Created');

    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('email', inviteEmail)
      .eq('organization_id', org.id)
      .single();

    if (!invitation) {
      logError('Invitation not found in database');
      return false;
    }

    logSuccess(`Invitation created: ${invitation.id}`);
    logInfo(`Expires at: ${invitation.expires_at}`);
    logInfo(`Token: ${invitation.token}`);

    // Step 5: Test duplicate invitation prevention
    logTest('Step 5: Duplicate Invitation Prevention');

    const duplicateResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/teams/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        email: inviteEmail,
        role: 'member',
        organizationId: org.id
      })
    });

    if (duplicateResponse.ok) {
      logError('Duplicate invitation was allowed!');
    } else {
      logSuccess('Duplicate invitation blocked');
    }

    // Step 6: Test invitation acceptance (simulated)
    logTest('Step 6: Invitation Acceptance');

    const acceptResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/teams/accept-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        token: invitation.token
      })
    });

    if (acceptResponse.ok) {
      logSuccess('Invitation accepted successfully');
    } else {
      const error = await acceptResponse.json();
      logWarning(`Acceptance failed: ${error.error} (expected - different user)`);
    }

    // Step 7: Test token reuse prevention
    logTest('Step 7: Token Reuse Prevention');

    const reuseResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/teams/accept-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        token: invitation.token
      })
    });

    if (reuseResponse.ok) {
      logError('Token reuse was allowed!');
    } else {
      logSuccess('Token reuse prevented');
    }

    // Cleanup
    await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitation.id);

    logInfo('Test invitation cleaned up');

    return true;

  } catch (error) {
    logError(`Team invitation test failed: ${error.message}`);
    return false;
  }
}

// =====================================================
// TEST 4: TEAM USAGE POOL DEDUCTION
// =====================================================

async function testTeamUsagePoolDeduction() {
  logSection('TEST 4: TEAM USAGE POOL DEDUCTION');

  try {
    logTest('Step 1: Get Team Organization');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logError('No active session');
      return false;
    }

    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organizations (*)
      `)
      .eq('user_id', session.user.id)
      .single();

    if (!userOrg) {
      logWarning('User not in organization');
      return false;
    }

    const org = userOrg.organizations;
    logSuccess(`Organization: ${org.name}`);
    logInfo(`Plan: ${org.plan_type} (${org.max_minutes_monthly} minutes/month)`);

    // Step 2: Check current usage
    logTest('Step 2: Current Usage Check');

    const periodStart = org.current_period_start ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: orgCalls } = await supabase
      .from('calls')
      .select('duration_minutes')
      .eq('organization_id', org.id)
      .gte('created_at', periodStart);

    const totalMinutes = orgCalls?.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) || 0;

    logInfo(`Current usage: ${totalMinutes}/${org.max_minutes_monthly} minutes`);
    logInfo(`Remaining: ${org.max_minutes_monthly - totalMinutes} minutes`);

    // Step 3: Verify member uploads count against org pool
    logTest('Step 3: Member Upload Verification');

    const { data: allMembers } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        role,
        auth.users (
          email
        )
      `)
      .eq('organization_id', org.id);

    logInfo(`Organization has ${allMembers?.length || 0} members`);

    for (const member of allMembers || []) {
      const { count: memberCalls } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.user_id)
        .eq('organization_id', org.id)
        .gte('created_at', periodStart);

      logInfo(`  Member ${member.auth?.users?.email}: ${memberCalls || 0} calls`);
    }

    // Step 4: Test usage limit enforcement
    logTest('Step 4: Usage Limit Enforcement');

    if (totalMinutes >= org.max_minutes_monthly) {
      logWarning('Organization at usage limit');

      // Try to upload and verify it's blocked
      const uploadTest = await fetch(`${TEST_CONFIG.baseUrl}/api/calls/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: new FormData() // Empty form to test validation
      });

      if (uploadTest.status === 402) {
        logSuccess('Upload correctly blocked at limit');
        const error = await uploadTest.json();
        logInfo(`Limit message: ${error.details?.message}`);
      } else {
        logError('Upload not blocked despite limit reached!');
      }
    } else {
      logSuccess('Organization within usage limits');
      logInfo('Uploads should be allowed');
    }

    // Step 5: Check overage handling
    logTest('Step 5: Overage System Check');

    const { data: overageSettings } = await supabase
      .from('organizations')
      .select('overage_enabled, overage_rate_per_minute, purchased_overage_minutes')
      .eq('id', org.id)
      .single();

    if (overageSettings?.overage_enabled) {
      logSuccess('Overage enabled for organization');
      logInfo(`Overage rate: $${overageSettings.overage_rate_per_minute}/minute`);
      logInfo(`Purchased overage: ${overageSettings.purchased_overage_minutes || 0} minutes`);
    } else {
      logInfo('Overage not enabled');
    }

    return true;

  } catch (error) {
    logError(`Usage pool test failed: ${error.message}`);
    return false;
  }
}

// =====================================================
// RUN ALL TESTS
// =====================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           CALLIQ END-TO-END TEST SUITE                ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results = {
    callUpload: false,
    urlImport: false,
    teamInvitation: false,
    usagePool: false
  };

  // Run tests
  results.callUpload = await testCallProcessingViaUpload();
  results.urlImport = await testCallProcessingViaURL();
  results.teamInvitation = await testTeamInvitationFlow();
  results.usagePool = await testTeamUsagePoolDeduction();

  // Summary
  logSection('TEST SUMMARY');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log('');
  log(`Call Upload Test: ${results.callUpload ? '✅ PASSED' : '❌ FAILED'}`,
      results.callUpload ? 'green' : 'red');
  log(`URL Import Test: ${results.urlImport ? '✅ PASSED' : '❌ FAILED'}`,
      results.urlImport ? 'green' : 'red');
  log(`Team Invitation Test: ${results.teamInvitation ? '✅ PASSED' : '❌ FAILED'}`,
      results.teamInvitation ? 'green' : 'red');
  log(`Usage Pool Test: ${results.usagePool ? '✅ PASSED' : '❌ FAILED'}`,
      results.usagePool ? 'green' : 'red');

  console.log('\n' + '='.repeat(60));
  if (passed === total) {
    log(`ALL TESTS PASSED (${passed}/${total})`, 'green');
  } else {
    log(`TESTS COMPLETED: ${passed}/${total} passed`, passed > total/2 ? 'yellow' : 'red');
  }
  console.log('='.repeat(60) + '\n');

  // Sign out
  await supabase.auth.signOut();
}

// Run tests
runAllTests().catch(console.error);