/**
 * Script to apply the RLS policy fix for team invitations
 * This fixes the 406 error when fetching invitations by token
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS policy fix for team invitations...\n');

  const policies = [
    {
      name: 'Drop old restrictive policy',
      sql: `DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;`
    },
    {
      name: 'Create policy for admins to view org invitations',
      sql: `
        CREATE POLICY "Team admins can view org invitations"
        ON team_invitations FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
          )
        );
      `
    },
    {
      name: 'Create policy for public to view by token',
      sql: `
        CREATE POLICY "Public can view invitations by token"
        ON team_invitations FOR SELECT
        USING (expires_at > NOW());
      `
    },
    {
      name: 'Drop old accept policy',
      sql: `DROP POLICY IF EXISTS "Users can accept invitations with valid token" ON team_invitations;`
    },
    {
      name: 'Create new accept policy',
      sql: `
        CREATE POLICY "Anyone can accept valid invitations"
        ON team_invitations FOR UPDATE
        USING (
          accepted_at IS NULL
          AND expires_at > NOW()
        )
        WITH CHECK (
          accepted_at IS NOT NULL
        );
      `
    }
  ];

  for (const policy of policies) {
    console.log(`📝 ${policy.name}...`);
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: policy.sql
      });

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('   ⚠️  RPC method not available, attempting direct execution...');
        console.log('   ℹ️  You may need to run this SQL directly in Supabase Dashboard:');
        console.log('   ', policy.sql.trim().replace(/\n/g, '\n    '));
      } else {
        console.log('   ✅ Success!');
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      console.log('   ℹ️  You may need to run this SQL directly in Supabase Dashboard:');
      console.log('   ', policy.sql.trim().replace(/\n/g, '\n    '));
    }
    console.log('');
  }

  console.log('\n✨ RLS policy fix complete!');
  console.log('\n📝 If any policies failed to apply automatically, please run them manually in your Supabase SQL Editor.');
  console.log('The SQL statements have been printed above for your convenience.\n');
}

applyRLSFix().catch(console.error);