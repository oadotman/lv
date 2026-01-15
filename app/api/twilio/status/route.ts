/**
 * Twilio Status Callback Webhook - SECURED & REAL-TIME
 * Receives call status updates during the call lifecycle
 * Triggers AI processing pipeline when calls complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateTwilioWebhook, logWebhookActivity } from '@/lib/twilio/security';
import { triggerCallProcessing } from '@/lib/queue/call-processor';

export const runtime = 'nodejs';

/**
 * POST /api/twilio/status
 *
 * Receives SECURED call status updates from Twilio
 * Status progression: queued → ringing → in-progress → completed/busy/failed/no-answer
 * Triggers AI processing when calls complete
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Validate Twilio webhook signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('[Status] TWILIO_AUTH_TOKEN not configured');
      return new NextResponse('Server configuration error', { status: 500 });
    }

    const clonedReq = req.clone();
    const validation = await validateTwilioWebhook(clonedReq, authToken);

    if (!validation.isValid) {
      console.warn('[Status] Invalid webhook signature:', validation.error);
      await logWebhookActivity('status', false, {
        error: validation.error,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const params = validation.params!;

    // Extract status parameters from validated params
    const callSid = params.CallSid as string;
    const callStatus = params.CallStatus as string;
    const from = params.From as string;
    const to = params.To as string;
    const direction = params.Direction as string;
    const duration = params.CallDuration as string;
    const timestamp = params.Timestamp as string;
    const recordingSid = params.RecordingSid as string;
    const recordingUrl = params.RecordingUrl as string;

    console.log('[Twilio Status] Call status update:', {
      callSid,
      status: callStatus,
      from,
      to,
      direction,
      duration,
    });

    const supabase = createAdminClient();

    // Update twilio_calls record
    const { error: twilioError } = await supabase
      .from('twilio_calls')
      .update({
        status: callStatus,
        duration: duration ? parseInt(duration, 10) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('twilio_call_sid', callSid);

    if (twilioError) {
      console.error('[Twilio Status] Error updating twilio_calls:', twilioError);
    }

    // Update click_to_call_sessions if this is an outbound call
    if (direction === 'outbound-api') {
      const statusTimestamps: any = {};

      // Set appropriate timestamp based on status
      switch (callStatus) {
        case 'ringing':
          statusTimestamps.connected_at = timestamp || new Date().toISOString();
          break;
        case 'in-progress':
          statusTimestamps.connected_at = statusTimestamps.connected_at || timestamp || new Date().toISOString();
          break;
        case 'completed':
        case 'busy':
        case 'failed':
        case 'no-answer':
          statusTimestamps.ended_at = timestamp || new Date().toISOString();
          if (duration) {
            statusTimestamps.duration = parseInt(duration, 10);
          }
          break;
      }

      const { error: sessionError } = await supabase
        .from('click_to_call_sessions')
        .update({
          status: callStatus,
          ...statusTimestamps,
          updated_at: new Date().toISOString(),
        })
        .eq('twilio_call_sid', callSid);

      if (sessionError) {
        console.error('[Twilio Status] Error updating session:', sessionError);
      }
    }

    // For completed calls, trigger the AI processing pipeline
    if (callStatus === 'completed') {
      const { data: call } = await supabase
        .from('calls')
        .select('id, organization_id')
        .eq('twilio_call_sid', callSid)
        .single();

      if (call) {
        // Update call with final status and recording info
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            status: 'completed',
            duration_seconds: duration ? parseInt(duration, 10) : null,
            recording_sid: recordingSid || null,
            recording_url: recordingUrl || null,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', call.id);

        if (updateError) {
          console.error('[Status] Error updating call:', updateError);
        }

        // Update usage tracking
        if (duration) {
          const minutes = Math.ceil(parseInt(duration) / 60);

          // Get current usage first
          const { data: currentUsage } = await supabase
            .from('usage_limits')
            .select('current_call_minutes')
            .eq('organization_id', call.organization_id)
            .single();

          // Update organization's current usage
          const { error: usageError } = await supabase
            .from('usage_limits')
            .update({
              current_call_minutes: (currentUsage?.current_call_minutes || 0) + minutes
            })
            .eq('organization_id', call.organization_id);

          if (usageError) {
            console.error('[Status] Error updating usage:', usageError);
          }

          // Log usage for billing
          await supabase.from('usage_logs').insert({
            organization_id: call.organization_id,
            usage_type: 'call_minutes',
            amount: minutes,
            resource_id: call.id,
            description: `Call ${callSid} - ${minutes} minutes`,
            created_at: new Date().toISOString()
          });
        }

        // TRIGGER AI PROCESSING PIPELINE
        console.log('[Status] Triggering AI processing for call:', call.id);

        try {
          // This will handle transcription and extraction
          await triggerCallProcessing({
            callId: call.id,
            organizationId: call.organization_id,
            recordingUrl: recordingUrl,
            recordingSid: recordingSid
          });

          // Send real-time notification
          await supabase.from('notifications').insert({
            organization_id: call.organization_id,
            type: 'call_processing',
            title: 'Call Processing Started',
            message: 'Your call is being transcribed and analyzed',
            data: { callId: call.id },
            created_at: new Date().toISOString()
          });
        } catch (processError) {
          console.error('[Status] Error triggering processing:', processError);
          // Don't fail the webhook if processing trigger fails
        }
      }
    }

    // Log successful webhook
    await logWebhookActivity('status', true, {
      callSid,
      status: callStatus,
      duration
    });

    // Return success response
    return NextResponse.json({
      success: true,
      status: callStatus,
      callSid
    });

  } catch (error) {
    console.error('[Twilio Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process status update' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twilio/status
 * Test endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio status callback endpoint',
    accepts: ['POST'],
    parameters: [
      'CallSid',
      'CallStatus',
      'From',
      'To',
      'Direction',
      'CallDuration',
      'Timestamp'
    ]
  });
}