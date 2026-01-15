/**
 * Twilio AMD (Answering Machine Detection) Webhook
 * Receives machine detection results for outbound calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/twilio/amd
 *
 * Receives AMD results from Twilio
 * AnsweredBy: human, machine, fax, unknown
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract AMD parameters
    const callSid = formData.get('CallSid') as string;
    const answeredBy = formData.get('AnsweredBy') as string;
    const machineDetectionDuration = formData.get('MachineDetectionDuration') as string;

    console.log('[Twilio AMD] Detection result:', {
      callSid,
      answeredBy,
      detectionDuration: machineDetectionDuration,
    });

    const supabase = createAdminClient();

    // Update twilio_calls record with AMD result
    const { error: twilioError } = await supabase
      .from('twilio_calls')
      .update({
        answered_by: answeredBy,
        raw_webhook_data: {
          amd_result: {
            answered_by: answeredBy,
            detection_duration: machineDetectionDuration,
            timestamp: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('twilio_call_sid', callSid);

    if (twilioError) {
      console.error('[Twilio AMD] Error updating twilio_calls:', twilioError);
    }

    // Update click_to_call_sessions metadata
    const { error: sessionError } = await supabase
      .from('click_to_call_sessions')
      .update({
        metadata: {
          answered_by: answeredBy,
          is_voicemail: answeredBy === 'machine',
          detection_duration: machineDetectionDuration,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('twilio_call_sid', callSid);

    if (sessionError) {
      console.error('[Twilio AMD] Error updating session:', sessionError);
    }

    // If it's a machine/voicemail, you might want to handle differently
    if (answeredBy === 'machine') {
      console.log('[Twilio AMD] Call answered by machine/voicemail:', callSid);
      // Could trigger different handling:
      // - Leave a pre-recorded message
      // - Mark for manual follow-up
      // - Schedule a retry
    }

    return NextResponse.json({
      success: true,
      answeredBy,
      callSid,
    });

  } catch (error) {
    console.error('[Twilio AMD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process AMD result' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twilio/amd
 * Test endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio AMD (Answering Machine Detection) webhook endpoint',
    accepts: ['POST'],
    parameters: [
      'CallSid',
      'AnsweredBy (human|machine|fax|unknown)',
      'MachineDetectionDuration',
    ],
    description: 'Receives machine detection results for outbound calls',
  });
}