// =====================================================
// DATA RETENTION POLICY AUTOMATION
// Automatically deletes data based on retention policies
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/logging/audit-logger';

export interface RetentionPolicy {
  resource: 'audio_files' | 'transcripts' | 'call_metadata' | 'extracted_fields' | 'audit_logs';
  retentionDays: number;
  enabled: boolean;
  description: string;
}

/**
 * TIERED RETENTION POLICY (Cost-Optimized)
 *
 * 1. Audio Files (7 days) - Largest cost driver, deleted after transcription
 * 2. Transcripts (30 days) - Delete after extraction data is confirmed
 * 3. Extracted CRM Fields (Indefinite) - Core business data, minimal storage cost
 * 4. Call Metadata (Indefinite) - Timestamp, caller info, duration - tiny storage
 * 5. Audit Logs (90 days) - Anonymized after 90 days for compliance
 */
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    resource: 'audio_files',
    retentionDays: 7,
    enabled: true,
    description: 'Audio files (largest storage cost) - deleted after transcription is complete'
  },
  {
    resource: 'transcripts',
    retentionDays: 30,
    enabled: true,
    description: 'Raw transcripts - deleted after CRM data is extracted and verified'
  },
  {
    resource: 'call_metadata',
    retentionDays: 0, // 0 = indefinite
    enabled: false, // Never auto-delete metadata
    description: 'Call metadata (caller, timestamp, duration) - retained indefinitely'
  },
  {
    resource: 'extracted_fields',
    retentionDays: 0, // 0 = indefinite
    enabled: false, // Never auto-delete extracted CRM data
    description: 'Extracted CRM fields (summary, sentiment, next steps) - retained indefinitely'
  },
  {
    resource: 'audit_logs',
    retentionDays: 90,
    enabled: true,
    description: 'Audit logs - anonymized after 90 days for compliance'
  },
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
 * Implements tiered retention based on storage cost
 */
async function deleteOldRecords(
  resource: string,
  cutoffDate: string
): Promise<number> {
  const supabase = createAdminClient();

  switch (resource) {
    case 'audio_files': {
      console.log(`[Retention] Deleting audio files older than ${cutoffDate}`);

      // Find calls with audio files older than cutoff date
      const { data: oldCalls } = await supabase
        .from('calls')
        .select('id, file_url, audio_url')
        .lt('created_at', cutoffDate)
        .or('file_url.not.is.null,audio_url.not.is.null');

      if (!oldCalls || oldCalls.length === 0) {
        console.log('[Retention] No old audio files to delete');
        return 0;
      }

      let deletedCount = 0;

      // Delete audio files from Supabase Storage
      for (const call of oldCalls) {
        const audioUrl = call.file_url || call.audio_url;
        if (audioUrl) {
          try {
            // Extract storage path from URL
            const url = new URL(audioUrl);
            const pathParts = url.pathname.split('/storage/v1/object/public/call-audio/');
            const storagePath = pathParts[1];

            if (storagePath) {
              const { error } = await supabase.storage
                .from('call-audio')
                .remove([storagePath]);

              if (!error) {
                deletedCount++;
                console.log(`[Retention] Deleted audio file: ${storagePath}`);
              } else {
                console.error(`[Retention] Failed to delete audio: ${storagePath}`, error);
              }
            }
          } catch (error) {
            console.error(`[Retention] Error parsing audio URL: ${audioUrl}`, error);
          }
        }

        // Update call record to clear audio URLs but keep metadata
        await supabase
          .from('calls')
          .update({
            file_url: null,
            audio_url: null,
            metadata: {
              ...((call as any).metadata || {}),
              audio_deleted_at: new Date().toISOString(),
              audio_deleted_reason: 'retention_policy'
            }
          })
          .eq('id', call.id);
      }

      return deletedCount;
    }

    case 'transcripts': {
      console.log(`[Retention] Deleting transcripts older than ${cutoffDate}`);

      // Delete old transcripts (keep extracted CRM data in call_fields)
      // First delete transcript utterances
      const { data: oldTranscripts } = await supabase
        .from('transcripts')
        .select('id')
        .lt('created_at', cutoffDate);

      if (!oldTranscripts || oldTranscripts.length === 0) {
        console.log('[Retention] No old transcripts to delete');
        return 0;
      }

      const transcriptIds = oldTranscripts.map(t => t.id);

      // Delete utterances first (foreign key constraint)
      await supabase
        .from('transcript_utterances')
        .delete()
        .in('transcript_id', transcriptIds);

      // Delete transcripts
      const { count } = await supabase
        .from('transcripts')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffDate);

      console.log(`[Retention] Deleted ${count || 0} transcripts`);
      return count || 0;
    }

    case 'audit_logs': {
      console.log(`[Retention] Anonymizing audit logs older than ${cutoffDate}`);

      // For audit logs, we anonymize instead of delete (for compliance)
      const { count } = await supabase
        .from('audit_logs')
        .update({
          user_id: null, // Remove user association
          ip_address: 'anonymized',
          user_agent: 'anonymized',
          metadata: {
            anonymized: true,
            anonymized_at: new Date().toISOString()
          },
        }, { count: 'exact' })
        .lt('created_at', cutoffDate)
        .not('user_id', 'is', null); // Only anonymize logs that haven't been anonymized yet

      console.log(`[Retention] Anonymized ${count || 0} audit log entries`);
      return count || 0;
    }

    case 'call_metadata':
    case 'extracted_fields': {
      // These are never auto-deleted (indefinite retention)
      console.log(`[Retention] Skipping ${resource} - indefinite retention policy`);
      return 0;
    }

    default:
      console.warn(`[Retention] Unknown resource type: ${resource}`);
      return 0;
  }
}

/**
 * Get retention policy for a resource
 */
export function getRetentionPolicy(
  resource: 'audio_files' | 'transcripts' | 'call_metadata' | 'extracted_fields' | 'audit_logs'
): RetentionPolicy | undefined {
  return DEFAULT_RETENTION_POLICIES.find((p) => p.resource === resource);
}

/**
 * Calculate when data will be deleted based on retention policy
 * Returns null if retention is indefinite (retentionDays = 0)
 */
export function calculateDeletionDate(
  createdAt: string,
  resource: 'audio_files' | 'transcripts' | 'call_metadata' | 'extracted_fields' | 'audit_logs'
): string | null {
  const policy = getRetentionPolicy(resource);
  if (!policy || !policy.enabled || policy.retentionDays === 0) return null; // 0 = indefinite

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
  resource: 'audio_files' | 'transcripts' | 'call_metadata' | 'extracted_fields' | 'audit_logs'
): boolean {
  const deletionDate = calculateDeletionDate(createdAt, resource);
  if (!deletionDate) return false;

  return new Date(deletionDate) < new Date();
}

/**
 * Get all retention policies
 */
export function getAllRetentionPolicies(): RetentionPolicy[] {
  return DEFAULT_RETENTION_POLICIES;
}
