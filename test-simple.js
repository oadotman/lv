// Simple test to check critical issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runQuickTests() {
  console.log('\n=== QUICK SYSTEM CHECK ===\n');

  // Check 1: Database connectivity
  console.log('1. Database Connection:');
  const { data: tables, error: tablesError } = await supabase
    .from('calls')
    .select('id')
    .limit(1);

  if (tablesError) {
    console.log('   ❌ Database connection failed:', tablesError.message);
    return;
  }
  console.log('   ✅ Database connected');

  // Check 2: Check if template_id column exists
  console.log('\n2. Template Column Check:');
  const { data: callsSchema } = await supabase
    .from('calls')
    .select('template_id')
    .limit(1);

  if (callsSchema !== null) {
    console.log('   ✅ template_id column exists in calls table');
  } else {
    console.log('   ⚠️  template_id column might be missing - run migration 006');
  }

  // Check 3: Check if processing tracking columns exist
  console.log('\n3. Processing Tracking Columns:');
  const { data: processingCheck } = await supabase
    .from('calls')
    .select('processing_attempts, processing_error')
    .limit(1);

  if (processingCheck !== null) {
    console.log('   ✅ Processing tracking columns exist');
  } else {
    console.log('   ⚠️  Processing tracking columns missing - run migration 007');
  }

  // Check 4: Check for stuck calls
  console.log('\n4. Stuck Calls Check:');
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const { data: stuckCalls } = await supabase
    .from('calls')
    .select('id, status, updated_at')
    .eq('status', 'processing')
    .lt('updated_at', tenMinutesAgo.toISOString())
    .limit(5);

  if (stuckCalls && stuckCalls.length > 0) {
    console.log(`   ⚠️  Found ${stuckCalls.length} calls stuck in processing:`);
    stuckCalls.forEach(call => {
      console.log(`      - ${call.id} (since ${call.updated_at})`);
    });
  } else {
    console.log('   ✅ No stuck calls found');
  }

  // Check 5: Check organization member counts
  console.log('\n5. Organization Member Limits:');
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, max_members')
    .limit(5);

  for (const org of orgs || []) {
    const { count } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    const status = count > org.max_members ? '❌ OVER LIMIT' : '✅';
    console.log(`   ${status} ${org.name}: ${count}/${org.max_members} members`);
  }

  // Check 6: Check for duplicate invitations
  console.log('\n6. Duplicate Invitations Check:');
  const { data: invitations } = await supabase
    .from('team_invitations')
    .select('email, organization_id')
    .is('accepted_at', null);

  const inviteMap = {};
  let duplicates = 0;

  (invitations || []).forEach(inv => {
    const key = `${inv.email}-${inv.organization_id}`;
    if (inviteMap[key]) {
      duplicates++;
      console.log(`   ⚠️  Duplicate invitation: ${inv.email}`);
    }
    inviteMap[key] = true;
  });

  if (duplicates === 0) {
    console.log('   ✅ No duplicate invitations found');
  }

  // Check 7: Check usage vs limits
  console.log('\n7. Usage Limits Check:');
  const { data: orgsWithUsage } = await supabase
    .from('organizations')
    .select('id, name, plan_type, max_minutes_monthly, current_period_start')
    .limit(3);

  for (const org of orgsWithUsage || []) {
    const periodStart = org.current_period_start ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: calls } = await supabase
      .from('calls')
      .select('duration_minutes')
      .eq('organization_id', org.id)
      .gte('created_at', periodStart);

    const totalMinutes = (calls || []).reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
    const percentage = Math.round((totalMinutes / org.max_minutes_monthly) * 100);

    const status = percentage > 100 ? '❌ OVER' : percentage > 80 ? '⚠️ ' : '✅';
    console.log(`   ${status} ${org.name}: ${totalMinutes}/${org.max_minutes_monthly} minutes (${percentage}%)`);
  }

  console.log('\n=== CHECK COMPLETE ===\n');
}

runQuickTests().catch(console.error);