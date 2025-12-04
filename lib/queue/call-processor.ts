// =====================================================
// CALL PROCESSING QUEUE WITH RETRY LOGIC
// Manages call processing with retries and failure recovery
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

interface ProcessingJob {
  callId: string;
  attempt: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: Date;
}

// In-memory queue (in production, use Redis/Bull/BullMQ)
const processingQueue = new Map<string, ProcessingJob>();
const activeJobs = new Set<string>();

// Configuration
const CONFIG = {
  MAX_ATTEMPTS: 3,
  MAX_CONCURRENT: 5, // Limit concurrent processing
  RETRY_DELAYS: [
    30 * 1000,    // 30 seconds after first failure
    2 * 60 * 1000,  // 2 minutes after second failure
    5 * 60 * 1000,  // 5 minutes after third failure
  ],
  PROCESS_TIMEOUT: 5 * 60 * 1000, // 5 minutes max per processing
  CLEANUP_INTERVAL: 60 * 1000, // Check for stuck jobs every minute
};

// Singleton queue manager
class CallProcessorQueue {
  private static instance: CallProcessorQueue;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup timer
    this.startCleanupTimer();
  }

  public static getInstance(): CallProcessorQueue {
    if (!CallProcessorQueue.instance) {
      CallProcessorQueue.instance = new CallProcessorQueue();
    }
    return CallProcessorQueue.instance;
  }

  /**
   * Add a call to the processing queue
   */
  public async enqueue(callId: string): Promise<void> {
    console.log(`[Queue] Enqueueing call ${callId}`);

    // Check if already in queue
    if (processingQueue.has(callId) || activeJobs.has(callId)) {
      console.log(`[Queue] Call ${callId} already in queue or processing`);
      return;
    }

    // Create job
    const job: ProcessingJob = {
      callId,
      attempt: 0,
      maxAttempts: CONFIG.MAX_ATTEMPTS,
    };

    processingQueue.set(callId, job);

    // Try to process immediately
    await this.processNext();
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    // Check concurrent limit
    if (activeJobs.size >= CONFIG.MAX_CONCURRENT) {
      console.log(`[Queue] Max concurrent jobs (${CONFIG.MAX_CONCURRENT}) reached`);
      return;
    }

    // Find next job to process
    const now = new Date();
    let nextJob: ProcessingJob | null = null;

    for (const [callId, job] of processingQueue.entries()) {
      // Skip if retry time hasn't come
      if (job.nextRetryAt && job.nextRetryAt > now) {
        continue;
      }

      nextJob = job;
      break;
    }

    if (!nextJob) {
      return; // No jobs ready to process
    }

    // Move to active
    processingQueue.delete(nextJob.callId);
    activeJobs.add(nextJob.callId);

    // Process the job
    try {
      await this.processCall(nextJob);
    } finally {
      activeJobs.delete(nextJob.callId);

      // Try to process next job
      setTimeout(() => this.processNext(), 100);
    }
  }

  /**
   * Process a single call with timeout
   */
  private async processCall(job: ProcessingJob): Promise<void> {
    job.attempt++;
    console.log(`[Queue] Processing call ${job.callId} (attempt ${job.attempt}/${job.maxAttempts})`);

    const supabase = createAdminClient();

    try {
      // Update status to processing
      await supabase
        .from('calls')
        .update({
          status: 'processing',
          processing_progress: 0,
          processing_message: `Processing (attempt ${job.attempt})...`,
          processing_attempts: job.attempt,
        })
        .eq('id', job.callId);

      // Call the processing endpoint with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.PROCESS_TIMEOUT);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${job.callId}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-processing': 'true',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Processing failed: ${response.status} - ${error}`);
      }

      console.log(`[Queue] ✅ Successfully processed call ${job.callId}`);

    } catch (error: any) {
      console.error(`[Queue] ❌ Error processing call ${job.callId}:`, error);

      // Check if should retry
      if (job.attempt < job.maxAttempts) {
        // Calculate next retry time with exponential backoff
        const delayMs = CONFIG.RETRY_DELAYS[job.attempt - 1] || CONFIG.RETRY_DELAYS[CONFIG.RETRY_DELAYS.length - 1];
        job.nextRetryAt = new Date(Date.now() + delayMs);
        job.lastError = error.message;

        console.log(`[Queue] Will retry call ${job.callId} at ${job.nextRetryAt.toISOString()}`);

        // Put back in queue
        processingQueue.set(job.callId, job);

        // Update database with retry info
        await supabase
          .from('calls')
          .update({
            status: 'processing',
            processing_message: `Retry scheduled (attempt ${job.attempt}/${job.maxAttempts})`,
            processing_error: error.message,
          })
          .eq('id', job.callId);

      } else {
        // Max attempts reached, mark as failed
        console.error(`[Queue] Call ${job.callId} failed after ${job.maxAttempts} attempts`);

        await supabase
          .from('calls')
          .update({
            status: 'failed',
            processing_message: `Failed after ${job.maxAttempts} attempts`,
            processing_error: error.message,
            assemblyai_error: `Processing failed: ${error.message}`,
          })
          .eq('id', job.callId);

        // Send notification
        const { data: call } = await supabase
          .from('calls')
          .select('user_id, customer_name')
          .eq('id', job.callId)
          .single();

        if (call) {
          await supabase.from('notifications').insert({
            user_id: call.user_id,
            notification_type: 'call_failed',
            title: 'Call processing failed',
            message: `Processing failed for call with ${call.customer_name || 'customer'} after multiple attempts.`,
            link: `/calls/${job.callId}`,
          });
        }
      }
    }
  }

  /**
   * Start cleanup timer to recover stuck jobs
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.recoverStuckJobs();
    }, CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Recover jobs that are stuck in processing
   */
  private async recoverStuckJobs(): Promise<void> {
    const supabase = createAdminClient();

    // Find calls stuck in processing for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const { data: stuckCalls } = await supabase
      .from('calls')
      .select('id')
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo.toISOString())
      .limit(10);

    if (stuckCalls && stuckCalls.length > 0) {
      console.log(`[Queue] Found ${stuckCalls.length} stuck calls, recovering...`);

      for (const call of stuckCalls) {
        // Check if not already in queue
        if (!processingQueue.has(call.id) && !activeJobs.has(call.id)) {
          console.log(`[Queue] Recovering stuck call ${call.id}`);
          await this.enqueue(call.id);
        }
      }
    }

    // Process any pending jobs
    await this.processNext();
  }

  /**
   * Get queue status
   */
  public getStatus(): {
    queued: number;
    active: number;
    details: Array<{ callId: string; attempt: number; nextRetryAt?: Date }>;
  } {
    const details: Array<{ callId: string; attempt: number; nextRetryAt?: Date }> = [];

    for (const [callId, job] of processingQueue.entries()) {
      details.push({
        callId,
        attempt: job.attempt,
        nextRetryAt: job.nextRetryAt,
      });
    }

    return {
      queued: processingQueue.size,
      active: activeJobs.size,
      details,
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const callProcessor = CallProcessorQueue.getInstance();

// Export function to enqueue calls
export async function enqueueCallProcessing(callId: string): Promise<void> {
  return callProcessor.enqueue(callId);
}

// Export function to get queue status
export function getQueueStatus() {
  return callProcessor.getStatus();
}