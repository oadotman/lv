// =====================================================
// RETENTION CLEANUP CRON ENDPOINT
// Daily job to delete old audio files, transcripts, and anonymize audit logs
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { runRetentionCleanup, cleanupExpiredExports } from '@/lib/cron/retention-cleanup';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

/**
 * POST /api/cron/retention-cleanup
 *
 * Runs the tiered retention cleanup:
 * 1. Delete audio files older than 7 days (largest cost saver)
 * 2. Delete transcripts older than 30 days
 * 3. Anonymize audit logs older than 90 days
 * 4. Keep call metadata and extracted CRM fields indefinitely
 *
 * This endpoint should be called daily via:
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Vercel Cron (if deployed on Vercel)
 * - PM2 cron (if on VPS)
 *
 * Security: Protect this endpoint with a secret token
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized retention cleanup attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] ========================================');
    console.log('[Cron] Starting retention cleanup job');
    console.log('[Cron] Timestamp:', new Date().toISOString());
    console.log('[Cron] ========================================');

    // Run retention cleanup
    const result = await runRetentionCleanup();

    // Also cleanup expired data export requests
    await cleanupExpiredExports();

    console.log('[Cron] ========================================');
    console.log('[Cron] Retention cleanup completed');
    console.log('[Cron] Results:', {
      success: result.success,
      deleted: result.deleted,
      errorCount: result.errors.length,
      deletionRequestsProcessed: result.deletionRequestsProcessed,
    });
    console.log('[Cron] ========================================');

    return NextResponse.json({
      success: result.success,
      deleted: result.deleted,
      errors: result.errors,
      deletionRequestsProcessed: result.deletionRequestsProcessed,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Retention cleanup failed:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/retention-cleanup
 *
 * Test endpoint to verify cron job is accessible
 * Returns retention policy information
 */
export async function GET(req: NextRequest) {
  const { getAllRetentionPolicies } = await import('@/lib/gdpr/data-retention');

  const policies = getAllRetentionPolicies();

  return NextResponse.json({
    message: 'Retention cleanup cron endpoint',
    policies: policies.map(p => ({
      resource: p.resource,
      retentionDays: p.retentionDays,
      enabled: p.enabled,
      description: p.description,
      nextRun: p.retentionDays > 0
        ? `Deletes data older than ${p.retentionDays} days`
        : 'Indefinite retention',
    })),
    usage: {
      method: 'POST',
      auth: 'Bearer token (CRON_SECRET env var)',
      schedule: 'Daily at 2:00 AM UTC',
    },
  });
}
