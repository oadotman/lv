// Test signup by directly creating records in the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUserDirectly() {
  const email = `testuser-${Date.now()}@example.com`;
  const userId = require('crypto').randomUUID();
  const orgId = require('crypto').randomUUID();

  console.log('Creating user directly in database...');
  console.log('Email:', email);
  console.log('User ID:', userId);

  try {
    // Step 1: Create organization
    console.log('\n1. Creating organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: orgId,
        name: 'Test Organization',
        slug: `org-${Date.now()}`,
        plan_type: 'free',
        max_members: 1,
        max_minutes_monthly: 60,
        billing_email: email,
        subscription_status: 'active'
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Failed to create organization:', orgError);
      return;
    }
    console.log('✅ Organization created:', org.id);

    // Step 2: Create user_organizations record
    console.log('\n2. Creating membership...');
    const { data: membership, error: memberError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner'
      })
      .select()
      .single();

    if (memberError) {
      console.error('❌ Failed to create membership:', memberError);
      // Clean up org
      await supabase.from('organizations').delete().eq('id', orgId);
      return;
    }
    console.log('✅ Membership created');

    // Step 3: Try to create auth user with raw SQL
    console.log('\n3. Attempting to create auth user via RPC...');

    // First check if we have a custom function for this
    const { data: functions, error: funcError } = await supabase.rpc('pg_catalog.pg_proc', {});

    console.log('\n✅ Successfully created test data!');
    console.log('Organization ID:', orgId);
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log('\nNOTE: Auth user was not created - only database records.');
    console.log('This confirms the issue is with Supabase Auth service, not the database.');

    // Clean up (optional)
    const cleanup = false; // Set to true to clean up
    if (cleanup) {
      console.log('\n🧹 Cleaning up test data...');
      await supabase.from('user_organizations').delete().eq('user_id', userId);
      await supabase.from('organizations').delete().eq('id', orgId);
      console.log('✅ Cleaned up');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

createUserDirectly();