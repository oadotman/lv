/**
 * Twilio Phone Number Provisioning API
 * Handles setting up Twilio phone numbers for organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/twilio/setup
 *
 * Provisions a new Twilio phone number for an organization
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

    const { organizationId, areaCode, forwardTo } = await req.json();

    // Verify user is admin/owner of organization
    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (
      !userData ||
      userData.organization_id !== organizationId ||
      !['owner', 'admin'].includes(userData.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if organization already has a phone number
    const adminSupabase = createAdminClient();
    const { data: existingPhone } = await adminSupabase
      .from('organization_phones')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (existingPhone) {
      return NextResponse.json({
        success: false,
        message: 'Organization already has an active phone number',
        phoneNumber: existingPhone.twilio_number,
      });
    }

    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.error('[Twilio Setup] Missing Twilio credentials');
      return NextResponse.json(
        { error: 'Twilio not configured' },
        { status: 500 }
      );
    }

    const twilioClient = twilio(accountSid, authToken);

    console.log('[Twilio Setup] Searching for available numbers...');

    // Search for available phone numbers
    const availableNumbers = await twilioClient
      .availablePhoneNumbers('US')
      .local.list({
        areaCode: areaCode || undefined,
        voiceEnabled: true,
        smsEnabled: false, // We don't need SMS for now
        limit: 10,
      });

    if (availableNumbers.length === 0) {
      return NextResponse.json(
        {
          error: 'No phone numbers available',
          message: areaCode
            ? `No numbers available in area code ${areaCode}`
            : 'No numbers available. Try a different area code.',
        },
        { status: 404 }
      );
    }

    // Pick the first available number
    const selectedNumber = availableNumbers[0];

    console.log('[Twilio Setup] Provisioning number:', selectedNumber.phoneNumber);

    // Purchase the phone number
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: selectedNumber.phoneNumber,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      voiceCallerIdLookup: true, // Get caller ID info
    });

    console.log('[Twilio Setup] Number purchased:', purchasedNumber.sid);

    // Save to database
    const { data: phoneRecord, error: dbError } = await adminSupabase
      .from('organization_phones')
      .insert({
        organization_id: organizationId,
        twilio_number: purchasedNumber.phoneNumber,
        twilio_sid: purchasedNumber.sid,
        friendly_name: purchasedNumber.friendlyName,
        forward_to: forwardTo || null,
        capabilities: {
          voice: purchasedNumber.capabilities.voice,
          sms: purchasedNumber.capabilities.sms,
          mms: purchasedNumber.capabilities.mms,
          fax: purchasedNumber.capabilities.fax,
        },
        status: 'active',
        metadata: {
          region: selectedNumber.region,
          locality: selectedNumber.locality,
          rate_center: selectedNumber.rateCenter,
          latitude: selectedNumber.latitude,
          longitude: selectedNumber.longitude,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Twilio Setup] Database error:', dbError);

      // Try to release the number if DB save failed
      try {
        await twilioClient
          .incomingPhoneNumbers(purchasedNumber.sid)
          .remove();
      } catch (releaseError) {
        console.error('[Twilio Setup] Failed to release number:', releaseError);
      }

      return NextResponse.json(
        { error: 'Failed to save phone number' },
        { status: 500 }
      );
    }

    // Update organization settings
    await adminSupabase
      .from('organizations')
      .update({
        twilio_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    console.log('[Twilio Setup] Successfully provisioned number for org:', organizationId);

    return NextResponse.json({
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName,
      capabilities: phoneRecord.capabilities,
      metadata: phoneRecord.metadata,
      message: 'Phone number provisioned successfully',
    });
  } catch (error) {
    console.error('[Twilio Setup] Error:', error);

    if (error instanceof Error && error.message.includes('Twilio')) {
      return NextResponse.json(
        {
          error: 'Twilio error',
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
 * GET /api/twilio/setup
 *
 * Gets the current Twilio setup for an organization
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get organization's phone numbers
    const { data: phones } = await supabase
      .from('organization_phones')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'active');

    return NextResponse.json({
      enabled: phones && phones.length > 0,
      phones: phones || [],
    });
  } catch (error) {
    console.error('[Twilio Setup] GET error:', error);

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
 * DELETE /api/twilio/setup
 *
 * Releases a Twilio phone number
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneId } = await req.json();

    // Verify user can manage this phone number
    const { data: phone } = await supabase
      .from('organization_phones')
      .select('*, organizations!inner(id)')
      .eq('id', phoneId)
      .single();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (
      !userData ||
      userData.organization_id !== phone.organization_id ||
      !['owner', 'admin'].includes(userData.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Release the number from Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        const twilioClient = twilio(accountSid, authToken);
        await twilioClient
          .incomingPhoneNumbers(phone.twilio_sid)
          .remove();

        console.log('[Twilio Setup] Released number:', phone.twilio_number);
      } catch (twilioError) {
        console.error('[Twilio Setup] Failed to release from Twilio:', twilioError);
        // Continue anyway - we'll mark as inactive
      }
    }

    // Mark as inactive in database
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('organization_phones')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', phoneId);

    return NextResponse.json({
      success: true,
      message: 'Phone number released successfully',
    });
  } catch (error) {
    console.error('[Twilio Setup] DELETE error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}