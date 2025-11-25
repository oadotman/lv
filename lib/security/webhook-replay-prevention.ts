/**
 * Webhook Replay Attack Prevention
 * Tracks processed webhook IDs to prevent duplicate processing
 */

import { createAdminClient } from '@/lib/supabase/server';

// In-memory cache for quick lookup (for when Redis is not available)
const processedWebhooks = new Map<string, number>();

// Cleanup interval: remove entries older than 24 hours
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > RETENTION_MS) {
      processedWebhooks.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Check if webhook has already been processed
 * Returns true if this is a duplicate (already processed)
 */
export async function isWebhookProcessed(
  webhookId: string,
  source: 'paddle' | 'assemblyai' | 'inngest'
): Promise<boolean> {
  const key = `${source}:${webhookId}`;

  // Check in-memory cache first
  if (processedWebhooks.has(key)) {
    return true;
  }

  // Check database (creates table if it doesn't exist)
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('processed_webhooks')
      .select('webhook_id')
      .eq('webhook_id', key)
      .eq('source', source)
      .maybeSingle();

    if (error) {
      // If table doesn't exist, log warning and allow webhook
      if (error.code === '42P01') {
        console.warn('processed_webhooks table does not exist - skipping replay check');
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking webhook replay:', error);
    // On error, allow webhook but log the issue
    return false;
  }
}

/**
 * Mark webhook as processed
 * Stores in both in-memory cache and database
 */
export async function markWebhookProcessed(
  webhookId: string,
  source: 'paddle' | 'assemblyai' | 'inngest',
  metadata?: Record<string, any>
): Promise<void> {
  const key = `${source}:${webhookId}`;

  // Add to in-memory cache
  processedWebhooks.set(key, Date.now());

  // Store in database
  try {
    const supabase = createAdminClient();

    await supabase.from('processed_webhooks').insert({
      webhook_id: key,
      source,
      processed_at: new Date().toISOString(),
      metadata: metadata || {},
    });
  } catch (error) {
    // Log error but don't fail the webhook processing
    console.error('Error marking webhook as processed:', error);
  }
}

/**
 * Clean up old webhook records
 * Call this periodically via cron job
 */
export async function cleanupOldWebhooks(olderThanDays: number = 7): Promise<number> {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from('processed_webhooks')
      .delete()
      .lt('processed_at', cutoffDate.toISOString())
      .select('webhook_id');

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error('Error cleaning up old webhooks:', error);
    return 0;
  }
}

/**
 * Validate webhook timestamp to prevent old replays
 * Returns true if timestamp is within acceptable range
 */
export function validateWebhookTimestamp(
  timestamp: number | string,
  maxAgeMinutes: number = 5
): boolean {
  const now = Date.now();
  const webhookTime = typeof timestamp === 'string'
    ? new Date(timestamp).getTime()
    : timestamp;

  const ageMs = now - webhookTime;
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  // Check if timestamp is in the future (clock skew tolerance: 1 minute)
  if (ageMs < -60000) {
    console.error('Webhook timestamp is in the future');
    return false;
  }

  // Check if timestamp is too old
  if (ageMs > maxAgeMs) {
    console.error(`Webhook timestamp too old: ${ageMs}ms (max: ${maxAgeMs}ms)`);
    return false;
  }

  return true;
}

/**
 * Generate idempotency key from webhook data
 */
export function generateIdempotencyKey(
  source: string,
  eventId: string,
  eventType: string
): string {
  const crypto = require('crypto');
  const data = `${source}:${eventId}:${eventType}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export default {
  isProcessed: isWebhookProcessed,
  markProcessed: markWebhookProcessed,
  cleanup: cleanupOldWebhooks,
  validateTimestamp: validateWebhookTimestamp,
  generateIdempotencyKey,
};