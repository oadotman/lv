/**
 * CRITICAL FIX: Add missing members to Karamo organization
 *
 * The Karamo organization has calls but NO members in user_organizations table!
 * This script finds who made the calls and adds them to the organization.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixKaramoMembers() {
  console.log('\n🚨 CRITICAL FIX: Adding missing members to Karamo organization');
  console.log('=' .repeat(60));

  try {
    // The Karamo organization with starter plan
    const KARAMO_ORG_ID = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041';

    // Step 1: Get the organization
    console.log('\n1️⃣ Getting Karamo organization...\n');

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', KARAMO_ORG_ID)
      .single();

    if (!org) {
      console.error('❌ Karamo organization not found');
      return;
    }

    console.log('✅ Found Karamo organization:');
    console.log(`   Name: ${org.name}`);
    console.log(`   Plan: ${org.plan_type}`);
    console.log(`   Max Minutes: ${org.max_minutes_monthly}`);
    console.log(`   Used Minutes: ${org.used_minutes || 0}`);

    // Step 2: Find all users who have calls in this organization
    console.log('\n2️⃣ Finding users who made calls to this organization...\n');

    const { data: calls } = await supabase
      .from('calls')
      .select(`
        user_id,
        id,
        status,
        duration_minutes,
        created_at
      `)
      .eq('organization_id', KARAMO_ORG_ID);

    if (!calls || calls.length === 0) {
      console.log('No calls found for this organization');
      return;
    }

    // Get unique users
    const userIds = [...new Set(calls.map(c => c.user_id))];
    console.log(`Found ${calls.length} calls from ${userIds.length} unique user(s)`);

    // Step 3: Get user details
    console.log('\n3️⃣ Getting user details...\n');

    for (const userId of userIds) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single();

      const userCalls = calls.filter(c => c.user_id === userId);
      const totalMinutes = userCalls
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

      console.log(`\nUser: ${user?.email || 'Unknown'} (${userId})`);
      console.log(`   Calls: ${userCalls.length}`);
      console.log(`   Total Minutes: ${totalMinutes}`);

      // Check if already in organization
      const { data: existing } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', KARAMO_ORG_ID)
        .single();

      if (existing) {
        console.log(`   ✅ Already in organization as ${existing.role}`);
      } else {
        console.log(`   ❌ NOT in organization - FIXING...`);

        // Determine role - first user is owner, others are members
        const { data: orgMembers } = await supabase
          .from('user_organizations')
          .select('*')
          .eq('organization_id', KARAMO_ORG_ID);

        const role = (orgMembers?.length || 0) === 0 ? 'owner' : 'member';

        // Add to organization
        const { error: insertError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: userId,
            organization_id: KARAMO_ORG_ID,
            role: role,
            joined_at: userCalls[0]?.created_at || new Date().toISOString()
          });

        if (insertError) {
          console.error(`   ❌ Failed to add: ${insertError.message}`);
        } else {
          console.log(`   ✅ FIXED: Added as ${role}`);
        }
      }
    }

    // Step 4: Recalculate organization usage
    console.log('\n4️⃣ Recalculating organization usage...\n');

    const completedCalls = calls.filter(c => c.status === 'completed');
    const actualUsage = completedCalls.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

    console.log(`Completed calls: ${completedCalls.length}`);
    console.log(`Actual usage: ${actualUsage} minutes`);
    console.log(`Stored usage: ${org.used_minutes || 0} minutes`);

    if (org.used_minutes !== actualUsage) {
      console.log('\n⚠️ Usage mismatch - updating...');

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ used_minutes: actualUsage })
        .eq('id', KARAMO_ORG_ID);

      if (updateError) {
        console.error(`❌ Failed to update usage: ${updateError.message}`);
      } else {
        console.log(`✅ Updated usage to ${actualUsage} minutes`);
      }
    } else {
      console.log('✅ Usage is already correct');
    }

    // Step 5: Final verification
    console.log('\n5️⃣ Final verification...\n');

    const { data: finalMembers } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        role,
        user:users(email)
      `)
      .eq('organization_id', KARAMO_ORG_ID);

    console.log(`Organization now has ${finalMembers?.length || 0} member(s):`);
    finalMembers?.forEach(member => {
      console.log(`   - ${member.user?.email || 'Unknown'} (${member.role})`);
    });

    console.log('\n✅ FIX COMPLETE!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Ask users to refresh their browser');
    console.log('2. Dashboard should now show correct usage');
    console.log('3. Future calls will be tracked properly');

  } catch (error) {
    console.error('\n❌ Fix error:', error);
  }
}

// Run the fix
fixKaramoMembers()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });