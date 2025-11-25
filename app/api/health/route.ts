// =====================================================
// HEALTH CHECK ENDPOINT
// Used for uptime monitoring (UptimeRobot, etc.)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { healthRateLimiter } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Returns health status of the application and its dependencies
 * Use this endpoint for uptime monitoring services like UptimeRobot
 */
export async function GET(req: NextRequest) {
  // Apply rate limiting to prevent abuse
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    await healthRateLimiter.check(clientIp);
  } catch (rateLimitError: any) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        }
      }
    );
  }

  const startTime = Date.now();

  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' as 'ok' | 'error', latency: 0 },
      storage: { status: 'unknown' as 'ok' | 'error', latency: 0 },
    },
    uptime: process.uptime(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    const supabase = await createClient();

    // Simple query to check database connectivity
    const { error: dbError } = await supabase
      .from('calls')
      .select('id')
      .limit(1);

    health.checks.database = {
      status: dbError ? 'error' : 'ok',
      latency: Date.now() - dbStart,
    };

    if (dbError) {
      console.error('Health check - Database error:', dbError);
      health.status = 'degraded';
    }

    // Check storage connection (optional, can be slow)
    // Commenting out for now to keep health check fast
    /*
    const storageStart = Date.now();
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();

    health.checks.storage = {
      status: storageError ? 'error' : 'ok',
      latency: Date.now() - storageStart,
    };

    if (storageError) {
      console.error('Health check - Storage error:', storageError);
      health.status = 'degraded';
    }
    */

  } catch (error) {
    console.error('Health check error:', error);
    health.status = 'unhealthy';
    health.checks.database.status = 'error';
  }

  // Determine overall status
  const hasErrors = Object.values(health.checks).some(check => check.status === 'error');
  if (hasErrors && health.status === 'healthy') {
    health.status = 'degraded';
  }

  // Calculate total response time
  const responseTime = Date.now() - startTime;

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 200 : // Still return 200 for degraded to avoid false alarms
                     503; // Service unavailable for unhealthy

  return NextResponse.json(
    {
      ...health,
      responseTime,
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

/**
 * HEAD /api/health
 *
 * Lightweight health check (no response body)
 * Useful for simple uptime monitoring
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
