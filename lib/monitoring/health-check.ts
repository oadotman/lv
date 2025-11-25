// =====================================================
// HEALTH CHECK SYSTEM
// Monitor system health and dependencies
// =====================================================

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logging/app-logger';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: ServiceHealth;
    storage: ServiceHealth;
    assemblyai: ServiceHealth;
    openai: ServiceHealth;
    inngest: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('calls').select('id').limit(1);

    if (error) throw error;

    return {
      status: 'up',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Database health check failed', error as Error, 'HealthCheck');

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check storage health
 */
async function checkStorage(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from('call-recordings')
      .list('', { limit: 1 });

    if (error) throw error;

    return {
      status: 'up',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Storage health check failed', error as Error, 'HealthCheck');

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check AssemblyAI health
 */
async function checkAssemblyAI(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('ASSEMBLYAI_API_KEY not configured');
    }

    // Simple API key validation check
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY,
      },
    });

    if (response.status === 401) {
      throw new Error('Invalid API key');
    }

    return {
      status: 'up',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('AssemblyAI health check failed', error as Error, 'HealthCheck');

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check OpenAI health
 */
async function checkOpenAI(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    return {
      status: 'up',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('OpenAI health check failed', error as Error, 'HealthCheck');

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Check Inngest health
 */
async function checkInngest(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    if (!process.env.INNGEST_EVENT_KEY || !process.env.INNGEST_SIGNING_KEY) {
      throw new Error('Inngest not configured');
    }

    // Inngest is healthy if keys are configured
    // More sophisticated check would verify event sending
    return {
      status: 'up',
      responseTime: Date.now() - start,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Inngest health check failed', error as Error, 'HealthCheck');

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

/**
 * Perform complete health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = process.uptime ? process.uptime() : 0;

  const [database, storage, assemblyai, openai, inngest] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkAssemblyAI(),
    checkOpenAI(),
    checkInngest(),
  ]);

  const checks = { database, storage, assemblyai, openai, inngest };

  // Determine overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

  if (statuses.every((s) => s === 'up')) {
    overallStatus = 'healthy';
  } else if (statuses.some((s) => s === 'down')) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: startTime,
    checks,
  };

  // Log health check results
  if (overallStatus !== 'healthy') {
    logger.warn('System health degraded', 'HealthCheck', { result });
  }

  return result;
}

/**
 * Check if system is ready to accept requests
 */
export async function isSystemReady(): Promise<boolean> {
  const health = await performHealthCheck();
  return health.status !== 'unhealthy';
}

/**
 * Get simplified health status
 */
export async function getHealthStatus(): Promise<{
  status: string;
  timestamp: string;
}> {
  const health = await performHealthCheck();

  return {
    status: health.status,
    timestamp: health.timestamp,
  };
}
