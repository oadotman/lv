/**
 * Agent Performance Optimizer
 * Optimizes agent execution through caching, batching, and smart scheduling
 */

import { AgentContextData, IAgent } from '../types';
import crypto from 'crypto';

export interface OptimizationConfig {
  enableCaching: boolean;
  enableBatching: boolean;
  enableParallelization: boolean;
  enablePromptOptimization: boolean;
  enableResultCaching: boolean;
  cacheExpirationMs: number;
  maxBatchSize: number;
  maxParallelAgents: number;
}

export interface CacheEntry {
  key: string;
  result: any;
  timestamp: Date;
  hits: number;
  agentName: string;
  inputHash: string;
}

export interface BatchRequest {
  id: string;
  agentName: string;
  input: any;
  callback: (result: any) => void;
  timestamp: Date;
}

export interface OptimizationMetrics {
  cacheHits: number;
  cacheMisses: number;
  batchedRequests: number;
  parallelExecutions: number;
  promptTokensSaved: number;
  executionTimeSaved: number;
  costSaved: number;
}

export class AgentOptimizer {
  private static instance: AgentOptimizer;
  private cache: Map<string, CacheEntry> = new Map();
  private batchQueue: Map<string, BatchRequest[]> = new Map();
  private metrics: OptimizationMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    batchedRequests: 0,
    parallelExecutions: 0,
    promptTokensSaved: 0,
    executionTimeSaved: 0,
    costSaved: 0
  };

  private config: OptimizationConfig = {
    enableCaching: true,
    enableBatching: true,
    enableParallelization: true,
    enablePromptOptimization: true,
    enableResultCaching: true,
    cacheExpirationMs: 300000, // 5 minutes
    maxBatchSize: 10,
    maxParallelAgents: 5
  };

  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private optimizedPrompts: Map<string, string> = new Map();

  private constructor() {
    this.startCacheCleanup();
  }

  static getInstance(): AgentOptimizer {
    if (!AgentOptimizer.instance) {
      AgentOptimizer.instance = new AgentOptimizer();
    }
    return AgentOptimizer.instance;
  }

  /**
   * Optimize agent execution
   */
  async optimizeExecution(
    agent: IAgent,
    input: any,
    context: AgentContextData
  ): Promise<any> {
    const agentName = agent.name;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.checkCache(agentName, input);
      if (cached) {
        this.metrics.cacheHits++;
        console.log(`Cache HIT for ${agentName}`);
        return cached;
      }
      this.metrics.cacheMisses++;
    }

    // Check if can batch
    if (this.config.enableBatching && this.canBatch(agentName)) {
      return this.batchRequest(agentName, input, agent, context);
    }

    // Optimize prompt if enabled
    if (this.config.enablePromptOptimization) {
      input = this.optimizePrompt(agentName, input);
    }

    // Execute normally
    const result = await this.executeAgent(agent, input, context);

    // Cache result
    if (this.config.enableResultCaching) {
      this.cacheResult(agentName, input, result);
    }

    return result;
  }

  /**
   * Check if result exists in cache
   */
  private checkCache(agentName: string, input: any): any | null {
    const cacheKey = this.generateCacheKey(agentName, input);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check expiration
    const age = Date.now() - entry.timestamp.getTime();
    if (age > this.config.cacheExpirationMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update hit count
    entry.hits++;
    this.cache.set(cacheKey, entry);

    // Calculate time saved (estimate)
    this.metrics.executionTimeSaved += 3000; // Estimate 3s saved
    this.metrics.promptTokensSaved += 500; // Estimate tokens saved
    this.metrics.costSaved += 0.01; // Estimate cost saved

    return entry.result;
  }

  /**
   * Cache agent result
   */
  private cacheResult(agentName: string, input: any, result: any): void {
    const cacheKey = this.generateCacheKey(agentName, input);
    const inputHash = this.hashInput(input);

    const entry: CacheEntry = {
      key: cacheKey,
      result,
      timestamp: new Date(),
      hits: 0,
      agentName,
      inputHash
    };

    this.cache.set(cacheKey, entry);

    // Limit cache size
    if (this.cache.size > 1000) {
      this.evictOldestEntry();
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(agentName: string, input: any): string {
    const inputHash = this.hashInput(input);
    return `${agentName}:${inputHash}`;
  }

  /**
   * Hash input for cache key
   */
  private hashInput(input: any): string {
    const str = JSON.stringify(input);
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Check if agent can be batched
   */
  private canBatch(agentName: string): boolean {
    const batchableAgents = [
      'classification',
      'speaker_identification',
      'load_extraction',
      'simple_rate_extraction'
    ];

    return batchableAgents.includes(agentName);
  }

  /**
   * Batch agent request
   */
  private async batchRequest(
    agentName: string,
    input: any,
    agent: IAgent,
    context: AgentContextData
  ): Promise<any> {
    return new Promise((resolve) => {
      const request: BatchRequest = {
        id: crypto.randomUUID(),
        agentName,
        input,
        callback: resolve,
        timestamp: new Date()
      };

      // Add to batch queue
      if (!this.batchQueue.has(agentName)) {
        this.batchQueue.set(agentName, []);
      }

      const queue = this.batchQueue.get(agentName)!;
      queue.push(request);

      this.metrics.batchedRequests++;

      // Process batch if full
      if (queue.length >= this.config.maxBatchSize) {
        this.processBatch(agentName, agent, context);
      } else {
        // Set timeout to process partial batch
        this.scheduleBatchProcessing(agentName, agent, context);
      }
    });
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(
    agentName: string,
    agent: IAgent,
    context: AgentContextData
  ): void {
    // Clear existing timeout
    const existingTimeout = this.batchTimeouts.get(agentName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.processBatch(agentName, agent, context);
    }, 100); // Process after 100ms

    this.batchTimeouts.set(agentName, timeout);
  }

  /**
   * Process batched requests
   */
  private async processBatch(
    agentName: string,
    agent: IAgent,
    context: AgentContextData
  ): Promise<void> {
    const queue = this.batchQueue.get(agentName);
    if (!queue || queue.length === 0) {
      return;
    }

    // Clear queue
    this.batchQueue.set(agentName, []);

    // Clear timeout
    const timeout = this.batchTimeouts.get(agentName);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(agentName);
    }

    console.log(`Processing batch of ${queue.length} requests for ${agentName}`);

    try {
      // Execute in batch (simplified - would need agent-specific batching)
      const results = await Promise.all(
        queue.map(req => this.executeAgent(agent, req.input, context))
      );

      // Deliver results
      queue.forEach((req, index) => {
        req.callback(results[index]);

        // Cache result
        if (this.config.enableResultCaching) {
          this.cacheResult(agentName, req.input, results[index]);
        }
      });
    } catch (error) {
      // Handle batch error
      console.error(`Batch processing error for ${agentName}:`, error);
      queue.forEach(req => req.callback({ error }));
    }
  }

  /**
   * Execute agent (placeholder - would need actual implementation)
   */
  private async executeAgent(
    agent: IAgent,
    input: any,
    context: AgentContextData
  ): Promise<any> {
    // This would need to be integrated with actual agent execution
    return agent.execute(context);
  }

  /**
   * Optimize prompt for efficiency
   */
  private optimizePrompt(agentName: string, input: any): any {
    // Check for optimized version
    const optimized = this.optimizedPrompts.get(agentName);
    if (optimized) {
      return { ...input, prompt: optimized };
    }

    // Apply optimizations
    if (typeof input === 'object' && input.prompt) {
      let prompt = input.prompt;

      // Remove redundant whitespace
      prompt = prompt.replace(/\s+/g, ' ').trim();

      // Remove unnecessary examples if confidence is high
      if (this.getAgentConfidence(agentName) > 0.9) {
        prompt = this.removeExamples(prompt);
      }

      // Compress instructions
      prompt = this.compressInstructions(prompt);

      this.optimizedPrompts.set(agentName, prompt);
      return { ...input, prompt };
    }

    return input;
  }

  /**
   * Get agent historical confidence
   */
  private getAgentConfidence(agentName: string): number {
    // This would need integration with performance monitoring
    return 0.85; // Placeholder
  }

  /**
   * Remove examples from prompt
   */
  private removeExamples(prompt: string): string {
    // Simple example removal (would need more sophisticated logic)
    return prompt.replace(/Example:[\s\S]*?(?=\n\n|$)/gi, '');
  }

  /**
   * Compress instructions
   */
  private compressInstructions(prompt: string): string {
    // Simple compression (would need more sophisticated logic)
    const replacements = [
      [/please\s+/gi, ''],
      [/you should\s+/gi, ''],
      [/make sure to\s+/gi, ''],
      [/it is important that\s+/gi, '']
    ];

    let compressed = prompt;
    for (const [pattern, replacement] of replacements) {
      compressed = compressed.replace(pattern as RegExp, replacement as string);
    }

    return compressed;
  }

  /**
   * Optimize parallel execution
   */
  async optimizeParallelExecution(
    agents: IAgent[],
    context: AgentContextData
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Group agents by dependency
    const { independent, dependent } = this.groupAgentsByDependency(agents);

    // Execute independent agents in parallel
    if (independent.length > 0) {
      const parallelBatches = this.createParallelBatches(independent);

      for (const batch of parallelBatches) {
        const batchResults = await Promise.all(
          batch.map(agent => this.optimizeExecution(agent, {}, context))
        );

        batch.forEach((agent, index) => {
          results.set(agent.name, batchResults[index]);
          // Context doesn't have setAgentOutput method - outputs are stored in results map
        });

        this.metrics.parallelExecutions += batch.length;
      }
    }

    // Execute dependent agents sequentially
    for (const agent of dependent) {
      const result = await this.optimizeExecution(agent, {}, context);
      results.set(agent.name, result);
      // Context doesn't have setAgentOutput method - outputs are stored in results map
    }

    return results;
  }

  /**
   * Group agents by dependency
   */
  private groupAgentsByDependency(agents: IAgent[]): {
    independent: IAgent[];
    dependent: IAgent[];
  } {
    const independent: IAgent[] = [];
    const dependent: IAgent[] = [];

    for (const agent of agents) {
      if (!agent.dependencies || agent.dependencies.length === 0) {
        independent.push(agent);
      } else {
        dependent.push(agent);
      }
    }

    return { independent, dependent };
  }

  /**
   * Create parallel execution batches
   */
  private createParallelBatches(agents: IAgent[]): IAgent[][] {
    const batches: IAgent[][] = [];
    const batchSize = this.config.maxParallelAgents;

    for (let i = 0; i < agents.length; i += batchSize) {
      batches.push(agents.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        const age = now - entry.timestamp.getTime();
        if (age > this.config.cacheExpirationMs) {
          expired.push(key);
        }
      }

      for (const key of expired) {
        this.cache.delete(key);
      }

      if (expired.length > 0) {
        console.log(`Cleaned up ${expired.length} expired cache entries`);
      }
    }, 60000); // Clean every minute
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): any {
    const stats = {
      size: this.cache.size,
      hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      topHits: [] as any[]
    };

    // Get top cached items by hits
    const entries = Array.from(this.cache.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    stats.topHits = entries.map(e => ({
      agent: e.agentName,
      hits: e.hits,
      age: Date.now() - e.timestamp.getTime()
    }));

    return stats;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Optimization config updated:', this.config);
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      batchedRequests: 0,
      parallelExecutions: 0,
      promptTokensSaved: 0,
      executionTimeSaved: 0,
      costSaved: 0
    };
  }
}

// Export singleton instance
export default AgentOptimizer.getInstance();