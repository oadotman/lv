import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats } from '@/lib/queue/bull-processor';
import { checkRedisHealth } from '@/lib/queue/redis-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for queue and Redis
 * Returns queue statistics and Redis connectivity
 */
export async function GET(req: NextRequest) {
  try {
    // Check Redis health
    const redisHealth = await checkRedisHealth();

    // Get queue statistics
    let queueStats = null;
    let queueError = null;

    try {
      queueStats = await getQueueStats();
    } catch (error) {
      queueError = error instanceof Error ? error.message : 'Failed to get queue stats';
    }

    // Determine overall health
    const healthy = redisHealth.healthy && !queueError;

    // Build response
    const response = {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisHealth.healthy,
        latency: redisHealth.latency,
        error: redisHealth.error,
      },
      queue: queueError ? {
        error: queueError,
      } : {
        stats: queueStats,
        processing: queueStats?.active || 0,
        waiting: queueStats?.waiting || 0,
        failed: queueStats?.failed || 0,
      },
      recommendations: [] as string[],
    };

    // Add recommendations if issues detected
    if (!redisHealth.healthy) {
      response.recommendations.push('Check Redis connection and credentials');
    }

    if (queueStats && queueStats.failed > 100) {
      response.recommendations.push('High number of failed jobs detected - investigate errors');
    }

    if (queueStats && queueStats.waiting > 1000) {
      response.recommendations.push('Large queue backlog - consider scaling workers');
    }

    if (redisHealth.latency && redisHealth.latency > 100) {
      response.recommendations.push('High Redis latency detected - check network or Redis performance');
    }

    return NextResponse.json(
      response,
      {
        status: healthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

  } catch (error) {
    console.error('[Health] Queue health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}