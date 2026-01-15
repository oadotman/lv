/**
 * Twilio Click-to-Call API
 * Initiates outbound calls from the browser
 */

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/twilio/call
 *
 * Initiates a click-to-call session
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toNumber, contactId, contactType, notes } = await req.json();

    if (!toNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get user's organization and Twilio number
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, twilio_preferences')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get organization's active Twilio number
    const adminSupabase = createAdminClient();
    const { data: orgPhone } = await adminSupabase
      .from('organization_phones')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'active')
      .single();

    if (!orgPhone) {
      return NextResponse.json(
        { error: 'No active phone number. Please set up Twilio first.' },
        { status: 404 }
      );
    }

    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio not configured' },
        { status: 500 }
      );
    }

    const twilioClient = twilio(accountSid, authToken);

    console.log('[Click-to-Call] Initiating call:', {
      from: orgPhone.twilio_number,
      to: toNumber,
      userId: user.id,
    });

    // Create click-to-call session record
    const { data: session } = await adminSupabase
      .from('click_to_call_sessions')
      .insert({
        user_id: user.id,
        organization_id: userData.organization_id,
        from_number: orgPhone.twilio_number,
        to_number: toNumber,
        contact_id: contactId || null,
        contact_type: contactType || null,
        notes: notes || null,
        status: 'initiated',
      })
      .select()
      .single();

    // Make the call using Twilio
    const call = await twilioClient.calls.create({
      to: toNumber,
      from: orgPhone.twilio_number,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      record: orgPhone.recording_enabled,
      recordingStatusCallback: orgPhone.recording_enabled
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording`
        : undefined,
      recordingStatusCallbackMethod: 'POST',
      // Custom parameters to track this session
      machineDetection: 'DetectMessageEnd',
      asyncAmd: 'true',
      asyncAmdStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/amd`,
      asyncAmdStatusCallbackMethod: 'POST',
    });

    // Update session with Twilio call SID
    await adminSupabase
      .from('click_to_call_sessions')
      .update({
        twilio_call_sid: call.sid,
        status: 'calling',
      })
      .eq('id', session.id);

    console.log('[Click-to-Call] Call initiated:', call.sid);

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      sessionId: session.id,
      from: orgPhone.twilio_number,
      to: toNumber,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    console.error('[Click-to-Call] Error:', error);

    if (error instanceof Error && error.message.includes('Twilio')) {
      return NextResponse.json(
        {
          error: 'Failed to initiate call',
          message: error.message,
        },
        { status: 503 }
      );
    }

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
 * GET /api/twilio/call/:sid
 *
 * Gets the status of a call
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const callSid = url.searchParams.get('sid');

    if (!callSid) {
      return NextResponse.json(
        { error: 'Call SID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get call session
    const { data: session } = await supabase
      .from('click_to_call_sessions')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .eq('user_id', user.id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Call session not found' },
        { status: 404 }
      );
    }

    // Get call status from Twilio if needed
    if (session.status === 'calling' || session.status === 'connected') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (accountSid && authToken) {
        try {
          const twilioClient = twilio(accountSid, authToken);
          const call = await twilioClient.calls(callSid).fetch();

          // Update session if status changed
          if (call.status !== session.status) {
            const adminSupabase = createAdminClient();
            await adminSupabase
              .from('click_to_call_sessions')
              .update({
                status: call.status,
                duration: call.duration ? parseInt(call.duration) : null,
                ended_at: call.status === 'completed' ? new Date().toISOString() : null,
              })
              .eq('id', session.id);

            session.status = call.status;
            session.duration = call.duration ? parseInt(call.duration) : null;
          }
        } catch (twilioError) {
          console.error('[Click-to-Call] Twilio fetch error:', twilioError);
        }
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      callSid: session.twilio_call_sid,
      status: session.status,
      duration: session.duration,
      from: session.from_number,
      to: session.to_number,
      initiatedAt: session.initiated_at,
      connectedAt: session.connected_at,
      endedAt: session.ended_at,
    });
  } catch (error) {
    console.error('[Click-to-Call] GET error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}