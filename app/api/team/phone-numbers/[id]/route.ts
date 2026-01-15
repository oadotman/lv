import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'Only admins can manage phone numbers' }, { status: 403 });
    }

    const updates = await request.json();

    // Update phone number in database
    const { data: updatedNumber, error: updateError } = await supabase
      .from('twilio_phone_numbers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', userOrg.organization_id)
      .select(`
        *,
        assigned_to_profile:profiles!twilio_phone_numbers_assigned_to_fkey(
          id,
          email,
          full_name
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // If status changed to inactive/deleted, update Twilio
    if (updates.status && updates.status !== 'active') {
      const { data: org } = await supabase
        .from('organizations')
        .select('twilio_account_sid, twilio_auth_token_encrypted')
        .eq('id', userOrg.organization_id)
        .single();

      if (org?.twilio_account_sid && org?.twilio_auth_token_encrypted) {
        const twilioClient = twilio(org.twilio_account_sid, org.twilio_auth_token_encrypted);

        if (updates.status === 'deleted' && updatedNumber.phone_number_sid) {
          // Release the number from Twilio
          await twilioClient.incomingPhoneNumbers(updatedNumber.phone_number_sid).remove();
        }
      }
    }

    return NextResponse.json(updatedNumber);
  } catch (error) {
    console.error('Error updating phone number:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update phone number'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'Only admins can delete phone numbers' }, { status: 403 });
    }

    // Get phone number details
    const { data: phoneNumber } = await supabase
      .from('twilio_phone_numbers')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Get organization's Twilio credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('twilio_account_sid, twilio_auth_token_encrypted')
      .eq('id', userOrg.organization_id)
      .single();

    // Release from Twilio if configured
    if (org?.twilio_account_sid && org?.twilio_auth_token_encrypted && phoneNumber.phone_number_sid) {
      try {
        const twilioClient = twilio(org.twilio_account_sid, org.twilio_auth_token_encrypted);
        await twilioClient.incomingPhoneNumbers(phoneNumber.phone_number_sid).remove();
      } catch (twilioError) {
        console.error('Error releasing Twilio number:', twilioError);
        // Continue with database deletion even if Twilio fails
      }
    }

    // Soft delete in database
    const { error: deleteError } = await supabase
      .from('twilio_phone_numbers')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', userOrg.organization_id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete phone number'
    }, { status: 500 });
  }
}