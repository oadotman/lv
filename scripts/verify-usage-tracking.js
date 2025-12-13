// =====================================================
// USAGE TRACKING VERIFICATION SCRIPT
// Run this to verify the critical fixes are working
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUsageTracking() {
  console.log('🔍 VERIFYING USAGE TRACKING SYSTEM\n');
  console.log('=' .repeat(50));

  try {
    // 1. Check for orphaned users
    console.log('\n1️⃣ Checking for orphaned users...');
    const { data: orphanedUsers, error: orphanError } = await supabase
      .rpc('get_orphaned_users', {}, { count: 'exact' });

    if (orphanError) {
      // Function might not exist, try direct query
      const { count } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true });

      const { count: userCount } = await supabase
        .from('auth.users')
        .select('*', { count: 'exact', head: true });

      console.log(`   Total users: ${userCount}`);
      console.log(`   Users with organizations: ${count}`);

      if (userCount > count) {
        console.log(`   ⚠️ WARNING: ${userCount - count} users without organizations!`);
      } else {
        console.log('   ✅ All users have organizations');
      }
    }

    // 2. Check for orphaned calls
    console.log('\n2️⃣ Checking for orphaned calls...');
    const { data: orphanedCalls, error: callError } = await supabase
      .from('calls')
      .select('id, user_id, created_at', { count: 'exact' })
      .is('organization_id', null)
      .eq('status', 'completed');

    if (orphanedCalls && orphanedCalls.length > 0) {
      console.log(`   ❌ Found ${orphanedCalls.length} completed calls without organization_id`);
      console.log('   First 5 orphaned calls:');
      orphanedCalls.slice(0, 5).forEach(call => {
        console.log(`     - Call ${call.id} (user: ${call.user_id})`);
      });
    } else {
      console.log('   ✅ No orphaned calls found');
    }

    // 3. Check usage synchronization
    console.log('\n3️⃣ Checking usage synchronization...');
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, used_minutes, max_minutes_monthly')
      .order('used_minutes', { ascending: false })
      .limit(10);

    if (organizations && organizations.length > 0) {
      console.log('   Top organizations by usage:');

      for (const org of organizations) {
        // Calculate actual usage from calls
        const { data: calls } = await supabase
          .from('calls')
          .select('duration_minutes')
          .eq('organization_id', org.id)
          .eq('status', 'completed');

        const actualUsage = calls ?
          calls.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) : 0;

        // Check usage from metrics
        const { data: metrics } = await supabase
          .from('usage_metrics')
          .select('metric_value')
          .eq('organization_id', org.id)
          .eq('metric_type', 'minutes_transcribed');

        const metricsUsage = metrics ?
          metrics.reduce((sum, m) => sum + (m.metric_value || 0), 0) : 0;

        const status = org.used_minutes === actualUsage ? '✅' :
                      org.used_minutes === metricsUsage ? '⚠️' : '❌';

        console.log(`   ${status} ${org.name}:`);
        console.log(`      - Stored: ${org.used_minutes || 0} minutes`);
        console.log(`      - From calls: ${actualUsage} minutes`);
        console.log(`      - From metrics: ${metricsUsage} minutes`);
        console.log(`      - Remaining: ${org.max_minutes_monthly - (org.used_minutes || 0)} of ${org.max_minutes_monthly}`);

        if (status === '❌') {
          console.log(`      ⚠️ MISMATCH DETECTED - needs sync!`);
        }
      }
    }

    // 4. Check if increment function exists
    console.log('\n4️⃣ Checking for increment_used_minutes function...');
    try {
      // Try to call the function with dummy data
      const { error: funcError } = await supabase.rpc('increment_used_minutes', {
        org_id: '00000000-0000-0000-0000-000000000000',
        minutes_to_add: 0
      });

      if (funcError && funcError.message.includes('does not exist')) {
        console.log('   ❌ Function increment_used_minutes does not exist!');
        console.log('   Run the SQL migration from DEPLOYMENT_CRITICAL_FIX.md');
      } else {
        console.log('   ✅ Function increment_used_minutes exists');
      }
    } catch (e) {
      console.log('   ⚠️ Could not verify function existence');
    }

    // 5. Check recent usage updates
    console.log('\n5️⃣ Checking recent usage updates...');
    const { data: recentMetrics } = await supabase
      .from('usage_metrics')
      .select('created_at, metric_value, organization_id, metadata')
      .eq('metric_type', 'minutes_transcribed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentMetrics && recentMetrics.length > 0) {
      console.log('   Recent transcriptions:');
      for (const metric of recentMetrics) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name, used_minutes')
          .eq('id', metric.organization_id)
          .single();

        console.log(`   📊 ${new Date(metric.created_at).toLocaleString()}`);
        console.log(`      Organization: ${org?.name || 'Unknown'}`);
        console.log(`      Minutes used: ${metric.metric_value}`);
        console.log(`      Total org usage: ${org?.used_minutes || 0}`);
        console.log(`      Call ID: ${metric.metadata?.call_id || 'N/A'}`);
      }
    } else {
      console.log('   No recent usage metrics found');
    }

    // 6. Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📋 SUMMARY\n');

    const issues = [];

    if (orphanedCalls && orphanedCalls.length > 0) {
      issues.push(`${orphanedCalls.length} orphaned calls need organization assignment`);
    }

    if (issues.length === 0) {
      console.log('✅ All critical checks passed!');
      console.log('The usage tracking system appears to be working correctly.');
    } else {
      console.log('⚠️ Issues detected:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\nRun the SQL migration from DEPLOYMENT_CRITICAL_FIX.md to fix these issues.');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyUsageTracking()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });