// Test listing existing users
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

async function testAuth() {
  try {
    // List existing users
    console.log('📋 Listing existing users...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });

    if (listError) {
      console.error('❌ Failed to list users:', listError);
    } else {
      console.log(`✅ Found ${users.users.length} users`);
      users.users.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }

    // Check auth.users table directly
    console.log('\n🔍 Checking auth schema directly...');
    const { data: authCheck, error: authCheckError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(5);

    if (authCheckError) {
      console.error('❌ Cannot access auth.users directly:', authCheckError.message);

      // Try public schema tables
      console.log('\n📊 Checking public schema tables...');
      const { data: tables, error: tablesError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (tablesError) {
        console.error('❌ Cannot access organizations:', tablesError);
      } else {
        console.log('✅ Can access public schema');
      }
    } else {
      console.log('✅ Can access auth.users table');
    }

    // Test creating user with different approach
    console.log('\n🧪 Testing alternative user creation...');
    const testEmail = `test-${Date.now()}@loadvoice.test`;

    // Try with signUp method instead
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (signUpError) {
      console.error('❌ SignUp method also failed:', signUpError);
    } else {
      console.log('✅ SignUp method worked!');
      if (signUpData.user) {
        // Clean up
        await supabase.auth.admin.deleteUser(signUpData.user.id);
        console.log('🧹 Cleaned up test user');
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testAuth();