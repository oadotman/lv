/**
 * FIX: Add invited members to user_organizations table
 *
 * This script fixes the critical issue where invited members' calls have
 * organization_id set, but the user is not in the user_organizations table.
 * This causes their usage to not be tracked properly.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixInvitedMemberOrganizations() {
  console.log('🔧 FIXING INVITED MEMBER ORGANIZATION RELATIONSHIPS\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Find calls with organization_id where user is not in user_organizations
    console.log('\n1️⃣ Finding orphaned calls (have org_id but user not in org)...\n');

    const { data: orphanedCalls } = await supabase
      .from('calls')
      .select(`
        id,
        user_id,
        organization_id,
        created_at,
        duration_minutes,
        user:users(email)
      `)
      .not('organization_id', 'is', null)
      .eq('status', 'completed');

    if (!orphanedCalls || orphanedCalls.length === 0) {
      console.log('No orphaned calls found');
      return;
    }

    // Group by user and organization
    const userOrgMap = new Map();
    orphanedCalls.forEach(call => {
      const key = `${call.user_id}-${call.organization_id}`;
      if (!userOrgMap.has(key)) {
        userOrgMap.set(key, {
          userId: call.user_id,
          orgId: call.organization_id,
          email: call.user?.email,
          callCount: 0,
          totalMinutes: 0,
          firstCallDate: call.created_at
        });
      }
      const data = userOrgMap.get(key);
      data.callCount++;
      data.totalMinutes += (call.duration_minutes || 0);
      if (new Date(call.created_at) < new Date(data.firstCallDate)) {
        data.firstCallDate = call.created_at;
      }
    });

    console.log(`Found ${userOrgMap.size} user-organization pairs to check\n`);

    // Step 2: Check each pair and fix missing relationships
    let fixedCount = 0;
    let alreadyExistsCount = 0;

    for (const [key, data] of userOrgMap) {
      // Check if relationship exists
      const { data: existing } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', data.userId)
        .eq('organization_id', data.orgId)
        .single();

      if (existing) {
        alreadyExistsCount++;
        console.log(`✓ ${data.email} already in organization (${data.callCount} calls, ${data.totalMinutes} min)`);
      } else {
        // Get organization details
        const { data: org } = await supabase
          .from('organizations')
          .select('name, plan_type')
          .eq('id', data.orgId)
          .single();

        console.log(`❌ MISSING: ${data.email} not in ${org?.name || 'Unknown Org'}`);
        console.log(`   - Has ${data.callCount} calls totaling ${data.totalMinutes} minutes`);
        console.log(`   - First call: ${new Date(data.firstCallDate).toLocaleDateString()}`);

        // Check if user was invited
        const { data: invitation } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('email', data.email?.toLowerCase())
          .eq('organization_id', data.orgId)
          .single();

        if (invitation) {
          console.log(`   - Found invitation (${invitation.accepted_at ? 'accepted' : 'pending'})`);

          // Add user to organization
          const { error: insertError } = await supabase
            .from('user_organizations')
            .insert({
              user_id: data.userId,
              organization_id: data.orgId,
              role: invitation.role || 'member',
              invited_by: invitation.invited_by,
              joined_at: invitation.accepted_at || data.firstCallDate
            });

          if (insertError) {
            console.error(`   ❌ Failed to add to organization:`, insertError.message);
          } else {
            console.log(`   ✅ FIXED: Added to organization as ${invitation.role || 'member'}`);
            fixedCount++;

            // Update invitation if not already accepted
            if (!invitation.accepted_at) {
              await supabase
                .from('team_invitations')
                .update({
                  accepted_at: new Date().toISOString(),
                  accepted_by: data.userId
                })
                .eq('id', invitation.id);
              console.log(`   ✅ Marked invitation as accepted`);
            }
          }
        } else {
          console.log(`   ⚠️ No invitation found - adding as member anyway`);

          // Add as member without invitation
          const { error: insertError } = await supabase
            .from('user_organizations')
            .insert({
              user_id: data.userId,
              organization_id: data.orgId,
              role: 'member',
              joined_at: data.firstCallDate
            });

          if (insertError) {
            console.error(`   ❌ Failed to add to organization:`, insertError.message);
          } else {
            console.log(`   ✅ FIXED: Added to organization as member`);
            fixedCount++;
          }
        }
      }
    }

    // Step 3: Recalculate organization usage
    console.log('\n2️⃣ Recalculating organization usage...\n');

    const orgIds = new Set(Array.from(userOrgMap.values()).map(d => d.orgId));

    for (const orgId of orgIds) {
      // Get organization
      const { data: org } = await supabase
        .from('organizations')
        .select('name, used_minutes')
        .eq('id', orgId)
        .single();

      // Calculate actual usage from calls
      const { data: orgCalls } = await supabase
        .from('calls')
        .select('duration_minutes')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .not('duration_minutes', 'is', null);

      const actualUsage = orgCalls?.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) || 0;

      console.log(`${org?.name}:`);
      console.log(`  Stored usage: ${org?.used_minutes || 0} minutes`);
      console.log(`  Actual usage: ${actualUsage} minutes`);

      if (org?.used_minutes !== actualUsage) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ used_minutes: actualUsage })
          .eq('id', orgId);

        if (updateError) {
          console.error(`  ❌ Failed to update usage:`, updateError.message);
        } else {
          console.log(`  ✅ FIXED: Updated usage to ${actualUsage} minutes`);
        }
      } else {
        console.log(`  ✓ Usage is already correct`);
      }
    }

    // Step 4: Summary
    console.log('\n\n📋 SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Fixed ${fixedCount} missing user-organization relationships`);
    console.log(`✓ ${alreadyExistsCount} relationships already existed`);
    console.log(`📊 Recalculated usage for ${orgIds.size} organization(s)`);

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Have affected users refresh their browser');
    console.log('2. Check that OrganizationSwitcher shows the team org');
    console.log('3. Verify future calls are tracked correctly');
    console.log('4. Monitor dashboard to ensure usage updates properly');

  } catch (error) {
    console.error('\n❌ Fix error:', error);
  }
}

// Run the fix
fixInvitedMemberOrganizations()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });