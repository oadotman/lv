// =====================================================
// CACHE USAGE EXAMPLES
// Shows how to integrate caching in API routes
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getCached, invalidateCache, CACHE_TTL } from './query-cache';

/**
 * Example 1: Cache user profile
 */
export async function getCachedUserProfile(userId: string) {
  return getCached(
    `profile:${userId}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    {
      ttl: CACHE_TTL.USER_PROFILE,
      namespace: 'users',
      tags: ['profile', `user:${userId}`],
    }
  );
}

/**
 * Example 2: Cache organization data
 */
export async function getCachedOrganization(orgId: string) {
  return getCached(
    `org:${orgId}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      return data;
    },
    {
      ttl: CACHE_TTL.ORGANIZATION,
      namespace: 'orgs',
      tags: ['organization', `org:${orgId}`],
    }
  );
}

/**
 * Example 3: Cache calls list with pagination
 */
export async function getCachedCallsList(
  orgId: string,
  page: number = 1,
  pageSize: number = 10,
  status?: string
) {
  const cacheKey = {
    type: 'calls-list',
    orgId,
    page,
    pageSize,
    status,
  };

  return getCached(
    cacheKey,
    async () => {
      const supabase = createClient();

      let query = supabase
        .from('calls')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        calls: data,
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      };
    },
    {
      ttl: CACHE_TTL.CALL_LIST, // Short TTL for frequently changing data
      namespace: `org:${orgId}`,
      tags: ['calls', `org:${orgId}`],
    }
  );
}

/**
 * Example 4: Cache carrier details with verification
 */
export async function getCachedCarrier(carrierId: string) {
  return getCached(
    `carrier:${carrierId}`,
    async () => {
      const supabase = createClient();

      const { data: carrier, error: carrierError } = await supabase
        .from('carriers')
        .select(`
          *,
          verifications:carrier_verifications(*)
        `)
        .eq('id', carrierId)
        .single();

      if (carrierError) throw carrierError;

      // Get latest interaction
      const { data: interactions } = await supabase
        .from('carrier_interactions')
        .select('*')
        .eq('carrier_id', carrierId)
        .order('interaction_date', { ascending: false })
        .limit(5);

      return {
        ...carrier,
        recent_interactions: interactions,
      };
    },
    {
      ttl: CACHE_TTL.CARRIER_DETAILS,
      namespace: 'carriers',
      tags: ['carrier', `carrier:${carrierId}`],
    }
  );
}

/**
 * Example 5: Cache usage metrics for organization
 */
export async function getCachedUsageMetrics(orgId: string, period: string = 'current') {
  const cacheKey = {
    type: 'usage',
    orgId,
    period,
  };

  return getCached(
    cacheKey,
    async () => {
      const supabase = createClient();

      // Get organization with usage
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select(`
          plan_type,
          plan_minutes,
          usage_minutes_current,
          usage_minutes_last,
          overage_minutes_current,
          subscription_status
        `)
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;

      // Get recent usage logs
      const { data: logs, error: logsError } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      // Calculate percentages and remaining
      const usagePercent = org.plan_minutes
        ? (org.usage_minutes_current / org.plan_minutes) * 100
        : 0;

      const remaining = Math.max(0, (org.plan_minutes || 0) - org.usage_minutes_current);

      return {
        organization: org,
        metrics: {
          used: org.usage_minutes_current,
          limit: org.plan_minutes,
          remaining,
          usagePercent,
          overage: org.overage_minutes_current,
        },
        recent_logs: logs,
      };
    },
    {
      ttl: CACHE_TTL.USAGE, // Very short TTL for billing-critical data
      namespace: `org:${orgId}`,
      tags: ['usage', `org:${orgId}`],
    }
  );
}

/**
 * Example 6: Invalidate cache after update
 */
export async function updateCallAndInvalidateCache(
  callId: string,
  orgId: string,
  updates: Record<string, any>
) {
  const supabase = createClient();

  // Update the call
  const { data, error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', callId)
    .select()
    .single();

  if (error) throw error;

  // Invalidate related caches
  await Promise.all([
    // Invalidate specific call cache
    invalidateCache(`call:${callId}`, 'calls'),
    // Invalidate organization's calls list
    invalidateCache({ type: 'calls-list', orgId }, `org:${orgId}`),
  ]);

  return data;
}

/**
 * Example 7: Warm up cache (pre-load frequently accessed data)
 */
export async function warmUpCache(orgId: string, userId: string) {
  try {
    // Pre-load frequently accessed data
    await Promise.all([
      getCachedUserProfile(userId),
      getCachedOrganization(orgId),
      getCachedUsageMetrics(orgId),
      getCachedCallsList(orgId, 1, 10),
    ]);

    console.log(`[Cache] Warmed up cache for org: ${orgId}, user: ${userId}`);
  } catch (error) {
    console.error('[Cache] Failed to warm up cache:', error);
  }
}