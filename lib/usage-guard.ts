// =====================================================
// USAGE GUARD - Protects against overage abuse
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Maximum overage allowed before blocking (100 minutes = $20 at $0.20/min)
export const MAX_OVERAGE_MINUTES = 100;
export const MAX_OVERAGE_CHARGE = 20.00; // $20 USD cap

// Estimated minutes per MB of audio (rough estimate: 1 minute ≈ 1MB for MP3)
const MINUTES_PER_MB = 1;

/**
 * Check if user can upload/process based on current usage and pending jobs
 * This MUST be called BEFORE starting any transcription
 */
export async function canProcessCall(
  organizationId: string,
  estimatedMinutes: number,
  supabase: ReturnType<typeof createClient>
): Promise<{
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  pendingMinutes: number;
  overageMinutes: number;
  overageCharge: number;
  projectedTotal: number;
  projectedOverage: number;
  projectedCharge: number;
}> {
  // 1. Get current usage from organization
  const { data: org } = await supabase
    .from('organizations')
    .select('usage_minutes_current, usage_minutes_limit, subscription_plan')
    .eq('id', organizationId)
    .single();

  if (!org) {
    return {
      allowed: false,
      reason: 'Organization not found',
      currentUsage: 0,
      limit: 0,
      pendingMinutes: 0,
      overageMinutes: 0,
      overageCharge: 0,
      projectedTotal: 0,
      projectedOverage: 0,
      projectedCharge: 0,
    };
  }

  // 2. Get all pending/processing calls to account for concurrent jobs
  const { data: pendingCalls } = await supabase
    .from('calls')
    .select('id, duration_minutes, file_size')
    .eq('organization_id', organizationId)
    .in('status', ['uploaded', 'processing', 'transcribing']);

  // Calculate pending minutes (estimate from file sizes if duration not known)
  let pendingMinutes = 0;
  if (pendingCalls) {
    for (const call of pendingCalls as any[]) {
      if (call.duration_minutes) {
        pendingMinutes += call.duration_minutes;
      } else if (call.file_size) {
        // Estimate: 1MB ≈ 1 minute of audio
        const estimatedMins = Math.ceil(call.file_size / (1024 * 1024) * MINUTES_PER_MB);
        pendingMinutes += estimatedMins;
      } else {
        // Conservative estimate if no info
        pendingMinutes += 5;
      }
    }
  }

  // 3. Calculate current overage
  const currentUsage = (org as any).usage_minutes_current || 0;
  const limit = (org as any).usage_minutes_limit || 60; // Default to 60 minutes for free tier
  const currentOverageMinutes = Math.max(0, currentUsage - limit);
  const currentOverageCharge = currentOverageMinutes * 0.20;

  // 4. Project total usage including pending and new request
  const projectedTotal = currentUsage + pendingMinutes + estimatedMinutes;
  const projectedOverageMinutes = Math.max(0, projectedTotal - limit);
  const projectedOverageCharge = projectedOverageMinutes * 0.20;

  // 5. Check if projection exceeds cap
  let allowed = true;
  let reason = '';

  if (projectedOverageCharge > MAX_OVERAGE_CHARGE) {
    allowed = false;
    reason = `Would exceed $${MAX_OVERAGE_CHARGE} overage cap. Projected charge: $${projectedOverageCharge.toFixed(2)}`;
  } else if (projectedOverageMinutes > MAX_OVERAGE_MINUTES) {
    allowed = false;
    reason = `Would exceed ${MAX_OVERAGE_MINUTES} minute overage limit. Projected overage: ${projectedOverageMinutes} minutes`;
  }

  // Log the check for monitoring
  console.log('[UsageGuard] Check result:', {
    organizationId,
    allowed,
    currentUsage,
    pendingMinutes,
    estimatedMinutes,
    projectedTotal,
    projectedOverageCharge: `$${projectedOverageCharge.toFixed(2)}`,
    reason,
  });

  return {
    allowed,
    reason,
    currentUsage,
    limit,
    pendingMinutes,
    overageMinutes: currentOverageMinutes,
    overageCharge: currentOverageCharge,
    projectedTotal,
    projectedOverage: projectedOverageMinutes,
    projectedCharge: projectedOverageCharge,
  };
}

/**
 * Estimate minutes from file size
 */
export function estimateMinutesFromFileSize(fileSizeBytes: number): number {
  // Conservative estimate: 1MB ≈ 1 minute
  // Most audio formats are roughly 1MB/minute for decent quality
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  return Math.ceil(fileSizeMB * MINUTES_PER_MB);
}

/**
 * Lock mechanism to prevent concurrent processing abuse
 * Creates a "processing lock" record to track active jobs
 */
export async function acquireProcessingLock(
  organizationId: string,
  callId: string,
  estimatedMinutes: number,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  try {
    // Try to insert a processing lock
    const { error } = await supabase
      .from('processing_locks')
      .insert({
        organization_id: organizationId,
        call_id: callId,
        estimated_minutes: estimatedMinutes,
        locked_at: new Date().toISOString(),
      } as any);

    return !error;
  } catch (err) {
    console.error('[UsageGuard] Failed to acquire lock:', err);
    return false;
  }
}

/**
 * Release processing lock when done or failed
 */
export async function releaseProcessingLock(
  callId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    await supabase
      .from('processing_locks')
      .delete()
      .eq('call_id', callId);
  } catch (err) {
    console.error('[UsageGuard] Failed to release lock:', err);
  }
}

/**
 * Get organization's usage summary with safety checks
 */
export async function getUsageSummaryWithGuard(
  organizationId: string,
  supabase: ReturnType<typeof createClient>
) {
  const { data: org } = await supabase
    .from('organizations')
    .select('usage_minutes_current, usage_minutes_limit, subscription_plan')
    .eq('id', organizationId)
    .single();

  if (!org) {
    return null;
  }

  const currentUsage = (org as any).usage_minutes_current || 0;
  const limit = (org as any).usage_minutes_limit || 30;
  const overageMinutes = Math.max(0, currentUsage - limit);
  const overageCharge = overageMinutes * 0.20;
  const remainingBeforeCap = MAX_OVERAGE_CHARGE - overageCharge;
  const remainingMinutesBeforeCap = Math.floor(remainingBeforeCap / 0.20);

  return {
    currentUsage,
    limit,
    overageMinutes,
    overageCharge,
    isAtCap: overageCharge >= MAX_OVERAGE_CHARGE,
    remainingBeforeCap: Math.max(0, remainingBeforeCap),
    remainingMinutesBeforeCap: Math.max(0, remainingMinutesBeforeCap),
    percentOfCap: (overageCharge / MAX_OVERAGE_CHARGE) * 100,
  };
}