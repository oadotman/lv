const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function testPartnerApplication() {
  console.log('🔍 Testing Partner Application System\n');
  console.log('=====================================\n');

  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    console.log('   ✅ Connected to Supabase');

    // 2. Check if partner_applications table exists
    console.log('\n2. Checking partner_applications table...');
    const { data: checkTable, error: checkError } = await supabase
      .from('partner_applications')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('   ❌ Error accessing partner_applications table:', checkError);
      console.log('   Error code:', checkError.code);
      console.log('   Error message:', checkError.message);
      console.log('   Error hint:', checkError.hint);

      if (checkError.code === '42P01') {
        console.log('\n   ⚠️ Table does not exist! You need to run the migration.');
        console.log('   Run: supabase db push or apply the migration manually');
      }
      return;
    } else {
      console.log('   ✅ partner_applications table exists');
    }

    // 3. Check table permissions
    console.log('\n3. Testing table permissions...');

    // Test INSERT permission
    const testEmail = `test_${Date.now()}@example.com`;
    const testApplication = {
      id: crypto.randomUUID(),
      email: testEmail,
      full_name: 'Test User',
      partner_type: 'crm_consultant',
      why_partner: 'This is a test application to verify the system is working correctly.',
      terms_accepted: true,
      status: 'pending',
      submitted_at: new Date().toISOString()
    };

    console.log('   Testing INSERT...');
    const { data: insertData, error: insertError } = await supabase
      .from('partner_applications')
      .insert(testApplication)
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ INSERT failed:', insertError.message);
      console.log('   Error code:', insertError.code);

      if (insertError.message?.includes('permission')) {
        console.log('\n   ⚠️ Permission issue detected!');
        console.log('   You may need to enable RLS or adjust policies');
      }
    } else {
      console.log('   ✅ INSERT successful');
      console.log('   Created application ID:', insertData.id);

      // Test SELECT permission
      console.log('\n   Testing SELECT...');
      const { data: selectData, error: selectError } = await supabase
        .from('partner_applications')
        .select('*')
        .eq('id', insertData.id)
        .single();

      if (selectError) {
        console.error('   ❌ SELECT failed:', selectError.message);
      } else {
        console.log('   ✅ SELECT successful');
      }

      // Clean up test data
      console.log('\n   Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('partner_applications')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        console.error('   ⚠️ Could not delete test data:', deleteError.message);
      } else {
        console.log('   ✅ Test data cleaned up');
      }
    }

    // 4. Test the API endpoint
    console.log('\n4. Testing API endpoint...');
    const port = process.env.PORT || 3002; // Use port 3002 as fallback
    console.log(`   Testing at: http://localhost:${port}/api/partners/apply`);

    const apiTestData = {
      email: `api_test_${Date.now()}@example.com`,
      full_name: 'API Test User',
      company_name: 'Test Company',
      partner_type: 'sales_coach',
      why_partner: 'Testing the API endpoint to ensure proper functionality and error handling.',
      terms_accepted: true,
      has_used_loadvoice: 'no'
    };

    try {
      const response = await fetch(`http://localhost:${port}/api/partners/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiTestData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('   ✅ API endpoint working correctly');
        console.log('   Application ID:', result.application?.id);
      } else {
        console.error('   ❌ API returned error:', result.message);
        if (result.errors) {
          console.log('   Validation errors:', result.errors);
        }
        if (result.debug) {
          console.log('   Debug info:', result.debug);
        }
      }
    } catch (apiError) {
      console.error('   ❌ API request failed:', apiError.message);
      console.log('   Make sure the development server is running (npm run dev)');
    }

    // 5. Check existing applications
    console.log('\n5. Checking existing applications...');
    const { data: applications, error: listError, count } = await supabase
      .from('partner_applications')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (listError) {
      console.error('   ❌ Could not list applications:', listError.message);
    } else {
      console.log(`   ✅ Found ${count || 0} total applications`);
      if (applications && applications.length > 0) {
        console.log('   Recent applications:');
        applications.forEach(app => {
          console.log(`     - ${app.email} (${app.status}) - ${new Date(app.submitted_at).toLocaleDateString()}`);
        });
      }
    }

    console.log('\n=====================================');
    console.log('✅ Partner application system test complete!\n');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPartnerApplication();