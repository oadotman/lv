/**
 * Performance Monitor for Multi-Agent System
 * Tracks and optimizes agent execution performance
 */

import { AgentContextData, BaseAgentOutput } from './types';
import { createClient } from '@supabase/supabase-js';

export interface PerformanceMetrics {
  agentName: string;
  executionTime: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cacheHits?: number;
  cacheMisses?: number;
  errors?: number;
  retries?: number;
  success: boolean;
  confidence?: number;
  timestamp: Date;
}

export interface AggregatedMetrics {
  agent: string;
  totalExecutions: number;
  avgExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  successRate: number;
  avgConfidence: number;
  totalTokenUsage: number;
  cacheHitRate: number;
  errorRate: number;
  costEstimate: number;
}

export interface SystemMetrics {
  totalExecutionTime: number;
  totalTokenUsage: number;
  totalCost: number;
  avgResponseTime: number;
  throughput: number; // calls per minute
  activeAgents: number;
  queuedTasks: number;
  errorRate: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface OptimizationRecommendation {
  type: 'performance' | 'cost' | 'reliability' | 'accuracy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agent?: string;
  issue: string;
  recommendation: string;
  expectedImprovement?: string;
  priority: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  private supabase: any;
  private flushInterval: NodeJS.Timeout | null = null;
  private config = {
    flushIntervalMs: 30000, // Flush metrics every 30 seconds
    maxMetricsInMemory: 1000,
    enableDatabaseLogging: true,
    costPerToken: 0.00002, // Example cost
    performanceThresholds: {
      executionTime: {
        warning: 5000,
        critical: 10000
      },
      tokenUsage: {
        warning: 1000,
        critical: 5000
      },
      errorRate: {
        warning: 0.1,
        critical: 0.25
      }
    }
  };

  private constructor() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Start periodic flush
      this.startPeriodicFlush();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking performance for an agent
   */
  startTracking(agentName: string, executionId: string): void {
    const key = `${agentName}_${executionId}`;
    this.startTimes.set(key, Date.now());
  }

  /**
   * End tracking and record metrics
   */
  endTracking(
    agentName: string,
    executionId: string,
    success: boolean,
    output?: BaseAgentOutput,
    tokenUsage?: { prompt: number; completion: number; total: number },
    error?: Error
  ): PerformanceMetrics {
    const key = `${agentName}_${executionId}`;
    const startTime = this.startTimes.get(key);

    if (!startTime) {
      throw new Error(`No tracking started for ${key}`);
    }

    const executionTime = Date.now() - startTime;
    this.startTimes.delete(key);

    const metrics: PerformanceMetrics = {
      agentName,
      executionTime,
      tokenUsage,
      success,
      confidence: output?.confidence?.value,
      timestamp: new Date(),
      errors: error ? 1 : 0
    };

    // Store metrics
    if (!this.metrics.has(agentName)) {
      this.metrics.set(agentName, []);
    }

    const agentMetrics = this.metrics.get(agentName)!;
    agentMetrics.push(metrics);

    // Trim if too many metrics in memory
    if (agentMetrics.length > this.config.maxMetricsInMemory) {
      agentMetrics.shift();
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);

    return metrics;
  }

  /**
   * Get aggregated metrics for an agent
   */
  getAgentMetrics(agentName: string, timeWindowMs?: number): AggregatedMetrics | null {
    const agentMetrics = this.metrics.get(agentName);
    if (!agentMetrics || agentMetrics.length === 0) {
      return null;
    }

    const now = Date.now();
    const filteredMetrics = timeWindowMs
      ? agentMetrics.filter(m => now - m.timestamp.getTime() <= timeWindowMs)
      : agentMetrics;

    if (filteredMetrics.length === 0) {
      return null;
    }

    const executionTimes = filteredMetrics.map(m => m.executionTime).sort((a, b) => a - b);
    const successCount = filteredMetrics.filter(m => m.success).length;
    const totalTokens = filteredMetrics.reduce((sum, m) => sum + (m.tokenUsage?.total || 0), 0);
    const confidences = filteredMetrics.filter(m => m.confidence).map(m => m.confidence!);
    const cacheHits = filteredMetrics.reduce((sum, m) => sum + (m.cacheHits || 0), 0);
    const totalCacheAttempts = filteredMetrics.reduce((sum, m) => sum + (m.cacheHits || 0) + (m.cacheMisses || 0), 0);

    return {
      agent: agentName,
      totalExecutions: filteredMetrics.length,
      avgExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      p95ExecutionTime: this.percentile(executionTimes, 0.95),
      p99ExecutionTime: this.percentile(executionTimes, 0.99),
      successRate: successCount / filteredMetrics.length,
      avgConfidence: confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0,
      totalTokenUsage: totalTokens,
      cacheHitRate: totalCacheAttempts > 0 ? cacheHits / totalCacheAttempts : 0,
      errorRate: 1 - (successCount / filteredMetrics.length),
      costEstimate: totalTokens * this.config.costPerToken
    };
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemMetrics {
    const allMetrics: PerformanceMetrics[] = [];
    for (const agentMetrics of this.metrics.values()) {
      allMetrics.push(...agentMetrics);
    }

    if (allMetrics.length === 0) {
      return {
        totalExecutionTime: 0,
        totalTokenUsage: 0,
        totalCost: 0,
        avgResponseTime: 0,
        throughput: 0,
        activeAgents: 0,
        queuedTasks: 0,
        errorRate: 0,
        healthStatus: 'healthy'
      };
    }

    const totalExecutionTime = allMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const totalTokenUsage = allMetrics.reduce((sum, m) => sum + (m.tokenUsage?.total || 0), 0);
    const totalCost = totalTokenUsage * this.config.costPerToken;
    const avgResponseTime = totalExecutionTime / allMetrics.length;
    const errors = allMetrics.filter(m => !m.success).length;
    const errorRate = errors / allMetrics.length;

    // Calculate throughput (calls per minute)
    const timeRange = allMetrics[allMetrics.length - 1].timestamp.getTime() - allMetrics[0].timestamp.getTime();
    const throughput = timeRange > 0 ? (allMetrics.length / (timeRange / 60000)) : 0;

    // Determine health status
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > this.config.performanceThresholds.errorRate.critical) {
      healthStatus = 'critical';
    } else if (errorRate > this.config.performanceThresholds.errorRate.warning) {
      healthStatus = 'degraded';
    } else if (avgResponseTime > this.config.performanceThresholds.executionTime.critical) {
      healthStatus = 'critical';
    } else if (avgResponseTime > this.config.performanceThresholds.executionTime.warning) {
      healthStatus = 'degraded';
    }

    return {
      totalExecutionTime,
      totalTokenUsage,
      totalCost,
      avgResponseTime,
      throughput,
      activeAgents: this.metrics.size,
      queuedTasks: this.startTimes.size,
      errorRate,
      healthStatus
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    let priority = 1;

    // Check each agent's performance
    for (const [agentName, agentMetrics] of this.metrics.entries()) {
      const aggregated = this.getAgentMetrics(agentName);
      if (!aggregated) continue;

      // High execution time
      if (aggregated.p95ExecutionTime > this.config.performanceThresholds.executionTime.critical) {
        recommendations.push({
          type: 'performance',
          severity: 'critical',
          agent: agentName,
          issue: `Agent ${agentName} has very high P95 execution time (${aggregated.p95ExecutionTime}ms)`,
          recommendation: 'Consider optimizing prompts, reducing complexity, or implementing caching',
          expectedImprovement: '30-50% reduction in execution time',
          priority: priority++
        });
      }

      // High token usage
      if (aggregated.totalTokenUsage / aggregated.totalExecutions > this.config.performanceThresholds.tokenUsage.critical) {
        recommendations.push({
          type: 'cost',
          severity: 'high',
          agent: agentName,
          issue: `Agent ${agentName} has high average token usage`,
          recommendation: 'Optimize prompts to be more concise, consider using smaller context windows',
          expectedImprovement: `Save $${(aggregated.costEstimate * 0.3).toFixed(2)} per 1000 calls`,
          priority: priority++
        });
      }

      // Low success rate
      if (aggregated.successRate < 0.8) {
        recommendations.push({
          type: 'reliability',
          severity: 'high',
          agent: agentName,
          issue: `Agent ${agentName} has low success rate (${(aggregated.successRate * 100).toFixed(1)}%)`,
          recommendation: 'Review error patterns, improve error handling, add retries',
          expectedImprovement: '20-30% improvement in success rate',
          priority: priority++
        });
      }

      // Low confidence scores
      if (aggregated.avgConfidence < 0.6) {
        recommendations.push({
          type: 'accuracy',
          severity: 'medium',
          agent: agentName,
          issue: `Agent ${agentName} has low average confidence (${(aggregated.avgConfidence * 100).toFixed(1)}%)`,
          recommendation: 'Improve prompts, add validation, consider fine-tuning',
          expectedImprovement: '15-25% improvement in confidence scores',
          priority: priority++
        });
      }

      // Low cache hit rate
      if (aggregated.cacheHitRate < 0.3 && aggregated.totalExecutions > 10) {
        recommendations.push({
          type: 'performance',
          severity: 'low',
          agent: agentName,
          issue: `Agent ${agentName} has low cache hit rate (${(aggregated.cacheHitRate * 100).toFixed(1)}%)`,
          recommendation: 'Implement or optimize caching strategy',
          expectedImprovement: '20-40% reduction in API calls',
          priority: priority++
        });
      }
    }

    // System-wide recommendations
    const systemMetrics = this.getSystemMetrics();

    if (systemMetrics.errorRate > this.config.performanceThresholds.errorRate.warning) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        issue: `System-wide error rate is high (${(systemMetrics.errorRate * 100).toFixed(1)}%)`,
        recommendation: 'Implement circuit breakers, improve error recovery, add monitoring alerts',
        expectedImprovement: '50% reduction in system errors',
        priority: 0 // Highest priority
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const { executionTime, tokenUsage, agentName, success } = metrics;

    if (executionTime > this.config.performanceThresholds.executionTime.critical) {
      console.error(`CRITICAL: Agent ${agentName} execution time ${executionTime}ms exceeds critical threshold`);
    } else if (executionTime > this.config.performanceThresholds.executionTime.warning) {
      console.warn(`WARNING: Agent ${agentName} execution time ${executionTime}ms exceeds warning threshold`);
    }

    if (tokenUsage && tokenUsage.total > this.config.performanceThresholds.tokenUsage.critical) {
      console.error(`CRITICAL: Agent ${agentName} token usage ${tokenUsage.total} exceeds critical threshold`);
    } else if (tokenUsage && tokenUsage.total > this.config.performanceThresholds.tokenUsage.warning) {
      console.warn(`WARNING: Agent ${agentName} token usage ${tokenUsage.total} exceeds warning threshold`);
    }

    if (!success) {
      console.error(`ERROR: Agent ${agentName} execution failed`);
    }
  }

  /**
   * Flush metrics to database
   */
  async flushMetrics(): Promise<void> {
    if (!this.supabase || !this.config.enableDatabaseLogging) {
      return;
    }

    const metricsToInsert: any[] = [];

    for (const [agentName, agentMetrics] of this.metrics.entries()) {
      const aggregated = this.getAgentMetrics(agentName);
      if (!aggregated) continue;

      metricsToInsert.push({
        agent_name: agentName,
        execution_count: aggregated.totalExecutions,
        avg_execution_time: aggregated.avgExecutionTime,
        p95_execution_time: aggregated.p95ExecutionTime,
        p99_execution_time: aggregated.p99ExecutionTime,
        success_rate: aggregated.successRate,
        avg_confidence: aggregated.avgConfidence,
        total_tokens: aggregated.totalTokenUsage,
        cache_hit_rate: aggregated.cacheHitRate,
        error_rate: aggregated.errorRate,
        cost_estimate: aggregated.costEstimate,
        timestamp: new Date().toISOString()
      });
    }

    if (metricsToInsert.length > 0) {
      try {
        const { error } = await this.supabase
          .from('agent_performance_metrics')
          .insert(metricsToInsert);

        if (error) {
          console.error('Failed to flush metrics to database:', error);
        } else {
          console.log(`Flushed ${metricsToInsert.length} agent metrics to database`);
          // Clear in-memory metrics after successful flush
          this.metrics.clear();
        }
      } catch (err) {
        console.error('Error flushing metrics:', err);
      }
    }
  }

  /**
   * Start periodic metric flushing
   */
  private startPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flushMetrics().catch(console.error);
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop periodic flushing
   */
  stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): any {
    const exportData: any = {
      timestamp: new Date().toISOString(),
      systemMetrics: this.getSystemMetrics(),
      agentMetrics: {},
      recommendations: this.getOptimizationRecommendations()
    };

    for (const [agentName] of this.metrics.entries()) {
      exportData.agentMetrics[agentName] = this.getAgentMetrics(agentName);
    }

    return exportData;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  /**
   * Get health check status
   */
  healthCheck(): { status: 'healthy' | 'degraded' | 'critical'; issues: string[] } {
    const systemMetrics = this.getSystemMetrics();
    const issues: string[] = [];

    if (systemMetrics.errorRate > this.config.performanceThresholds.errorRate.critical) {
      issues.push(`Critical error rate: ${(systemMetrics.errorRate * 100).toFixed(1)}%`);
    }

    if (systemMetrics.avgResponseTime > this.config.performanceThresholds.executionTime.critical) {
      issues.push(`Critical response time: ${systemMetrics.avgResponseTime}ms`);
    }

    if (systemMetrics.queuedTasks > 100) {
      issues.push(`High queue depth: ${systemMetrics.queuedTasks} tasks`);
    }

    return {
      status: systemMetrics.healthStatus,
      issues
    };
  }
}

// Export singleton instance
export default PerformanceMonitor.getInstance();