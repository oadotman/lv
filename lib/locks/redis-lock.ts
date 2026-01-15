// =====================================================
// REDIS DISTRIBUTED LOCKS
// Prevents concurrent processing in multi-instance deployments
// =====================================================

import Redlock from 'redlock';
import type { Lock } from 'redlock';
import { getDefaultRedisClient } from '@/lib/queue/redis-config';

interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryCount?: number; // Number of retries
  retryDelay?: number; // Base delay between retries in ms
  retryJitter?: number; // Random jitter to add to retries
}

// Default lock configurations
const DEFAULT_OPTIONS: Required<LockOptions> = {
  ttl: 30000, // 30 seconds default
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 200,
};

// Lock TTL presets for common use cases
export const LOCK_TTL = {
  SHORT: 5000, // 5 seconds - for quick operations
  MEDIUM: 30000, // 30 seconds - for standard operations
  LONG: 60000, // 1 minute - for longer operations
  VERY_LONG: 300000, // 5 minutes - for complex operations

  // Specific operation types
  CALL_PROCESSING: 300000, // 5 minutes - for full call processing
  TRANSCRIPTION: 180000, // 3 minutes - for transcription
  EXTRACTION: 60000, // 1 minute - for data extraction
  CARRIER_VERIFICATION: 30000, // 30 seconds - for API calls
  USAGE_UPDATE: 5000, // 5 seconds - for quick updates
  BATCH_OPERATION: 120000, // 2 minutes - for batch operations
};

/**
 * Distributed lock manager using Redlock algorithm
 */
export class DistributedLockManager {
  private static instance: DistributedLockManager;
  private redlock: Redlock;
  private activeLocks: Map<string, Lock> = new Map();

  private constructor() {
    const redis = getDefaultRedisClient();

    this.redlock = new Redlock(
      [redis as any],
      {
        // The expected clock drift; for more details see:
        // http://redis.io/topics/distlock
        driftFactor: 0.01, // multiplied by lock ttl to determine drift time

        // The max number of times Redlock will attempt to lock a resource
        retryCount: DEFAULT_OPTIONS.retryCount,

        // The time in ms between attempts
        retryDelay: DEFAULT_OPTIONS.retryDelay,

        // The max time in ms randomly added to retries
        retryJitter: DEFAULT_OPTIONS.retryJitter,
      }
    );

    // Handle Redlock errors
    this.redlock.on('clientError', (error) => {
      console.error('[DistributedLock] Redlock error:', error);
    });

    // Cleanup expired locks periodically
    setInterval(() => {
      this.cleanupExpiredLocks();
    }, 60000); // Every minute
  }

  public static getInstance(): DistributedLockManager {
    if (!DistributedLockManager.instance) {
      DistributedLockManager.instance = new DistributedLockManager();
    }
    return DistributedLockManager.instance;
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    options: LockOptions = {}
  ): Promise<Lock | null> {
    const { ttl, retryCount, retryDelay, retryJitter } = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const lockKey = `lock:${resource}`;

    try {
      // Create custom Redlock instance if non-default options
      let lockClient = this.redlock;

      if (
        retryCount !== DEFAULT_OPTIONS.retryCount ||
        retryDelay !== DEFAULT_OPTIONS.retryDelay ||
        retryJitter !== DEFAULT_OPTIONS.retryJitter
      ) {
        const redis = getDefaultRedisClient();
        lockClient = new Redlock([redis as any], {
          driftFactor: 0.01,
          retryCount,
          retryDelay,
          retryJitter,
        });
      }

      // Try to acquire the lock
      const lock = await lockClient.acquire([lockKey], ttl);

      // Store active lock
      this.activeLocks.set(resource, lock);

      console.log(`[DistributedLock] Acquired lock for ${resource}, TTL: ${ttl}ms`);
      return lock;
    } catch (error) {
      if (error instanceof Error && error.message.includes('attempts')) {
        console.warn(`[DistributedLock] Failed to acquire lock for ${resource} after ${retryCount} attempts`);
      } else {
        console.error(`[DistributedLock] Error acquiring lock for ${resource}:`, error);
      }
      return null;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(lockOrResource: Lock | string): Promise<boolean> {
    try {
      let lock: Lock | undefined;

      if (typeof lockOrResource === 'string') {
        lock = this.activeLocks.get(lockOrResource);
        if (!lock) {
          console.warn(`[DistributedLock] No active lock found for ${lockOrResource}`);
          return false;
        }
      } else {
        lock = lockOrResource;
      }

      await lock.unlock();

      // Remove from active locks
      if (typeof lockOrResource === 'string') {
        this.activeLocks.delete(lockOrResource);
      } else {
        // Find and remove by lock instance
        for (const [resource, activeLock] of this.activeLocks.entries()) {
          if (activeLock === lock) {
            this.activeLocks.delete(resource);
            break;
          }
        }
      }

      console.log(`[DistributedLock] Released lock`);
      return true;
    } catch (error) {
      console.error(`[DistributedLock] Error releasing lock:`, error);
      return false;
    }
  }

  /**
   * Extend a lock's TTL
   */
  async extendLock(
    lockOrResource: Lock | string,
    ttl: number
  ): Promise<Lock | null> {
    try {
      let lock: Lock | undefined;

      if (typeof lockOrResource === 'string') {
        lock = this.activeLocks.get(lockOrResource);
        if (!lock) {
          console.warn(`[DistributedLock] No active lock found for ${lockOrResource}`);
          return null;
        }
      } else {
        lock = lockOrResource;
      }

      const extended = await lock.extend(ttl);
      console.log(`[DistributedLock] Extended lock by ${ttl}ms`);
      return extended;
    } catch (error) {
      console.error(`[DistributedLock] Error extending lock:`, error);
      return null;
    }
  }

  /**
   * Execute a function with a distributed lock
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T | null> {
    const lock = await this.acquireLock(resource, options);

    if (!lock) {
      console.error(`[DistributedLock] Failed to acquire lock for ${resource}`);
      return null;
    }

    try {
      // Execute the function
      const result = await fn();
      return result;
    } finally {
      // Always release the lock
      await this.releaseLock(lock);
    }
  }

  /**
   * Check if a resource is locked
   */
  async isLocked(resource: string): Promise<boolean> {
    const redis = getDefaultRedisClient();
    const lockKey = `lock:${resource}`;

    try {
      const value = await redis.get(lockKey);
      return value !== null;
    } catch (error) {
      console.error(`[DistributedLock] Error checking lock status:`, error);
      return false;
    }
  }

  /**
   * Get all active locks (for monitoring)
   */
  getActiveLocks(): Map<string, Lock> {
    return new Map(this.activeLocks);
  }

  /**
   * Clean up expired locks from memory
   */
  private cleanupExpiredLocks(): void {
    for (const [resource, lock] of this.activeLocks.entries()) {
      // Check if lock has expired
      if (lock.expiration && lock.expiration < Date.now()) {
        this.activeLocks.delete(resource);
        console.log(`[DistributedLock] Cleaned up expired lock for ${resource}`);
      }
    }
  }
}

// Singleton instance
const lockManager = DistributedLockManager.getInstance();

/**
 * Convenience function to acquire a lock
 */
export async function acquireLock(
  resource: string,
  ttl: number = LOCK_TTL.MEDIUM
): Promise<Lock | null> {
  return lockManager.acquireLock(resource, { ttl });
}

/**
 * Convenience function to release a lock
 */
export async function releaseLock(lockOrResource: Lock | string): Promise<boolean> {
  return lockManager.releaseLock(lockOrResource);
}

/**
 * Convenience function to extend a lock
 */
export async function extendLock(
  lockOrResource: Lock | string,
  ttl: number
): Promise<Lock | null> {
  return lockManager.extendLock(lockOrResource, ttl);
}

/**
 * Convenience function to execute with lock
 */
export async function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T | null> {
  return lockManager.withLock(resource, fn, options);
}

/**
 * Convenience function to check if locked
 */
export async function isLocked(resource: string): Promise<boolean> {
  return lockManager.isLocked(resource);
}

export default {
  acquireLock,
  releaseLock,
  extendLock,
  withLock,
  isLocked,
  LOCK_TTL,
};