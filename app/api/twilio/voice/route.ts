/**
 * Twilio Voice Webhook - SECURED with signature validation
 * Handles incoming and outgoing calls with automatic recording
 * Includes configurable recording disclosure for legal compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateTwilioWebhook, logWebhookActivity } from '@/lib/twilio/security';

export const runtime = 'nodejs';

// Two-party consent states that require recording disclosure
const TWO_PARTY_CONSENT_STATES = [
  'CA', // California
  'CT', // Connecticut
  'FL', // Florida
  'IL', // Illinois
  'MD', // Maryland
  'MA', // Massachusetts
  'MI', // Michigan
  'MT', // Montana
  'NV', // Nevada
  'NH', // New Hampshire
  'PA', // Pennsylvania
  'WA', // Washington
];

/**
 * Determine if recording disclosure is required based on state
 */
function requiresRecordingDisclosure(
  phoneNumber: string,
  organizationSettings?: any
): boolean {
  // If organization has explicitly enabled disclosure, always use it
  if (organizationSettings?.always_announce_recording) {
    return true;
  }

  // If organization has explicitly disabled disclosure (use at their own risk)
  if (organizationSettings?.never_announce_recording) {
    return false;
  }

  // Try to determine state from phone number area code
  // This is a simplified approach - in production, you might want to use a service
  // that can accurately determine the state from the phone number

  // For now, default to true for safety (always announce)
  return true;
}

/**
 * POST /api/twilio/voice
 *
 * TwiML endpoint for handling voice calls
 * Automatically records calls with proper disclosure
 * SECURED with webhook signature validation
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Validate Twilio webhook signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('[Twilio Voice] TWILIO_AUTH_TOKEN not configured');
      return new NextResponse('Server configuration error', { status: 500 });
    }

    // Clone request for validation (body can only be read once)
    const clonedReq = req.clone();
    const validation = await validateTwilioWebhook(clonedReq, authToken);

    if (!validation.isValid) {
      console.warn('[Twilio Voice] Invalid webhook signature:', validation.error);
      await logWebhookActivity('voice', false, {
        error: validation.error,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Extract validated parameters
    const params = validation.params!;
    const callSid = params.CallSid as string;
    const from = params.From as string;
    const to = params.To as string;
    const callStatus = params.CallStatus as string;
    const direction = params.Direction as string;
    const fromCity = params.FromCity as string;
    const fromState = params.FromState as string;
    const toCity = params.ToCity as string;
    const toState = params.ToState as string;

    console.log('[Twilio Voice] Verified incoming call:', {
      callSid,
      from,
      to,
      direction,
      status: callStatus,
      fromState,
      toState,
    });

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Get organization by phone number
    const supabase = createAdminClient();

    // First check if the phone number exists in our system
    const { data: twilioNumber } = await supabase
      .from('twilio_phone_numbers')
      .select(`
        *,
        organizations!inner(*)
      `)
      .eq('phone_number', to)
      .single();

    if (!twilioNumber) {
      console.error('[Twilio Voice] Phone number not found:', to);
      twiml.say('This number is not configured. Please contact support.');

      await logWebhookActivity('voice', false, {
        reason: 'phone_not_found',
        phone: to,
        callSid
      });

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Get organization settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('organization_id', twilioNumber.organization_id)
      .single();

    // Store call record in database
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        organization_id: twilioNumber.organization_id,
        twilio_call_sid: callSid,
        twilio_phone_number_id: twilioNumber.id,
        from_number: from,
        to_number: to,
        direction: direction?.toLowerCase() || 'inbound',
        status: 'initiated',
        started_at: new Date().toISOString(),
        metadata: {
          fromCity,
          fromState,
          toCity,
          toState,
        },
      })
      .select()
      .single();

    if (callError) {
      console.error('[Twilio Voice] Error creating call record:', callError);
    }

    // Check if recording disclosure is required
    const needsDisclosure = requiresRecordingDisclosure(from, settings);

    if (needsDisclosure && settings?.recording_disclosure_enabled !== false) {
      // Use custom disclosure text if provided, otherwise use default
      const disclosureText =
        settings?.recording_disclosure_text ||
        'This call is being recorded for quality assurance and documentation purposes.';

      twiml.say({
        voice: 'alice',
        language: 'en-US',
      }, disclosureText);

      // Add a small pause after disclosure
      twiml.pause({ length: 1 });
    }

    // If there's a forwarding number configured, dial it
    if (twilioNumber.forwarding_number) {
      const dial = twiml.dial({
        callerId: from,
        record: 'record-from-answer-dual', // Record both sides from when call is answered
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-status`,
        recordingStatusCallbackEvent: ['completed'] as any, // Type assertion for Twilio event types
        recordingStatusCallbackMethod: 'POST',
        trim: 'trim-silence', // Remove silence from beginning and end
      } as any); // Type assertion to handle Twilio typing issues

      dial.number(twilioNumber.forwarding_number);
    } else {
      // No forwarding number, just record the call
      twiml.record({
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-complete`,
        method: 'POST',
        maxLength: 3600, // Max 1 hour
        playBeep: false, // Don't play beep after disclosure
        transcribe: false, // We'll use AssemblyAI for transcription
        trim: 'trim-silence',
      });

      // After recording, end the call
      twiml.hangup();
    }

    // Add status callback for call completion
    const response = new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

    // Log successful webhook processing
    await logWebhookActivity('voice', true, {
      callSid,
      organizationId: twilioNumber.organization_id,
      direction,
      from,
      to,
    });

    return response;
  } catch (error) {
    console.error('[Twilio Voice] Error:', error);

    await logWebhookActivity('voice', false, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return safe TwiML even in error cases
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      'We encountered an error processing your call. Please try again later or contact support.'
    );
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 200, // Return 200 even for errors so Twilio gets valid TwiML
    });
  }
}