// Quick test script to verify database connection and structure
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function testDatabase() {
  console.log('🔍 Testing database connection and structure...\n');

  // Test 1: Check if organizations table exists
  console.log('Test 1: Checking organizations table...');
  const { data: orgCheck, error: orgCheckError } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .limit(1);

  if (orgCheckError) {
    console.error('❌ Organizations table error:', orgCheckError);
  } else {
    console.log('✅ Organizations table accessible');
  }

  // Test 2: Try to insert a test organization
  console.log('\nTest 2: Trying to insert test organization...');
  const testOrgData = {
    name: 'Test Org',
    slug: `test-${Date.now()}`,
    plan_type: 'free',
    max_members: 1,
    max_minutes_monthly: 30,
    billing_email: 'test@example.com',
    subscription_status: 'active'
  };

  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('organizations')
    .insert(testOrgData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert error:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code
    });
  } else {
    console.log('✅ Test organization created:', insertData);

    // Clean up test data
    await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', insertData.id);
    console.log('✅ Test organization deleted');
  }

  // Test 3: Check RLS policies
  console.log('\nTest 3: Checking RLS status...');
  const { data: rlsData, error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('organizations', 'user_organizations')
    `
  }).catch(() => {
    // RPC might not exist, use alternative check
    return { data: null, error: 'RPC not available' };
  });

  if (rlsError && rlsError !== 'RPC not available') {
    console.log('ℹ️  RLS check via RPC not available');
  } else if (rlsData) {
    console.log('✅ RLS status:', rlsData);
  }

  console.log('\n🎉 Database tests complete!');
}

testDatabase().catch(console.error);
