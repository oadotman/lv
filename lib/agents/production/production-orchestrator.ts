/**
 * Production Orchestrator for Multi-Agent System
 * Integrates with existing LoadVoice system for gradual rollout
 */

import { createClient } from '@supabase/supabase-js';
import { Orchestrator } from '../orchestrator';
import { AgentContextData } from '../types';
import PerformanceMonitor from '../performance-monitor';
import ErrorRecoverySystem from '../error-recovery';
import AgentOptimizer from '../optimization/agent-optimizer';

export interface ProductionConfig {
  enableMultiAgent: boolean;
  rolloutPercentage: number;
  comparisonMode: boolean;
  enabledAgents: string[];
  disabledAgents: string[];
  fallbackToLegacy: boolean;
  monitoringEnabled: boolean;
  cachingEnabled: boolean;
}

export interface ProcessingResult {
  success: boolean;
  method: 'multi_agent' | 'legacy' | 'comparison';
  multiAgentOutput?: any;
  legacyOutput?: any;
  executionTimeMs: number;
  tokensUsed?: number;
  errors?: any[];
  metadata?: any;
}

export class ProductionOrchestrator {
  private static instance: ProductionOrchestrator;
  private orchestrator: Orchestrator;
  private supabase: any;
  private config: ProductionConfig;
  private performanceMonitor: any;
  private errorRecovery: any;
  private optimizer: any;

  private constructor() {
    this.orchestrator = new Orchestrator();
    this.performanceMonitor = PerformanceMonitor;
    this.errorRecovery = ErrorRecoverySystem;
    this.optimizer = AgentOptimizer;

    // Initialize Supabase client if credentials available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Load default configuration
    this.config = {
      enableMultiAgent: false,
      rolloutPercentage: 0,
      comparisonMode: false,
      enabledAgents: [],
      disabledAgents: [],
      fallbackToLegacy: true,
      monitoringEnabled: true,
      cachingEnabled: true
    };

    // Load configuration from database
    this.loadConfiguration();
  }

  static getInstance(): ProductionOrchestrator {
    if (!ProductionOrchestrator.instance) {
      ProductionOrchestrator.instance = new ProductionOrchestrator();
    }
    return ProductionOrchestrator.instance;
  }

  /**
   * Load configuration from database
   */
  private async loadConfiguration(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from('agent_feature_flags')
        .select('*')
        .single();

      if (data) {
        this.config = {
          enableMultiAgent: data.multi_agent_enabled || false,
          rolloutPercentage: data.rollout_percentage || 0,
          comparisonMode: data.comparison_mode || false,
          enabledAgents: data.enabled_agents || [],
          disabledAgents: data.disabled_agents || [],
          fallbackToLegacy: true,
          monitoringEnabled: true,
          cachingEnabled: true
        };
      }
    } catch (err) {
      console.error('Failed to load configuration:', err);
    }
  }

  /**
   * Main processing entry point
   */
  async processCall(
    callId: string,
    transcript: string,
    organizationId: string,
    options: any = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Check if should use multi-agent
    const useMultiAgent = this.shouldUseMultiAgent(organizationId);

    // Comparison mode - run both methods
    if (this.config.comparisonMode) {
      return this.runComparison(callId, transcript, organizationId, options);
    }

    // Multi-agent mode
    if (useMultiAgent) {
      try {
        const result = await this.runMultiAgent(callId, transcript, organizationId, options);

        // Fallback to legacy if failed and fallback enabled
        if (!result.success && this.config.fallbackToLegacy) {
          console.warn('Multi-agent failed, falling back to legacy');
          return this.runLegacy(callId, transcript, organizationId, options);
        }

        return result;
      } catch (error) {
        console.error('Multi-agent error:', error);

        if (this.config.fallbackToLegacy) {
          return this.runLegacy(callId, transcript, organizationId, options);
        }

        throw error;
      }
    }

    // Legacy mode
    return this.runLegacy(callId, transcript, organizationId, options);
  }

  /**
   * Determine if multi-agent should be used
   */
  private shouldUseMultiAgent(organizationId: string): boolean {
    if (!this.config.enableMultiAgent) {
      return false;
    }

    // Check rollout percentage
    if (this.config.rolloutPercentage < 100) {
      const hash = this.hashString(organizationId + new Date().toISOString());
      const percentile = (hash % 100) + 1;
      return percentile <= this.config.rolloutPercentage;
    }

    return true;
  }

  /**
   * Run multi-agent extraction
   */
  private async runMultiAgent(
    callId: string,
    transcript: string,
    organizationId: string,
    options: any
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Create context
      const agentOutputsMap = new Map<string, any>();
      const metadata = {
        ...options.metadata,
        callId,
        organizationId
      };

      const context: AgentContextData = {
        transcript,
        utterances: options.utterances || [],
        metadata,
        agentOutputs: agentOutputsMap,
        sharedState: new Map(),
        executionLog: [],
        getAgentOutput: function<T>(agentName: string): T | undefined {
          return agentOutputsMap.get(agentName) as T | undefined;
        }
      };

      // Start performance tracking
      if (this.config.monitoringEnabled) {
        this.performanceMonitor.startTracking('multi_agent_pipeline', callId);
      }

      // Execute orchestrator extraction
      const result = await this.orchestrator.extract(
        transcript,
        context.utterances,
        context.metadata
      );

      // End performance tracking
      if (this.config.monitoringEnabled) {
        const metrics = this.performanceMonitor.endTracking(
          'multi_agent_pipeline',
          callId,
          true,
          result
        );

        // Store metrics in database
        await this.storeMetrics(callId, organizationId, metrics);
      }

      // Store outputs in database
      await this.storeAgentOutputs(callId, organizationId, result);

      return {
        success: true,
        method: 'multi_agent',
        multiAgentOutput: result,
        executionTimeMs: Date.now() - startTime,
        tokensUsed: this.calculateTokenUsage(result),
        metadata: {
          agentsExecuted: Array.from(context.agentOutputs?.keys() || []),
          confidence: this.calculateOverallConfidence(result)
        }
      };
    } catch (error: any) {
      // Handle error with recovery system
      const errorContext = {
        agentName: 'multi_agent_pipeline',
        error,
        attempt: 1,
        timestamp: new Date(),
        context: { callId, organizationId }
      };

      const recoveryResult = await this.errorRecovery.handleError(errorContext);

      if (recoveryResult.success) {
        return {
          success: true,
          method: 'multi_agent',
          multiAgentOutput: recoveryResult.result,
          executionTimeMs: Date.now() - startTime,
          errors: [error.message],
          metadata: { recovered: true }
        };
      }

      throw error;
    }
  }

  /**
   * Run legacy extraction
   */
  private async runLegacy(
    callId: string,
    transcript: string,
    organizationId: string,
    options: any
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Import legacy extraction function
      const { extractCRMData } = await import('../../openai');

      // Build config for legacy extraction
      const config = {
        transcript,
        utterances: options?.utterances || [],
        speakerMapping: options?.speakerMapping || {},
        customerName: options?.customerName,
        callType: options?.callType,
        ...options
      };

      const result = await extractCRMData(config);

      return {
        success: true,
        method: 'legacy',
        legacyOutput: result,
        executionTimeMs: Date.now() - startTime,
        metadata: {
          method: 'legacy_extraction'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'legacy',
        executionTimeMs: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Run comparison mode - both methods in parallel
   */
  private async runComparison(
    callId: string,
    transcript: string,
    organizationId: string,
    options: any
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Run both methods in parallel
      const [multiAgentResult, legacyResult] = await Promise.allSettled([
        this.runMultiAgent(callId, transcript, organizationId, options),
        this.runLegacy(callId, transcript, organizationId, options)
      ]);

      const comparison: ProcessingResult = {
        success: true,
        method: 'comparison',
        executionTimeMs: Date.now() - startTime,
        metadata: {
          comparison: true
        }
      };

      // Add results
      if (multiAgentResult.status === 'fulfilled') {
        comparison.multiAgentOutput = multiAgentResult.value.multiAgentOutput;
      } else {
        comparison.errors = comparison.errors || [];
        comparison.errors.push(`Multi-agent failed: ${multiAgentResult.reason}`);
      }

      if (legacyResult.status === 'fulfilled') {
        comparison.legacyOutput = legacyResult.value.legacyOutput;
      } else {
        comparison.errors = comparison.errors || [];
        comparison.errors.push(`Legacy failed: ${legacyResult.reason}`);
      }

      // Store comparison in database
      await this.storeComparison(callId, organizationId, comparison);

      return comparison;
    } catch (error: any) {
      return {
        success: false,
        method: 'comparison',
        executionTimeMs: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Store agent outputs in database
   */
  private async storeAgentOutputs(
    callId: string,
    organizationId: string,
    outputs: any
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      const outputRecords = [];

      for (const [agentName, output] of Object.entries(outputs)) {
        if (typeof output === 'object' && output !== null) {
          outputRecords.push({
            call_id: callId,
            organization_id: organizationId,
            agent_name: agentName,
            output_data: output,
            confidence: (output as any).confidence?.value || null,
            quality_score: (output as any).quality?.score || null,
            completeness: (output as any).completeness || null,
            validation_status: 'pending'
          });
        }
      }

      if (outputRecords.length > 0) {
        await this.supabase
          .from('agent_outputs')
          .insert(outputRecords);
      }
    } catch (err) {
      console.error('Failed to store agent outputs:', err);
    }
  }

  /**
   * Store performance metrics
   */
  private async storeMetrics(
    callId: string,
    organizationId: string,
    metrics: any
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('agent_execution_logs')
        .insert({
          call_id: callId,
          organization_id: organizationId,
          agent_name: 'multi_agent_pipeline',
          execution_time_ms: metrics.executionTime,
          tokens_used: metrics.tokenUsage?.total || null,
          success: metrics.success,
          error_message: metrics.error?.message || null,
          error_type: metrics.error?.type || null
        });
    } catch (err) {
      console.error('Failed to store metrics:', err);
    }
  }

  /**
   * Store comparison results
   */
  private async storeComparison(
    callId: string,
    organizationId: string,
    comparison: ProcessingResult
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('extraction_comparisons')
        .insert({
          call_id: callId,
          organization_id: organizationId,
          legacy_output: comparison.legacyOutput,
          multi_agent_output: comparison.multiAgentOutput,
          legacy_execution_time_ms: comparison.legacyOutput ?
            comparison.executionTimeMs / 2 : null, // Estimate
          multi_agent_execution_time_ms: comparison.multiAgentOutput ?
            comparison.executionTimeMs / 2 : null // Estimate
        });
    } catch (err) {
      console.error('Failed to store comparison:', err);
    }
  }

  /**
   * Calculate token usage from results
   */
  private calculateTokenUsage(result: any): number {
    let totalTokens = 0;

    if (result && typeof result === 'object') {
      for (const value of Object.values(result)) {
        if (typeof value === 'object' && value !== null) {
          const output = value as any;
          if (output.tokenUsage?.total) {
            totalTokens += output.tokenUsage.total;
          }
        }
      }
    }

    return totalTokens;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(result: any): number {
    const confidences: number[] = [];

    if (result && typeof result === 'object') {
      for (const value of Object.values(result)) {
        if (typeof value === 'object' && value !== null) {
          const output = value as any;
          if (output.confidence?.value) {
            confidences.push(output.confidence.value);
          }
        }
      }
    }

    if (confidences.length === 0) return 0;

    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  /**
   * Hash string for rollout percentage
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Update configuration
   */
  async updateConfiguration(config: Partial<ProductionConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Save to database if available
    if (this.supabase) {
      try {
        await this.supabase
          .from('agent_feature_flags')
          .upsert({
            multi_agent_enabled: this.config.enableMultiAgent,
            rollout_percentage: this.config.rolloutPercentage,
            comparison_mode: this.config.comparisonMode,
            enabled_agents: this.config.enabledAgents,
            disabled_agents: this.config.disabledAgents
          });
      } catch (err) {
        console.error('Failed to update configuration:', err);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ProductionConfig {
    return { ...this.config };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const health: any = {
      status: 'healthy',
      multiAgentEnabled: this.config.enableMultiAgent,
      rolloutPercentage: this.config.rolloutPercentage,
      issues: []
    };

    // Check error recovery health
    const errorHealth = this.errorRecovery.healthCheck();
    if (!errorHealth.healthy) {
      health.status = 'degraded';
      health.issues.push(...errorHealth.issues);
    }

    // Check performance monitor health
    const performanceHealth = this.performanceMonitor.healthCheck();
    if (performanceHealth.status !== 'healthy') {
      health.status = performanceHealth.status;
      health.issues.push(...performanceHealth.issues);
    }

    return health;
  }
}

// Export singleton instance
export default ProductionOrchestrator.getInstance();