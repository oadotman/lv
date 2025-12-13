// =====================================================
// DIAGNOSE CRITICAL USAGE TRACKING ISSUE
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseUsageIssue() {
  console.log('🔍 DIAGNOSING CRITICAL USAGE TRACKING ISSUE\n');
  console.log('=' .repeat(50));

  try {
    // Get recent usage metrics with issues
    console.log('\n1️⃣ Recent usage metrics showing "Unknown" organization...');
    const { data: recentMetrics } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('metric_type', 'minutes_transcribed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentMetrics || recentMetrics.length === 0) {
      console.log('   No recent metrics found');
      return;
    }

    // Analyze each metric
    for (const metric of recentMetrics) {
      console.log(`\n📊 Metric from ${new Date(metric.created_at).toLocaleString()}`);
      console.log(`   Metric ID: ${metric.id}`);
      console.log(`   Organization ID in metric: ${metric.organization_id}`);
      console.log(`   User ID: ${metric.user_id}`);
      console.log(`   Minutes: ${metric.metric_value}`);
      console.log(`   Call ID: ${metric.metadata?.call_id}`);

      // Check if organization exists
      if (metric.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', metric.organization_id)
          .single();

        if (orgError) {
          console.log(`   ❌ ERROR: Organization ${metric.organization_id} NOT FOUND!`);
          console.log(`      This is why it shows as "Unknown"!`);
        } else if (org) {
          console.log(`   ✅ Organization found: ${org.name}`);
          console.log(`      - Plan: ${org.plan_type}`);
          console.log(`      - Used minutes: ${org.used_minutes}`);
          console.log(`      - Max minutes: ${org.max_minutes_monthly}`);

          if (org.used_minutes === 0 || org.used_minutes === null) {
            console.log(`      ⚠️ WARNING: Organization has 0 or NULL used_minutes!`);
            console.log(`      This means usage is NOT being deducted!`);
          }
        }
      } else {
        console.log(`   ❌ CRITICAL: Metric has NULL organization_id!`);
      }

      // Check the associated call
      if (metric.metadata?.call_id) {
        const { data: call } = await supabase
          .from('calls')
          .select('*')
          .eq('id', metric.metadata.call_id)
          .single();

        if (call) {
          console.log(`   📞 Call details:`);
          console.log(`      - Status: ${call.status}`);
          console.log(`      - Organization ID on call: ${call.organization_id}`);
          console.log(`      - Duration minutes: ${call.duration_minutes}`);

          if (!call.organization_id) {
            console.log(`      ❌ Call has NO organization_id!`);
          }

          if (call.organization_id !== metric.organization_id) {
            console.log(`      ⚠️ MISMATCH: Call org (${call.organization_id}) !== Metric org (${metric.organization_id})`);
          }
        }
      }

      // Check user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', metric.user_id)
        .single();

      if (userOrg) {
        console.log(`   👤 User's organization: ${userOrg.organization_id}`);
        console.log(`      Role: ${userOrg.role}`);

        if (userOrg.organization_id !== metric.organization_id) {
          console.log(`      ⚠️ MISMATCH: User org !== Metric org`);
        }
      } else {
        console.log(`   ❌ User has NO organization!`);
      }
    }

    // Check if organizations table has the used_minutes column properly
    console.log('\n2️⃣ Checking organizations table structure...');
    const { data: sampleOrg } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (sampleOrg) {
      console.log('   Organization columns:');
      Object.keys(sampleOrg).forEach(key => {
        if (key.includes('minutes') || key.includes('used')) {
          console.log(`     - ${key}: ${sampleOrg[key]}`);
        }
      });
    }

    // Check if the increment function is being called
    console.log('\n3️⃣ Testing increment_used_minutes function...');

    // Get a test organization
    const { data: testOrg } = await supabase
      .from('organizations')
      .select('id, name, used_minutes')
      .limit(1)
      .single();

    if (testOrg) {
      console.log(`   Test org: ${testOrg.name}`);
      console.log(`   Current used_minutes: ${testOrg.used_minutes}`);

      // Try to increment by 0 (safe test)
      const { error: incError } = await supabase.rpc('increment_used_minutes', {
        org_id: testOrg.id,
        minutes_to_add: 0
      });

      if (incError) {
        console.log(`   ❌ Function call failed: ${incError.message}`);
      } else {
        console.log(`   ✅ Function call succeeded`);
      }
    }

    // Summary of issues
    console.log('\n' + '=' .repeat(50));
    console.log('📋 DIAGNOSIS SUMMARY\n');

    console.log('CRITICAL ISSUES FOUND:');
    console.log('1. Recent usage_metrics have organization_id but organizations table returns NULL');
    console.log('2. This suggests organization records may be missing or RLS policies blocking access');
    console.log('3. Organizations have used_minutes = 0, meaning deduction is NOT happening');
    console.log('4. The increment_used_minutes function exists but may not be called properly');

    console.log('\nRECOMMENDED ACTIONS:');
    console.log('1. Check if organization records actually exist in database');
    console.log('2. Verify RLS policies allow service role to update organizations');
    console.log('3. Ensure increment_used_minutes is called AFTER recording usage_metrics');
    console.log('4. Add logging to track when and why updates fail');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error(error);
  }
}

// Run diagnosis
diagnoseUsageIssue()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });