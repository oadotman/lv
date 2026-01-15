/**
 * Twilio Phone Number Provisioning
 * Allows users to get their own LoadVoice number
 * They can either use it directly or forward their existing number to it
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import twilio from 'twilio';

export const runtime = 'nodejs';

/**
 * POST /api/twilio/provision-number
 *
 * Provisions a new Twilio phone number for the user's organization
 * Users can:
 * 1. Use this number directly for all their freight calls
 * 2. Forward their existing business number to this LoadVoice number
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const { areaCode, localNumber } = await req.json();

    // Use LoadVoice's main Twilio account (not per-org)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.error('[Provision] Twilio credentials not configured');
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    const twilioClient = twilio(accountSid, authToken);

    // Check if organization already has a number
    const adminSupabase = createAdminClient();
    const { data: existingNumbers } = await adminSupabase
      .from('twilio_phone_numbers')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .eq('is_active', true);

    if (existingNumbers && existingNumbers.length > 0) {
      // Return existing number instead of provisioning new one
      return NextResponse.json({
        phoneNumber: existingNumbers[0].phone_number,
        isExisting: true,
        message: 'You already have a LoadVoice number'
      });
    }

    // Search for available phone numbers
    let availableNumbers;

    try {
      if (localNumber) {
        // Try to get a specific number if requested
        availableNumbers = await twilioClient
          .availablePhoneNumbers('US')
          .local
          .list({
            contains: localNumber.replace(/\D/g, ''), // Remove non-digits
            limit: 1
          });
      } else if (areaCode && areaCode !== 'local') {
        // Search by area code
        availableNumbers = await twilioClient
          .availablePhoneNumbers('US')
          .local
          .list({
            areaCode: areaCode,
            voiceEnabled: true,
            limit: 10
          });
      } else {
        // Get any available US number
        availableNumbers = await twilioClient
          .availablePhoneNumbers('US')
          .local
          .list({
            voiceEnabled: true,
            limit: 10
          });
      }
    } catch (twilioError) {
      console.error('[Provision] Error searching numbers:', twilioError);
      return NextResponse.json({
        error: 'Failed to search for available numbers'
      }, { status: 500 });
    }

    if (!availableNumbers || availableNumbers.length === 0) {
      return NextResponse.json({
        error: `No phone numbers available ${areaCode ? `in area code ${areaCode}` : ''}`
      }, { status: 404 });
    }

    // Purchase the first available number
    const selectedNumber = availableNumbers[0];

    let purchasedNumber;
    try {
      purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: selectedNumber.phoneNumber,
        friendlyName: `LoadVoice - ${userOrg.organization_id}`,

        // Voice webhooks - all calls go through our system
        voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice-fallback`,
        voiceFallbackMethod: 'POST',

        // Status callback for real-time updates
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
        statusCallbackMethod: 'POST',

        // SMS (optional, for future features)
        smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms`,
        smsMethod: 'POST'
      });

      console.log('[Provision] Successfully purchased number:', purchasedNumber.phoneNumber);
    } catch (purchaseError) {
      console.error('[Provision] Error purchasing number:', purchaseError);
      return NextResponse.json({
        error: 'Failed to purchase phone number'
      }, { status: 500 });
    }

    // Save to database
    try {
      const { data: savedNumber, error: dbError } = await adminSupabase
        .from('twilio_phone_numbers')
        .insert({
          organization_id: userOrg.organization_id,
          phone_number: purchasedNumber.phoneNumber,
          twilio_sid: purchasedNumber.sid,
          friendly_name: purchasedNumber.friendlyName,
          area_code: purchasedNumber.phoneNumber.substring(2, 5), // Extract area code
          capabilities: {
            voice: purchasedNumber.capabilities.voice,
            sms: purchasedNumber.capabilities.sms,
            mms: purchasedNumber.capabilities.mms
          },
          is_primary: true, // First number is primary
          is_active: true,
          created_at: new Date().toISOString(),
          metadata: {
            provisioned_by: user.id,
            region: selectedNumber.region,
            country: 'US'
          }
        })
        .select()
        .single();

      if (dbError) {
        // If database save fails, release the number
        console.error('[Provision] Database error, releasing number:', dbError);
        await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
        throw dbError;
      }

      // Create default system settings for the organization
      await adminSupabase
        .from('system_settings')
        .upsert({
          organization_id: userOrg.organization_id,
          recording_enabled: true,
          recording_disclosure_enabled: true,
          recording_disclosure_text: 'This call is being recorded for quality and documentation purposes.',
          auto_transcription: true,
          auto_extraction: true,
          email_notifications: true,
          created_at: new Date().toISOString()
        });

      // Initialize usage limits for the organization
      await adminSupabase
        .from('usage_limits')
        .upsert({
          organization_id: userOrg.organization_id,
          monthly_call_minutes: 60, // Free tier
          monthly_transcription_minutes: 60,
          monthly_extractions: 100,
          current_call_minutes: 0,
          current_transcription_minutes: 0,
          current_extractions: 0,
          overage_enabled: false,
          reset_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      console.log('[Provision] Successfully saved number to database');

      // Return success with instructions
      return NextResponse.json({
        success: true,
        phoneNumber: purchasedNumber.phoneNumber,
        sid: purchasedNumber.sid,
        instructions: {
          option1: {
            title: 'Use LoadVoice Number Directly',
            description: 'Give this number to carriers and shippers',
            steps: [
              `Save this number in your contacts: ${purchasedNumber.phoneNumber}`,
              'Share it with your carriers and shippers',
              'All calls to this number are automatically recorded and processed'
            ]
          },
          option2: {
            title: 'Forward Your Existing Number',
            description: 'Keep your current business number',
            steps: [
              'Contact your phone provider',
              `Request call forwarding to: ${purchasedNumber.phoneNumber}`,
              'Choose: Always forward, Forward when busy, or Forward when no answer',
              'Your existing number stays the same, but calls get processed by LoadVoice'
            ]
          }
        }
      });

    } catch (error) {
      // Clean up purchased number if something went wrong
      if (purchasedNumber?.sid) {
        try {
          await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
        } catch (cleanupError) {
          console.error('[Provision] Error cleaning up number:', cleanupError);
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('[Provision] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to provision number'
    }, { status: 500 });
  }
}

/**
 * GET /api/twilio/provision-number
 *
 * Get current phone numbers for the organization
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get organization's phone numbers
    const adminSupabase = createAdminClient();
    const { data: phoneNumbers, error } = await adminSupabase
      .from('twilio_phone_numbers')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Provision] Error fetching numbers:', error);
      return NextResponse.json({ error: 'Failed to fetch numbers' }, { status: 500 });
    }

    return NextResponse.json({
      phoneNumbers: phoneNumbers || [],
      hasNumbers: (phoneNumbers?.length || 0) > 0
    });

  } catch (error) {
    console.error('[Provision] GET Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch numbers'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/twilio/provision-number
 *
 * Release a phone number (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { phoneNumberSid } = await req.json();

    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check if admin
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg || !['owner', 'admin'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the phone number from database
    const adminSupabase = createAdminClient();
    const { data: phoneNumber } = await adminSupabase
      .from('twilio_phone_numbers')
      .select('*')
      .eq('twilio_sid', phoneNumberSid)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Release from Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    const twilioClient = twilio(accountSid, authToken);

    try {
      await twilioClient.incomingPhoneNumbers(phoneNumberSid).remove();
      console.log('[Provision] Released number from Twilio:', phoneNumber.phone_number);
    } catch (twilioError) {
      console.error('[Provision] Error releasing from Twilio:', twilioError);
    }

    // Mark as inactive in database (soft delete)
    const { error: dbError } = await adminSupabase
      .from('twilio_phone_numbers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        metadata: {
          ...phoneNumber.metadata,
          released_by: user.id,
          released_at: new Date().toISOString()
        }
      })
      .eq('id', phoneNumber.id);

    if (dbError) {
      console.error('[Provision] Error updating database:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: `Released phone number ${phoneNumber.phone_number}`
    });

  } catch (error) {
    console.error('[Provision] DELETE Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to release number'
    }, { status: 500 });
  }
}