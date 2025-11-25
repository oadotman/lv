// =====================================================
// DATA RETENTION CRON JOB
// Automated cleanup of old data based on retention policies
// =====================================================

import { applyRetentionPolicies } from '@/lib/gdpr/data-retention';
import { getPendingDeletions, processDataDeletion } from '@/lib/gdpr/data-deletion';
import { logger } from '@/lib/logging/app-logger';
import { logAuditEvent } from '@/lib/logging/audit-logger';

/**
 * Run data retention cleanup
 * Should be scheduled to run daily via cron
 */
export async function runRetentionCleanup(): Promise<{
  success: boolean;
  deleted: Record<string, number>;
  errors: string[];
  deletionRequestsProcessed: number;
}> {
  const startTime = Date.now();

  logger.info('Starting data retention cleanup', 'Cron');

  try {
    // 1. Apply retention policies to old data
    const retentionResult = await applyRetentionPolicies();

    logger.info('Retention policies applied', 'Cron', {
      deleted: retentionResult.deleted,
      errors: retentionResult.errors,
    });

    // 2. Process pending deletion requests that have passed grace period
    const pendingDeletions = await getPendingDeletions();

    logger.info(`Found ${pendingDeletions.length} pending deletion requests`, 'Cron');

    let deletionRequestsProcessed = 0;

    for (const deletion of pendingDeletions) {
      try {
        await processDataDeletion(deletion.id);
        deletionRequestsProcessed++;

        logger.info(`Processed deletion request ${deletion.id}`, 'Cron');
      } catch (error) {
        const errorMsg = `Failed to process deletion request ${deletion.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        retentionResult.errors.push(errorMsg);

        logger.error(errorMsg, error as Error, 'Cron');
      }
    }

    // Log cleanup completion
    await logAuditEvent({
      userId: 'system',
      action: 'retention_cleanup_completed',
      resourceType: 'system',
      resourceId: 'cron',
      metadata: {
        duration: Date.now() - startTime,
        deleted: retentionResult.deleted,
        deletionRequestsProcessed,
        errors: retentionResult.errors,
      },
    });

    logger.info('Data retention cleanup completed', 'Cron', {
      duration: Date.now() - startTime,
      deleted: retentionResult.deleted,
      deletionRequestsProcessed,
      errorCount: retentionResult.errors.length,
    });

    return {
      success: retentionResult.errors.length === 0,
      deleted: retentionResult.deleted,
      errors: retentionResult.errors,
      deletionRequestsProcessed,
    };
  } catch (error) {
    logger.error('Data retention cleanup failed', error as Error, 'Cron');

    await logAuditEvent({
      userId: 'system',
      action: 'retention_cleanup_failed',
      resourceType: 'system',
      resourceId: 'cron',
      metadata: {
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      success: false,
      deleted: {},
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      deletionRequestsProcessed: 0,
    };
  }
}

/**
 * Cleanup expired data export requests
 */
export async function cleanupExpiredExports(): Promise<void> {
  logger.info('Cleaning up expired data exports', 'Cron');

  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabase = createAdminClient();

    const { data: expiredExports } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('status', 'completed')
      .lt('expires_at', new Date().toISOString());

    if (expiredExports && expiredExports.length > 0) {
      // Delete export files from storage
      for (const exportReq of expiredExports) {
        if (exportReq.download_url) {
          const fileName = exportReq.download_url.split('/').pop();
          if (fileName) {
            await supabase.storage.from('data-exports').remove([fileName]);
          }
        }
      }

      // Delete export request records
      await supabase
        .from('data_export_requests')
        .delete()
        .eq('status', 'completed')
        .lt('expires_at', new Date().toISOString());

      logger.info(`Deleted ${expiredExports.length} expired exports`, 'Cron');
    }
  } catch (error) {
    logger.error('Failed to cleanup expired exports', error as Error, 'Cron');
  }
}

/**
 * Schedule retention cleanup (run via Inngest or cron)
 */
export async function scheduleRetentionCleanup(): Promise<void> {
  // This function would be called by Inngest or a cron service
  // Example: Run daily at 2 AM
  const result = await runRetentionCleanup();

  // Also cleanup expired exports
  await cleanupExpiredExports();

  if (!result.success) {
    // Send alert to monitoring service
    logger.error('Retention cleanup completed with errors', new Error('Cleanup errors'), 'Cron', {
      errors: result.errors,
    });
  }
}
