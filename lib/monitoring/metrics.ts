// =====================================================
// METRICS AND MONITORING
// Application performance and business metrics tracking
// =====================================================

import { logger } from '@/lib/logging/app-logger';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MetricAggregation {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private aggregations: Map<string, MetricAggregation> = new Map();

  /**
   * Record a metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);
    this.updateAggregation(name, value);

    // Send to monitoring service if configured
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      this.sendToPostHog(metric);
    }

    // Log performance metrics
    if (name.includes('duration') || name.includes('latency')) {
      logger.performance(name, value, 'ms');
    }
  }

  /**
   * Update aggregation for a metric
   */
  private updateAggregation(name: string, value: number): void {
    const agg = this.aggregations.get(name) || {
      count: 0,
      sum: 0,
      min: value,
      max: value,
      avg: 0,
    };

    agg.count++;
    agg.sum += value;
    agg.min = Math.min(agg.min, value);
    agg.max = Math.max(agg.max, value);
    agg.avg = agg.sum / agg.count;

    this.aggregations.set(name, agg);
  }

  /**
   * Send metric to PostHog
   */
  private async sendToPostHog(metric: Metric): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const posthog = await import('posthog-js');
        posthog.default.capture(metric.name, {
          value: metric.value,
          ...metric.tags,
        });
      }
    } catch (error) {
      logger.error('Failed to send metric to PostHog', error as Error, 'Metrics');
    }
  }

  /**
   * Get aggregated metrics
   */
  getAggregation(name: string): MetricAggregation | undefined {
    return this.aggregations.get(name);
  }

  /**
   * Get all metrics
   */
  getAll(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics older than specified time
   */
  cleanup(olderThanMs: number = 3600000): void {
    const cutoff = Date.now() - olderThanMs;
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Cleanup old metrics every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    metrics.cleanup();
  }, 3600000);
}

/**
 * Track API request duration
 */
export function trackApiDuration(
  method: string,
  path: string,
  duration: number,
  statusCode: number
): void {
  metrics.record('api.request.duration', duration, {
    method,
    path,
    status: String(statusCode),
  });

  if (statusCode >= 500) {
    metrics.record('api.request.error', 1, {
      method,
      path,
      status: String(statusCode),
    });
  }
}

/**
 * Track database query duration
 */
export function trackDbQuery(
  operation: string,
  table: string,
  duration: number,
  success: boolean
): void {
  metrics.record('db.query.duration', duration, {
    operation,
    table,
    success: String(success),
  });

  if (!success) {
    metrics.record('db.query.error', 1, {
      operation,
      table,
    });
  }
}

/**
 * Track external API call
 */
export function trackExternalApi(
  service: string,
  operation: string,
  duration: number,
  success: boolean
): void {
  metrics.record('external.api.duration', duration, {
    service,
    operation,
    success: String(success),
  });

  if (!success) {
    metrics.record('external.api.error', 1, {
      service,
      operation,
    });
  }
}

/**
 * Track business metrics
 */
export const businessMetrics = {
  /**
   * Track call upload
   */
  callUploaded(userId: string, fileSize: number, duration: number): void {
    metrics.record('business.call.uploaded', 1, { userId });
    metrics.record('business.call.upload.size', fileSize, { userId });
    metrics.record('business.call.upload.duration', duration, { userId });
  },

  /**
   * Track transcription completed
   */
  transcriptionCompleted(userId: string, duration: number, wordCount: number): void {
    metrics.record('business.transcription.completed', 1, { userId });
    metrics.record('business.transcription.duration', duration, { userId });
    metrics.record('business.transcription.words', wordCount, { userId });
  },

  /**
   * Track extraction completed
   */
  extractionCompleted(userId: string, duration: number, fieldCount: number): void {
    metrics.record('business.extraction.completed', 1, { userId });
    metrics.record('business.extraction.duration', duration, { userId });
    metrics.record('business.extraction.fields', fieldCount, { userId });
  },

  /**
   * Track data export
   */
  dataExported(userId: string, format: string, recordCount: number): void {
    metrics.record('business.data.exported', 1, { userId, format });
    metrics.record('business.data.export.records', recordCount, { userId, format });
  },

  /**
   * Track user signup
   */
  userSignup(userId: string): void {
    metrics.record('business.user.signup', 1, { userId });
  },

  /**
   * Track user login
   */
  userLogin(userId: string): void {
    metrics.record('business.user.login', 1, { userId });
  },

  /**
   * Track subscription created
   */
  subscriptionCreated(userId: string, plan: string): void {
    metrics.record('business.subscription.created', 1, { userId, plan });
  },

  /**
   * Track subscription cancelled
   */
  subscriptionCancelled(userId: string, plan: string, reason?: string): void {
    metrics.record('business.subscription.cancelled', 1, {
      userId,
      plan,
      reason: reason || 'unknown',
    });
  },
};

/**
 * Generate metrics report
 */
export function generateMetricsReport(): Record<string, MetricAggregation> {
  const report: Record<string, MetricAggregation> = {};

  for (const [name, agg] of metrics['aggregations'].entries()) {
    report[name] = { ...agg };
  }

  return report;
}

/**
 * Export metrics for external monitoring
 */
export function exportMetrics(): Metric[] {
  return metrics.getAll();
}
