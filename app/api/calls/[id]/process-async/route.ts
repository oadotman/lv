// =====================================================
// ASYNC CALL PROCESSING API ROUTE (WITH BULL QUEUE)
// Queues calls for background processing
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { canProcessCall, estimateMinutesFromFileSize, acquireProcessingLock } from '@/lib/usage-guard';
import { addCallToQueue, getJob, JobPriority } from '@/lib/queue/bull-processor';

export const runtime = 'nodejs';
export const maxDuration = 10; // Quick response - just queues the job

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  try {
    const supabase = createAdminClient();

    // Get call details
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (fetchError || !call) {
      console.error('[ProcessAsync] Call not found:', callId);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    console.log('[ProcessAsync] ========================================');
    console.log('[ProcessAsync] Queuing call for processing:', callId);
    console.log('[ProcessAsync] File:', call.file_name);

    // Check if already processing or queued
    if (['queued', 'processing', 'transcribing', 'extracting'].includes(call.status)) {
      console.warn('[ProcessAsync] Call already in progress:', call.status);
      return NextResponse.json(
        {
          error: 'Call is already being processed',
          status: call.status,
          callId
        },
        { status: 409 }
      );
    }

    // =====================================================
    // CHECK USAGE BEFORE QUEUING
    // =====================================================

    if (call.organization_id) {
      // Estimate minutes from file size
      const estimatedMinutes = call.file_size
        ? estimateMinutesFromFileSize(call.file_size)
        : 10; // Conservative estimate if no file size

      console.log('[ProcessAsync] 🔒 Checking usage guard...');
      const usageCheck = await canProcessCall(call.organization_id, estimatedMinutes, supabase as any);

      if (!usageCheck.allowed) {
        console.error('[ProcessAsync] 🚫 BLOCKED by usage guard:', {
          callId,
          organizationId: call.organization_id,
          reason: usageCheck.reason,
          projectedCharge: usageCheck.projectedCharge,
        });

        // Mark call as failed due to usage limit
        await supabase
          .from('calls')
          .update({
            status: 'failed',
            error_message: `Usage limit exceeded: ${usageCheck.reason}`,
            processing_message: 'Processing blocked: Would exceed $20 overage cap',
          })
          .eq('id', callId);

        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            details: {
              reason: usageCheck.reason,
              currentUsage: usageCheck.currentUsage,
              projectedOverageCharge: usageCheck.projectedCharge,
              message: 'This transcription would exceed your $20 overage cap. Please upgrade your plan.',
            },
          },
          { status: 402 }
        );
      }

      // Try to acquire processing lock
      console.log('[ProcessAsync] 🔐 Acquiring processing lock...');
      const lockAcquired = await acquireProcessingLock(
        call.organization_id,
        callId,
        estimatedMinutes,
        supabase as any
      );

      if (!lockAcquired) {
        console.warn('[ProcessAsync] ⚠️ Failed to acquire lock, but continuing...');
        // Continue anyway - lock is advisory
      }
    }

    // Get audio URL from storage
    const audioUrl = call.file_url;

    if (!audioUrl) {
      console.error('[ProcessAsync] ❌ No audio URL found');
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          error_message: 'No audio URL found',
        })
        .eq('id', callId);

      return NextResponse.json(
        { error: 'No audio URL found' },
        { status: 400 }
      );
    }

    // =====================================================
    // QUEUE THE JOB FOR PROCESSING
    // =====================================================

    // Get user information
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('organization_id', call.organization_id)
      .single();

    const userId = profile?.id || call.user_id || '';

    // Determine priority based on file size
    let priority = JobPriority.NORMAL;
    if (call.file_size) {
      const fileSizeMB = call.file_size / (1024 * 1024);
      if (fileSizeMB < 10) {
        priority = JobPriority.HIGH; // Small files process quickly
      } else if (fileSizeMB > 100) {
        priority = JobPriority.LOW; // Large files take longer
      }
    }

    // Add to Bull queue
    const job = await addCallToQueue({
      callId,
      organizationId: call.organization_id,
      userId,
      fileUrl: audioUrl,
      fileName: call.file_name,
      fileSize: call.file_size || 0,
      durationMinutes: call.duration_minutes,
      languageCode: call.language_code || 'en',
      speakerLabels: true,
      autoHighlights: false,
      contentSafety: false,
      iabCategories: false,
      sentimentAnalysis: true,
      entityDetection: false,
    }, {
      priority,
      delay: 0, // Process immediately
    });

    console.log('[ProcessAsync] ✅ Job queued successfully:', job.id);

    // Return job information
    return NextResponse.json({
      success: true,
      message: 'Call queued for processing',
      callId,
      jobId: job.id.toString(),
      status: 'queued',
      priority: priority === JobPriority.HIGH ? 'high' :
                priority === JobPriority.LOW ? 'low' : 'normal',
    });

  } catch (error) {
    console.error('[ProcessAsync] Error:', error);

    // Try to update call status
    try {
      const supabase = createAdminClient();
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Processing failed',
        })
        .eq('id', callId);
    } catch (updateError) {
      console.error('[ProcessAsync] Failed to update call status:', updateError);
    }

    // Release lock if acquired
    try {
      const supabase = createAdminClient();
      const { data: call } = await supabase
        .from('calls')
        .select('organization_id')
        .eq('id', callId)
        .single();

      if (call?.organization_id) {
        await import('@/lib/usage-guard').then(({ releaseProcessingLock }) =>
          releaseProcessingLock(callId, supabase as any)
        );
      }
    } catch (lockError) {
      console.error('[ProcessAsync] Failed to release lock:', lockError);
    }

    return NextResponse.json(
      { error: 'Failed to queue call for processing' },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  try {
    const supabase = createAdminClient();

    // Get call details
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('status, processing_progress, processing_message, error_message')
      .eq('id', callId)
      .single();

    if (fetchError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Try to get job information if available
    const jobIdParam = req.nextUrl.searchParams.get('jobId');
    let jobInfo = null;

    if (jobIdParam) {
      try {
        const job = await getJob(jobIdParam);
        if (job) {
          jobInfo = {
            id: job.id,
            progress: await job.progress(),
            attemptsMade: job.attemptsMade,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
          };
        }
      } catch (jobError) {
        console.error('[ProcessAsync] Failed to get job info:', jobError);
      }
    }

    return NextResponse.json({
      callId,
      status: call.status,
      progress: call.processing_progress || 0,
      message: call.processing_message || '',
      error: call.error_message,
      job: jobInfo,
    });

  } catch (error) {
    console.error('[ProcessAsync] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check processing status' },
      { status: 500 }
    );
  }
}