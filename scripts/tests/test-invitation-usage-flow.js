/**
 * TEST: Complete Invitation to Usage Flow
 *
 * This test verifies the complete flow from invitation to usage tracking:
 * 1. Team invitation is sent
 * 2. New user signs up via invitation
 * 3. User is linked to team organization
 * 4. User uploads a call
 * 5. Usage is deducted from TEAM organization, not personal
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  teamOwnerEmail: 'team-owner@example.com', // Update with actual team owner
  invitedUserEmail: 'new-member@example.com', // Email to invite
};

async function testInvitationUsageFlow() {
  console.log('🧪 Testing Complete Invitation to Usage Flow\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Get team owner's organization
    console.log('\n1️⃣ Getting team owner organization...\n');

    const { data: ownerUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', TEST_CONFIG.teamOwnerEmail)
      .single();

    if (!ownerUser) {
      console.error('❌ Team owner not found. Update TEST_CONFIG.teamOwnerEmail');
      return;
    }

    const { data: ownerOrgs } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organization:organizations(*)
      `)
      .eq('user_id', ownerUser.id)
      .eq('role', 'owner');

    const teamOrg = ownerOrgs?.find(o => o.organization.organizations.max_members > 1) || ownerOrgs?.[0];

    if (!teamOrg) {
      console.error('❌ No organization found for team owner');
      return;
    }

    const organization = teamOrg.organization.organizations;
    console.log(`✅ Found organization: ${organization.name}`);
    console.log(`   Plan: ${organization.plan_type}`);
    console.log(`   Max Minutes: ${organization.max_minutes_monthly}`);
    console.log(`   Used Minutes (before): ${organization.used_minutes || 0}`);

    // Step 2: Check if invitation exists
    console.log('\n2️⃣ Checking for existing invitation...\n');

    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('email', TEST_CONFIG.invitedUserEmail)
      .eq('organization_id', organization.id)
      .is('accepted_at', null)
      .single();

    if (existingInvite) {
      console.log(`✅ Found pending invitation with token: ${existingInvite.token}`);
      console.log(`   Expires: ${new Date(existingInvite.expires_at).toLocaleString()}`);
      console.log('\n📝 Invitation URL:');
      console.log(`   ${process.env.NEXT_PUBLIC_APP_URL}/invite/${existingInvite.token}`);
    } else {
      console.log('⚠️ No pending invitation found for this email');
      console.log('   You may need to create one through the app');
    }

    // Step 3: Check if user has already joined
    console.log('\n3️⃣ Checking if user has already joined...\n');

    const { data: invitedUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', TEST_CONFIG.invitedUserEmail)
      .single();

    if (invitedUser) {
      console.log('✅ User exists in system');

      // Check their organization memberships
      const { data: invitedUserOrgs } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          joined_at,
          organization:organizations(name, plan_type)
        `)
        .eq('user_id', invitedUser.id);

      console.log(`   Member of ${invitedUserOrgs?.length || 0} organization(s):`);
      invitedUserOrgs?.forEach(org => {
        const isTeamOrg = org.organization_id === organization.id;
        console.log(`   - ${org.organization.organizations.name} (${org.role}) ${isTeamOrg ? '← TEAM ORG' : ''}`);
      });

      // Step 4: Check recent calls by invited member
      console.log('\n4️⃣ Checking recent calls by invited member...\n');

      const { data: memberCalls } = await supabase
        .from('calls')
        .select('id, organization_id, created_at, duration_minutes, status')
        .eq('user_id', invitedUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (memberCalls && memberCalls.length > 0) {
        console.log(`Found ${memberCalls.length} recent call(s):`);

        memberCalls.forEach(call => {
          const isTeamCall = call.organization_id === organization.id;
          console.log(`   Call ${call.id.substring(0, 8)}...`);
          console.log(`     Date: ${new Date(call.created_at).toLocaleString()}`);
          console.log(`     Duration: ${call.duration_minutes || 0} minutes`);
          console.log(`     Organization: ${isTeamCall ? '✅ TEAM ORG' : '❌ WRONG ORG!'}`);
          console.log(`     Status: ${call.status}`);
        });

        // Calculate usage
        const teamCalls = memberCalls.filter(c => c.organization_id === organization.id);
        const totalMinutesFromMember = teamCalls.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
        console.log(`\n   Total minutes from this member: ${totalMinutesFromMember}`);
      } else {
        console.log('No calls found from invited member');
      }
    } else {
      console.log('⚠️ User has not signed up yet');
    }

    // Step 5: Verify usage tracking
    console.log('\n5️⃣ Verifying team usage tracking...\n');

    // Get all completed calls for the organization
    const { data: allOrgCalls } = await supabase
      .from('calls')
      .select('user_id, duration_minutes')
      .eq('organization_id', organization.id)
      .eq('status', 'completed')
      .not('duration_minutes', 'is', null);

    // Group by user
    const usageByUser = {};
    allOrgCalls?.forEach(call => {
      usageByUser[call.user_id] = (usageByUser[call.user_id] || 0) + (call.duration_minutes || 0);
    });

    const totalMinutesUsed = Object.values(usageByUser).reduce((sum, mins) => sum + mins, 0);

    console.log('📊 Organization Usage Summary:');
    console.log(`   Total Minutes Used: ${totalMinutesUsed}/${organization.max_minutes_monthly}`);
    console.log(`   Usage Percentage: ${((totalMinutesUsed / organization.max_minutes_monthly) * 100).toFixed(1)}%`);
    console.log(`   Unique Users: ${Object.keys(usageByUser).length}`);

    if (invitedUser && usageByUser[invitedUser.id]) {
      const memberUsage = usageByUser[invitedUser.id];
      const memberPercentage = ((memberUsage / totalMinutesUsed) * 100).toFixed(1);
      console.log(`\n   Invited Member Usage: ${memberUsage} minutes (${memberPercentage}% of total)`);
    }

    // Check if stored usage matches calculated
    if (organization.used_minutes !== totalMinutesUsed) {
      console.log(`\n   ⚠️ WARNING: Stored usage (${organization.used_minutes}) doesn't match calculated (${totalMinutesUsed})`);
      console.log('   Run fix-organization-tracking.js to correct this');
    } else {
      console.log('\n   ✅ Usage tracking is accurate');
    }

    // Step 6: Test flow recommendations
    console.log('\n6️⃣ Test Flow Checklist:\n');
    console.log('[ ] 1. Send invitation to new member email');
    console.log('[ ] 2. Click invitation link in email');
    console.log('[ ] 3. Complete signup with invitation token');
    console.log('[ ] 4. Verify localStorage has team org ID set');
    console.log('[ ] 5. Upload a test call');
    console.log('[ ] 6. Verify call shows under team organization');
    console.log('[ ] 7. Check team usage increased (not personal org)');
    console.log('[ ] 8. Use OrganizationSwitcher to verify context');

    // Step 7: Common issues to check
    console.log('\n7️⃣ Common Issues Checklist:\n');

    // Check if invited user has personal org
    if (invitedUser) {
      const { data: personalOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, organization:organizations(name, used_minutes)')
        .eq('user_id', invitedUser.id)
        .eq('role', 'owner')
        .single();

      if (personalOrg) {
        console.log(`⚠️ User has personal org: ${personalOrg.organization.organizations.name}`);
        console.log(`   Personal org usage: ${personalOrg.organization.organizations.used_minutes || 0} minutes`);
        console.log('   Ensure calls are NOT going here!');
      }
    }

    // Check for multiple pending invitations
    const { data: allInvites } = await supabase
      .from('team_invitations')
      .select('id, organization_id')
      .eq('email', TEST_CONFIG.invitedUserEmail)
      .is('accepted_at', null);

    if (allInvites && allInvites.length > 1) {
      console.log(`\n⚠️ Multiple pending invitations (${allInvites.length}) for same email`);
      console.log('   This could cause confusion');
    }

  } catch (error) {
    console.error('\n❌ Test error:', error);
  }
}

// Run the test
testInvitationUsageFlow()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });