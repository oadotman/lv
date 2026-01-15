/**
 * Performance Monitoring System for LoadVoice
 * Tracks and reports on key performance metrics
 */

import { createClient } from '@supabase/supabase-js';

export interface PerformanceMetric {
  id: string;
  metric_type: 'extraction' | 'api_call' | 'page_load' | 'database_query';
  operation: string;
  duration_ms: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  user_id?: string;
  organization_id?: string;
}

export interface PerformanceThresholds {
  extraction: number;  // 60000ms (60 seconds)
  api_call: number;    // 5000ms (5 seconds)
  page_load: number;   // 3000ms (3 seconds)
  database_query: number; // 1000ms (1 second)
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds = {
    extraction: 60000,
    api_call: 5000,
    page_load: 3000,
    database_query: 1000,
  };

  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private supabase?: ReturnType<typeof createClient>) {
    this.startAutoFlush();
  }

  /**
   * Start a performance measurement
   */
  startMeasurement(operation: string, metadata?: Record<string, any>) {
    const id = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    return {
      id,
      end: (success = true, error?: string) => {
        const duration = performance.now() - startTime;
        const type = this.inferMetricType(operation);

        this.recordMetric({
          id,
          metric_type: type,
          operation,
          duration_ms: Math.round(duration),
          success,
          error_message: error,
          metadata,
          timestamp: new Date(),
        });

        // Check if threshold exceeded
        if (duration > this.thresholds[type]) {
          this.handleSlowOperation(type, operation, duration);
        }

        return duration;
      },
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Auto-flush if batch size reached
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = metric.success ? '✓' : '✗';
      const color = metric.duration_ms > this.thresholds[metric.metric_type] ? '🔴' : '🟢';
      console.log(
        `${color} ${emoji} [${metric.metric_type}] ${metric.operation}: ${metric.duration_ms}ms`
      );
    }
  }

  /**
   * Infer metric type from operation name
   */
  private inferMetricType(operation: string): PerformanceMetric['metric_type'] {
    if (operation.includes('extract') || operation.includes('transcribe')) {
      return 'extraction';
    }
    if (operation.includes('api/') || operation.includes('fetch')) {
      return 'api_call';
    }
    if (operation.includes('page') || operation.includes('route')) {
      return 'page_load';
    }
    return 'database_query';
  }

  /**
   * Handle slow operations
   */
  private handleSlowOperation(
    type: PerformanceMetric['metric_type'],
    operation: string,
    duration: number
  ) {
    console.warn(
      `⚠️ Slow ${type}: ${operation} took ${duration.toFixed(0)}ms (threshold: ${this.thresholds[type]}ms)`
    );

    // Could send alerts, trigger optimizations, etc.
    if (type === 'extraction' && duration > 90000) {
      console.error('🚨 Critical: Extraction exceeded 90 seconds!');
    }
  }

  /**
   * Get performance summary
   */
  getSummary(since?: Date): {
    totalOperations: number;
    successRate: number;
    averageDuration: Record<PerformanceMetric['metric_type'], number>;
    slowOperations: PerformanceMetric[];
    errors: PerformanceMetric[];
  } {
    const relevantMetrics = since
      ? this.metrics.filter(m => m.timestamp >= since)
      : this.metrics;

    const successful = relevantMetrics.filter(m => m.success);
    const slow = relevantMetrics.filter(
      m => m.duration_ms > this.thresholds[m.metric_type]
    );
    const errors = relevantMetrics.filter(m => !m.success);

    // Calculate averages by type
    const averages = {} as Record<PerformanceMetric['metric_type'], number>;
    const types: PerformanceMetric['metric_type'][] = [
      'extraction',
      'api_call',
      'page_load',
      'database_query',
    ];

    types.forEach(type => {
      const typeMetrics = relevantMetrics.filter(m => m.metric_type === type);
      if (typeMetrics.length > 0) {
        const total = typeMetrics.reduce((sum, m) => sum + m.duration_ms, 0);
        averages[type] = Math.round(total / typeMetrics.length);
      } else {
        averages[type] = 0;
      }
    });

    return {
      totalOperations: relevantMetrics.length,
      successRate: relevantMetrics.length > 0
        ? (successful.length / relevantMetrics.length) * 100
        : 100,
      averageDuration: averages,
      slowOperations: slow.slice(-10), // Last 10 slow operations
      errors: errors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      if (this.metrics.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Flush metrics to database
   */
  async flush() {
    if (this.metrics.length === 0) return;

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('performance_metrics')
          .insert(metricsToFlush as any);

        if (error) {
          console.error('Failed to flush performance metrics:', error);
          // Re-add metrics to queue
          this.metrics.unshift(...metricsToFlush);
        }
      } catch (error) {
        console.error('Error flushing metrics:', error);
        // Re-add metrics to queue
        this.metrics.unshift(...metricsToFlush);
      }
    } else {
      // If no Supabase, just log summary
      console.log('Performance metrics flushed:', metricsToFlush.length, 'items');
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /**
   * Get real-time dashboard metrics
   */
  getDashboardMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const summary = this.getSummary(oneHourAgo);

    return {
      health: {
        status: summary.successRate >= 95 ? 'healthy' : summary.successRate >= 80 ? 'degraded' : 'unhealthy',
        successRate: summary.successRate.toFixed(1),
        totalOperations: summary.totalOperations,
      },
      performance: {
        extraction: {
          avg: summary.averageDuration.extraction,
          status: summary.averageDuration.extraction <= this.thresholds.extraction ? 'good' : 'slow',
        },
        api: {
          avg: summary.averageDuration.api_call,
          status: summary.averageDuration.api_call <= this.thresholds.api_call ? 'good' : 'slow',
        },
        pageLoad: {
          avg: summary.averageDuration.page_load,
          status: summary.averageDuration.page_load <= this.thresholds.page_load ? 'good' : 'slow',
        },
        database: {
          avg: summary.averageDuration.database_query,
          status: summary.averageDuration.database_query <= this.thresholds.database_query ? 'good' : 'slow',
        },
      },
      issues: [
        ...summary.slowOperations.map(op => ({
          type: 'performance' as const,
          message: `Slow ${op.metric_type}: ${op.operation} (${op.duration_ms}ms)`,
          timestamp: op.timestamp,
        })),
        ...summary.errors.map(err => ({
          type: 'error' as const,
          message: `Failed ${err.metric_type}: ${err.operation} - ${err.error_message}`,
          timestamp: err.timestamp,
        })),
      ],
    };
  }
}

/**
 * Performance monitoring React hook
 */
export function usePerformanceTracking() {
  const track = (operation: string, fn: () => Promise<any>) => {
    return async () => {
      const measurement = performanceMonitor.startMeasurement(operation);

      try {
        const result = await fn();
        measurement.end(true);
        return result;
      } catch (error) {
        measurement.end(false, error?.toString());
        throw error;
      }
    };
  };

  const trackSync = (operation: string, fn: () => any) => {
    return () => {
      const measurement = performanceMonitor.startMeasurement(operation);

      try {
        const result = fn();
        measurement.end(true);
        return result;
      } catch (error) {
        measurement.end(false, error?.toString());
        throw error;
      }
    };
  };

  return { track, trackSync };
}

/**
 * Web Vitals tracking
 */
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        performanceMonitor.startMeasurement('page_load_fcp', {
          url: window.location.pathname,
        }).end(true);
      }
    }
  });
  paintObserver.observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    performanceMonitor.startMeasurement('page_load_lcp', {
      url: window.location.pathname,
      value: lastEntry.startTime,
    }).end(true);
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const measurement = performanceMonitor.startMeasurement('interaction_fid', {
        url: window.location.pathname,
        value: (entry as any).processingStart - entry.startTime,
      });
      measurement.end(true);
    }
  });
  fidObserver.observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let cls = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        cls += (entry as any).value;
      }
    }
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });

  // Report CLS on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.startMeasurement('page_stability_cls', {
      url: window.location.pathname,
      value: cls,
    }).end(true);
  });
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();