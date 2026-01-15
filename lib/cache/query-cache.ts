// =====================================================
// REDIS-BASED QUERY CACHING LAYER
// Reduces database load by caching frequent queries
// =====================================================

import { getDefaultRedisClient } from '@/lib/queue/redis-config';
import { createHash } from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache namespace for organization
  tags?: string[]; // Tags for cache invalidation
}

interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
}

// Default TTL values for different data types
export const CACHE_TTL = {
  SHORT: 60, // 1 minute - for rapidly changing data
  MEDIUM: 300, // 5 minutes - for moderately stable data
  LONG: 3600, // 1 hour - for stable data
  VERY_LONG: 86400, // 1 day - for rarely changing data

  // Specific data types
  USER_PROFILE: 3600, // 1 hour
  ORGANIZATION: 3600, // 1 hour
  CALL_LIST: 60, // 1 minute
  CALL_DETAILS: 300, // 5 minutes
  CARRIER_LIST: 600, // 10 minutes
  CARRIER_DETAILS: 1800, // 30 minutes
  TEMPLATE: 3600, // 1 hour
  METRICS: 300, // 5 minutes
  USAGE: 60, // 1 minute - critical for billing
};

/**
 * Query cache manager
 */
export class QueryCache {
  private static instance: QueryCache;
  private stats: CacheStats = { hits: 0, misses: 0, errors: 0 };
  private statsReportInterval?: NodeJS.Timeout;

  private constructor() {
    // Report stats every 5 minutes in development
    if (process.env.NODE_ENV === 'development') {
      this.statsReportInterval = setInterval(() => {
        console.log('[QueryCache] Stats:', this.stats);
      }, 5 * 60 * 1000);
    }
  }

  public static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  /**
   * Generate cache key from query parameters
   */
  private generateKey(
    queryKey: string | Record<string, any>,
    namespace?: string
  ): string {
    const baseKey = typeof queryKey === 'string'
      ? queryKey
      : createHash('md5').update(JSON.stringify(queryKey)).digest('hex');

    return namespace ? `cache:${namespace}:${baseKey}` : `cache:${baseKey}`;
  }

  /**
   * Get cached data or fetch from source
   */
  async getCached<T>(
    key: string | Record<string, any>,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = CACHE_TTL.MEDIUM, namespace, tags } = options;
    const cacheKey = this.generateKey(key, namespace);

    try {
      const redis = getDefaultRedisClient();

      // Try to get from cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        this.stats.hits++;

        // Parse and return cached data
        try {
          return JSON.parse(cached);
        } catch (parseError) {
          console.error('[QueryCache] Failed to parse cached data:', parseError);
          // Continue to fetch fresh data
        }
      }

      this.stats.misses++;
    } catch (error) {
      this.stats.errors++;
      console.error('[QueryCache] Redis error, fetching fresh data:', error);
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result asynchronously (don't block response)
    this.set(cacheKey, data, ttl, tags).catch(error => {
      console.error('[QueryCache] Failed to cache result:', error);
    });

    return data;
  }

  /**
   * Set cache value
   */
  async set(
    key: string | Record<string, any>,
    value: any,
    ttl: number = CACHE_TTL.MEDIUM,
    tags?: string[]
  ): Promise<void> {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);

    try {
      const redis = getDefaultRedisClient();
      const serialized = JSON.stringify(value);

      // Set with expiry
      await redis.setex(cacheKey, ttl, serialized);

      // Add to tag sets for invalidation
      if (tags && tags.length > 0) {
        const pipeline = redis.pipeline();
        for (const tag of tags) {
          pipeline.sadd(`cache:tag:${tag}`, cacheKey);
          pipeline.expire(`cache:tag:${tag}`, ttl);
        }
        await pipeline.exec();
      }
    } catch (error) {
      console.error('[QueryCache] Failed to set cache:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache by key
   */
  async invalidate(key: string | Record<string, any>, namespace?: string): Promise<void> {
    const cacheKey = this.generateKey(key, namespace);

    try {
      const redis = getDefaultRedisClient();
      await redis.del(cacheKey);
    } catch (error) {
      console.error('[QueryCache] Failed to invalidate cache:', error);
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const redis = getDefaultRedisClient();
      const tagKey = `cache:tag:${tag}`;

      // Get all keys with this tag
      const keys = await redis.smembers(tagKey);

      if (keys.length > 0) {
        // Delete all cached entries
        await redis.del(...keys);
      }

      // Delete the tag set itself
      await redis.del(tagKey);
    } catch (error) {
      console.error('[QueryCache] Failed to invalidate by tag:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const redis = getDefaultRedisClient();

      // Use SCAN to find matching keys (safer than KEYS)
      const stream = redis.scanStream({
        match: `cache:${pattern}`,
        count: 100,
      });

      const keysToDelete: string[] = [];

      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          keysToDelete.push(...keys);
        }
      });

      stream.on('end', async () => {
        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete);
          console.log(`[QueryCache] Invalidated ${keysToDelete.length} keys matching pattern: ${pattern}`);
        }
      });
    } catch (error) {
      console.error('[QueryCache] Failed to invalidate by pattern:', error);
    }
  }

  /**
   * Clear all cache for a namespace
   */
  async clearNamespace(namespace: string): Promise<void> {
    await this.invalidateByPattern(`${namespace}:*`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.statsReportInterval) {
      clearInterval(this.statsReportInterval);
    }
  }
}

// Singleton instance
const cacheInstance = QueryCache.getInstance();

/**
 * Convenience function to get cached data
 */
export async function getCached<T>(
  key: string | Record<string, any>,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return cacheInstance.getCached(key, fetchFn, options);
}

/**
 * Convenience function to invalidate cache
 */
export async function invalidateCache(
  key: string | Record<string, any>,
  namespace?: string
): Promise<void> {
  return cacheInstance.invalidate(key, namespace);
}

/**
 * Convenience function to invalidate by tag
 */
export async function invalidateCacheByTag(tag: string): Promise<void> {
  return cacheInstance.invalidateByTag(tag);
}

/**
 * Convenience function to clear namespace
 */
export async function clearCacheNamespace(namespace: string): Promise<void> {
  return cacheInstance.clearNamespace(namespace);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return cacheInstance.getStats();
}

export default {
  getCached,
  invalidateCache,
  invalidateCacheByTag,
  clearCacheNamespace,
  getCacheStats,
  CACHE_TTL,
};