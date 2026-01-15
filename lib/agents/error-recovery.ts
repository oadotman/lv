/**
 * Error Recovery System for Multi-Agent Pipeline
 * Handles errors, implements fallback strategies, and ensures graceful degradation
 */

import { AgentContextData, BaseAgentOutput } from './types';

export interface ErrorContext {
  agentName: string;
  error: Error;
  attempt: number;
  timestamp: Date;
  context: AgentContextData;
  previousAttempts?: ErrorContext[];
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'skip' | 'partial' | 'circuit_break';
  action: () => Promise<any>;
  description: string;
  confidence: number;
}

export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy['type'];
  result?: any;
  error?: Error;
  partialData?: any;
  degradationLevel: 'none' | 'minimal' | 'moderate' | 'severe';
}

export interface CircuitBreakerState {
  agent: string;
  state: 'closed' | 'open' | 'half_open';
  failures: number;
  lastFailure?: Date;
  successCount: number;
  nextRetry?: Date;
}

export class ErrorRecoverySystem {
  private static instance: ErrorRecoverySystem;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorHistory: Map<string, ErrorContext[]> = new Map();

  private config = {
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeMs: 60000, // 1 minute
      halfOpenRequests: 3
    },
    fallbackStrategies: {
      enablePartialExtraction: true,
      enableDefaultValues: true,
      enableCachedResults: true,
      enableDegradedMode: true
    }
  };

  private fallbackCache: Map<string, any> = new Map();
  private defaultOutputs: Map<string, any> = new Map();

  private constructor() {
    this.initializeDefaultOutputs();
  }

  static getInstance(): ErrorRecoverySystem {
    if (!ErrorRecoverySystem.instance) {
      ErrorRecoverySystem.instance = new ErrorRecoverySystem();
    }
    return ErrorRecoverySystem.instance;
  }

  /**
   * Handle agent error with recovery strategies
   */
  async handleError(errorContext: ErrorContext): Promise<RecoveryResult> {
    console.error(`Error in agent ${errorContext.agentName}:`, errorContext.error.message);

    // Store error in history
    this.addErrorToHistory(errorContext);

    // Check circuit breaker
    const circuitState = this.checkCircuitBreaker(errorContext.agentName);
    if (circuitState.state === 'open') {
      console.warn(`Circuit breaker OPEN for ${errorContext.agentName}`);
      return this.applyFallbackStrategy(errorContext);
    }

    // Determine recovery strategy
    const strategy = this.determineRecoveryStrategy(errorContext);

    // Execute recovery strategy
    let result: RecoveryResult;
    switch (strategy.type) {
      case 'retry':
        result = await this.retryWithBackoff(errorContext);
        break;
      case 'fallback':
        result = await this.applyFallbackStrategy(errorContext);
        break;
      case 'skip':
        result = await this.skipAgent(errorContext);
        break;
      case 'partial':
        result = await this.extractPartialData(errorContext);
        break;
      case 'circuit_break':
        result = await this.triggerCircuitBreaker(errorContext);
        break;
      default:
        result = {
          success: false,
          strategy: 'skip',
          error: errorContext.error,
          degradationLevel: 'severe'
        };
    }

    // Update circuit breaker state
    this.updateCircuitBreaker(errorContext.agentName, result.success);

    return result;
  }

  /**
   * Determine best recovery strategy based on error type and context
   */
  private determineRecoveryStrategy(errorContext: ErrorContext): RecoveryStrategy {
    const { error, attempt, agentName } = errorContext;

    // Check if error is transient (network, timeout)
    if (this.isTransientError(error)) {
      if (attempt < this.config.maxRetries) {
        return {
          type: 'retry',
          action: async () => this.retryWithBackoff(errorContext),
          description: `Retry attempt ${attempt + 1} of ${this.config.maxRetries}`,
          confidence: 0.7
        };
      }
    }

    // Check if error is due to malformed data
    if (this.isDataError(error)) {
      if (this.config.fallbackStrategies.enablePartialExtraction) {
        return {
          type: 'partial',
          action: async () => this.extractPartialData(errorContext),
          description: 'Attempt partial data extraction',
          confidence: 0.5
        };
      }
    }

    // Check if agent has cached results
    if (this.hasCachedResults(agentName)) {
      return {
        type: 'fallback',
        action: async () => this.useCachedResults(agentName),
        description: 'Use cached results from previous successful execution',
        confidence: 0.6
      };
    }

    // Check if agent is optional
    if (this.isAgentOptional(agentName)) {
      return {
        type: 'skip',
        action: async () => this.skipAgent(errorContext),
        description: 'Skip optional agent',
        confidence: 0.8
      };
    }

    // Circuit breaker if too many failures
    const errorCount = this.getErrorCount(agentName);
    if (errorCount >= this.config.circuitBreaker.failureThreshold) {
      return {
        type: 'circuit_break',
        action: async () => this.triggerCircuitBreaker(errorContext),
        description: 'Trigger circuit breaker due to repeated failures',
        confidence: 0.3
      };
    }

    // Default fallback
    return {
      type: 'fallback',
      action: async () => this.applyFallbackStrategy(errorContext),
      description: 'Apply default fallback strategy',
      confidence: 0.4
    };
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff(errorContext: ErrorContext): Promise<RecoveryResult> {
    const { attempt } = errorContext;
    const delay = this.config.exponentialBackoff
      ? this.config.retryDelayMs * Math.pow(2, attempt - 1)
      : this.config.retryDelayMs;

    console.log(`Retrying ${errorContext.agentName} after ${delay}ms (attempt ${attempt})`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Re-execute agent (this would need actual agent execution logic)
      const result = await this.reexecuteAgent(errorContext);

      return {
        success: true,
        strategy: 'retry',
        result,
        degradationLevel: 'none'
      };
    } catch (retryError: any) {
      // Create new error context with incremented attempt
      const newContext: ErrorContext = {
        ...errorContext,
        attempt: attempt + 1,
        error: retryError,
        previousAttempts: [...(errorContext.previousAttempts || []), errorContext]
      };

      // Recursively handle error if retries remaining
      if (newContext.attempt < this.config.maxRetries) {
        return this.handleError(newContext);
      }

      return {
        success: false,
        strategy: 'retry',
        error: retryError,
        degradationLevel: 'moderate'
      };
    }
  }

  /**
   * Apply fallback strategy
   */
  private async applyFallbackStrategy(errorContext: ErrorContext): Promise<RecoveryResult> {
    const { agentName } = errorContext;

    // Try cached results first
    if (this.config.fallbackStrategies.enableCachedResults && this.hasCachedResults(agentName)) {
      const cached = this.fallbackCache.get(agentName);
      return {
        success: true,
        strategy: 'fallback',
        result: cached,
        degradationLevel: 'minimal'
      };
    }

    // Use default values
    if (this.config.fallbackStrategies.enableDefaultValues && this.defaultOutputs.has(agentName)) {
      const defaultOutput = this.defaultOutputs.get(agentName);
      return {
        success: true,
        strategy: 'fallback',
        result: defaultOutput,
        degradationLevel: 'moderate'
      };
    }

    // Degraded mode - return minimal data
    if (this.config.fallbackStrategies.enableDegradedMode) {
      return {
        success: true,
        strategy: 'fallback',
        result: this.getMinimalOutput(agentName),
        degradationLevel: 'severe'
      };
    }

    return {
      success: false,
      strategy: 'fallback',
      error: errorContext.error,
      degradationLevel: 'severe'
    };
  }

  /**
   * Skip optional agent
   */
  private async skipAgent(errorContext: ErrorContext): Promise<RecoveryResult> {
    console.warn(`Skipping optional agent ${errorContext.agentName}`);

    return {
      success: true,
      strategy: 'skip',
      result: null,
      degradationLevel: 'minimal'
    };
  }

  /**
   * Extract partial data despite errors
   */
  private async extractPartialData(errorContext: ErrorContext): Promise<RecoveryResult> {
    console.log(`Attempting partial data extraction for ${errorContext.agentName}`);

    try {
      // This would implement partial extraction logic specific to each agent
      const partialData = await this.performPartialExtraction(errorContext);

      return {
        success: true,
        strategy: 'partial',
        result: partialData,
        partialData,
        degradationLevel: 'moderate'
      };
    } catch (partialError: any) {
      return {
        success: false,
        strategy: 'partial',
        error: partialError,
        degradationLevel: 'severe'
      };
    }
  }

  /**
   * Trigger circuit breaker
   */
  private async triggerCircuitBreaker(errorContext: ErrorContext): Promise<RecoveryResult> {
    const { agentName } = errorContext;

    const circuitState = this.circuitBreakers.get(agentName) || this.createCircuitBreaker(agentName);
    circuitState.state = 'open';
    circuitState.lastFailure = new Date();
    circuitState.nextRetry = new Date(Date.now() + this.config.circuitBreaker.resetTimeMs);

    this.circuitBreakers.set(agentName, circuitState);

    console.error(`Circuit breaker triggered for ${agentName}. Will retry at ${circuitState.nextRetry}`);

    // Use fallback while circuit is open
    return this.applyFallbackStrategy(errorContext);
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(agentName: string): CircuitBreakerState {
    const state = this.circuitBreakers.get(agentName);
    if (!state) {
      return this.createCircuitBreaker(agentName);
    }

    // Check if circuit should transition from open to half-open
    if (state.state === 'open' && state.nextRetry && new Date() >= state.nextRetry) {
      state.state = 'half_open';
      state.successCount = 0;
      this.circuitBreakers.set(agentName, state);
    }

    return state;
  }

  /**
   * Update circuit breaker based on execution result
   */
  private updateCircuitBreaker(agentName: string, success: boolean): void {
    const state = this.circuitBreakers.get(agentName) || this.createCircuitBreaker(agentName);

    if (success) {
      if (state.state === 'half_open') {
        state.successCount++;
        if (state.successCount >= this.config.circuitBreaker.halfOpenRequests) {
          state.state = 'closed';
          state.failures = 0;
          console.log(`Circuit breaker for ${agentName} is now CLOSED`);
        }
      } else if (state.state === 'closed') {
        state.failures = Math.max(0, state.failures - 1);
      }
    } else {
      state.failures++;
      if (state.state === 'half_open' || state.failures >= this.config.circuitBreaker.failureThreshold) {
        state.state = 'open';
        state.lastFailure = new Date();
        state.nextRetry = new Date(Date.now() + this.config.circuitBreaker.resetTimeMs);
        console.warn(`Circuit breaker for ${agentName} is now OPEN`);
      }
    }

    this.circuitBreakers.set(agentName, state);
  }

  /**
   * Create new circuit breaker state
   */
  private createCircuitBreaker(agent: string): CircuitBreakerState {
    return {
      agent,
      state: 'closed',
      failures: 0,
      successCount: 0
    };
  }

  /**
   * Check if error is transient (can be retried)
   */
  private isTransientError(error: Error): boolean {
    const transientPatterns = [
      /timeout/i,
      /network/i,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /429/, // Rate limit
      /503/, // Service unavailable
      /502/  // Bad gateway
    ];

    return transientPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if error is due to data issues
   */
  private isDataError(error: Error): boolean {
    const dataPatterns = [
      /JSON/i,
      /parse/i,
      /undefined/i,
      /null/i,
      /invalid/i,
      /malformed/i
    ];

    return dataPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if agent is optional (can be skipped)
   */
  private isAgentOptional(agentName: string): boolean {
    const optionalAgents = [
      'reference_resolution',
      'temporal_resolution',
      'accessorial_parser',
      'summary'
    ];

    return optionalAgents.includes(agentName);
  }

  /**
   * Check if cached results exist
   */
  private hasCachedResults(agentName: string): boolean {
    return this.fallbackCache.has(agentName);
  }

  /**
   * Use cached results
   */
  private async useCachedResults(agentName: string): Promise<any> {
    return this.fallbackCache.get(agentName);
  }

  /**
   * Add error to history
   */
  private addErrorToHistory(errorContext: ErrorContext): void {
    const { agentName } = errorContext;
    if (!this.errorHistory.has(agentName)) {
      this.errorHistory.set(agentName, []);
    }

    const history = this.errorHistory.get(agentName)!;
    history.push(errorContext);

    // Keep only last 100 errors per agent
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get error count for agent
   */
  private getErrorCount(agentName: string, timeWindowMs: number = 300000): number {
    const history = this.errorHistory.get(agentName);
    if (!history) return 0;

    const cutoff = Date.now() - timeWindowMs;
    return history.filter(e => e.timestamp.getTime() > cutoff).length;
  }

  /**
   * Re-execute agent (placeholder - would need actual implementation)
   */
  private async reexecuteAgent(errorContext: ErrorContext): Promise<any> {
    // This would need to be implemented with actual agent execution logic
    throw new Error('Agent re-execution not implemented');
  }

  /**
   * Perform partial extraction (placeholder - would need actual implementation)
   */
  private async performPartialExtraction(errorContext: ErrorContext): Promise<any> {
    // This would need agent-specific partial extraction logic
    return {
      partial: true,
      confidence: 0.5,
      extractedFields: []
    };
  }

  /**
   * Get minimal output for degraded mode
   */
  private getMinimalOutput(agentName: string): any {
    return {
      agentName,
      status: 'degraded',
      confidence: 0.3,
      error: 'Operating in degraded mode',
      data: {}
    };
  }

  /**
   * Initialize default outputs for fallback
   */
  private initializeDefaultOutputs(): void {
    // These would be agent-specific default outputs
    this.defaultOutputs.set('classification', {
      primaryType: 'unknown',
      confidence: 0.3
    });

    this.defaultOutputs.set('speaker_identification', {
      speakers: {},
      confidence: 0.3
    });

    this.defaultOutputs.set('load_extraction', {
      loads: [],
      confidence: 0.3
    });

    // Add more default outputs as needed
  }

  /**
   * Cache successful result for fallback use
   */
  cacheSuccessfulResult(agentName: string, result: any): void {
    this.fallbackCache.set(agentName, result);
  }

  /**
   * Get error recovery statistics
   */
  getStatistics(): any {
    const stats: any = {
      circuitBreakers: {},
      errorCounts: {},
      recoverySuccessRate: {}
    };

    // Circuit breaker states
    for (const [agent, state] of this.circuitBreakers.entries()) {
      stats.circuitBreakers[agent] = {
        state: state.state,
        failures: state.failures,
        lastFailure: state.lastFailure,
        nextRetry: state.nextRetry
      };
    }

    // Error counts
    for (const [agent, history] of this.errorHistory.entries()) {
      stats.errorCounts[agent] = {
        total: history.length,
        last24h: history.filter(e => Date.now() - e.timestamp.getTime() < 86400000).length,
        lastHour: history.filter(e => Date.now() - e.timestamp.getTime() < 3600000).length
      };
    }

    return stats;
  }

  /**
   * Reset error recovery state
   */
  reset(): void {
    this.circuitBreakers.clear();
    this.errorHistory.clear();
    this.fallbackCache.clear();
  }

  /**
   * Health check for error recovery system
   */
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for open circuit breakers
    for (const [agent, state] of this.circuitBreakers.entries()) {
      if (state.state === 'open') {
        issues.push(`Circuit breaker open for ${agent}`);
      }
    }

    // Check for high error rates
    for (const [agent] of this.errorHistory.entries()) {
      const errorCount = this.getErrorCount(agent, 3600000); // Last hour
      if (errorCount > 10) {
        issues.push(`High error rate for ${agent}: ${errorCount} errors in last hour`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export default ErrorRecoverySystem.getInstance();