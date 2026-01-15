// =====================================================
// SIMPLE USAGE TRACKING
// Just track minutes and calculate overage
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Flat overage rate - simple!
const OVERAGE_RATE = 0.20; // $0.20 per minute

/**
 * Log usage for a completed call
 */
export async function logCallUsage(
  callId: string,
  durationMinutes: number,
  supabase: ReturnType<typeof createClient>
) {
  try {
    // Just call the database function
    const { error } = await (supabase as any).rpc('log_call_usage', {
      p_call_id: callId,
      p_duration_minutes: Math.ceil(durationMinutes), // Round up to nearest minute
    });

    if (error) {
      console.error('Error logging usage:', error);
      // Don't throw - we don't want to break the app over usage logging
    }
  } catch (err) {
    console.error('Failed to log usage:', err);
  }
}

/**
 * Get current usage and overage for an organization
 */
export async function getUsageStatus(
  organizationId: string,
  supabase: ReturnType<typeof createClient>
) {
  const { data, error } = await (supabase as any)
    .rpc('calculate_overage', {
      p_organization_id: organizationId,
    })
    .single();

  if (error) {
    console.error('Error fetching usage:', error);
    return {
      minutesUsed: 0,
      minutesLimit: 30,
      overageMinutes: 0,
      overageCharge: 0,
      percentUsed: 0,
      currentMonth: new Date().toISOString().slice(0, 7),
      daysRemaining: 30,
      status: 'ok' as const,
    };
  }

  const percentUsed = data.minutes_limit > 0
    ? (data.minutes_used / data.minutes_limit) * 100
    : 0;

  return {
    minutesUsed: data.minutes_used || 0,
    minutesLimit: data.minutes_limit || 30,
    overageMinutes: data.overage_minutes || 0,
    overageCharge: data.overage_charge || 0,
    percentUsed: Math.round(percentUsed),
    currentMonth: data.current_month || new Date().toISOString().slice(0, 7),
    daysRemaining: data.days_remaining || 30,
    status: percentUsed >= 100 ? 'overage' : percentUsed >= 90 ? 'warning' : 'ok' as const,
  };
}

/**
 * Format minutes for display
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Format overage charge for display
 */
export function formatOverageCharge(charge: number): string {
  return `$${charge.toFixed(2)}`;
}

/**
 * Get usage color for UI
 */
export function getUsageColor(status: 'ok' | 'warning' | 'overage'): string {
  switch (status) {
    case 'overage':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    default:
      return 'text-green-600';
  }
}

/**
 * Simple usage display component data
 */
export async function getUsageDisplayData(
  organizationId: string,
  supabase: ReturnType<typeof createClient>
) {
  const usage = await getUsageStatus(organizationId, supabase);

  // Format month for display (e.g., "January 2026")
  const monthName = new Date(usage.currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return {
    title: `${usage.minutesUsed} / ${usage.minutesLimit} minutes`,
    subtitle: usage.overageMinutes > 0
      ? `${usage.overageMinutes} overage minutes (${formatOverageCharge(usage.overageCharge)})`
      : `${usage.minutesLimit - usage.minutesUsed} minutes remaining`,
    monthDisplay: monthName,
    daysRemaining: usage.daysRemaining,
    resetInfo: `Resets in ${usage.daysRemaining} day${usage.daysRemaining !== 1 ? 's' : ''}`,
    percentUsed: usage.percentUsed,
    color: getUsageColor(usage.status as 'ok' | 'warning' | 'overage'),
    status: usage.status,
  };
}

/**
 * Reset usage for all organizations (called by cron job or manually)
 */
export async function resetMonthlyUsage(
  supabase: ReturnType<typeof createClient>
) {
  const { data, error } = await supabase
    .rpc('reset_all_monthly_usage');

  if (error) {
    console.error('Error resetting monthly usage:', error);
    return { success: false, error, resetCount: 0 };
  }

  return { success: true, resetCount: data || 0 };
}

// That's it! Now with proper monthly tracking that resets automatically!