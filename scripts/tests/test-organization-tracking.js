/**
 * TEST: Organization Tracking for Invited Team Members
 *
 * This script tests that invited team members' calls are properly
 * tracked against the correct organization's usage pool.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user emails (update these with your test users)
const TEST_CONFIG = {
  ownerEmail: 'owner@test.com', // User who owns an organization
  invitedEmail: 'invited@test.com', // User to invite to the organization
};

async function testOrganizationTracking() {
  console.log('🧪 Testing Organization Tracking Fix\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check current organization structure
    console.log('\n1️⃣ Checking organization structure...\n');

    // Get owner's organization
    const { data: ownerData } = await supabase
      .from('users')
      .select('id')
      .eq('email', TEST_CONFIG.ownerEmail)
      .single();

    if (!ownerData) {
      console.error('❌ Owner user not found. Please update TEST_CONFIG.ownerEmail');
      return;
    }

    const { data: ownerOrgs } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organization:organizations(*)
      `)
      .eq('user_id', ownerData.id);

    console.log(`Owner (${TEST_CONFIG.ownerEmail}):`);
    ownerOrgs?.forEach(org => {
      console.log(`  - ${org.organization.organizations.name} (${org.role})`);
      console.log(`    Plan: ${org.organization.organizations.plan_type}`);
      console.log(`    Max Minutes: ${org.organization.organizations.max_minutes_monthly}`);
      console.log(`    Used Minutes: ${org.organization.organizations.used_minutes || 0}`);
    });

    // Get invited member's organizations
    const { data: invitedData } = await supabase
      .from('users')
      .select('id')
      .eq('email', TEST_CONFIG.invitedEmail)
      .single();

    if (!invitedData) {
      console.log('\n⚠️ Invited user not found. They may not have signed up yet.');
    } else {
      const { data: invitedOrgs } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          joined_at,
          organization:organizations(*)
        `)
        .eq('user_id', invitedData.id);

      console.log(`\nInvited Member (${TEST_CONFIG.invitedEmail}):`);
      invitedOrgs?.forEach(org => {
        console.log(`  - ${org.organization.organizations.name} (${org.role})`);
        console.log(`    Joined: ${new Date(org.joined_at).toLocaleDateString()}`);
        console.log(`    Plan: ${org.organization.organizations.plan_type}`);
      });

      // Step 2: Check calls by invited member
      console.log('\n2️⃣ Checking calls by invited member...\n');

      const { data: invitedCalls } = await supabase
        .from('calls')
        .select('id, organization_id, created_at, duration_minutes, status')
        .eq('user_id', invitedData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invitedCalls && invitedCalls.length > 0) {
        console.log(`Found ${invitedCalls.length} recent calls:`);

        for (const call of invitedCalls) {
          // Find which org this call belongs to
          const org = invitedOrgs?.find(o => o.organization_id === call.organization_id);
          const orgName = org?.organization.organizations.name || 'Unknown';
          const isPersonal = org?.role === 'owner' && org?.organization.organizations.max_members === 1;

          console.log(`  Call ${call.id.substring(0, 8)}...`);
          console.log(`    Date: ${new Date(call.created_at).toLocaleDateString()}`);
          console.log(`    Organization: ${orgName} ${isPersonal ? '(Personal)' : '(Team)'}`);
          console.log(`    Duration: ${call.duration_minutes || 0} minutes`);
          console.log(`    Status: ${call.status}`);

          // Check if this is correct
          const callDate = new Date(call.created_at);
          const teamOrg = invitedOrgs?.find(o =>
            o.role !== 'owner' &&
            new Date(o.joined_at) <= callDate
          );

          if (teamOrg && call.organization_id !== teamOrg.organization_id) {
            console.log(`    ⚠️ WARNING: This call should belong to ${teamOrg.organization.organizations.name}!`);
          } else if (teamOrg && call.organization_id === teamOrg.organization_id) {
            console.log(`    ✅ Correctly assigned to team organization`);
          }
        }
      } else {
        console.log('No calls found for invited member');
      }
    }

    // Step 3: Check usage tracking
    console.log('\n3️⃣ Verifying usage tracking...\n');

    if (ownerOrgs && ownerOrgs.length > 0) {
      const teamOrg = ownerOrgs.find(o => o.organization.organizations.max_members > 1);

      if (teamOrg) {
        const orgId = teamOrg.organization_id;

        // Get all calls for this organization
        const { data: orgCalls } = await supabase
          .from('calls')
          .select('duration_minutes, user_id')
          .eq('organization_id', orgId)
          .eq('status', 'completed')
          .not('duration_minutes', 'is', null);

        const totalMinutes = orgCalls?.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) || 0;

        // Count unique users
        const uniqueUsers = new Set(orgCalls?.map(c => c.user_id) || []);

        console.log(`Organization: ${teamOrg.organization.organizations.name}`);
        console.log(`  Total Calls: ${orgCalls?.length || 0}`);
        console.log(`  Unique Members: ${uniqueUsers.size}`);
        console.log(`  Total Minutes Used: ${totalMinutes}`);
        console.log(`  Minutes Limit: ${teamOrg.organization.organizations.max_minutes_monthly}`);
        console.log(`  Usage: ${((totalMinutes / teamOrg.organization.organizations.max_minutes_monthly) * 100).toFixed(1)}%`);

        if (totalMinutes !== teamOrg.organization.organizations.used_minutes) {
          console.log(`  ⚠️ WARNING: Stored usage (${teamOrg.organization.organizations.used_minutes}) doesn't match calculated (${totalMinutes})`);
        } else {
          console.log(`  ✅ Usage tracking is accurate`);
        }
      }
    }

    // Step 4: Test recommendations
    console.log('\n4️⃣ Test Recommendations:\n');
    console.log('1. Have the invited member upload a new call');
    console.log('2. Check that the call appears under the team organization');
    console.log('3. Verify the team\'s usage increases, not the personal organization');
    console.log('4. Use the Organization Switcher to change context');
    console.log('5. Upload a call in each context and verify correct assignment');

  } catch (error) {
    console.error('\n❌ Test error:', error);
  }
}

// Run the test
testOrganizationTracking()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });