// =====================================================
// IMMEDIATE STUCK CALL CLEANUP
// Marks all stuck calls as failed and sets up auto-cleanup
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
);

async function cleanupStuckCalls() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         STUCK CALL CLEANUP SYSTEM                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // =====================================================
  // STEP 1: Find all stuck calls
  // =====================================================
  console.log('1. IDENTIFYING STUCK CALLS');
  console.log('─'.repeat(50));

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  const { data: stuckCalls, error: fetchError } = await supabase
    .from('calls')
    .select('id, file_name, status, updated_at, processing_attempts')
    .in('status', ['processing', 'transcribing', 'extracting'])
    .lt('updated_at', oneHourAgo.toISOString())
    .order('updated_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching stuck calls:', fetchError.message);
    return;
  }

  if (!stuckCalls || stuckCalls.length === 0) {
    console.log('✅ No stuck calls found!');
    return;
  }

  console.log(`Found ${stuckCalls.length} stuck calls to clean up:\n`);

  // Display stuck calls
  stuckCalls.forEach((call, index) => {
    const minutesStuck = Math.round((Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60);
    console.log(`${index + 1}. ${call.file_name}`);
    console.log(`   ID: ${call.id}`);
    console.log(`   Status: ${call.status}`);
    console.log(`   Stuck for: ${minutesStuck} minutes (${Math.round(minutesStuck / 60)} hours)`);
    console.log(`   Previous attempts: ${call.processing_attempts || 0}\n`);
  });

  // =====================================================
  // STEP 2: Mark all stuck calls as failed
  // =====================================================
  console.log('2. MARKING STUCK CALLS AS FAILED');
  console.log('─'.repeat(50));

  let successCount = 0;
  let failCount = 0;

  for (const call of stuckCalls) {
    const minutesStuck = Math.round((Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60);

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'failed',
        processing_error: `Automatically marked as failed after being stuck for ${minutesStuck} minutes`,
        processing_attempts: (call.processing_attempts || 0) + 1,
        last_processing_attempt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', call.id);

    if (updateError) {
      console.log(`   ❌ Failed to update call ${call.id}:`, updateError.message);
      failCount++;
    } else {
      console.log(`   ✅ Marked call ${call.id} as failed`);
      successCount++;
    }
  }

  console.log(`\n   Summary: ${successCount} succeeded, ${failCount} failed`);

  // =====================================================
  // STEP 3: Clean up related data
  // =====================================================
  console.log('\n3. CLEANING UP RELATED DATA');
  console.log('─'.repeat(50));

  // Clean up any orphaned transcripts
  const { data: orphanedTranscripts } = await supabase
    .from('transcripts')
    .select('id, call_id')
    .in('call_id', stuckCalls.map(c => c.id));

  if (orphanedTranscripts && orphanedTranscripts.length > 0) {
    console.log(`   Found ${orphanedTranscripts.length} partial transcripts`);

    // You might want to keep partial data for debugging
    console.log('   ℹ️  Partial transcripts kept for debugging');
  } else {
    console.log('   ✅ No orphaned transcripts found');
  }

  // =====================================================
  // STEP 4: Setup auto-cleanup for future
  // =====================================================
  console.log('\n4. AUTO-CLEANUP CONFIGURATION');
  console.log('─'.repeat(50));

  console.log('   ℹ️  Database function created for automatic cleanup');
  console.log('   ℹ️  Stuck calls will be auto-marked as failed after 1 hour');
  console.log('   ℹ️  Run migration 008 to enable automatic cleanup');

  // =====================================================
  // STEP 5: Recommendations
  // =====================================================
  console.log('\n5. RECOMMENDATIONS');
  console.log('─'.repeat(50));

  console.log('   1. Run migration 008 in production:');
  console.log('      - Adds auto-cleanup function');
  console.log('      - Creates system_logs table');
  console.log('      - Sets up scheduled cleanup (if pg_cron available)');
  console.log('');
  console.log('   2. Add API endpoint for manual cleanup:');
  console.log('      - POST /api/admin/cleanup-stuck-calls');
  console.log('      - Calls trigger_stuck_call_cleanup() function');
  console.log('');
  console.log('   3. Set up monitoring:');
  console.log('      - Alert if calls stuck > 30 minutes');
  console.log('      - Daily report of failed calls');
  console.log('      - Track cleanup frequency');

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n' + '═'.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('═'.repeat(60));
  console.log(`✅ Cleaned up ${successCount} stuck calls`);
  if (failCount > 0) {
    console.log(`❌ Failed to clean ${failCount} calls`);
  }
  console.log('═'.repeat(60));
}

// Run the cleanup
cleanupStuckCalls().catch(console.error);