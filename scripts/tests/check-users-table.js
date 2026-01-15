// Check for users table in public schema
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

async function checkUsersTable() {
  console.log('Checking for users table...\n');

  try {
    // Check public.users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.log('❌ No public.users table found:', usersError.message);
    } else {
      console.log('✅ Found public.users table');
      console.log('Sample users:', users);
    }

    // Check table structure via raw SQL
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', {
        table_name: 'users'
      })
      .select('*');

    if (!columnsError && columns) {
      console.log('\nTable columns:', columns);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsersTable();