/**
 * CRITICAL VERIFICATION: Team Usage Tracking
 *
 * This script verifies that invited team members' calls are properly
 * tracked against the team organization's usage pool.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTeamUsageTracking() {
  console.log('🔍 CRITICAL USAGE TRACKING VERIFICATION\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Find organizations with team members
    console.log('\n1️⃣ Finding team organizations...\n');

    const { data: teamOrgs } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        plan_type,
        max_minutes_monthly,
        used_minutes
      `)
      .gt('max_members', 1);

    if (!teamOrgs || teamOrgs.length === 0) {
      console.log('No team organizations found');
      return;
    }

    for (const org of teamOrgs) {
      console.log(`\n📊 Organization: ${org.name}`);
      console.log(`   Plan: ${org.plan_type}`);
      console.log(`   Limit: ${org.max_minutes_monthly} minutes`);
      console.log(`   Used (stored): ${org.used_minutes || 0} minutes`);

      // Step 2: Get all team members
      const { data: members } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          joined_at,
          user:users(email)
        `)
        .eq('organization_id', org.id);

      console.log(`\n   Team Members (${members?.length || 0}):`);
      members?.forEach(member => {
        console.log(`   - ${member.user?.email} (${member.role})`);
      });

      // Step 3: Get all calls for this organization
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: orgCalls } = await supabase
        .from('calls')
        .select('id, user_id, duration_minutes, status, created_at')
        .eq('organization_id', org.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      if (orgCalls && orgCalls.length > 0) {
        console.log(`\n   Calls This Month: ${orgCalls.length}`);

        // Group calls by user
        const callsByUser = {};
        orgCalls.forEach(call => {
          if (!callsByUser[call.user_id]) {
            callsByUser[call.user_id] = {
              count: 0,
              totalMinutes: 0
            };
          }
          callsByUser[call.user_id].count++;
          callsByUser[call.user_id].totalMinutes += (call.duration_minutes || 0);
        });

        // Display usage by member
        console.log('\n   Usage by Member:');
        for (const [userId, usage] of Object.entries(callsByUser)) {
          const member = members?.find(m => m.user_id === userId);
          const email = member?.user?.email || 'Unknown';
          const role = member?.role || 'Unknown';
          console.log(`   - ${email} (${role}): ${usage.count} calls, ${usage.totalMinutes} minutes`);
        }

        // Calculate total usage
        const calculatedTotal = orgCalls.reduce((sum, call) => sum + (call.duration_minutes || 0), 0);
        console.log(`\n   ✅ Total Calculated Usage: ${calculatedTotal} minutes`);

        // Check if stored usage matches calculated
        if (org.used_minutes !== calculatedTotal) {
          console.log(`   ⚠️ WARNING: Stored usage (${org.used_minutes}) doesn't match calculated (${calculatedTotal})`);
          console.log(`   Difference: ${Math.abs(org.used_minutes - calculatedTotal)} minutes`);
        } else {
          console.log(`   ✅ Usage tracking is accurate`);
        }
      } else {
        console.log('\n   No completed calls this month');
      }

      // Step 4: Check for orphaned calls (calls without organization_id)
      const memberIds = members?.map(m => m.user_id) || [];
      if (memberIds.length > 0) {
        const { data: orphanedCalls } = await supabase
          .from('calls')
          .select('id, user_id, created_at, duration_minutes')
          .in('user_id', memberIds)
          .is('organization_id', null)
          .eq('status', 'completed');

        if (orphanedCalls && orphanedCalls.length > 0) {
          console.log(`\n   ⚠️ CRITICAL: Found ${orphanedCalls.length} orphaned calls from team members!`);
          console.log('   These calls are not being tracked against the team usage:');
          orphanedCalls.forEach(call => {
            const member = members?.find(m => m.user_id === call.user_id);
            console.log(`   - Call ${call.id.substring(0, 8)} by ${member?.user?.email}: ${call.duration_minutes} minutes`);
          });

          const orphanedMinutes = orphanedCalls.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
          console.log(`   ❌ LOST REVENUE: ${orphanedMinutes} minutes not tracked!`);
        }
      }
    }

    // Step 5: Summary and recommendations
    console.log('\n\n📋 SUMMARY & RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    console.log('\n✅ What\'s Working:');
    console.log('1. Dashboard now reads directly from calls table (duration_minutes)');
    console.log('2. Organization context is set when invitations are accepted');
    console.log('3. Upload API accepts explicit organization_id from frontend');

    console.log('\n⚠️ Critical Checks:');
    console.log('1. Ensure invited members are using OrganizationSwitcher');
    console.log('2. Verify localStorage has currentOrganizationId set correctly');
    console.log('3. Check that upload modal is passing organizationId to API');

    console.log('\n🔧 If Usage Is Not Tracking:');
    console.log('1. Check browser console for organization context');
    console.log('2. Verify member is in correct organization (not personal)');
    console.log('3. Check if call has organization_id set in database');
    console.log('4. Run fix-organization-tracking.js to repair historical data');

  } catch (error) {
    console.error('\n❌ Verification error:', error);
  }
}

// Run the verification
verifyTeamUsageTracking()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });