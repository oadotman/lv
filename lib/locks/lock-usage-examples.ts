// =====================================================
// DISTRIBUTED LOCK USAGE EXAMPLES
// Shows how to use Redis locks in production scenarios
// =====================================================

import { withLock, acquireLock, releaseLock, LOCK_TTL } from './redis-lock';
import { createClient } from '@/lib/supabase/server';

/**
 * Example 1: Prevent concurrent call processing
 */
export async function processCallWithLock(callId: string) {
  const lockResource = `call:process:${callId}`;

  // Execute with automatic lock management
  const result = await withLock(
    lockResource,
    async () => {
      const supabase = createClient();

      // Check if already processing
      const { data: call } = await supabase
        .from('calls')
        .select('status')
        .eq('id', callId)
        .single();

      if (call?.status === 'processing') {
        throw new Error('Call is already being processed');
      }

      // Update status
      await supabase
        .from('calls')
        .update({ status: 'processing' })
        .eq('id', callId);

      // Do the actual processing...
      console.log(`Processing call ${callId}...`);

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Update status when done
      await supabase
        .from('calls')
        .update({ status: 'completed' })
        .eq('id', callId);

      return { success: true, callId };
    },
    { ttl: LOCK_TTL.CALL_PROCESSING }
  );

  if (!result) {
    console.log(`Could not acquire lock for call ${callId}`);
    throw new Error('Another instance is processing this call');
  }

  return result;
}

/**
 * Example 2: Prevent duplicate usage updates
 */
export async function updateUsageWithLock(
  orgId: string,
  minutes: number
) {
  const lockResource = `usage:update:${orgId}`;

  return withLock(
    lockResource,
    async () => {
      const supabase = createClient();

      // Get current usage
      const { data: org, error } = await supabase
        .from('organizations')
        .select('usage_minutes_current, plan_minutes')
        .eq('id', orgId)
        .single();

      if (error) throw error;

      const newUsage = org.usage_minutes_current + minutes;

      // Update usage atomically
      await supabase
        .from('organizations')
        .update({
          usage_minutes_current: newUsage,
          overage_minutes_current: Math.max(0, newUsage - (org.plan_minutes || 0))
        })
        .eq('id', orgId);

      // Log the usage
      await supabase
        .from('usage_logs')
        .insert({
          organization_id: orgId,
          minutes_used: minutes,
          total_minutes: newUsage,
        });

      return {
        previousUsage: org.usage_minutes_current,
        newUsage,
        addedMinutes: minutes
      };
    },
    { ttl: LOCK_TTL.USAGE_UPDATE }
  );
}

/**
 * Example 3: Manual lock management for long operations
 */
export async function processLargeBatchWithLock(
  batchId: string,
  items: any[]
) {
  const lockResource = `batch:process:${batchId}`;

  // Manually acquire lock
  const lock = await acquireLock(lockResource, LOCK_TTL.BATCH_OPERATION);

  if (!lock) {
    throw new Error(`Cannot acquire lock for batch ${batchId}`);
  }

  try {
    const results = [];
    const supabase = createClient();

    // Update batch status
    await supabase
      .from('batch_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    // Process items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Extend lock if processing is taking long
      if (i > 0 && i % 10 === 0) {
        await lock.extend(LOCK_TTL.BATCH_OPERATION);
        console.log(`Extended lock for batch ${batchId}, processed ${i}/${items.length}`);
      }

      // Process item
      const result = await processItem(item);
      results.push(result);

      // Update progress
      await supabase
        .from('batch_jobs')
        .update({
          progress: Math.round((i + 1) / items.length * 100),
        })
        .eq('id', batchId);
    }

    // Mark as completed
    await supabase
      .from('batch_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: results,
      })
      .eq('id', batchId);

    return results;
  } catch (error) {
    // Mark as failed
    const supabase = createClient();
    await supabase
      .from('batch_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', batchId);

    throw error;
  } finally {
    // Always release the lock
    await releaseLock(lock);
  }
}

/**
 * Example 4: Prevent duplicate carrier verification
 */
export async function verifyCarrierWithLock(
  mcNumber: string,
  dotNumber?: string
) {
  // Use MC number as primary lock key
  const lockResource = `carrier:verify:${mcNumber}`;

  return withLock(
    lockResource,
    async () => {
      const supabase = createClient();

      // Check if recently verified
      const { data: recentVerification } = await supabase
        .from('carrier_verifications')
        .select('*')
        .eq('mc_number', mcNumber)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentVerification) {
        console.log(`Carrier ${mcNumber} was recently verified`);
        return recentVerification;
      }

      // Perform verification
      console.log(`Verifying carrier ${mcNumber}...`);

      // Call external API...
      const verificationData = await callFMCSAApi(mcNumber, dotNumber);

      // Store verification
      const { data, error } = await supabase
        .from('carrier_verifications')
        .insert({
          mc_number: mcNumber,
          dot_number: dotNumber,
          ...verificationData,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    {
      ttl: LOCK_TTL.CARRIER_VERIFICATION,
      retryCount: 1, // Don't retry much, verification can be done later
    }
  );
}

/**
 * Example 5: Distributed job queue processing
 */
export async function processNextJobWithLock(queueName: string) {
  const lockResource = `queue:${queueName}:processing`;

  return withLock(
    lockResource,
    async () => {
      const supabase = createClient();

      // Get next unprocessed job
      const { data: job, error } = await supabase
        .from('job_queue')
        .select('*')
        .eq('queue_name', queueName)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error || !job) {
        return null; // No jobs to process
      }

      // Mark job as processing
      await supabase
        .from('job_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          worker_id: process.env.WORKER_ID || 'default',
        })
        .eq('id', job.id);

      // Process the job
      try {
        const result = await processJob(job);

        // Mark as completed
        await supabase
          .from('job_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: result,
          })
          .eq('id', job.id);

        return result;
      } catch (error) {
        // Mark as failed
        await supabase
          .from('job_queue')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: job.attempts + 1,
          })
          .eq('id', job.id);

        throw error;
      }
    },
    {
      ttl: 5000, // Short TTL to allow quick job turnover
      retryCount: 0, // No retries, move to next job
    }
  );
}

// Helper functions (placeholders)
async function processItem(item: any) {
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 100));
  return { processed: true, item };
}

async function callFMCSAApi(mcNumber: string, dotNumber?: string) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    legal_name: 'Test Carrier Inc',
    operating_status: 'ACTIVE',
    safety_rating: 'SATISFACTORY',
  };
}

async function processJob(job: any) {
  // Simulate job processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, jobId: job.id };
}