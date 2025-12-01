// =====================================================
// TEAM INVITATION API
// Handles creating and sending team invitations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sanitizeEmail, sanitizeInput } from '@/lib/sanitize-simple';
import { inviteRateLimiter } from '@/lib/rateLimit';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';

    try {
      await inviteRateLimiter.check(identifier);
    } catch (error) {
      return NextResponse.json(
        { error: 'Too many invitation requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email: rawEmail, role, organizationId } = body;

    // Validate and sanitize input
    if (!rawEmail || !role || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role, organizationId' },
        { status: 400 }
      );
    }

    let email: string;
    try {
      email = sanitizeEmail(rawEmail);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member".' },
        { status: 400 }
      );
    }

    // Verify user has permission to invite (owner or admin)
    const { data: membership, error: membershipError } = await supabase
      .from('user_organizations')
      .select('role, organization:organizations(*)')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to invite team members' },
        { status: 403 }
      );
    }

    const organization = membership.organization as any;

    // Check if user with this email is already a member
    // We'll use admin client to check if the user exists
    try {
      const adminClient = createAdminClient();
      const { data: userList } = await adminClient.auth.admin.listUsers();

      const existingUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('user_organizations')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (existingMember) {
          return NextResponse.json(
            { error: 'User is already a member of this organization' },
            { status: 400 }
          );
        }
      }
    } catch (userCheckError) {
      // If we can't check for existing user, continue anyway
      console.log('Could not check for existing user, continuing:', userCheckError);
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id, expires_at')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .is('accepted_at', null)
      .maybeSingle();

    if (existingInvite) {
      if (new Date(existingInvite.expires_at) > new Date()) {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email' },
          { status: 400 }
        );
      } else {
        // Delete expired invitation
        await supabase
          .from('team_invitations')
          .delete()
          .eq('id', existingInvite.id);
      }
    }

    // Check team size limit
    const { count: memberCount } = await supabase
      .from('user_organizations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (memberCount !== null && memberCount >= organization.max_members) {
      return NextResponse.json(
        { error: `Team limit reached (${organization.max_members} members). Please upgrade your plan.` },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Create invitation
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Invitation creation error:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send email via Resend (dynamic import to avoid build-time issues)
    try {
      const { sendTeamInvitation } = await import('@/lib/resend/sendTeamInvitation');
      const messageId = await sendTeamInvitation({
        email,
        inviterName: user.user_metadata?.full_name || user.email || 'A team member',
        organizationName: organization.name,
        role,
        inviteToken: token,
        expiresAt,
      });

      // Update invitation with Resend message ID
      if (messageId) {
        await supabase
          .from('team_invitations')
          .update({ resend_message_id: messageId })
          .eq('id', invitation.id);
      }

      // Log audit
      await supabase.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'team_member_invited',
        p_resource_type: 'invitation',
        p_resource_id: invitation.id,
        p_metadata: {
          email,
          role,
          organization_id: organizationId,
          organization_name: organization.name,
        },
      });

    } catch (emailError: any) {
      console.error('Email send error:', emailError);

      // Delete invitation since email failed
      await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Failed to send invitation email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
      },
    });

  } catch (error) {
    console.error('Team invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List pending invitations for an organization
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get organization ID from query params
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      );
    }

    // Verify user has permission (owner or admin)
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to view invitations' },
        { status: 403 }
      );
    }

    // Get pending invitations
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invitations: invitations || [],
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke an invitation
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Missing invitation ID' },
        { status: 400 }
      );
    }

    // Get invitation to verify ownership
    const { data: invitation, error: fetchError } = await supabase
      .from('team_invitations')
      .select('*, organization:organizations(*)')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify user has permission
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to revoke invitations' },
        { status: 403 }
      );
    }

    // Delete invitation
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      );
    }

    // Log audit
    await supabase.rpc('log_audit', {
      p_user_id: user.id,
      p_action: 'invitation_revoked',
      p_resource_type: 'invitation',
      p_resource_id: invitationId,
      p_metadata: {
        email: invitation.email,
        organization_id: invitation.organization_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    });

  } catch (error) {
    console.error('Revoke invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
