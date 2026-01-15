import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg || !['owner', 'admin'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Only admins can provision phone numbers' }, { status: 403 });
    }

    const { area_code, friendly_name, assignment_type, assigned_to } = await request.json();

    // Get organization's Twilio credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('twilio_account_sid, twilio_auth_token_encrypted')
      .eq('id', userOrg.organization_id)
      .single();

    if (!org?.twilio_account_sid || !org?.twilio_auth_token_encrypted) {
      return NextResponse.json({ error: 'Twilio not configured for organization' }, { status: 400 });
    }

    // Initialize Twilio client
    const twilioClient = twilio(org.twilio_account_sid, org.twilio_auth_token_encrypted);

    // Search for available phone numbers
    const searchParams: any = {
      voiceEnabled: true,
      smsEnabled: true,
      limit: 1
    };

    if (area_code) {
      searchParams.areaCode = area_code;
    }

    const availableNumbers = await twilioClient
      .availablePhoneNumbers('US')
      .local
      .list(searchParams);

    if (availableNumbers.length === 0) {
      return NextResponse.json({
        error: 'No phone numbers available in the specified area'
      }, { status: 404 });
    }

    // Purchase the phone number
    const phoneNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      friendlyName: friendly_name || `LoadVoice - ${new Date().toISOString()}`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`,
      voiceMethod: 'POST',
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms`,
      smsMethod: 'POST'
    });

    // Save to database
    const { data: newNumber, error: dbError } = await supabase
      .from('twilio_phone_numbers')
      .insert({
        organization_id: userOrg.organization_id,
        phone_number: phoneNumber.phoneNumber,
        friendly_name,
        phone_number_sid: phoneNumber.sid,
        assignment_type: assignment_type || 'personal',
        assigned_to: assignment_type === 'personal' ? assigned_to : null,
        assigned_by: user.id,
        voice_url: phoneNumber.voiceUrl,
        sms_url: phoneNumber.smsUrl,
        status: 'active'
      })
      .select(`
        *,
        assigned_to_profile:profiles!twilio_phone_numbers_assigned_to_fkey(
          id,
          email,
          full_name
        )
      `)
      .single();

    if (dbError) {
      // If database save fails, release the number
      await twilioClient.incomingPhoneNumbers(phoneNumber.sid).remove();
      throw dbError;
    }

    return NextResponse.json(newNumber);
  } catch (error) {
    console.error('Error provisioning phone number:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to provision phone number'
    }, { status: 500 });
  }
}