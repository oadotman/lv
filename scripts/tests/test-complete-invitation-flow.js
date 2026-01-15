/**
 * COMPREHENSIVE END-TO-END TEST: Invitation to Usage Flow
 *
 * This test verifies every step from invitation to usage tracking
 * to identify exactly where the issue occurs.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration - Using actual emails from the system
const TEST_CONFIG = {
  teamOwnerEmail: 'evelyn.etaifo@protonmail.com', // From console logs - this might be the invited member
  invitedMemberEmail: 'evelyn.etaifo@protonmail.com', // The user we're testing
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCompleteInvitationFlow() {
  log('\n🔬 COMPREHENSIVE INVITATION TO USAGE FLOW TEST', 'cyan');
  log('=' .repeat(70), 'cyan');

  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // ============================================
    // STEP 1: VERIFY TEAM ORGANIZATION EXISTS
    // ============================================
    log('\n📋 STEP 1: Verify Team Organization', 'blue');
    log('-'.repeat(50));

    const { data: ownerUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_CONFIG.teamOwnerEmail)
      .single();

    if (!ownerUser) {
      testResults.failed.push('Team owner user not found');
      log(`❌ Team owner not found: ${TEST_CONFIG.teamOwnerEmail}`, 'red');
      return testResults;
    }
    log(`✅ Found team owner: ${ownerUser.email}`, 'green');

    const { data: ownerOrgs } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organization:organizations(*)
      `)
      .eq('user_id', ownerUser.id);

    const teamOrg = ownerOrgs?.find(o => o.organization.max_members > 1);

    if (!teamOrg) {
      testResults.failed.push('No team organization found');
      log('❌ No team organization found for owner', 'red');
      return testResults;
    }

    const organization = teamOrg.organization;
    log(`✅ Found team organization: ${organization.name}`, 'green');
    log(`   ID: ${organization.id}`);
    log(`   Plan: ${organization.plan_type}`);
    log(`   Max Minutes: ${organization.max_minutes_monthly}`);
    log(`   Current Usage: ${organization.used_minutes || 0}`);
    testResults.passed.push('Team organization exists');

    // ============================================
    // STEP 2: VERIFY INVITED MEMBER EXISTS
    // ============================================
    log('\n📋 STEP 2: Verify Invited Member', 'blue');
    log('-'.repeat(50));

    const { data: invitedUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_CONFIG.invitedMemberEmail)
      .single();

    if (!invitedUser) {
      testResults.failed.push('Invited member not found');
      log(`❌ Invited member not found: ${TEST_CONFIG.invitedMemberEmail}`, 'red');
      log('   User needs to sign up via invitation link first', 'yellow');
      return testResults;
    }
    log(`✅ Found invited member: ${invitedUser.email}`, 'green');
    testResults.passed.push('Invited member exists');

    // ============================================
    // STEP 3: VERIFY MEMBER IS IN ORGANIZATION
    // ============================================
    log('\n📋 STEP 3: Verify Member-Organization Relationship', 'blue');
    log('-'.repeat(50));

    const { data: memberOrgs } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        joined_at,
        organization:organizations(name, plan_type)
      `)
      .eq('user_id', invitedUser.id);

    const memberInTeam = memberOrgs?.find(mo => mo.organization_id === organization.id);

    if (!memberInTeam) {
      testResults.failed.push('Member not in team organization');
      log(`❌ Member is NOT in team organization!`, 'red');
      log(`   Member's organizations:`, 'yellow');
      memberOrgs?.forEach(mo => {
        log(`   - ${mo.organization.name} (${mo.role})`, 'yellow');
      });
    } else {
      log(`✅ Member IS in team organization`, 'green');
      log(`   Role: ${memberInTeam.role}`);
      log(`   Joined: ${new Date(memberInTeam.joined_at).toLocaleDateString()}`);
      testResults.passed.push('Member in organization');
    }

    // ============================================
    // STEP 4: CHECK MEMBER'S CALLS
    // ============================================
    log('\n📋 STEP 4: Analyze Member\'s Calls', 'blue');
    log('-'.repeat(50));

    const { data: memberCalls } = await supabase
      .from('calls')
      .select(`
        id,
        organization_id,
        status,
        duration_minutes,
        created_at,
        file_name
      `)
      .eq('user_id', invitedUser.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!memberCalls || memberCalls.length === 0) {
      testResults.warnings.push('Member has no calls');
      log('⚠️ Member has not uploaded any calls yet', 'yellow');
    } else {
      log(`Found ${memberCalls.length} calls from member:`, 'cyan');

      let correctOrgCount = 0;
      let wrongOrgCount = 0;
      let noOrgCount = 0;
      let completedCount = 0;
      let totalMinutes = 0;

      memberCalls.forEach(call => {
        const isTeamOrg = call.organization_id === organization.id;
        const hasOrg = call.organization_id !== null;
        const isCompleted = call.status === 'completed';

        if (!hasOrg) {
          noOrgCount++;
          log(`\n❌ Call ${call.id.substring(0, 8)}... has NO organization!`, 'red');
        } else if (!isTeamOrg) {
          wrongOrgCount++;
          log(`\n⚠️ Call ${call.id.substring(0, 8)}... has WRONG organization!`, 'yellow');
        } else {
          correctOrgCount++;
          log(`\n✅ Call ${call.id.substring(0, 8)}... has CORRECT organization`, 'green');
        }

        log(`   File: ${call.file_name}`);
        log(`   Date: ${new Date(call.created_at).toLocaleString()}`);
        log(`   Status: ${call.status} ${isCompleted ? '✅' : '⏳'}`);
        log(`   Duration: ${call.duration_minutes || 0} minutes`);
        log(`   Org ID: ${call.organization_id || 'NULL'}`);

        if (isCompleted) {
          completedCount++;
          if (isTeamOrg) {
            totalMinutes += (call.duration_minutes || 0);
          }
        }
      });

      // Summary
      log('\n📊 Call Analysis Summary:', 'magenta');
      log(`   Correct Organization: ${correctOrgCount}/${memberCalls.length}`, correctOrgCount === memberCalls.length ? 'green' : 'yellow');
      log(`   Wrong Organization: ${wrongOrgCount}/${memberCalls.length}`, wrongOrgCount > 0 ? 'red' : 'green');
      log(`   No Organization: ${noOrgCount}/${memberCalls.length}`, noOrgCount > 0 ? 'red' : 'green');
      log(`   Completed Status: ${completedCount}/${memberCalls.length}`, completedCount === memberCalls.length ? 'green' : 'yellow');
      log(`   Total Minutes (team org only): ${totalMinutes}`, 'cyan');

      if (correctOrgCount === memberCalls.length) {
        testResults.passed.push('All calls have correct organization');
      } else {
        testResults.failed.push(`${memberCalls.length - correctOrgCount} calls have wrong/missing organization`);
      }

      if (completedCount < memberCalls.length) {
        testResults.warnings.push(`${memberCalls.length - completedCount} calls not marked as completed`);
      }
    }

    // ============================================
    // STEP 5: VERIFY DASHBOARD CALCULATION
    // ============================================
    log('\n📋 STEP 5: Verify Dashboard Calculation Logic', 'blue');
    log('-'.repeat(50));

    // Simulate dashboard calculation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all completed calls for the organization this month
    const { data: orgCalls } = await supabase
      .from('calls')
      .select('duration_minutes, user_id')
      .eq('organization_id', organization.id)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', now.toISOString());

    const dashboardTotal = orgCalls?.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) || 0;

    log(`Dashboard would show: ${dashboardTotal} minutes used`, 'cyan');
    log(`Organization stored usage: ${organization.used_minutes || 0} minutes`, 'cyan');

    if (dashboardTotal === 0 && orgCalls && orgCalls.length > 0) {
      testResults.failed.push('Dashboard calculation returns 0 despite having calls');
      log('❌ CRITICAL: Dashboard shows 0 minutes but there are calls!', 'red');
      log('   This means duration_minutes is NULL for completed calls', 'red');
    } else if (dashboardTotal > 0) {
      testResults.passed.push('Dashboard calculation works correctly');
      log('✅ Dashboard calculation is working', 'green');
    }

    // ============================================
    // STEP 6: CHECK CRITICAL FIELDS
    // ============================================
    log('\n📋 STEP 6: Check Critical Fields', 'blue');
    log('-'.repeat(50));

    // Check a recent completed call for all required fields
    if (memberCalls && memberCalls.length > 0) {
      const recentCall = memberCalls.find(c => c.status === 'completed') || memberCalls[0];

      log(`Checking call ${recentCall.id.substring(0, 8)}...`);

      const criticalChecks = {
        'Has organization_id': recentCall.organization_id !== null,
        'Correct organization_id': recentCall.organization_id === organization.id,
        'Status is completed': recentCall.status === 'completed',
        'Has duration_minutes': recentCall.duration_minutes !== null && recentCall.duration_minutes > 0,
      };

      Object.entries(criticalChecks).forEach(([check, passed]) => {
        if (passed) {
          log(`  ✅ ${check}`, 'green');
          testResults.passed.push(check);
        } else {
          log(`  ❌ ${check}`, 'red');
          testResults.failed.push(check);
        }
      });
    }

    // ============================================
    // STEP 7: CHECK USAGE_METRICS TABLE
    // ============================================
    log('\n📋 STEP 7: Check usage_metrics Table', 'blue');
    log('-'.repeat(50));

    const { data: usageMetrics } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', invitedUser.id)
      .gte('created_at', startOfMonth.toISOString());

    if (!usageMetrics || usageMetrics.length === 0) {
      testResults.warnings.push('No usage_metrics entries found');
      log('⚠️ No usage_metrics entries for this member', 'yellow');
      log('   This is OK if using duration_minutes from calls table', 'yellow');
    } else {
      const metricsTotal = usageMetrics.reduce((sum, m) => sum + (m.metric_value || 0), 0);
      log(`✅ Found ${usageMetrics.length} usage_metrics entries`, 'green');
      log(`   Total: ${metricsTotal} minutes`, 'cyan');
    }

  } catch (error) {
    testResults.failed.push(`Test error: ${error.message}`);
    log(`\n❌ Test error: ${error}`, 'red');
  }

  // ============================================
  // FINAL REPORT
  // ============================================
  log('\n' + '='.repeat(70), 'magenta');
  log('📊 TEST RESULTS SUMMARY', 'magenta');
  log('='.repeat(70), 'magenta');

  log(`\n✅ PASSED (${testResults.passed.length}):`, 'green');
  testResults.passed.forEach(test => log(`   • ${test}`, 'green'));

  if (testResults.warnings.length > 0) {
    log(`\n⚠️ WARNINGS (${testResults.warnings.length}):`, 'yellow');
    testResults.warnings.forEach(test => log(`   • ${test}`, 'yellow'));
  }

  if (testResults.failed.length > 0) {
    log(`\n❌ FAILED (${testResults.failed.length}):`, 'red');
    testResults.failed.forEach(test => log(`   • ${test}`, 'red'));

    log('\n🔧 TROUBLESHOOTING STEPS:', 'cyan');
    log('1. Ensure invited member accepted invitation properly', 'cyan');
    log('2. Check browser console when uploading for organization context', 'cyan');
    log('3. Verify localStorage has currentOrganizationId set', 'cyan');
    log('4. Check that calls have duration_minutes field set', 'cyan');
    log('5. Ensure calls are marked as "completed" status', 'cyan');
    log('6. Run fix-organization-tracking.js if needed', 'cyan');
  } else {
    log('\n🎉 ALL CRITICAL TESTS PASSED!', 'green');
  }

  return testResults;
}

// Run the test
console.log('Starting comprehensive test...\n');
testCompleteInvitationFlow()
  .then(results => {
    if (results.failed.length > 0) {
      log('\n❌ Test completed with failures', 'red');
      process.exit(1);
    } else {
      log('\n✅ Test completed successfully', 'green');
      process.exit(0);
    }
  })
  .catch(error => {
    log(`\n❌ Test failed: ${error}`, 'red');
    process.exit(1);
  });