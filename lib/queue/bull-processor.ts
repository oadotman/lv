import Bull, { Queue, Job, JobOptions, JobStatus } from 'bull';
import { getDefaultRedisClient, getSubscriberRedisClient } from './redis-config';
import { createClient } from '@supabase/supabase-js';
import { submitTranscriptionJob, getTranscriptionStatus } from '../assemblyai';
import { extractFreightData } from '../openai-loadvoice';
import { alertTranscriptionFailed } from '../monitoring/alert-service';

/**
 * Production-ready Bull Queue implementation for call processing
 * Replaces the in-memory queue with persistent, scalable job processing
 */

// Job data types
export interface CallProcessingJobData {
  callId: string;
  organizationId: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  durationMinutes?: number;
  languageCode?: string;
  speakerLabels?: boolean;
  autoHighlights?: boolean;
  contentSafety?: boolean;
  iabCategories?: boolean;
  sentimentAnalysis?: boolean;
  entityDetection?: boolean;
  attempt?: number;
}

export interface JobResult {
  success: boolean;
  transcriptId?: string;
  error?: string;
  processedAt: Date;
}

// Queue configuration
const QUEUE_CONFIG = {
  name: 'call-processing',
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
  maxStalledCount: 3,
  stalledInterval: 60000, // 1 minute
};

// Job options with exponential backoff
const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 30000, // Start with 30 seconds
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
};

// Priority levels
export enum JobPriority {
  LOW = 10,
  NORMAL = 0,
  HIGH = -5,
  CRITICAL = -10,
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Bull queue instance
let processingQueue: Queue<CallProcessingJobData> | null = null;

/**
 * Initialize the Bull queue with Redis connection
 */
export const initializeQueue = async (): Promise<Queue<CallProcessingJobData>> => {
  if (processingQueue) {
    return processingQueue;
  }

  console.log('[Bull] Initializing call processing queue...');

  // Create Bull queue with Redis clients
  processingQueue = new Bull<CallProcessingJobData>(
    QUEUE_CONFIG.name,
    {
      createClient: (type) => {
        switch (type) {
          case 'client':
            return getDefaultRedisClient();
          case 'subscriber':
            return getSubscriberRedisClient();
          case 'bclient':
            return getDefaultRedisClient();
          default:
            return getDefaultRedisClient();
        }
      },
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }
  );

  // Queue event handlers
  processingQueue.on('error', (error) => {
    console.error('[Bull] Queue error:', error);
  });

  processingQueue.on('waiting', (jobId) => {
    console.log(`[Bull] Job ${jobId} is waiting`);
  });

  processingQueue.on('active', (job) => {
    console.log(`[Bull] Job ${job.id} started processing`);
  });

  processingQueue.on('completed', (job, result) => {
    console.log(`[Bull] Job ${job.id} completed:`, result);
  });

  processingQueue.on('failed', (job, error) => {
    console.error(`[Bull] Job ${job.id} failed:`, error.message);
  });

  processingQueue.on('stalled', (job) => {
    console.warn(`[Bull] Job ${job.id} stalled and will be retried`);
  });

  // Start processing jobs
  processingQueue.process(QUEUE_CONFIG.concurrency, processCallJob);

  console.log('[Bull] Queue initialized successfully');
  return processingQueue;
};

/**
 * Add a call to the processing queue
 */
export const addCallToQueue = async (
  data: CallProcessingJobData,
  options?: {
    priority?: JobPriority;
    delay?: number;
  }
): Promise<Job<CallProcessingJobData>> => {
  const queue = await initializeQueue();

  const jobOptions: JobOptions = {
    ...DEFAULT_JOB_OPTIONS,
    priority: options?.priority || JobPriority.NORMAL,
    delay: options?.delay || 0,
  };

  const job = await queue.add(data, jobOptions);

  console.log(`[Bull] Added job ${job.id} for call ${data.callId}`);

  // Update call status to queued
  await supabase
    .from('calls')
    .update({
      status: 'queued',
      queued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.callId);

  return job;
};

/**
 * Process a call job
 */
async function processCallJob(job: Job<CallProcessingJobData>): Promise<JobResult> {
  const { callId, organizationId, userId, fileUrl, languageCode } = job.data;
  const startTime = Date.now();

  try {
    console.log(`[Bull] Processing call ${callId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

    // Update job progress
    await job.progress(10);

    // Step 1: Update status to processing
    await supabase
      .from('calls')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    await job.progress(20);

    // Step 2: Submit to AssemblyAI with webhook callback
    console.log(`[Bull] Submitting call ${callId} to AssemblyAI...`);

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/assemblyai`;
    const transcriptionResult = await submitTranscriptionJob({
      audioUrl: fileUrl,
      speakersExpected: job.data.speakerLabels ? 2 : undefined,
      webhookUrl: webhookUrl,
    });
    const transcriptId = transcriptionResult.id;

    await job.progress(40);

    // Step 3: Store transcript ID and update status
    await supabase
      .from('calls')
      .update({
        transcript_id: transcriptId,
        status: 'transcribing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    await job.progress(50);

    // Step 4: Poll for completion with timeout (webhook is primary, this is backup)
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes max
    const pollInterval = 15000; // Check every 15 seconds
    const endTime = Date.now() + maxWaitTime;

    while (Date.now() < endTime) {
      const transcript = await getTranscriptionStatus(transcriptId);

      if (transcript.status === 'completed') {
        await job.progress(70);

        // Step 5: Store transcript
        await supabase
          .from('transcripts')
          .upsert({
            id: transcriptId,
            call_id: callId,
            content: transcript.text,
            words: transcript.words || [],
            utterances: transcript.utterances || [],
            audio_duration: transcript.audio_duration,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        await job.progress(80);

        // Step 6: Extract fields using OpenAI
        if (transcript.text) {
          console.log(`[Bull] Extracting fields for call ${callId}...`);

          try {
            const extractedData = await extractFreightData(
              transcript.text
            );

            // Store extracted fields
            if (extractedData) {
              await supabase
                .from('call_fields')
                .upsert({
                  call_id: callId,
                  ...extractedData,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
            }

            await job.progress(90);
          } catch (extractError) {
            console.error(`[Bull] Field extraction failed for call ${callId}:`, extractError);
            // Continue processing even if extraction fails
          }
        }

        // Step 7: Update final status
        await supabase
          .from('calls')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', callId);

        await job.progress(100);

        // Send completion notification
        // Note: alertProcessingComplete is not available in alert-service
        // Could add notification logic here if needed

        return {
          success: true,
          transcriptId,
          processedAt: new Date(),
        };
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      // Update job progress
      const progressPercent = 50 + Math.floor((Date.now() - startTime) / maxWaitTime * 20);
      await job.progress(Math.min(progressPercent, 69));
    }

    // Timeout reached
    throw new Error('Transcription timeout - webhook may process it later');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Bull] Job failed for call ${callId}:`, errorMessage);

    // Update call status to failed
    await supabase
      .from('calls')
      .update({
        status: 'failed',
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    // Send failure alert on final attempt
    if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
      await alertTranscriptionFailed(callId, userId, errorMessage);
    }

    throw error; // Re-throw to trigger Bull's retry mechanism
  }
}

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  const queue = await initializeQueue();

  const [
    waitingCount,
    activeCount,
    completedCount,
    failedCount,
    delayedCount,
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting: waitingCount,
    active: activeCount,
    completed: completedCount,
    failed: failedCount,
    delayed: delayedCount,
    total: waitingCount + activeCount + delayedCount,
  };
};

/**
 * Get job by ID
 */
export const getJob = async (jobId: string): Promise<Job<CallProcessingJobData> | null> => {
  const queue = await initializeQueue();
  return queue.getJob(jobId);
};

/**
 * Retry a failed job
 */
export const retryJob = async (jobId: string): Promise<void> => {
  const job = await getJob(jobId);
  if (job) {
    await job.retry();
    console.log(`[Bull] Retrying job ${jobId}`);
  }
};

/**
 * Remove a job from the queue
 */
export const removeJob = async (jobId: string): Promise<void> => {
  const job = await getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`[Bull] Removed job ${jobId}`);
  }
};

/**
 * Pause the queue
 */
export const pauseQueue = async (): Promise<void> => {
  const queue = await initializeQueue();
  await queue.pause();
  console.log('[Bull] Queue paused');
};

/**
 * Resume the queue
 */
export const resumeQueue = async (): Promise<void> => {
  const queue = await initializeQueue();
  await queue.resume();
  console.log('[Bull] Queue resumed');
};

/**
 * Clean old jobs from the queue
 */
export const cleanQueue = async (
  grace: number = 3600000, // 1 hour default
  status: 'completed' | 'wait' | 'active' | 'delayed' | 'failed' = 'completed'
): Promise<Job<CallProcessingJobData>[]> => {
  const queue = await initializeQueue();
  const removed = await queue.clean(grace, status);
  console.log(`[Bull] Cleaned ${removed.length} old jobs`);
  return removed;
};

/**
 * Gracefully shut down the queue
 */
export const shutdownQueue = async (): Promise<void> => {
  if (!processingQueue) {
    return;
  }

  console.log('[Bull] Shutting down queue...');

  // Stop accepting new jobs
  await processingQueue.pause();

  // Wait for active jobs to complete (max 30 seconds)
  const maxWait = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const activeCount = await processingQueue.getActiveCount();
    if (activeCount === 0) {
      break;
    }
    console.log(`[Bull] Waiting for ${activeCount} active jobs to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close the queue
  await processingQueue.close();
  processingQueue = null;

  console.log('[Bull] Queue shut down complete');
};

/**
 * Get the processing queue instance
 */
export const getCallProcessingQueue = async (): Promise<Queue<CallProcessingJobData>> => {
  return initializeQueue();
};

// Export types
export type { Queue, Job, JobOptions, JobStatus };