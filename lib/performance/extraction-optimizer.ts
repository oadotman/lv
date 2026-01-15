/**
 * Extraction Performance Optimizer
 * Ensures extraction completes within 60 seconds
 */

import { createClient } from '@supabase/supabase-js';

interface ExtractionMetrics {
  startTime: number;
  uploadTime?: number;
  transcriptionTime?: number;
  aiExtractionTime?: number;
  totalTime?: number;
  status: 'pending' | 'uploading' | 'transcribing' | 'extracting' | 'complete' | 'failed';
  progress: number;
}

export class ExtractionOptimizer {
  private metrics: Map<string, ExtractionMetrics> = new Map();
  private readonly TARGET_TIME = 60000; // 60 seconds
  private readonly TIMEOUT = 55000; // 55 seconds (5s buffer)

  /**
   * Start tracking an extraction
   */
  startExtraction(extractionId: string): ExtractionMetrics {
    const metrics: ExtractionMetrics = {
      startTime: Date.now(),
      status: 'pending',
      progress: 0,
    };

    this.metrics.set(extractionId, metrics);
    this.setExtractionTimeout(extractionId);

    return metrics;
  }

  /**
   * Update extraction progress
   */
  updateProgress(
    extractionId: string,
    status: ExtractionMetrics['status'],
    progress: number
  ): ExtractionMetrics | null {
    const metrics = this.metrics.get(extractionId);
    if (!metrics) return null;

    metrics.status = status;
    metrics.progress = Math.min(100, progress);

    // Track phase timings
    const now = Date.now();
    const elapsed = now - metrics.startTime;

    switch (status) {
      case 'uploading':
        metrics.uploadTime = elapsed;
        break;
      case 'transcribing':
        metrics.transcriptionTime = elapsed - (metrics.uploadTime || 0);
        break;
      case 'extracting':
        metrics.aiExtractionTime = elapsed - (metrics.uploadTime || 0) - (metrics.transcriptionTime || 0);
        break;
      case 'complete':
        metrics.totalTime = elapsed;
        break;
    }

    return metrics;
  }

  /**
   * Get current metrics for an extraction
   */
  getMetrics(extractionId: string): ExtractionMetrics | null {
    return this.metrics.get(extractionId) || null;
  }

  /**
   * Check if extraction is within target time
   */
  isWithinTarget(extractionId: string): boolean {
    const metrics = this.metrics.get(extractionId);
    if (!metrics) return false;

    const elapsed = Date.now() - metrics.startTime;
    return elapsed < this.TARGET_TIME;
  }

  /**
   * Set timeout for extraction
   */
  private setExtractionTimeout(extractionId: string): void {
    setTimeout(() => {
      const metrics = this.metrics.get(extractionId);
      if (metrics && metrics.status !== 'complete') {
        metrics.status = 'failed';
        metrics.totalTime = this.TIMEOUT;
        console.error(`[Performance] Extraction ${extractionId} timed out after ${this.TIMEOUT}ms`);
      }
    }, this.TIMEOUT);
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(extractionId: string): string[] {
    const metrics = this.metrics.get(extractionId);
    if (!metrics) return [];

    const recommendations: string[] = [];

    // Check upload time
    if (metrics.uploadTime && metrics.uploadTime > 5000) {
      recommendations.push('Consider compressing audio files before upload');
    }

    // Check transcription time
    if (metrics.transcriptionTime && metrics.transcriptionTime > 30000) {
      recommendations.push('Use AssemblyAI real-time transcription for faster results');
    }

    // Check AI extraction time
    if (metrics.aiExtractionTime && metrics.aiExtractionTime > 20000) {
      recommendations.push('Optimize AI prompts for faster processing');
    }

    // Check total time
    if (metrics.totalTime && metrics.totalTime > this.TARGET_TIME) {
      recommendations.push('Consider processing in background with progress notifications');
    }

    return recommendations;
  }

  /**
   * Clean up old metrics
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;

    for (const [id, metrics] of this.metrics.entries()) {
      if (metrics.startTime < oneHourAgo) {
        this.metrics.delete(id);
      }
    }
  }
}

/**
 * Optimize extraction prompts for speed
 */
export function optimizePrompt(prompt: string, maxTokens: number = 500): string {
  // Trim whitespace
  let optimized = prompt.trim();

  // Remove unnecessary instructions
  const unnecessaryPhrases = [
    'Please be very detailed',
    'Take your time',
    'Think step by step',
    'Be as thorough as possible',
  ];

  unnecessaryPhrases.forEach(phrase => {
    optimized = optimized.replace(new RegExp(phrase, 'gi'), '');
  });

  // Add speed-focused instructions
  if (!optimized.includes('concise')) {
    optimized = 'Be concise. ' + optimized;
  }

  return optimized;
}

/**
 * Parallel extraction processing
 */
export async function parallelExtraction(
  audioUrl: string,
  organizationId: string
): Promise<any> {
  const tasks = [];

  // Start transcription immediately
  const transcriptionTask = startTranscription(audioUrl);
  tasks.push(transcriptionTask);

  // Pre-warm AI model (optional)
  const aiWarmupTask = warmupAIModel();
  tasks.push(aiWarmupTask);

  // Wait for transcription
  const [transcription] = await Promise.all(tasks);

  // Now do AI extraction with warmed-up model
  const extraction = await performExtraction(transcription);

  return extraction;
}

/**
 * Start transcription with AssemblyAI
 */
async function startTranscription(audioUrl: string): Promise<string> {
  // Simulated - replace with actual AssemblyAI call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Transcribed text here...');
    }, 1000);
  });
}

/**
 * Warm up AI model
 */
async function warmupAIModel(): Promise<void> {
  // Send a dummy request to warm up the model
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
}

/**
 * Perform AI extraction
 */
async function performExtraction(transcription: string): Promise<any> {
  // Simulated - replace with actual OpenAI call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        origin: 'Chicago, IL',
        destination: 'Nashville, TN',
        commodity: 'Steel coils',
        weight: 42000,
        rate: 2500,
      });
    }, 1000);
  });
}

/**
 * Cache frequently used data
 */
export class ExtractionCache {
  private cache: Map<string, any> = new Map();
  private readonly TTL = 300000; // 5 minutes

  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.TTL,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor() {
  const monitor = (operation: string, fn: Function) => {
    return async (...args: any[]) => {
      const start = performance.now();

      try {
        const result = await fn(...args);
        const duration = performance.now() - start;

        // Log slow operations
        if (duration > 1000) {
          console.warn(`[Performance] ${operation} took ${duration.toFixed(2)}ms`);
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(`[Performance] ${operation} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
  };

  return { monitor };
}

// Export singleton instance
export const extractionOptimizer = new ExtractionOptimizer();
export const extractionCache = new ExtractionCache();