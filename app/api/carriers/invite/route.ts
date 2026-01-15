/**
 * Carrier Invitation System
 * Send invitations to carriers to join your network
 * Track invitation status and onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCarrierInvitation } from '@/lib/resend/sendCarrierInvitation';

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    const { carrier_name, email, mc_number, contact_name, message } = body;

    if (!carrier_name || !email || !mc_number) {
      return NextResponse.json({
        error: 'Carrier name, email, and MC number are required'
      }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check if carrier is already in the system
    const { data: existingCarrier } = await adminSupabase
      .from('carriers')
      .select('id, status, email')
      .eq('organization_id', userOrg.organization_id)
      .eq('mc_number', mc_number)
      .single();

    if (existingCarrier) {
      if (existingCarrier.status === 'active') {
        return NextResponse.json({
          error: 'This carrier is already active in your network'
        }, { status: 400 });
      }

      // Resend invitation if carrier exists but inactive
      const invitationToken = generateInvitationToken();

      // Update carrier with new invitation
      await adminSupabase
        .from('carriers')
        .update({
          invitation_token: invitationToken,
          invitation_sent_at: new Date().toISOString(),
          invitation_sent_by: user.id,
          status: 'invited'
        })
        .eq('id', existingCarrier.id);

      // Send invitation email
      await sendCarrierInvitation({
        to: email,
        carrierName: carrier_name,
        contactName: contact_name || 'Partner',
        invitationToken,
        organizationName: userOrg.organization_id,
        personalMessage: message,
        senderName: user.email
      });

      return NextResponse.json({
        message: 'Invitation resent successfully',
        carrierId: existingCarrier.id
      });
    }

    // Create new carrier with invited status
    const invitationToken = generateInvitationToken();

    const { data: newCarrier, error: createError } = await adminSupabase
      .from('carriers')
      .insert({
        organization_id: userOrg.organization_id,
        carrier_name,
        mc_number,
        email,
        contact_name,
        status: 'invited',
        invitation_token: invitationToken,
        invitation_sent_at: new Date().toISOString(),
        invitation_sent_by: user.id,
        created_by: user.id,
        created_at: new Date().toISOString(),
        metadata: {
          invitation_message: message,
          source: 'invitation'
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('[Carrier Invite] Error creating carrier:', createError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    try {
      await sendCarrierInvitation({
        to: email,
        carrierName: carrier_name,
        contactName: contact_name || 'Partner',
        invitationToken,
        organizationName: userOrg.organization_id,
        personalMessage: message,
        senderName: user.email
      });
    } catch (emailError) {
      console.error('[Carrier Invite] Error sending email:', emailError);
      // Don't fail the whole request if email fails
    }

    // Log activity
    await adminSupabase.from('carrier_activities').insert({
      carrier_id: newCarrier.id,
      organization_id: userOrg.organization_id,
      user_id: user.id,
      activity_type: 'invited',
      description: `Invitation sent to ${carrier_name}`,
      metadata: { email, mc_number },
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Invitation sent successfully',
      carrier: newCarrier
    }, { status: 201 });

  } catch (error) {
    console.error('[Carrier Invite] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/carriers/invite
 * Get list of pending invitations
 */
export async function GET(request: NextRequest) {
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

    const adminSupabase = createAdminClient();

    // Get pending invitations
    const { data: invitations, error } = await adminSupabase
      .from('carriers')
      .select(`
        id,
        carrier_name,
        mc_number,
        email,
        contact_name,
        status,
        invitation_sent_at,
        invitation_accepted_at,
        created_at
      `)
      .eq('organization_id', userOrg.organization_id)
      .eq('status', 'invited')
      .order('invitation_sent_at', { ascending: false });

    if (error) {
      console.error('[Carrier Invite] Error fetching invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      pending: invitations?.length || 0,
      sentToday: invitations?.filter(i => {
        const sent = new Date(i.invitation_sent_at);
        const today = new Date();
        return sent.toDateString() === today.toDateString();
      }).length || 0,
      expiringSoon: invitations?.filter(i => {
        const sent = new Date(i.invitation_sent_at);
        const daysSinceSent = Math.floor((Date.now() - sent.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceSent > 25; // Expires after 30 days
      }).length || 0
    };

    return NextResponse.json({
      invitations: invitations || [],
      statistics: stats
    });

  } catch (error) {
    console.error('[Carrier Invite] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate unique invitation token
 */
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}