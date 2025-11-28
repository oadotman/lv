// =====================================================
// AUDIO TRIMMING API
// POST: Trim audio to selected time range before transcription
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
    const body = await request.json();
    const { startTime, endTime } = body;

    // Validate input
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      return NextResponse.json(
        { error: 'Invalid time range' },
        { status: 400 }
      );
    }

    if (startTime < 0 || endTime <= startTime) {
      return NextResponse.json(
        { error: 'Invalid time range. End time must be after start time.' },
        { status: 400 }
      );
    }

    if (endTime - startTime < 1) {
      return NextResponse.json(
        { error: 'Selected audio must be at least 1 second long' },
        { status: 400 }
      );
    }

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

    // Check if call is in a state that can be trimmed
    if (call.status !== 'uploaded' && call.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot trim audio. Call is in "${call.status}" state. Audio can only be trimmed before transcription.` },
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

    // Store trim metadata in the call record
    // The actual audio trimming will be handled by AssemblyAI using the start/end timestamps
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        trim_start: startTime,
        trim_end: endTime,
        metadata: {
          ...(call.metadata || {}),
          trim_duration: endTime - startTime,
        },
      })
      .eq('id', callId);

    if (updateError) {
      console.error('Failed to update call metadata:', updateError);
      return NextResponse.json(
        { error: 'Failed to save trim settings' },
        { status: 500 }
      );
    }

    // Trigger background processing directly (no Inngest needed)
    try {
      console.log('🚀 Triggering background processing with trim for call:', callId, {
        startTime,
        endTime,
        duration: endTime - startTime,
      });

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
        message: `Transcribing ${Math.floor(endTime - startTime)} seconds of your call with ${call.customer_name || 'customer'}. This usually takes 3-6 minutes.`,
        link: `/calls/${callId}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Audio trimmed and transcription started',
        trim: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
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
    console.error('Trim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
