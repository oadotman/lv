/**
 * Twilio Recording Webhook
 * Processes completed call recordings and triggers transcription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { inngest } from '@/lib/inngest/client';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max

/**
 * POST /api/twilio/recording
 *
 * Called by Twilio when a recording is ready
 * Downloads recording and triggers LoadVoice processing pipeline
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract Twilio recording parameters
    const recordingSid = formData.get('RecordingSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const recordingStatus = formData.get('RecordingStatus') as string;

    console.log('[Twilio Recording] Recording received:', {
      recordingSid,
      callSid,
      duration: recordingDuration,
      status: recordingStatus,
    });

    // Only process completed recordings
    if (recordingStatus !== 'completed') {
      console.log('[Twilio Recording] Skipping non-completed recording:', recordingStatus);
      return NextResponse.json({ success: true, message: 'Recording not completed yet' });
    }

    const supabase = createAdminClient();

    // Update Twilio call record with recording info
    const { data: twilioCall, error: twilioError } = await supabase
      .from('twilio_calls')
      .update({
        twilio_recording_sid: recordingSid,
        recording_url: recordingUrl + '.mp3', // Twilio supports .mp3 format
        recording_duration: parseInt(recordingDuration),
        duration: parseInt(recordingDuration), // Use recording duration as call duration
        status: 'recorded',
        updated_at: new Date().toISOString(),
      })
      .eq('twilio_call_sid', callSid)
      .select()
      .single();

    if (twilioError) {
      console.error('[Twilio Recording] Error updating Twilio call:', twilioError);
      // Continue anyway - we can still process the recording
    }

    // Get organization info
    const { data: orgPhone } = await supabase
      .from('organization_phones')
      .select('organization_id, transcription_enabled')
      .eq('twilio_number', to)
      .single();

    if (!orgPhone) {
      console.error('[Twilio Recording] Organization phone not found for:', to);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create a main call record in LoadVoice
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        organization_id: orgPhone.organization_id,
        title: `Call with ${formatPhoneNumber(from)}`,
        audio_url: recordingUrl + '.mp3',
        duration: parseInt(recordingDuration),
        status: 'recorded',
        source: 'twilio',
        metadata: {
          twilio_call_sid: callSid,
          twilio_recording_sid: recordingSid,
          from_number: from,
          to_number: to,
          auto_recorded: true,
        },
      })
      .select()
      .single();

    if (callError) {
      console.error('[Twilio Recording] Error creating call record:', callError);
      return NextResponse.json(
        { error: 'Failed to create call record' },
        { status: 500 }
      );
    }

    // Link Twilio call to LoadVoice call
    if (twilioCall) {
      await supabase
        .from('twilio_calls')
        .update({ call_id: call.id })
        .eq('id', twilioCall.id);
    }

    // Trigger transcription if enabled
    if (orgPhone.transcription_enabled !== false) {
      console.log('[Twilio Recording] Triggering transcription for call:', call.id);

      await inngest.send({
        name: 'call/process',
        data: {
          callId: call.id,
          organizationId: orgPhone.organization_id,
          audioUrl: recordingUrl + '.mp3',
          source: 'twilio',
        },
      });
    }

    // Update organization usage
    await supabase.rpc('increment_usage', {
      org_id: orgPhone.organization_id,
      call_count: 1,
      audio_minutes: Math.ceil(parseInt(recordingDuration) / 60),
    });

    console.log('[Twilio Recording] Successfully processed recording:', {
      callId: call.id,
      organizationId: orgPhone.organization_id,
      duration: recordingDuration,
    });

    return NextResponse.json({
      success: true,
      callId: call.id,
      message: 'Recording processed successfully',
    });
  } catch (error) {
    console.error('[Twilio Recording] Webhook error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twilio/recording
 *
 * Test endpoint to verify webhook is accessible
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Twilio Recording Webhook',
    status: 'ready',
    description: 'This endpoint receives recording status callbacks from Twilio',
  });
}

/**
 * Format phone number for display
 */
function formatPhoneNumber(phone: string): string {
  // Remove country code if present
  const cleaned = phone.replace(/^\+1/, '').replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Return original if not standard US format
  return phone;
}