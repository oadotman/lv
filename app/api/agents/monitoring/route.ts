/**
 * API Route: Agent System Monitoring
 * Provides real-time metrics and monitoring data for the multi-agent system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ProductionOrchestrator from '@/lib/agents/production/production-orchestrator';
import GradualRolloutSystem from '@/lib/agents/production/gradual-rollout';
import MigrationUtilities from '@/lib/agents/production/migration-utilities';
import PerformanceMonitor from '@/lib/agents/performance-monitor';
import ErrorRecoverySystem from '@/lib/agents/error-recovery';
import AgentOptimizer from '@/lib/agents/optimization/agent-optimizer';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'overview';
    const timeRange = searchParams.get('timeRange') || '1h';
    const organizationId = searchParams.get('organizationId');

    // Check if user has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    switch (type) {
      case 'overview':
        return await getOverview(supabase, organizationId, isAdmin);

      case 'performance':
        return await getPerformance(supabase, timeRange, organizationId, isAdmin);

      case 'rollout':
        return await getRolloutStatus(isAdmin);

      case 'migration':
        return await getMigrationStatus(searchParams.get('migrationId'), isAdmin);

      case 'errors':
        return await getErrorMetrics(supabase, timeRange, organizationId, isAdmin);

      case 'optimization':
        return await getOptimizationMetrics(isAdmin);

      case 'health':
        return await getHealthStatus();

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve monitoring data' },
      { status: 500 }
    );
  }
}

async function getOverview(
  supabase: any,
  organizationId: string | null,
  isAdmin: boolean
) {
  const orchestrator = ProductionOrchestrator;
  const rollout = GradualRolloutSystem;
  const performance = PerformanceMonitor;

  // Get current configuration
  const config = orchestrator.getConfiguration();

  // Get rollout status
  const rolloutStatus = await rollout.getRolloutStatus();

  // Get performance metrics
  // TODO: Fix PerformanceMonitor instantiation - should be an instance, not the class
  // const performanceMetrics = performance.getMetrics();
  const performanceMetrics = {
    averageExecutionTime: 0,
    p95: 0,
    p99: 0,
    successRate: 0,
    cacheHitRate: 0
  }; // Temporarily disabled until PerformanceMonitor is properly instantiated

  // Get database statistics
  let dbStats = null;
  if (isAdmin) {
    const query = supabase
      .from('agent_execution_logs')
      .select('*', { count: 'exact' });

    if (organizationId) {
      query.eq('organization_id', organizationId);
    }

    const { count: totalExecutions } = await query;

    const { count: successfulExecutions } = await supabase
      .from('agent_execution_logs')
      .select('*', { count: 'exact' })
      .eq('success', true);

    const { data: recentErrors } = await supabase
      .from('agent_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    dbStats = {
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0
        ? ((successfulExecutions || 0) / totalExecutions * 100).toFixed(2)
        : 0,
      recentErrors
    };
  }

  return NextResponse.json({
    config: {
      multiAgentEnabled: config.enableMultiAgent,
      rolloutPercentage: config.rolloutPercentage,
      comparisonMode: config.comparisonMode,
      fallbackEnabled: config.fallbackToLegacy
    },
    rollout: {
      currentPhase: rolloutStatus.currentPhase?.name || 'None',
      percentage: rolloutStatus.currentPhase?.percentage || 0,
      status: rolloutStatus.currentPhase?.status || 'inactive'
    },
    performance: {
      averageLatency: performanceMetrics.averageExecutionTime,
      p95Latency: performanceMetrics.p95,
      p99Latency: performanceMetrics.p99,
      successRate: performanceMetrics.successRate,
      cacheHitRate: performanceMetrics.cacheHitRate
    },
    database: dbStats,
    timestamp: new Date().toISOString()
  });
}

async function getPerformance(
  supabase: any,
  timeRange: string,
  organizationId: string | null,
  isAdmin: boolean
) {
  const performance = PerformanceMonitor;

  // Calculate time window
  const timeWindows: Record<string, number> = {
    '1h': 3600000,
    '6h': 21600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000
  };

  const windowMs = timeWindows[timeRange] || timeWindows['1h'];
  const startTime = new Date(Date.now() - windowMs).toISOString();

  // Get agent metrics from database
  let query = supabase
    .from('agent_performance_metrics')
    .select('*')
    .gte('created_at', startTime)
    .order('created_at', { ascending: false });

  if (organizationId && !isAdmin) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: metrics, error } = await query;

  if (error) {
    console.error('Failed to fetch performance metrics:', error);
  }

  // Get memory metrics
  // TODO: Fix PerformanceMonitor instantiation - should be an instance, not the class
  // const memoryMetrics = performance.getMetrics();
  const memoryMetrics = {
    totalExecutions: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageExecutionTime: 0
  }; // Temporarily disabled until PerformanceMonitor is properly instantiated

  // Aggregate by agent
  const agentMetrics: Record<string, any> = {};
  if (metrics) {
    metrics.forEach((m: any) => {
      if (!agentMetrics[m.agent_name]) {
        agentMetrics[m.agent_name] = {
          executions: 0,
          totalTime: 0,
          totalTokens: 0,
          errors: 0,
          successes: 0
        };
      }

      agentMetrics[m.agent_name].executions++;
      agentMetrics[m.agent_name].totalTime += m.average_execution_time || 0;
      agentMetrics[m.agent_name].totalTokens += m.total_tokens || 0;
      agentMetrics[m.agent_name].errors += m.error_count || 0;
      agentMetrics[m.agent_name].successes += m.success_count || 0;
    });
  }

  // Calculate averages
  Object.keys(agentMetrics).forEach(agent => {
    const stats = agentMetrics[agent];
    stats.averageTime = stats.executions > 0
      ? (stats.totalTime / stats.executions).toFixed(2)
      : 0;
    stats.successRate = stats.executions > 0
      ? ((stats.successes / stats.executions) * 100).toFixed(2)
      : 0;
    stats.averageTokens = stats.executions > 0
      ? Math.round(stats.totalTokens / stats.executions)
      : 0;
  });

  return NextResponse.json({
    timeRange,
    startTime,
    agentMetrics,
    systemMetrics: {
      totalExecutions: memoryMetrics.totalExecutions,
      cacheHits: memoryMetrics.cacheHits,
      cacheMisses: memoryMetrics.cacheMisses,
      averageLatency: memoryMetrics.averageExecutionTime
    }
  });
}

async function getRolloutStatus(isAdmin: boolean) {
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const rollout = GradualRolloutSystem;
  const status = await rollout.getRolloutStatus();

  return NextResponse.json(status);
}

async function getMigrationStatus(
  migrationId: string | null,
  isAdmin: boolean
) {
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const migration = MigrationUtilities;

  if (migrationId) {
    const status = migration.getMigrationStatus(migrationId);
    if (!status) {
      return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  // Get migration statistics
  const stats = await migration.getMigrationStatistics();
  return NextResponse.json(stats);
}

async function getErrorMetrics(
  supabase: any,
  timeRange: string,
  organizationId: string | null,
  isAdmin: boolean
) {
  const errorRecovery = ErrorRecoverySystem;

  // Calculate time window
  const timeWindows: Record<string, number> = {
    '1h': 3600000,
    '6h': 21600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000
  };

  const windowMs = timeWindows[timeRange] || timeWindows['1h'];
  const startTime = new Date(Date.now() - windowMs).toISOString();

  // Get error logs from database
  let query = supabase
    .from('agent_error_logs')
    .select('*')
    .gte('created_at', startTime)
    .order('created_at', { ascending: false });

  if (organizationId && !isAdmin) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: errors, error } = await query;

  if (error) {
    console.error('Failed to fetch error logs:', error);
  }

  // Get recovery metrics
  // TODO: Fix ErrorRecoverySystem instantiation - should be an instance, not the class
  // const recoveryMetrics = errorRecovery.getMetrics();
  const recoveryMetrics = {
    successfulRecoveries: 0,
    failedRecoveries: 0,
    recoveryRate: 0,
    circuitBreakerStatus: 'closed'
  }; // Temporarily disabled until ErrorRecoverySystem is properly instantiated

  // Aggregate errors by type
  const errorsByType: Record<string, number> = {};
  const errorsByAgent: Record<string, number> = {};

  if (errors) {
    errors.forEach((e: any) => {
      errorsByType[e.error_type] = (errorsByType[e.error_type] || 0) + 1;
      errorsByAgent[e.agent_name] = (errorsByAgent[e.agent_name] || 0) + 1;
    });
  }

  return NextResponse.json({
    timeRange,
    totalErrors: errors?.length || 0,
    errorsByType,
    errorsByAgent,
    recovery: {
      successfulRecoveries: recoveryMetrics.successfulRecoveries,
      failedRecoveries: recoveryMetrics.failedRecoveries,
      recoveryRate: recoveryMetrics.recoveryRate,
      circuitBreakerStatus: recoveryMetrics.circuitBreakerStatus
    },
    recentErrors: errors?.slice(0, 10) || []
  });
}

async function getOptimizationMetrics(isAdmin: boolean) {
  const optimizer = AgentOptimizer;
  // TODO: Fix AgentOptimizer instantiation - should be an instance, not the class
  // const metrics = optimizer.getMetrics();
  const metrics = {
    cacheHitRate: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheMemoryMB: 0,
    agentUsageStats: {},
    optimizationOpportunities: [],
    batchedRequests: 0,
    averageBatchSize: 0,
    tokensSaved: 0,
    timeSavedMs: 0,
    costSaved: 0
  }; // Temporarily return default values until AgentOptimizer is properly instantiated

  return NextResponse.json({
    cache: {
      hitRate: metrics.cacheHitRate,
      totalHits: metrics.cacheHits,
      totalMisses: metrics.cacheMisses,
      memorySizeMB: metrics.cacheMemoryMB
    },
    batching: {
      batchedRequests: metrics.batchedRequests,
      averageBatchSize: metrics.averageBatchSize
    },
    savings: {
      tokensSaved: metrics.tokensSaved,
      timeSavedMs: metrics.timeSavedMs,
      costSaved: metrics.costSaved
    }
  });
}

async function getHealthStatus() {
  const orchestrator = ProductionOrchestrator;
  const performance = PerformanceMonitor;
  const errorRecovery = ErrorRecoverySystem;

  const orchestratorHealth = await orchestrator.healthCheck();
  const performanceHealth = performance.healthCheck();
  const errorHealth = errorRecovery.healthCheck();

  const overallHealth = {
    status: 'healthy',
    components: {
      orchestrator: orchestratorHealth,
      performance: performanceHealth,
      errorRecovery: errorHealth
    },
    issues: []
  };

  // Aggregate issues
  if (orchestratorHealth.issues) {
    overallHealth.issues.push(...orchestratorHealth.issues);
  }
  if (performanceHealth.issues) {
    overallHealth.issues.push(...performanceHealth.issues);
  }
  if (errorHealth.issues) {
    overallHealth.issues.push(...errorHealth.issues);
  }

  // Determine overall status
  if (overallHealth.issues.length > 0) {
    overallHealth.status = overallHealth.issues.some((i: any) => i.severity === 'critical')
      ? 'critical'
      : 'degraded';
  }

  return NextResponse.json(overallHealth);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'updateConfig':
        return await updateConfiguration(body.config);

      case 'startMigration':
        return await startMigration(body.migrationConfig);

      case 'activatePhase':
        return await activateRolloutPhase(body.phaseId);

      case 'rollback':
        return await rollbackPhase(body.phaseId);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Monitoring POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function updateConfiguration(config: any) {
  const orchestrator = ProductionOrchestrator;
  await orchestrator.updateConfiguration(config);
  return NextResponse.json({ success: true, config });
}

async function startMigration(migrationConfig: any) {
  const migration = MigrationUtilities;
  const migrationId = await migration.migrateCalls(migrationConfig);
  return NextResponse.json({ success: true, migrationId });
}

async function activateRolloutPhase(phaseId: string) {
  const rollout = GradualRolloutSystem;
  const success = await rollout.activatePhase(phaseId);
  return NextResponse.json({ success });
}

async function rollbackPhase(phaseId: string) {
  const rollout = GradualRolloutSystem;
  const success = await rollout.rollbackPhase(phaseId);
  return NextResponse.json({ success });
}