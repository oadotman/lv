// =====================================================
// INNGEST CRON JOB: DATA RETENTION CLEANUP
// Automated daily cleanup of old data
// =====================================================

import { inngest } from '../client';
import { runRetentionCleanup, cleanupExpiredExports } from '@/lib/cron/retention-cleanup';
import { logger } from '@/lib/logging/app-logger';

/**
 * Daily data retention cleanup job
 * Runs at 2 AM UTC every day
 */
export const retentionCleanupJob = inngest.createFunction(
  {
    id: 'retention-cleanup',
    name: 'Daily Data Retention Cleanup',
  },
  { cron: '0 2 * * *' }, // Run at 2 AM UTC daily
  async ({ step }) => {
    logger.info('Starting scheduled retention cleanup', 'Inngest');

    // Step 1: Apply retention policies
    const cleanupResult = await step.run('apply-retention-policies', async () => {
      return await runRetentionCleanup();
    });

    // Step 2: Cleanup expired exports
    await step.run('cleanup-expired-exports', async () => {
      await cleanupExpiredExports();
    });

    logger.info('Retention cleanup completed', 'Inngest', {
      result: cleanupResult,
    });

    return {
      success: cleanupResult.success,
      deleted: cleanupResult.deleted,
      deletionRequestsProcessed: cleanupResult.deletionRequestsProcessed,
      errors: cleanupResult.errors,
    };
  }
);

/**
 * Weekly audit log cleanup
 * Runs every Sunday at 3 AM UTC
 */
export const auditLogCleanupJob = inngest.createFunction(
  {
    id: 'audit-log-cleanup',
    name: 'Weekly Audit Log Cleanup',
  },
  { cron: '0 3 * * 0' }, // Run at 3 AM UTC on Sundays
  async ({ step }) => {
    logger.info('Starting audit log cleanup', 'Inngest');

    await step.run('anonymize-old-audit-logs', async () => {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const supabase = createAdminClient();

      // Anonymize audit logs older than 7 years
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

      const { count } = await supabase
        .from('audit_logs')
        .update({
          ip_address: 'redacted',
          user_agent: 'redacted',
          metadata: { archived: true },
        }, { count: 'exact' })
        .lt('created_at', sevenYearsAgo.toISOString());

      logger.info(`Anonymized ${count || 0} audit logs`, 'Inngest');

      return { anonymized: count || 0 };
    });

    return { success: true };
  }
);
