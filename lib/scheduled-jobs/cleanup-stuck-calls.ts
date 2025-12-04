// =====================================================
// SCHEDULED JOB: CLEANUP STUCK CALLS
// Runs periodically to clean up stuck calls
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

export interface CleanupResult {
  success: boolean;
  cleaned: number;
  failed: number;
  details: Array<{
    id: string;
    file_name: string;
    minutes_stuck: number;
  }>;
  errors: Array<{
    id: string;
    file_name: string;
    error: string;
  }>;
}

/**
 * Cleanup stuck calls that have been processing for more than the specified threshold
 * @param thresholdMinutes - Minutes after which a call is considered stuck (default: 60)
 * @returns Cleanup result with details of cleaned and failed calls
 */
export async function cleanupStuckCalls(thresholdMinutes: number = 60): Promise<CleanupResult> {
  const supabase = createAdminClient();

  const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  try {
    // Find stuck calls
    const { data: stuckCalls, error: fetchError } = await supabase
      .from('calls')
      .select('id, file_name, status, updated_at, processing_attempts, user_id, organization_id')
      .in('status', ['processing', 'transcribing', 'extracting'])
      .lt('updated_at', thresholdTime.toISOString())
      .order('updated_at', { ascending: true });

    if (fetchError) {
      console.error('[Scheduled Cleanup] Error fetching stuck calls:', fetchError);
      return {
        success: false,
        cleaned: 0,
        failed: 0,
        details: [],
        errors: [{ id: '', file_name: '', error: fetchError.message }]
      };
    }

    if (!stuckCalls || stuckCalls.length === 0) {
      console.log('[Scheduled Cleanup] No stuck calls found');
      return {
        success: true,
        cleaned: 0,
        failed: 0,
        details: [],
        errors: []
      };
    }

    console.log(`[Scheduled Cleanup] Found ${stuckCalls.length} stuck calls`);

    const cleanedCalls: CleanupResult['details'] = [];
    const failedCalls: CleanupResult['errors'] = [];

    // Process each stuck call
    for (const call of stuckCalls) {
      const minutesStuck = Math.round(
        (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60
      );

      // Mark as failed
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          status: 'failed',
          processing_error: `Auto-cleanup: Stuck for ${minutesStuck} minutes (threshold: ${thresholdMinutes} min)`,
          processing_attempts: (call.processing_attempts || 0) + 1,
          last_processing_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', call.id);

      if (updateError) {
        console.error(`[Scheduled Cleanup] Failed to update call ${call.id}:`, updateError);
        failedCalls.push({
          id: call.id,
          file_name: call.file_name,
          error: updateError.message
        });
      } else {
        cleanedCalls.push({
          id: call.id,
          file_name: call.file_name,
          minutes_stuck: minutesStuck
        });

        // Create notification for the user
        await supabase
          .from('notifications')
          .insert({
            user_id: call.user_id,
            notification_type: 'call_failed',
            title: 'Call processing failed',
            message: `Your call "${call.file_name}" could not be processed and has been marked as failed. Please try uploading again.`,
            link: `/calls/${call.id}`
          });
      }
    }

    // Log the cleanup action
    await supabase
      .from('system_logs')
      .insert({
        log_type: 'scheduled_cleanup',
        message: `Scheduled cleanup: ${cleanedCalls.length} calls cleaned, ${failedCalls.length} failed`,
        metadata: {
          threshold_minutes: thresholdMinutes,
          cleaned_count: cleanedCalls.length,
          failed_count: failedCalls.length,
          cleaned_ids: cleanedCalls.map(c => c.id),
          timestamp: new Date().toISOString()
        }
      });

    console.log(`[Scheduled Cleanup] Cleaned ${cleanedCalls.length} calls, ${failedCalls.length} failed`);

    return {
      success: true,
      cleaned: cleanedCalls.length,
      failed: failedCalls.length,
      details: cleanedCalls,
      errors: failedCalls
    };

  } catch (error) {
    console.error('[Scheduled Cleanup] Unexpected error:', error);
    return {
      success: false,
      cleaned: 0,
      failed: 0,
      details: [],
      errors: [{
        id: '',
        file_name: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    };
  }
}

/**
 * Check for stuck calls without cleaning them
 * @param thresholdMinutes - Minutes after which a call is considered stuck
 * @returns List of stuck calls
 */
export async function checkStuckCalls(thresholdMinutes: number = 60) {
  const supabase = createAdminClient();
  const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const { data: stuckCalls, error } = await supabase
    .from('calls')
    .select('id, file_name, status, updated_at, processing_attempts, user_id')
    .in('status', ['processing', 'transcribing', 'extracting'])
    .lt('updated_at', thresholdTime.toISOString())
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('[Check] Error fetching stuck calls:', error);
    return [];
  }

  return (stuckCalls || []).map(call => ({
    ...call,
    minutes_stuck: Math.round(
      (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60
    ),
    hours_stuck: Math.round(
      (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60 / 60
    )
  }));
}

/**
 * Setup function to be called by a cron job or external scheduler
 * This can be called from Vercel Cron, node-cron, or any other scheduler
 */
export async function runScheduledCleanup() {
  console.log('[Scheduled Job] Starting stuck call cleanup...');

  const result = await cleanupStuckCalls(60); // 1 hour threshold

  if (result.success) {
    console.log(`[Scheduled Job] Cleanup completed: ${result.cleaned} cleaned, ${result.failed} failed`);
  } else {
    console.error('[Scheduled Job] Cleanup failed');
  }

  return result;
}