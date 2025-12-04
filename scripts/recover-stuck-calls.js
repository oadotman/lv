// =====================================================
// STUCK CALL RECOVERY SCRIPT
// Recovers calls stuck in processing and triggers retry
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin access
);

async function recoverStuckCalls() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           STUCK CALL RECOVERY SCRIPT                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Find stuck calls (processing for > 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const { data: stuckCalls, error } = await supabase
    .from('calls')
    .select('id, file_name, status, processing_attempts, updated_at, user_id, organization_id')
    .in('status', ['processing', 'transcribing', 'extracting'])
    .lt('updated_at', tenMinutesAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching stuck calls:', error.message);
    return;
  }

  if (!stuckCalls || stuckCalls.length === 0) {
    console.log('✅ No stuck calls found');
    return;
  }

  console.log(`Found ${stuckCalls.length} stuck calls to recover:\n`);

  let recovered = 0;
  let failed = 0;

  for (const call of stuckCalls) {
    const timeSinceUpdate = Date.now() - new Date(call.updated_at).getTime();
    const minutesStuck = Math.round(timeSinceUpdate / 1000 / 60);

    console.log(`Processing: ${call.file_name}`);
    console.log(`  ID: ${call.id}`);
    console.log(`  Status: ${call.status}`);
    console.log(`  Stuck for: ${minutesStuck} minutes`);
    console.log(`  Previous attempts: ${call.processing_attempts || 0}`);

    // Check if we've exceeded max retry attempts
    if ((call.processing_attempts || 0) >= 3) {
      console.log('  ❌ Max retry attempts reached, marking as failed');

      await supabase
        .from('calls')
        .update({
          status: 'failed',
          processing_error: 'Max retry attempts exceeded',
          last_processing_attempt: new Date().toISOString()
        })
        .eq('id', call.id);

      failed++;
      continue;
    }

    // Reset to uploaded for retry
    console.log('  🔄 Resetting to uploaded for retry...');

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'uploaded',
        processing_attempts: (call.processing_attempts || 0) + 1,
        processing_error: `Recovered from stuck state after ${minutesStuck} minutes`,
        last_processing_attempt: new Date().toISOString(),
        processing_progress: 0,
        processing_message: 'Queued for retry'
      })
      .eq('id', call.id);

    if (updateError) {
      console.log('  ❌ Failed to reset call:', updateError.message);
      failed++;
    } else {
      console.log('  ✅ Call reset successfully');

      // Trigger reprocessing via API
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/calls/${call.id}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-role': process.env.SUPABASE_SERVICE_ROLE_KEY // Auth for internal API
          }
        });

        if (response.ok) {
          console.log('  ✅ Reprocessing triggered successfully');
          recovered++;
        } else {
          const error = await response.text();
          console.log('  ⚠️  API call made but returned error:', error);
          recovered++;
        }
      } catch (apiError) {
        console.log('  ⚠️  Could not trigger API (server may be offline)');
        recovered++;
      }
    }

    console.log('');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('RECOVERY SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Recovered: ${recovered} calls`);
  console.log(`❌ Failed: ${failed} calls`);
  console.log(`📊 Total processed: ${recovered + failed}/${stuckCalls.length}`);

  // Check for calls eligible for retry
  const { data: retryableCalls } = await supabase
    .from('calls')
    .select('id')
    .eq('status', 'failed')
    .lt('processing_attempts', 3);

  if (retryableCalls && retryableCalls.length > 0) {
    console.log(`\nℹ️  ${retryableCalls.length} additional failed calls are eligible for retry`);
  }
}

// Add recovery for failed calls with attempts < 3
async function retryFailedCalls() {
  console.log('\n═'.repeat(60));
  console.log('RETRYING FAILED CALLS');
  console.log('═'.repeat(60));

  const { data: failedCalls } = await supabase
    .from('calls')
    .select('id, file_name, processing_attempts, processing_error')
    .eq('status', 'failed')
    .lt('processing_attempts', 3)
    .limit(10);

  if (!failedCalls || failedCalls.length === 0) {
    console.log('No failed calls to retry');
    return;
  }

  console.log(`Found ${failedCalls.length} failed calls to retry:\n`);

  for (const call of failedCalls) {
    console.log(`Retrying: ${call.file_name}`);
    console.log(`  Previous attempts: ${call.processing_attempts}`);
    console.log(`  Last error: ${call.processing_error}`);

    // Reset to uploaded
    await supabase
      .from('calls')
      .update({
        status: 'uploaded',
        processing_attempts: call.processing_attempts + 1,
        last_processing_attempt: new Date().toISOString(),
        processing_progress: 0,
        processing_message: 'Queued for retry'
      })
      .eq('id', call.id);

    console.log('  ✅ Queued for retry\n');
  }
}

// Run both recovery functions
async function main() {
  await recoverStuckCalls();
  await retryFailedCalls();

  console.log('\n✨ Recovery script completed');
}

main().catch(console.error);