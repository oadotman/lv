// =====================================================
// DATA RETENTION POLICY AUTOMATION
// Automatically deletes data based on retention policies
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/logging/audit-logger';

export interface RetentionPolicy {
  resource: 'calls' | 'transcripts' | 'extractions' | 'audit_logs';
  retentionDays: number;
  enabled: boolean;
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { resource: 'calls', retentionDays: 365, enabled: true }, // Keep calls for 1 year
  { resource: 'transcripts', retentionDays: 365, enabled: true },
  { resource: 'extractions', retentionDays: 365, enabled: true },
  { resource: 'audit_logs', retentionDays: 2555, enabled: true }, // Keep audit logs for 7 years (legal requirement)
];

/**
 * Apply data retention policies
 * Should be run as a cron job (e.g., daily)
 */
export async function applyRetentionPolicies(): Promise<{
  deleted: Record<string, number>;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  try {
    for (const policy of DEFAULT_RETENTION_POLICIES) {
      if (!policy.enabled) continue;

      const cutoffDate = new Date(
        Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000
      );

      try {
        const count = await deleteOldRecords(
          policy.resource,
          cutoffDate.toISOString()
        );
        deleted[policy.resource] = count;

        // Log retention policy application
        await logAuditEvent({
          userId: 'system',
          action: 'retention_policy_applied',
          resourceType: policy.resource,
          resourceId: 'batch',
          metadata: {
            policy,
            cutoffDate: cutoffDate.toISOString(),
            deletedCount: count,
          },
        });
      } catch (error) {
        const message = `Failed to apply retention policy for ${policy.resource}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        errors.push(message);
        console.error(message);
      }
    }

    return { deleted, errors };
  } catch (error) {
    console.error('Error applying retention policies:', error);
    throw error;
  }
}

/**
 * Delete old records for a specific resource type
 */
async function deleteOldRecords(
  resource: string,
  cutoffDate: string
): Promise<number> {
  const supabase = createAdminClient();

  switch (resource) {
    case 'calls': {
      // Delete calls and their associated data
      const { data: oldCalls } = await supabase
        .from('calls')
        .select('id, audio_url')
        .lt('created_at', cutoffDate);

      if (!oldCalls || oldCalls.length === 0) return 0;

      const callIds = oldCalls.map((c) => c.id);

      // Delete audio files from storage
      for (const call of oldCalls) {
        if (call.audio_url) {
          const fileName = call.audio_url.split('/').pop();
          if (fileName) {
            await supabase.storage.from('call-recordings').remove([fileName]);
          }
        }
      }

      // Delete transcripts
      await supabase.from('transcripts').delete().in('call_id', callIds);

      // Delete extractions
      await supabase.from('extractions').delete().in('call_id', callIds);

      // Delete calls
      const { count } = await supabase
        .from('calls')
        .delete({ count: 'exact' })
        .in('id', callIds);

      return count || 0;
    }

    case 'audit_logs': {
      // For audit logs, we anonymize instead of delete (for compliance)
      const { count } = await supabase
        .from('audit_logs')
        .update({
          ip_address: 'redacted',
          user_agent: 'redacted',
          metadata: { archived: true },
        }, { count: 'exact' })
        .lt('created_at', cutoffDate);

      return count || 0;
    }

    default:
      return 0;
  }
}

/**
 * Get retention policy for a resource
 */
export function getRetentionPolicy(
  resource: 'calls' | 'transcripts' | 'extractions' | 'audit_logs'
): RetentionPolicy | undefined {
  return DEFAULT_RETENTION_POLICIES.find((p) => p.resource === resource);
}

/**
 * Calculate when data will be deleted based on retention policy
 */
export function calculateDeletionDate(
  createdAt: string,
  resource: 'calls' | 'transcripts' | 'extractions' | 'audit_logs'
): string | null {
  const policy = getRetentionPolicy(resource);
  if (!policy || !policy.enabled) return null;

  const created = new Date(createdAt);
  const deletionDate = new Date(
    created.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000
  );

  return deletionDate.toISOString();
}

/**
 * Check if data should be deleted based on retention policy
 */
export function shouldDelete(
  createdAt: string,
  resource: 'calls' | 'transcripts' | 'extractions' | 'audit_logs'
): boolean {
  const deletionDate = calculateDeletionDate(createdAt, resource);
  if (!deletionDate) return false;

  return new Date(deletionDate) < new Date();
}
