/**
 * LoadVoice Performance Optimization Module
 * Ensures <60 second extraction and <1 second page loads
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Cache keys for different data types
export const CACHE_KEYS = {
  DASHBOARD: 'dashboard-snapshot',
  LOADS: 'loads-list',
  CARRIERS: 'carriers-list',
  SHIPPERS: 'shippers-list',
  EXTRACTION: 'extraction-result',
  METRICS: 'performance-metrics'
} as const;

// Cache TTL configuration (in seconds)
export const CACHE_TTL = {
  DASHBOARD: 60,        // 1 minute for dashboard data
  LOADS: 30,           // 30 seconds for load list
  CARRIERS: 300,       // 5 minutes for carrier data
  SHIPPERS: 300,       // 5 minutes for shipper data
  EXTRACTION: 3600,    // 1 hour for extraction results
  METRICS: 120         // 2 minutes for metrics
} as const;

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private readonly maxSamples = 100;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName: string): () => number {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration);
      return duration;
    };
  }

  /**
   * Record a metric value
   */
  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only the last N samples
    if (values.length > this.maxSamples) {
      values.shift();
    }
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;

    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get all metrics summary
   */
  getMetricsSummary(): Record<string, { avg: number; min: number; max: number; samples: number }> {
    const summary: Record<string, any> = {};

    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        summary[name] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          min: Math.round(Math.min(...values)),
          max: Math.round(Math.max(...values)),
          samples: values.length
        };
      }
    }

    return summary;
  }

  /**
   * Check if performance targets are met
   */
  checkPerformanceTargets(): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const targets = {
      extraction: 60000,     // 60 seconds
      pageLoad: 1000,       // 1 second
      apiResponse: 2000,    // 2 seconds
      dbQuery: 100         // 100ms
    };

    for (const [metric, target] of Object.entries(targets)) {
      const avg = this.getAverageMetric(metric);
      if (avg > target) {
        violations.push(`${metric}: ${avg}ms (target: ${target}ms)`);
      }
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }
}

/**
 * Optimized database query with caching
 */
export const cachedQuery = unstable_cache(
  async (query: string, params: any[], cacheKey: string) => {
    const monitor = PerformanceMonitor.getInstance();
    const endTimer = monitor.startTimer('dbQuery');

    try {
      // Execute query (implementation depends on your DB client)
      const result = await executeQuery(query, params);
      return result;
    } finally {
      endTimer();
    }
  },
  ['database-query'],
  {
    revalidate: 60, // Default 60 second cache
    tags: ['database']
  }
);

/**
 * Optimized extraction with parallel processing
 */
export async function optimizedExtraction(
  transcript: string,
  callType: 'shipper' | 'carrier' | 'check_call'
): Promise<any> {
  const monitor = PerformanceMonitor.getInstance();
  const endTimer = monitor.startTimer('extraction');

  try {
    // Start processing in parallel
    const [transcriptionResult, extractionResult] = await Promise.all([
      // Process transcription optimization
      optimizeTranscript(transcript),
      // Pre-warm extraction model
      preWarmExtractionModel(callType)
    ]);

    // Perform extraction with optimized data
    const result = await performExtraction(transcriptionResult, callType);

    const duration = endTimer();

    // Log if exceeding target
    if (duration > 60000) {
      console.warn(`Extraction took ${duration}ms, exceeding 60s target`);
    }

    return result;
  } catch (error) {
    endTimer();
    throw error;
  }
}

/**
 * Optimize transcript for processing
 */
async function optimizeTranscript(transcript: string): Promise<string> {
  // Remove unnecessary whitespace
  let optimized = transcript.trim().replace(/\s+/g, ' ');

  // Remove filler words that don't affect extraction
  const fillerWords = ['uh', 'um', 'like', 'you know', 'basically'];
  fillerWords.forEach(word => {
    optimized = optimized.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });

  return optimized;
}

/**
 * Pre-warm extraction model
 */
async function preWarmExtractionModel(callType: string): Promise<void> {
  // This would trigger model initialization if needed
  // Implementation depends on your AI service
  return;
}

/**
 * Perform the actual extraction
 */
async function performExtraction(transcript: string, callType: string): Promise<any> {
  // Implementation depends on your extraction service
  // This is where you'd call OpenAI or other AI service
  return {
    callType,
    data: {},
    confidence: 0
  };
}

/**
 * Execute database query (placeholder)
 */
async function executeQuery(query: string, params: any[]): Promise<any> {
  // Implementation depends on your database client
  return [];
}

/**
 * Batch database operations for efficiency
 */
export class BatchProcessor {
  private queue: Map<string, any[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchSize = 10;
  private readonly batchDelay = 100; // ms

  /**
   * Add item to batch queue
   */
  add(type: string, item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.queue.has(type)) {
        this.queue.set(type, []);
      }

      this.queue.get(type)!.push({ item, resolve, reject });

      // Clear existing timer
      if (this.timers.has(type)) {
        clearTimeout(this.timers.get(type)!);
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.processBatch(type);
      }, this.batchDelay);

      this.timers.set(type, timer);

      // Process immediately if batch is full
      if (this.queue.get(type)!.length >= this.batchSize) {
        clearTimeout(timer);
        this.processBatch(type);
      }
    });
  }

  /**
   * Process a batch of items
   */
  private async processBatch(type: string) {
    const items = this.queue.get(type);
    if (!items || items.length === 0) return;

    this.queue.set(type, []);
    this.timers.delete(type);

    try {
      // Process all items in batch
      const results = await this.executeBatch(type, items.map(i => i.item));

      // Resolve all promises
      items.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      items.forEach(item => {
        item.reject(error);
      });
    }
  }

  /**
   * Execute batch operation
   */
  private async executeBatch(type: string, items: any[]): Promise<any[]> {
    // Implementation depends on operation type
    switch (type) {
      case 'load-status-update':
        return this.batchUpdateLoadStatus(items);
      case 'carrier-lookup':
        return this.batchCarrierLookup(items);
      default:
        return items;
    }
  }

  private async batchUpdateLoadStatus(items: any[]): Promise<any[]> {
    // Batch update implementation
    return items;
  }

  private async batchCarrierLookup(items: any[]): Promise<any[]> {
    // Batch lookup implementation
    return items;
  }
}

/**
 * Lazy loading utilities
 */
export const lazyLoad = {
  /**
   * Load component on demand
   */
  component: (loader: () => Promise<any>) => {
    return cache(async () => {
      const module = await loader();
      return module.default || module;
    });
  },

  /**
   * Load data on scroll
   */
  infiniteScroll: (
    loadMore: () => Promise<any[]>,
    options = { threshold: 0.8 }
  ) => {
    let loading = false;
    let hasMore = true;

    return {
      onScroll: async (event: any) => {
        const { scrollTop, scrollHeight, clientHeight } = event.target;
        const scrollRatio = (scrollTop + clientHeight) / scrollHeight;

        if (scrollRatio > options.threshold && !loading && hasMore) {
          loading = true;
          try {
            const newItems = await loadMore();
            hasMore = newItems.length > 0;
          } finally {
            loading = false;
          }
        }
      },
      hasMore
    };
  }
};

/**
 * Image optimization utilities
 */
export const imageOptimization = {
  /**
   * Generate optimized image URL
   */
  getOptimizedUrl: (url: string, width: number, quality = 75): string => {
    // Implementation depends on your image service
    return `${url}?w=${width}&q=${quality}`;
  },

  /**
   * Preload critical images
   */
  preloadImages: (urls: string[]) => {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }
};

/**
 * Request deduplication
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Export singleton instances
 */
export const performanceMonitor = PerformanceMonitor.getInstance();
export const batchProcessor = new BatchProcessor();

/**
 * Performance optimization middleware for Next.js
 */
export function withPerformanceTracking(handler: any) {
  return async (req: any, res: any) => {
    const endTimer = performanceMonitor.startTimer('apiResponse');

    try {
      // Set performance headers
      res.setHeader('X-Response-Time', '0');
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');

      // Execute handler
      const result = await handler(req, res);

      // Record response time
      const duration = endTimer();
      res.setHeader('X-Response-Time', `${Math.round(duration)}ms`);

      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  };
}