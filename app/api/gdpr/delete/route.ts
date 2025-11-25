// =====================================================
// GDPR DATA DELETION API ROUTE
// Handles "Right to be Forgotten" requests (GDPR Article 17)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { requestDataDeletion, getDeletionStatus } from '@/lib/gdpr/data-deletion';
import { logAuditEvent } from '@/lib/logging/audit-logger';
import { logger } from '@/lib/logging/app-logger';

/**
 * POST /api/gdpr/delete
 * Request account and data deletion (30-day grace period)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { reason } = await req.json();

    logger.warn('Data deletion requested', 'GDPR', {
      userId: user.id,
      reason,
    });

    // Request deletion
    const result = await requestDataDeletion(user.id, reason);

    // Log the request
    await logAuditEvent({
      userId: user.id,
      action: 'data_deletion_requested',
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        reason,
        scheduledFor: result.scheduledFor,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      scheduledFor: result.scheduledFor,
      message: 'Your data deletion request has been scheduled. You have 30 days to cancel this request.',
    });
  } catch (error) {
    logger.error('Data deletion request failed', error as Error, 'GDPR');

    return NextResponse.json(
      {
        error: 'Failed to request data deletion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/delete
 * Check deletion request status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const requestId = req.nextUrl.searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const status = await getDeletionStatus(requestId);

    if (!status) {
      return NextResponse.json(
        { error: 'Deletion request not found' },
        { status: 404 }
      );
    }

    // Verify user owns this deletion request
    if (status.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Failed to get deletion status', error as Error, 'GDPR');

    return NextResponse.json(
      {
        error: 'Failed to get deletion status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
