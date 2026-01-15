// Fix missing users table in database
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

async function fixDatabase() {
  console.log('🔧 Attempting to fix database schema...\n');

  try {
    // Create users table
    console.log('1. Creating public.users table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (tableError) {
      console.log('Note: Could not create table via RPC (this is normal)');
      console.log('Please run the SQL script manually in Supabase dashboard.');
      console.log('\n📋 Copy this SQL and run it in Supabase SQL Editor:');
      console.log('=' * 60);
      console.log(createTableSQL);
      console.log('=' * 60);
    } else {
      console.log('✅ Table created successfully');
    }

    // Test if we can now query the users table
    const { data: testQuery, error: queryError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (!queryError) {
      console.log('✅ Users table is accessible!');
    } else {
      console.log('⚠️ Users table still not accessible:', queryError.message);
    }

  } catch (err) {
    console.error('Error:', err);
  }

  console.log('\n📝 MANUAL FIX INSTRUCTIONS:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Open the file: create-users-table.sql');
  console.log('5. Copy and paste the SQL content');
  console.log('6. Click "Run" to execute the SQL');
  console.log('\nThis will create the missing public.users table and fix the signup issue.');
}

fixDatabase();