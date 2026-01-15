// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Service Key (first 20 chars):', supabaseServiceKey?.substring(0, 20));

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    // Test 1: Check if we can query the database
    console.log('\n📊 Testing database connection...');
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database query failed:', error);
    } else {
      console.log('✅ Database connection successful');
    }

    // Test 2: Try to create a test user
    console.log('\n👤 Testing auth service...');
    const testEmail = `test-${Date.now()}@example.com`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
      },
    });

    if (authError) {
      console.error('❌ Auth test failed:', authError);
      console.error('Full error:', JSON.stringify(authError, null, 2));
    } else {
      console.log('✅ Auth service working');
      console.log('Created test user:', authData.user?.id);

      // Clean up - delete test user
      if (authData.user?.id) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
        if (deleteError) {
          console.error('⚠️ Failed to delete test user:', deleteError);
        } else {
          console.log('🧹 Test user cleaned up');
        }
      }
    }

    // Test 3: Check Auth configuration
    console.log('\n⚙️ Checking Auth configuration...');
    const { data: settings, error: settingsError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (settingsError) {
      console.error('❌ Cannot access auth admin:', settingsError);
    } else {
      console.log('✅ Auth admin access working');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();