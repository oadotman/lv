// =====================================================
// GDPR DATA EXPORT API ROUTE
// Handles user data export requests (GDPR Article 15)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { exportUserData, exportToJSON, exportToCSV } from '@/lib/gdpr/data-export';
import { logAuditEvent } from '@/lib/logging/audit-logger';
import { logger } from '@/lib/logging/app-logger';

/**
 * POST /api/gdpr/export
 * Export all user data in requested format
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Require authentication
    const user = await requireAuth();
    const { format = 'json' } = await req.json();

    logger.info('Data export requested', 'GDPR', {
      userId: user.id,
      format,
    });

    // Export user data
    const exportData = await exportUserData(user.id);

    // Format based on request
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      content = exportToCSV(exportData);
      contentType = 'text/csv';
      filename = `synqall-data-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      content = exportToJSON(exportData);
      contentType = 'application/json';
      filename = `synqall-data-export-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Log the export
    await logAuditEvent({
      userId: user.id,
      action: 'data_export',
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        format,
        recordCount: exportData.metadata.recordCount,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    logger.api('POST', '/api/gdpr/export', 200, Date.now() - startTime);

    // Return file as download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Data export failed', error as Error, 'GDPR');

    return NextResponse.json(
      {
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gdpr/export
 * Get export metadata (what data will be exported)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const exportData = await exportUserData(user.id);

    return NextResponse.json({
      metadata: exportData.metadata,
      exportDate: exportData.exportDate,
    });
  } catch (error) {
    logger.error('Failed to get export metadata', error as Error, 'GDPR');

    return NextResponse.json(
      {
        error: 'Failed to get export metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
