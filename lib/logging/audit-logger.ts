// =====================================================
// AUDIT LOGGING SERVICE
// Comprehensive audit trail for compliance and security
// =====================================================

import { createServerClient } from '@/lib/supabase/server';

export interface AuditEvent {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'user_signup'
  | 'user_password_reset'
  | 'user_email_changed'
  | 'user_profile_updated'
  | 'call_uploaded'
  | 'call_viewed'
  | 'call_deleted'
  | 'call_exported'
  | 'data_export'
  | 'data_deletion_requested'
  | 'data_deletion_cancelled'
  | 'data_deletion_completed'
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'team_member_invited'
  | 'team_member_removed'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'consent_given'
  | 'consent_revoked'
  | 'retention_policy_applied'
  | 'security_event';

/**
 * Log an audit event
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const supabase = createServerClient();

  try {
    await supabase.from('audit_logs').insert({
      user_id: event.userId,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      metadata: event.metadata || {},
      ip_address: event.ipAddress || null,
      user_agent: event.userAgent || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log to console if database insert fails
    console.error('Failed to log audit event:', error, event);
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  userId: string,
  action: 'login' | 'logout' | 'signup' | 'password_reset',
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: `user_${action}`,
    resourceType: 'user',
    resourceId: userId,
    metadata,
  });
}

/**
 * Log data access events (for GDPR compliance)
 */
export async function logDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: 'view' | 'export' | 'delete',
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: `${resourceType}_${action}`,
    resourceType,
    resourceId,
    metadata,
  });
}

/**
 * Log security events
 */
export async function logSecurityEvent(
  userId: string,
  eventType: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded',
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'security_event',
    resourceType: 'security',
    resourceId: eventType,
    metadata: {
      eventType,
      ...metadata,
    },
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<any[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.action) {
    query = query.eq('action', options.action);
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching resource audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Search audit logs (admin only)
 */
export async function searchAuditLogs(filters: {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate audit report for compliance
 */
export async function generateAuditReport(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<{
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    eventsByAction: Record<string, number>;
  };
  events: any[];
}> {
  const supabase = createServerClient();

  let query = supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: events, error } = await query;

  if (error) {
    throw new Error(`Failed to generate audit report: ${error.message}`);
  }

  const eventsByAction: Record<string, number> = {};
  const uniqueUsers = new Set<string>();

  events?.forEach((event) => {
    eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
    uniqueUsers.add(event.user_id);
  });

  return {
    summary: {
      totalEvents: events?.length || 0,
      uniqueUsers: uniqueUsers.size,
      eventsByAction,
    },
    events: events || [],
  };
}
