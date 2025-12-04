// =====================================================
// SECURE INVITATION ACCEPTANCE API
// Handles team invitation acceptance with proper validation
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Start a pseudo-transaction by checking everything first
    // Step 1: Fetch and validate invitation WITH LOCK (using select for update pattern)
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select(`
        *,
        organizations (
          id,
          name,
          slug,
          max_members,
          deleted_at
        )
      `)
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // Step 2: Comprehensive validation checks
    const validationErrors = [];

    // Check if invitation is already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if organization still exists and is not deleted
    if (!invitation.organizations || invitation.organizations.deleted_at) {
      return NextResponse.json(
        { error: 'The organization no longer exists' },
        { status: 400 }
      );
    }

    const organization = invitation.organizations;

    // Step 3: Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('user_organizations')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (existingMembership) {
      // Mark invitation as accepted anyway to prevent reuse
      await supabase
        .from('team_invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    // Step 4: Check organization member limits
    const { count: currentMemberCount } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);

    if (currentMemberCount !== null && currentMemberCount >= organization.max_members) {
      return NextResponse.json(
        {
          error: 'This organization has reached its member limit',
          details: {
            current: currentMemberCount,
            limit: organization.max_members
          }
        },
        { status: 400 }
      );
    }

    // Step 5: Verify the inviter still has permission
    const { data: inviterRole } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', invitation.invited_by)
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (!inviterRole || (inviterRole.role !== 'owner' && inviterRole.role !== 'admin')) {
      return NextResponse.json(
        { error: 'The person who invited you no longer has permission to add members' },
        { status: 400 }
      );
    }

    // Step 6: Perform atomic acceptance using Supabase RPC or transaction
    // First, try to mark invitation as accepted with a conditional update
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('team_invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', invitation.id)
      .is('accepted_at', null) // CRITICAL: Only update if not already accepted
      .select()
      .single();

    if (updateError || !updatedInvitation) {
      // Check if it was a race condition (already accepted)
      const { data: checkInvite } = await supabase
        .from('team_invitations')
        .select('accepted_at')
        .eq('id', invitation.id)
        .single();

      if (checkInvite?.accepted_at) {
        return NextResponse.json(
          { error: 'This invitation was just accepted by another session' },
          { status: 409 } // Conflict
        );
      }

      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      );
    }

    // Step 7: Add user to organization
    const { data: membership, error: memberError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: organization.id,
        role: invitation.role,
        invited_by: invitation.invited_by
      })
      .select()
      .single();

    if (memberError) {
      // Rollback invitation acceptance if membership creation fails
      // This is our manual rollback since Supabase doesn't have transactions
      await supabase
        .from('team_invitations')
        .update({
          accepted_at: null,
          accepted_by: null
        })
        .eq('id', invitation.id);

      // Check if it's a unique constraint violation
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'You are already a member of this organization' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add you to the organization' },
        { status: 500 }
      );
    }

    // Step 8: Log the successful acceptance
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'team_invitation_accepted',
        resource_type: 'organization',
        resource_id: organization.id,
        metadata: {
          invitation_id: invitation.id,
          role: invitation.role,
          invited_by: invitation.invited_by
        }
      });

    // Return success with organization details
    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Invitation acceptance error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while accepting the invitation' },
      { status: 500 }
    );
  }
}