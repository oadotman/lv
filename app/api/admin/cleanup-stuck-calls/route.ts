// =====================================================
// ADMIN API: CLEANUP STUCK CALLS
// Manually trigger cleanup of stuck calls
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Check for admin authorization
    const headersList = headers();
    const serviceRole = headersList.get('x-service-role');

    // In production, implement proper admin authentication
    // For now, check for service role key or authenticated admin user
    if (!serviceRole && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Find calls stuck for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get stuck calls first for logging
    const { data: stuckCalls, error: fetchError } = await supabase
      .from('calls')
      .select('id, file_name, status, updated_at, processing_attempts')
      .in('status', ['processing', 'transcribing', 'extracting'])
      .lt('updated_at', oneHourAgo.toISOString())
      .order('updated_at', { ascending: true });

    if (fetchError) {
      console.error('[Cleanup] Error fetching stuck calls:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch stuck calls' },
        { status: 500 }
      );
    }

    if (!stuckCalls || stuckCalls.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck calls found',
        cleaned: 0,
        calls: []
      });
    }

    console.log(`[Cleanup] Found ${stuckCalls.length} stuck calls to clean`);

    // Mark all stuck calls as failed
    const cleanedCalls = [];
    const failedCalls = [];

    for (const call of stuckCalls) {
      const minutesStuck = Math.round(
        (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60
      );

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
        console.error(`[Cleanup] Failed to update call ${call.id}:`, updateError);
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
      }
    }

    // Log the cleanup action
    await supabase
      .from('system_logs')
      .insert({
        log_type: 'manual_cleanup',
        message: `Manual cleanup: ${cleanedCalls.length} calls cleaned, ${failedCalls.length} failed`,
        metadata: {
          cleaned_calls: cleanedCalls,
          failed_calls: failedCalls,
          triggered_by: 'api',
          timestamp: new Date().toISOString()
        }
      });

    console.log(`[Cleanup] Cleaned ${cleanedCalls.length} stuck calls`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCalls.length} stuck calls`,
      cleaned: cleanedCalls.length,
      failed: failedCalls.length,
      calls: cleanedCalls,
      errors: failedCalls
    });

  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check for stuck calls without cleaning them
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get threshold from query params (default 60 minutes)
    const url = new URL(req.url);
    const thresholdMinutes = parseInt(url.searchParams.get('threshold') || '60');

    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const { data: stuckCalls, error } = await supabase
      .from('calls')
      .select('id, file_name, status, updated_at, processing_attempts, user_id')
      .in('status', ['processing', 'transcribing', 'extracting'])
      .lt('updated_at', thresholdTime.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stuck calls' },
        { status: 500 }
      );
    }

    const callsWithDetails = (stuckCalls || []).map(call => ({
      ...call,
      minutes_stuck: Math.round(
        (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60
      ),
      hours_stuck: Math.round(
        (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60 / 60
      )
    }));

    return NextResponse.json({
      success: true,
      threshold_minutes: thresholdMinutes,
      stuck_count: callsWithDetails.length,
      calls: callsWithDetails
    });

  } catch (error) {
    console.error('[Cleanup] Error checking stuck calls:', error);
    return NextResponse.json(
      { error: 'Check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}