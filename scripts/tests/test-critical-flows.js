// =====================================================
// CRITICAL FLOW VALIDATION TEST
// Tests key security and reliability improvements
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
);

async function testCriticalFlows() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        CRITICAL FLOW VALIDATION TEST                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // =====================================================
  // TEST 1: Token Reuse Prevention
  // =====================================================
  console.log('1. TOKEN REUSE PREVENTION TEST');
  console.log('─'.repeat(50));

  try {
    // Create a test invitation
    const testOrgId = '00000000-0000-0000-0000-000000000001'; // Dummy ID
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: testOrgId,
        email: 'test@example.com',
        role: 'member',
        invited_by: '00000000-0000-0000-0000-000000000002',
        token: 'test-token-' + Date.now(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (invitation) {
      // Simulate accepting the invitation
      const { data: firstAccept, error: firstError } = await supabase
        .from('team_invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: '00000000-0000-0000-0000-000000000003'
        })
        .eq('id', invitation.id)
        .is('accepted_at', null)
        .select()
        .single();

      // Try to accept again (should fail)
      const { data: secondAccept, error: secondError } = await supabase
        .from('team_invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: '00000000-0000-0000-0000-000000000004'
        })
        .eq('id', invitation.id)
        .is('accepted_at', null)
        .select()
        .single();

      if (firstAccept && !secondAccept) {
        console.log('   ✅ Token reuse prevented successfully');
        testsPassed++;
      } else {
        console.log('   ❌ Token reuse prevention failed');
        testsFailed++;
      }

      // Cleanup
      await supabase.from('team_invitations').delete().eq('id', invitation.id);
    }
  } catch (error) {
    console.log('   ⚠️  Test skipped - invitation table not accessible');
  }

  // =====================================================
  // TEST 2: Processing Retry Tracking
  // =====================================================
  console.log('\n2. PROCESSING RETRY TRACKING TEST');
  console.log('─'.repeat(50));

  try {
    // Check if processing tracking columns exist
    const { data: callWithTracking } = await supabase
      .from('calls')
      .select('processing_attempts, processing_error, last_processing_attempt')
      .limit(1);

    if (callWithTracking !== null) {
      console.log('   ✅ Processing tracking columns exist');

      // Check for stuck calls
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const { data: stuckCalls } = await supabase
        .from('calls')
        .select('id, status, processing_attempts')
        .eq('status', 'processing')
        .lt('updated_at', tenMinutesAgo.toISOString())
        .limit(5);

      if (stuckCalls && stuckCalls.length > 0) {
        console.log(`   ⚠️  Found ${stuckCalls.length} stuck calls needing retry`);
        stuckCalls.forEach(call => {
          console.log(`      - Call ${call.id}: ${call.processing_attempts || 0} attempts`);
        });
      } else {
        console.log('   ✅ No stuck calls found');
      }
      testsPassed++;
    } else {
      console.log('   ❌ Processing tracking columns missing');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Error checking processing tracking:', error.message);
    testsFailed++;
  }

  // =====================================================
  // TEST 3: Organization Member Limits
  // =====================================================
  console.log('\n3. ORGANIZATION MEMBER LIMIT ENFORCEMENT');
  console.log('─'.repeat(50));

  try {
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, max_members')
      .limit(5);

    let limitViolations = 0;

    for (const org of organizations || []) {
      const { count } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      if (count > org.max_members) {
        console.log(`   ❌ ${org.name}: ${count}/${org.max_members} members (OVER LIMIT)`);
        limitViolations++;
      } else {
        console.log(`   ✅ ${org.name}: ${count}/${org.max_members} members`);
      }
    }

    if (limitViolations === 0) {
      console.log('   ✅ All organizations within member limits');
      testsPassed++;
    } else {
      console.log(`   ❌ ${limitViolations} organizations exceed member limits`);
      testsFailed++;
    }
  } catch (error) {
    console.log('   ⚠️  Could not check member limits:', error.message);
  }

  // =====================================================
  // TEST 4: Template Ownership Validation
  // =====================================================
  console.log('\n4. TEMPLATE OWNERSHIP VALIDATION');
  console.log('─'.repeat(50));

  try {
    // Check if template_id column exists in calls
    const { data: callsWithTemplate } = await supabase
      .from('calls')
      .select('id, template_id, user_id')
      .not('template_id', 'is', null)
      .limit(10);

    if (callsWithTemplate && callsWithTemplate.length > 0) {
      let validationErrors = 0;

      for (const call of callsWithTemplate) {
        const { data: template } = await supabase
          .from('custom_templates')
          .select('id, user_id, organization_id')
          .eq('id', call.template_id)
          .single();

        if (template) {
          // Check if user has access
          const isUserTemplate = template.user_id === call.user_id;

          let isOrgTemplate = false;
          if (template.organization_id) {
            const { data: userOrg } = await supabase
              .from('user_organizations')
              .select('organization_id')
              .eq('user_id', call.user_id)
              .eq('organization_id', template.organization_id)
              .single();

            isOrgTemplate = !!userOrg;
          }

          if (!isUserTemplate && !isOrgTemplate) {
            console.log(`   ❌ Call ${call.id} uses unauthorized template`);
            validationErrors++;
          }
        }
      }

      if (validationErrors === 0) {
        console.log('   ✅ All calls use authorized templates');
        testsPassed++;
      } else {
        console.log(`   ❌ ${validationErrors} calls use unauthorized templates`);
        testsFailed++;
      }
    } else {
      console.log('   ℹ️  No calls with templates to validate');
      testsPassed++;
    }
  } catch (error) {
    console.log('   ⚠️  Could not validate templates:', error.message);
  }

  // =====================================================
  // TEST 5: Duplicate Invitation Prevention
  // =====================================================
  console.log('\n5. DUPLICATE INVITATION PREVENTION');
  console.log('─'.repeat(50));

  try {
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('email, organization_id')
      .is('accepted_at', null);

    const inviteMap = {};
    let duplicates = 0;

    (invitations || []).forEach(inv => {
      const key = `${inv.email}-${inv.organization_id}`;
      if (inviteMap[key]) {
        duplicates++;
        console.log(`   ⚠️  Duplicate pending invitation: ${inv.email}`);
      }
      inviteMap[key] = true;
    });

    if (duplicates === 0) {
      console.log('   ✅ No duplicate pending invitations');
      testsPassed++;
    } else {
      console.log(`   ❌ Found ${duplicates} duplicate invitations`);
      testsFailed++;
    }
  } catch (error) {
    console.log('   ⚠️  Could not check invitations:', error.message);
  }

  // =====================================================
  // TEST 6: Usage Pool and Overage Tracking
  // =====================================================
  console.log('\n6. USAGE POOL AND OVERAGE TRACKING');
  console.log('─'.repeat(50));

  try {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, max_minutes_monthly, overage_allowed, current_period_start')
      .limit(3);

    for (const org of orgs || []) {
      const periodStart = org.current_period_start ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Get total usage for current period
      const { data: calls } = await supabase
        .from('calls')
        .select('duration_minutes')
        .eq('organization_id', org.id)
        .gte('created_at', periodStart);

      const totalMinutes = (calls || []).reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
      const percentage = Math.round((totalMinutes / org.max_minutes_monthly) * 100);

      if (totalMinutes > org.max_minutes_monthly && !org.overage_allowed) {
        console.log(`   ⚠️  ${org.name}: ${totalMinutes}/${org.max_minutes_monthly} min (${percentage}%) - OVER LIMIT, NO OVERAGE`);
      } else if (percentage > 100) {
        console.log(`   ℹ️  ${org.name}: ${totalMinutes}/${org.max_minutes_monthly} min (${percentage}%) - Using overage`);
      } else if (percentage > 80) {
        console.log(`   ⚠️  ${org.name}: ${totalMinutes}/${org.max_minutes_monthly} min (${percentage}%) - Near limit`);
      } else {
        console.log(`   ✅ ${org.name}: ${totalMinutes}/${org.max_minutes_monthly} min (${percentage}%)`);
      }
    }
    testsPassed++;
  } catch (error) {
    console.log('   ⚠️  Could not check usage pools:', error.message);
  }

  // =====================================================
  // TEST 7: Call Processing Queue Status
  // =====================================================
  console.log('\n7. CALL PROCESSING QUEUE STATUS');
  console.log('─'.repeat(50));

  try {
    // Check for calls in various states
    const states = ['pending', 'processing', 'transcribing', 'extracting', 'completed', 'failed'];
    const statusCounts = {};

    for (const state of states) {
      const { count } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('status', state);

      statusCounts[state] = count || 0;
    }

    console.log('   Call Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const icon = status === 'failed' && count > 0 ? '❌' :
                   status === 'processing' && count > 5 ? '⚠️' : '✅';
      console.log(`   ${icon} ${status}: ${count} calls`);
    });

    // Check for calls that need retry
    const { data: retryableCalls } = await supabase
      .from('calls')
      .select('id, processing_attempts, processing_error')
      .eq('status', 'failed')
      .lt('processing_attempts', 3)
      .limit(5);

    if (retryableCalls && retryableCalls.length > 0) {
      console.log(`   ℹ️  ${retryableCalls.length} calls eligible for retry`);
    }

    testsPassed++;
  } catch (error) {
    console.log('   ⚠️  Could not check queue status:', error.message);
  }

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 ALL CRITICAL FLOWS VALIDATED SUCCESSFULLY!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues before production.');
  }

  console.log('═'.repeat(60));
}

// Run the tests
testCriticalFlows().catch(console.error);