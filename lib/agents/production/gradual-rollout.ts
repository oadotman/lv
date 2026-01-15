/**
 * Gradual Rollout System for Multi-Agent Extraction
 * Manages phased deployment and feature flag control
 */

import { createClient } from '@supabase/supabase-js';
import ProductionOrchestrator from './production-orchestrator';

export interface RolloutConfig {
  percentage: number;
  organizationIds?: string[];
  userIds?: string[];
  features?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface RolloutPhase {
  id: string;
  name: string;
  percentage: number;
  criteria: {
    organizationWhitelist?: string[];
    organizationBlacklist?: string[];
    userWhitelist?: string[];
    userBlacklist?: string[];
    minCalls?: number;
    regions?: string[];
  };
  features: {
    enabledAgents: string[];
    disabledAgents: string[];
    comparisonMode: boolean;
    fallbackEnabled: boolean;
  };
  metrics: {
    targetSuccessRate: number;
    targetLatencyMs: number;
    targetErrorRate: number;
  };
  status: 'pending' | 'active' | 'completed' | 'rolled_back';
}

export interface RolloutMetrics {
  phase: string;
  successRate: number;
  errorRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  callsProcessed: number;
  organizationCount: number;
  feedback: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export class GradualRolloutSystem {
  private static instance: GradualRolloutSystem;
  private supabase: any;
  private orchestrator: any;
  private currentPhase?: RolloutPhase;
  private rolloutHistory: RolloutPhase[] = [];
  private metricsCache: Map<string, RolloutMetrics> = new Map();

  private constructor() {
    this.orchestrator = ProductionOrchestrator;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Load rollout configuration
    this.loadRolloutConfig();
  }

  static getInstance(): GradualRolloutSystem {
    if (!GradualRolloutSystem.instance) {
      GradualRolloutSystem.instance = new GradualRolloutSystem();
    }
    return GradualRolloutSystem.instance;
  }

  /**
   * Load rollout configuration from database
   */
  private async loadRolloutConfig(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from('rollout_phases')
        .select('*')
        .eq('status', 'active')
        .single();

      if (data) {
        this.currentPhase = data;
        await this.applyPhaseConfiguration(data);
      }
    } catch (err) {
      console.error('Failed to load rollout config:', err);
    }
  }

  /**
   * Create a new rollout phase
   */
  async createPhase(phase: Omit<RolloutPhase, 'id' | 'status'>): Promise<string> {
    const phaseId = this.generatePhaseId();

    const newPhase: RolloutPhase = {
      ...phase,
      id: phaseId,
      status: 'pending'
    };

    // Store in database
    if (this.supabase) {
      await this.supabase
        .from('rollout_phases')
        .insert(newPhase);
    }

    this.rolloutHistory.push(newPhase);
    return phaseId;
  }

  /**
   * Activate a rollout phase
   */
  async activatePhase(phaseId: string): Promise<boolean> {
    const phase = this.rolloutHistory.find(p => p.id === phaseId);
    if (!phase) return false;

    // Deactivate current phase
    if (this.currentPhase) {
      await this.deactivatePhase(this.currentPhase.id);
    }

    // Activate new phase
    phase.status = 'active';
    this.currentPhase = phase;

    // Apply configuration
    await this.applyPhaseConfiguration(phase);

    // Update database
    if (this.supabase) {
      await this.supabase
        .from('rollout_phases')
        .update({ status: 'active', activated_at: new Date().toISOString() })
        .eq('id', phaseId);
    }

    // Start monitoring
    this.startPhaseMonitoring(phaseId);

    return true;
  }

  /**
   * Apply phase configuration to orchestrator
   */
  private async applyPhaseConfiguration(phase: RolloutPhase): Promise<void> {
    await this.orchestrator.updateConfiguration({
      enableMultiAgent: true,
      rolloutPercentage: phase.percentage,
      comparisonMode: phase.features.comparisonMode,
      enabledAgents: phase.features.enabledAgents,
      disabledAgents: phase.features.disabledAgents,
      fallbackToLegacy: phase.features.fallbackEnabled
    });
  }

  /**
   * Check if organization/user should use multi-agent
   */
  shouldUseMultiAgent(
    organizationId: string,
    userId?: string,
    context?: any
  ): boolean {
    if (!this.currentPhase) return false;

    const phase = this.currentPhase;

    // Check blacklists first
    if (phase.criteria.organizationBlacklist?.includes(organizationId)) {
      return false;
    }
    if (userId && phase.criteria.userBlacklist?.includes(userId)) {
      return false;
    }

    // Check whitelists
    if (phase.criteria.organizationWhitelist) {
      return phase.criteria.organizationWhitelist.includes(organizationId);
    }
    if (userId && phase.criteria.userWhitelist) {
      return phase.criteria.userWhitelist.includes(userId);
    }

    // Check percentage rollout
    const hash = this.hashString(organizationId);
    const percentile = (hash % 100) + 1;
    return percentile <= phase.percentage;
  }

  /**
   * Monitor phase metrics
   */
  private async startPhaseMonitoring(phaseId: string): Promise<void> {
    const monitoringInterval = setInterval(async () => {
      const metrics = await this.collectPhaseMetrics(phaseId);

      // Store metrics
      this.metricsCache.set(phaseId, metrics);

      // Check if metrics meet targets
      const phase = this.currentPhase;
      if (phase && phase.id === phaseId) {
        const meetsTargets = this.checkMetricTargets(metrics, phase);

        if (!meetsTargets) {
          console.warn(`Phase ${phaseId} not meeting targets, considering rollback`);

          // Auto-rollback if critical thresholds exceeded
          if (metrics.errorRate > 0.1 || metrics.successRate < 0.8) {
            console.error(`Critical thresholds exceeded, rolling back phase ${phaseId}`);
            await this.rollbackPhase(phaseId);
            clearInterval(monitoringInterval);
          }
        }
      }
    }, 60000); // Check every minute

    // Store interval reference for cleanup
    if (this.currentPhase && this.currentPhase.id === phaseId) {
      (this.currentPhase as any)._monitoringInterval = monitoringInterval;
    }
  }

  /**
   * Collect metrics for a phase
   */
  private async collectPhaseMetrics(phaseId: string): Promise<RolloutMetrics> {
    if (!this.supabase) {
      return this.getDefaultMetrics(phaseId);
    }

    try {
      // Get execution logs
      const { data: executions } = await this.supabase
        .from('agent_execution_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .eq('rollout_phase', phaseId);

      // Calculate metrics
      const totalCalls = executions?.length || 0;
      const successfulCalls = executions?.filter((e: any) => e.success).length || 0;
      const failedCalls = totalCalls - successfulCalls;

      const latencies = executions?.map((e: any) => e.execution_time_ms) || [];
      latencies.sort((a: number, b: number) => a - b);

      const metrics: RolloutMetrics = {
        phase: phaseId,
        successRate: totalCalls > 0 ? successfulCalls / totalCalls : 1,
        errorRate: totalCalls > 0 ? failedCalls / totalCalls : 0,
        averageLatencyMs: latencies.length > 0
          ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length
          : 0,
        p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] || 0,
        p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] || 0,
        callsProcessed: totalCalls,
        organizationCount: new Set(executions?.map((e: any) => e.organization_id)).size,
        feedback: {
          positive: 0,
          negative: 0,
          neutral: 0
        }
      };

      // Get feedback if available
      const { data: feedback } = await this.supabase
        .from('user_feedback')
        .select('sentiment')
        .eq('rollout_phase', phaseId);

      if (feedback) {
        feedback.forEach((f: any) => {
          if (f.sentiment === 'positive') metrics.feedback.positive++;
          else if (f.sentiment === 'negative') metrics.feedback.negative++;
          else metrics.feedback.neutral++;
        });
      }

      return metrics;
    } catch (err) {
      console.error('Failed to collect metrics:', err);
      return this.getDefaultMetrics(phaseId);
    }
  }

  /**
   * Check if metrics meet phase targets
   */
  private checkMetricTargets(
    metrics: RolloutMetrics,
    phase: RolloutPhase
  ): boolean {
    const targets = phase.metrics;

    if (metrics.successRate < targets.targetSuccessRate) return false;
    if (metrics.errorRate > targets.targetErrorRate) return false;
    if (metrics.averageLatencyMs > targets.targetLatencyMs) return false;

    return true;
  }

  /**
   * Rollback a phase
   */
  async rollbackPhase(phaseId: string): Promise<boolean> {
    const phase = this.rolloutHistory.find(p => p.id === phaseId);
    if (!phase) return false;

    console.log(`Rolling back phase ${phaseId}`);

    // Mark as rolled back
    phase.status = 'rolled_back';

    // Disable multi-agent
    await this.orchestrator.updateConfiguration({
      enableMultiAgent: false,
      rolloutPercentage: 0
    });

    // Update database
    if (this.supabase) {
      await this.supabase
        .from('rollout_phases')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString()
        })
        .eq('id', phaseId);

      // Log rollback event
      await this.supabase
        .from('system_logs')
        .insert({
          log_type: 'rollback',
          message: `Phase ${phaseId} rolled back`,
          metadata: {
            phaseId,
            metrics: this.metricsCache.get(phaseId)
          }
        });
    }

    // Clear current phase
    this.currentPhase = undefined;

    // Stop monitoring
    if ((phase as any)._monitoringInterval) {
      clearInterval((phase as any)._monitoringInterval);
    }

    return true;
  }

  /**
   * Deactivate a phase
   */
  private async deactivatePhase(phaseId: string): Promise<void> {
    const phase = this.rolloutHistory.find(p => p.id === phaseId);
    if (!phase) return;

    phase.status = 'completed';

    if (this.supabase) {
      await this.supabase
        .from('rollout_phases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', phaseId);
    }

    // Stop monitoring
    if ((phase as any)._monitoringInterval) {
      clearInterval((phase as any)._monitoringInterval);
    }
  }

  /**
   * Get rollout status
   */
  async getRolloutStatus(): Promise<any> {
    const status = {
      currentPhase: this.currentPhase,
      metrics: this.currentPhase
        ? this.metricsCache.get(this.currentPhase.id)
        : null,
      history: this.rolloutHistory.map(p => ({
        id: p.id,
        name: p.name,
        percentage: p.percentage,
        status: p.status,
        metrics: this.metricsCache.get(p.id)
      })),
      recommendations: []
    };

    // Add recommendations
    if (this.currentPhase) {
      const metrics = this.metricsCache.get(this.currentPhase.id);
      if (metrics) {
        if (metrics.successRate > 0.95 && metrics.errorRate < 0.02) {
          status.recommendations.push({
            type: 'expand',
            message: 'Metrics are excellent, consider expanding rollout percentage'
          });
        }
        if (metrics.errorRate > 0.05) {
          status.recommendations.push({
            type: 'investigate',
            message: 'Error rate is elevated, investigate issues before expanding'
          });
        }
      }
    }

    return status;
  }

  /**
   * Create predefined rollout phases
   */
  async createStandardRollout(): Promise<string[]> {
    const phases = [
      {
        name: 'Alpha Testing',
        percentage: 1,
        criteria: {
          organizationWhitelist: ['internal-testing']
        },
        features: {
          enabledAgents: ['all'],
          disabledAgents: [],
          comparisonMode: true,
          fallbackEnabled: true
        },
        metrics: {
          targetSuccessRate: 0.9,
          targetLatencyMs: 10000,
          targetErrorRate: 0.1
        }
      },
      {
        name: 'Beta Testing',
        percentage: 5,
        criteria: {},
        features: {
          enabledAgents: ['all'],
          disabledAgents: [],
          comparisonMode: true,
          fallbackEnabled: true
        },
        metrics: {
          targetSuccessRate: 0.93,
          targetLatencyMs: 8000,
          targetErrorRate: 0.07
        }
      },
      {
        name: 'Limited Release',
        percentage: 20,
        criteria: {},
        features: {
          enabledAgents: ['all'],
          disabledAgents: [],
          comparisonMode: false,
          fallbackEnabled: true
        },
        metrics: {
          targetSuccessRate: 0.95,
          targetLatencyMs: 7000,
          targetErrorRate: 0.05
        }
      },
      {
        name: 'General Availability',
        percentage: 100,
        criteria: {},
        features: {
          enabledAgents: ['all'],
          disabledAgents: [],
          comparisonMode: false,
          fallbackEnabled: false
        },
        metrics: {
          targetSuccessRate: 0.97,
          targetLatencyMs: 5000,
          targetErrorRate: 0.03
        }
      }
    ];

    const phaseIds = [];
    for (const phase of phases) {
      const id = await this.createPhase(phase);
      phaseIds.push(id);
    }

    return phaseIds;
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(phaseId: string): RolloutMetrics {
    return {
      phase: phaseId,
      successRate: 1,
      errorRate: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      callsProcessed: 0,
      organizationCount: 0,
      feedback: {
        positive: 0,
        negative: 0,
        neutral: 0
      }
    };
  }

  /**
   * Generate phase ID
   */
  private generatePhaseId(): string {
    return `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash string for percentage rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export default GradualRolloutSystem.getInstance();