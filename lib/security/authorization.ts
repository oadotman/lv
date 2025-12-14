/**
 * Authorization Utilities
 * Verify user access to resources and organizations
 */

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type Role = 'owner' | 'admin' | 'member';

export interface UserOrganization {
  organization_id: string;
  role: Role;
  organization: {
    id: string;
    name: string;
    plan_type: string;
    subscription_status: string;
  };
}

/**
 * Check if user has access to an organization
 */
export async function hasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.error('Error checking organization access:', error);
    return false;
  }

  return !!data;
}

/**
 * Get user's role in an organization
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<Role | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as Role;
}

/**
 * Check if user has required role or higher in organization
 * Role hierarchy: owner > admin > member
 */
export async function hasRequiredRole(
  userId: string,
  organizationId: string,
  requiredRole: Role
): Promise<boolean> {
  const userRole = await getUserRole(userId, organizationId);

  if (!userRole) {
    return false;
  }

  const roleHierarchy: Record<Role, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Verify user owns or is admin of organization
 * Throws error if unauthorized
 */
export async function requireOrganizationAdmin(
  userId: string,
  organizationId: string
): Promise<void> {
  const hasAccess = await hasRequiredRole(userId, organizationId, 'admin');

  if (!hasAccess) {
    throw new Error('Unauthorized: Admin access required');
  }
}

/**
 * Verify user has access to organization
 * Throws error if unauthorized
 */
export async function requireOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<void> {
  const hasAccess = await hasOrganizationAccess(userId, organizationId);

  if (!hasAccess) {
    throw new Error('Unauthorized: Organization access required');
  }
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(
  userId: string
): Promise<UserOrganization[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_organizations')
    .select(`
      organization_id,
      role,
      organization:organizations(
        id,
        name,
        plan_type,
        subscription_status
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user organizations:', error);
    return [];
  }

  return data as unknown as UserOrganization[];
}

/**
 * Check if user owns a call or has access via organization
 */
export async function hasCallAccess(
  userId: string,
  callId: string
): Promise<boolean> {
  const supabase = createServerClient();

  // Fetch call with organization_id
  const { data, error } = await supabase
    .from('calls')
    .select('id, user_id, organization_id')
    .eq('id', callId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  // User owns the call directly
  if (data.user_id === userId) {
    return true;
  }

  // Check if user has access via organization membership
  if (data.organization_id) {
    const hasOrgAccess = await hasOrganizationAccess(userId, data.organization_id);
    if (hasOrgAccess) {
      return true;
    }
  }

  return false;
}

/**
 * Require call access
 * Throws error if unauthorized
 */
export async function requireCallAccess(
  userId: string,
  callId: string
): Promise<void> {
  const hasAccess = await hasCallAccess(userId, callId);

  if (!hasAccess) {
    throw new Error('Unauthorized: Call access required');
  }
}

/**
 * Check if organization can perform action based on plan
 */
export async function canPerformAction(
  organizationId: string,
  action: 'upload_call' | 'invite_member' | 'export_data' | 'api_access'
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('plan_type, subscription_status, max_members, max_minutes_monthly')
    .eq('id', organizationId)
    .maybeSingle();

  if (error || !org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  // Check subscription status
  if (org.subscription_status !== 'active') {
    return { allowed: false, reason: 'Subscription inactive' };
  }

  // Check plan-specific limits
  switch (action) {
    case 'upload_call':
      // Check if organization has reached monthly minutes limit
      // This would require querying current usage
      return { allowed: true };

    case 'invite_member':
      // Check member limit
      const { count } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (count && count >= org.max_members) {
        return { allowed: false, reason: 'Member limit reached' };
      }
      return { allowed: true };

    case 'export_data':
      // Only available on paid plans
      if (org.plan_type === 'free') {
        return { allowed: false, reason: 'Upgrade required for data export' };
      }
      return { allowed: true };


    default:
      return { allowed: true };
  }
}

/**
 * Validate organization ID format
 */
export function isValidOrganizationId(id: string): boolean {
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate call ID format
 */
export function isValidCallId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Check if user can modify resource
 */
export async function canModifyResource(
  userId: string,
  resourceType: 'call' | 'organization' | 'team',
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case 'call':
      return hasCallAccess(userId, resourceId);

    case 'organization':
      return hasRequiredRole(userId, resourceId, 'admin');

    case 'team':
      // Implement team-specific logic
      return false;

    default:
      return false;
  }
}

/**
 * Get user's permissions for an organization
 */
export async function getUserPermissions(
  userId: string,
  organizationId: string
): Promise<{
  canManageMembers: boolean;
  canManageBilling: boolean;
  canDeleteOrganization: boolean;
  canUploadCalls: boolean;
  canViewCalls: boolean;
  canExportData: boolean;
}> {
  const role = await getUserRole(userId, organizationId);

  if (!role) {
    return {
      canManageMembers: false,
      canManageBilling: false,
      canDeleteOrganization: false,
      canUploadCalls: false,
      canViewCalls: false,
      canExportData: false,
    };
  }

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const isMember = role === 'member' || isAdmin;

  return {
    canManageMembers: isAdmin,
    canManageBilling: isOwner,
    canDeleteOrganization: isOwner,
    canUploadCalls: isMember,
    canViewCalls: isMember,
    canExportData: isAdmin,
  };
}

export default {
  hasOrganizationAccess,
  getUserRole,
  hasRequiredRole,
  requireOrganizationAdmin,
  requireOrganizationAccess,
  getUserOrganizations,
  hasCallAccess,
  requireCallAccess,
  canPerformAction,
  isValidOrganizationId,
  isValidCallId,
  canModifyResource,
  getUserPermissions,
};