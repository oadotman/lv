// =====================================================
// MANUAL TRANSCRIPTION TRIGGER API
// POST: Start transcription for an uploaded call
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    const callId = params.id;

    // Get call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id) // Ensure user owns the call
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if call is in a state that can be transcribed
    if (call.status !== 'uploaded' && call.status !== 'failed') {
      return NextResponse.json(
        { error: `Call is currently in "${call.status}" state. Can only transcribe calls in "uploaded" or "failed" state.` },
        { status: 400 }
      );
    }

    // Check if audio URL exists
    if (!call.audio_url && !call.file_url) {
      return NextResponse.json(
        { error: 'No audio file found for this call' },
        { status: 400 }
      );
    }

    // Trigger background processing directly (no Inngest needed)
    try {
      console.log('🚀 Triggering background processing for call:', callId);

      // Update call status to processing
      await supabase
        .from('calls')
        .update({
          status: 'processing',
          assemblyai_error: null, // Clear any previous errors
        })
        .eq('id', callId);

      // Call processing endpoint asynchronously (fire and forget)
      const processUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${callId}/process`;

      // Use fetch without awaiting to trigger background processing
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-processing': 'true',
        },
      }).catch((err) => {
        console.error('Failed to trigger processing:', err);
      });

      console.log('✅ Background processing triggered for call:', callId);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        notification_type: 'call_processing',
        title: 'Transcription started',
        message: `Your call with ${call.customer_name || 'customer'} is now being transcribed. This usually takes 3-6 minutes.`,
        link: `/calls/${callId}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Transcription started successfully',
        call: {
          id: call.id,
          status: 'processing',
        },
      });

    } catch (error) {
      console.error('Failed to trigger transcription:', error);

      // Update status to failed
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: error instanceof Error
            ? error.message
            : 'Failed to start transcription',
        })
        .eq('id', callId);

      return NextResponse.json(
        { error: 'Failed to start transcription. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Transcription trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
