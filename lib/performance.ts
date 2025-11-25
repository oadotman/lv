// =====================================================
// PERFORMANCE MONITORING UTILITIES
// Track and log performance metrics
// =====================================================

import { analytics } from './analytics';
import * as Sentry from '@sentry/nextjs';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  fast: 1000,      // < 1s is fast
  acceptable: 3000, // < 3s is acceptable
  slow: 5000,       // < 5s is slow
  critical: 10000,  // > 10s is critical
};

interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * Measure performance of an async function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  options?: {
    logToConsole?: boolean;
    sendToAnalytics?: boolean;
    sendToSentry?: boolean;
  }
): Promise<T> {
  const {
    logToConsole = true,
    sendToAnalytics = true,
    sendToSentry = false,
  } = options || {};

  const startTime = performance.now();

  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log metric
    const metric: PerformanceMetric = {
      name,
      duration,
      startTime,
      endTime,
    };

    handlePerformanceMetric(metric, {
      logToConsole,
      sendToAnalytics,
      sendToSentry,
    });

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log failed operation
    if (logToConsole) {
      console.error(`Operation failed: ${name} (${duration.toFixed(2)}ms)`, error);
    }

    if (sendToSentry) {
      Sentry.captureException(error, {
        tags: {
          operation: name,
          duration: Math.round(duration),
        },
      });
    }

    throw error;
  }
}

/**
 * Measure performance of a sync function
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  options?: {
    logToConsole?: boolean;
    sendToAnalytics?: boolean;
  }
): T {
  const {
    logToConsole = true,
    sendToAnalytics = true,
  } = options || {};

  const startTime = performance.now();

  try {
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      name,
      duration,
      startTime,
      endTime,
    };

    handlePerformanceMetric(metric, {
      logToConsole,
      sendToAnalytics,
      sendToSentry: false,
    });

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (logToConsole) {
      console.error(`Operation failed: ${name} (${duration.toFixed(2)}ms)`, error);
    }

    throw error;
  }
}

/**
 * Handle performance metric logging and reporting
 */
function handlePerformanceMetric(
  metric: PerformanceMetric,
  options: {
    logToConsole: boolean;
    sendToAnalytics: boolean;
    sendToSentry: boolean;
  }
) {
  const { name, duration } = metric;
  const status = getPerformanceStatus(duration);

  // Console logging
  if (options.logToConsole) {
    const color = status === 'fast' ? '🟢' : status === 'acceptable' ? '🟡' : '🔴';
    console.log(`${color} ${name}: ${duration.toFixed(2)}ms (${status})`);
  }

  // Send to analytics
  if (options.sendToAnalytics && typeof window !== 'undefined') {
    analytics.performanceMetric({
      metric: name,
      value: Math.round(duration),
      unit: 'ms',
    });
  }

  // Send to Sentry if slow
  if (options.sendToSentry && (status === 'slow' || status === 'critical')) {
    Sentry.captureMessage(`Slow operation: ${name}`, {
      level: status === 'critical' ? 'error' : 'warning',
      tags: {
        operation: name,
        duration: Math.round(duration),
        status,
      },
    });
  }
}

/**
 * Get performance status based on duration
 */
function getPerformanceStatus(duration: number): 'fast' | 'acceptable' | 'slow' | 'critical' {
  if (duration < THRESHOLDS.fast) return 'fast';
  if (duration < THRESHOLDS.acceptable) return 'acceptable';
  if (duration < THRESHOLDS.slow) return 'slow';
  return 'critical';
}

/**
 * Create a performance timer for manual timing
 */
export function createTimer(name: string) {
  const startTime = performance.now();

  return {
    stop: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        duration,
        startTime,
        endTime,
      };

      handlePerformanceMetric(metric, {
        logToConsole: true,
        sendToAnalytics: true,
        sendToSentry: false,
      });

      return duration;
    },

    lap: (lapName?: string) => {
      const lapTime = performance.now();
      const duration = lapTime - startTime;

      console.log(`⏱️ ${name}${lapName ? ` - ${lapName}` : ''}: ${duration.toFixed(2)}ms`);

      return duration;
    },
  };
}

/**
 * Measure Web Vitals (CLS, FID, LCP, FCP, TTFB)
 */
export function reportWebVitals(metric: any) {
  const { name, value, id } = metric;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Web Vital - ${name}:`, value);
  }

  // Send to analytics
  if (typeof window !== 'undefined') {
    analytics.performanceMetric({
      metric: `web_vital_${name.toLowerCase()}`,
      value: Math.round(value),
      unit: 'ms',
    });
  }

  // Send to Sentry
  Sentry.captureMessage(`Web Vital: ${name}`, {
    level: 'info',
    tags: {
      web_vital: name,
      value: Math.round(value),
      id,
    },
  });
}

/**
 * Helper: Measure API request performance
 */
export async function measureApiRequest<T>(
  url: string,
  requestFn: () => Promise<T>
): Promise<T> {
  return measurePerformance(
    `API: ${url}`,
    requestFn,
    {
      logToConsole: process.env.NODE_ENV === 'development',
      sendToAnalytics: true,
      sendToSentry: true,
    }
  );
}

/**
 * Helper: Measure database query performance
 */
export async function measureDbQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return measurePerformance(
    `DB: ${queryName}`,
    queryFn,
    {
      logToConsole: process.env.NODE_ENV === 'development',
      sendToAnalytics: true,
      sendToSentry: true,
    }
  );
}

/**
 * Helper: Measure file upload performance
 */
export async function measureFileUpload<T>(
  fileName: string,
  uploadFn: () => Promise<T>
): Promise<T> {
  return measurePerformance(
    `Upload: ${fileName}`,
    uploadFn,
    {
      logToConsole: true,
      sendToAnalytics: true,
      sendToSentry: false,
    }
  );
}
