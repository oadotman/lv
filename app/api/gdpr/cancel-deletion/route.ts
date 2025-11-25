// =====================================================
// GDPR CANCEL DELETION API ROUTE
// Allows users to cancel deletion requests within grace period
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { cancelDataDeletion, getDeletionStatus } from '@/lib/gdpr/data-deletion';
import { logAuditEvent } from '@/lib/logging/audit-logger';
import { logger } from '@/lib/logging/app-logger';

/**
 * POST /api/gdpr/cancel-deletion
 * Cancel a pending data deletion request
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns this deletion request
    const status = await getDeletionStatus(requestId);
    if (!status || status.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Deletion request not found or unauthorized' },
        { status: 404 }
      );
    }

    logger.info('Data deletion cancelled', 'GDPR', {
      userId: user.id,
      requestId,
    });

    // Cancel deletion
    await cancelDataDeletion(requestId);

    // Log the cancellation
    await logAuditEvent({
      userId: user.id,
      action: 'data_deletion_cancelled',
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        requestId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Your data deletion request has been cancelled.',
    });
  } catch (error) {
    logger.error('Failed to cancel deletion', error as Error, 'GDPR');

    return NextResponse.json(
      {
        error: 'Failed to cancel deletion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
