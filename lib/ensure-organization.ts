// =====================================================
// ORGANIZATION CONTEXT MANAGEMENT
// Ensures users always have an organization context
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Ensure user has an organization
 * This is the CRITICAL function that prevents orphaned users
 */
export async function ensureUserOrganization(userId: string) {
  const supabase = createAdminClient();

  // Check if user has any organization
  const { data: userOrg } = await supabase
    .from('user_organizations')
    .select('organization_id, role, organization:organizations(*)')
    .eq('user_id', userId)
    .maybeSingle();

  if (userOrg?.organization_id) {
    // User has organization
    return {
      success: true,
      organizationId: userOrg.organization_id,
      organization: userOrg.organization,
      role: userOrg.role
    };
  }

  // User has NO organization - this is a problem!
  console.error(`CRITICAL: User ${userId} has no organization!`);

  // Get user details to create a default organization
  const { data: userData } = await supabase.auth.admin.getUserById(userId);

  if (!userData?.user) {
    return {
      success: false,
      error: 'User not found'
    };
  }

  // Create a default organization for the orphaned user
  const orgName = userData.user.email?.split('@')[0] || 'My Organization';

  const { data: newOrg, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: `${orgName}'s Team`,
      slug: `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      plan_type: 'free',
      max_members: 1,
      max_minutes: 60,
      max_minutes_monthly: 60,
      usage_minutes_limit: 60,
      used_minutes: 0,
      created_by: userId
    })
    .select()
    .single();

  if (orgError || !newOrg) {
    console.error('Failed to create default organization:', orgError);
    return {
      success: false,
      error: 'Failed to create organization'
    };
  }

  // Link user to organization as owner
  const { error: linkError } = await supabase
    .from('user_organizations')
    .insert({
      user_id: userId,
      organization_id: newOrg.id,
      role: 'owner'
    });

  if (linkError) {
    console.error('Failed to link user to organization:', linkError);
    // Clean up the organization we just created
    await supabase.from('organizations').delete().eq('id', newOrg.id);
    return {
      success: false,
      error: 'Failed to link user to organization'
    };
  }

  console.log(`Created default organization ${newOrg.id} for orphaned user ${userId}`);

  return {
    success: true,
    organizationId: newOrg.id,
    organization: newOrg,
    role: 'owner',
    wasCreated: true
  };
}

/**
 * Get organization for a call
 * Used when uploading or processing calls
 */
export async function getOrganizationForCall(userId: string, callId?: string) {
  const supabase = createAdminClient();

  // If we have a callId, check if it already has an organization
  if (callId) {
    const { data: call } = await supabase
      .from('calls')
      .select('organization_id')
      .eq('id', callId)
      .single();

    if (call?.organization_id) {
      return call.organization_id;
    }
  }

  // Get user's organization
  const result = await ensureUserOrganization(userId);

  if (!result.success) {
    throw new Error(`User ${userId} has no organization and we couldn't create one`);
  }

  // If this was for a specific call, update it
  if (callId && result.organizationId) {
    await supabase
      .from('calls')
      .update({ organization_id: result.organizationId })
      .eq('id', callId);

    console.log(`Updated call ${callId} with organization ${result.organizationId}`);
  }

  return result.organizationId;
}

/**
 * Validate invitation and get organization
 * Used during invitation acceptance flow
 */
export async function validateInvitationOrganization(token: string, email: string) {
  const supabase = createAdminClient();

  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('token', token)
    .eq('email', email)
    .is('accepted_at', null)
    .single();

  if (error || !invitation) {
    return {
      success: false,
      error: 'Invalid or expired invitation'
    };
  }

  // Check if invitation is expired
  if (new Date(invitation.expires_at) < new Date()) {
    return {
      success: false,
      error: 'Invitation has expired'
    };
  }

  return {
    success: true,
    invitation,
    organizationId: invitation.organization_id,
    organization: invitation.organization,
    role: invitation.role
  };
}

/**
 * Fix orphaned calls without organization
 * Maintenance function to fix historical data
 */
export async function fixOrphanedCalls() {
  const supabase = createAdminClient();

  // Find all calls without organization_id
  const { data: orphanedCalls } = await supabase
    .from('calls')
    .select('id, user_id')
    .is('organization_id', null);

  if (!orphanedCalls || orphanedCalls.length === 0) {
    console.log('No orphaned calls found');
    return;
  }

  console.log(`Found ${orphanedCalls.length} orphaned calls to fix`);

  for (const call of orphanedCalls) {
    try {
      const orgId = await getOrganizationForCall(call.user_id, call.id);
      console.log(`Fixed call ${call.id} with organization ${orgId}`);
    } catch (error) {
      console.error(`Failed to fix call ${call.id}:`, error);
    }
  }
}