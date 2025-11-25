// =====================================================
// API ENDPOINT: Approve Call
// Approves a transcription and triggers CRM extraction
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import type { ApproveCallRequest, ApproveCallResponse, CallStatus } from '@/lib/types/approval';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await requireAuth();
    const supabase = createServerClient();

    const callId = params.id;

    // Parse request body
    const body: ApproveCallRequest = await req.json().catch(() => ({}));
    const { notes, skipExtraction = false } = body;

    // Get call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify user owns this call
    if (call.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if call is in a valid state for approval
    if (!['transcribed', 'pending_review', 'in_review'].includes(call.status)) {
      return NextResponse.json(
        {
          error: `Call cannot be approved in ${call.status} status. Must be transcribed, pending_review, or in_review.`,
        },
        { status: 400 }
      );
    }

    // Update call with approval
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'approved' as CallStatus,
        approval_status: 'approved',
        reviewed_by: user.id,
        reviewed_at: now,
        review_notes: notes || null,
        requires_review: false, // Clear the flag
      })
      .eq('id', callId);

    if (updateError) {
      console.error('Error updating call:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve call' },
        { status: 500 }
      );
    }

    // Record the approval in edit history
    await supabase.from('call_edits').insert({
      call_id: callId,
      user_id: user.id,
      edit_type: 'approval',
      old_value: call.status,
      new_value: 'approved',
      edit_reason: notes || 'Manual approval',
    });

    let extractionTriggered = false;

    // Trigger extraction unless explicitly skipped
    if (!skipExtraction) {
      try {
        await inngest.send({
          name: 'call/approved',
          data: {
            callId,
            userId: user.id,
            transcriptId: call.assemblyai_transcript_id,
            autoApproved: false,
          },
        });

        extractionTriggered = true;
        console.log(`[API] Extraction triggered for call ${callId}`);
      } catch (inngestError) {
        console.error('Error triggering extraction:', inngestError);
        // Don't fail the approval if extraction trigger fails
        // The user can manually trigger it later
      }
    }

    // Send notification
    await supabase.from('notifications').insert({
      user_id: call.user_id,
      notification_type: extractionTriggered ? 'call_approved' : 'call_reviewed',
      title: extractionTriggered
        ? 'Call approved - Extracting data'
        : 'Call approved',
      message: extractionTriggered
        ? 'Your call has been approved and CRM data extraction is now in progress.'
        : 'Your call has been approved.',
      link: `/calls/${callId}`,
      call_id: callId,
    });

    const response: ApproveCallResponse = {
      success: true,
      message: extractionTriggered
        ? 'Call approved and extraction started'
        : 'Call approved successfully',
      call: {
        id: callId,
        status: 'approved',
        approval_status: 'approved',
        reviewed_at: now,
      },
      extractionTriggered,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error approving call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
