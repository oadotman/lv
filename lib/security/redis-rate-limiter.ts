// =====================================================
// REDIS-BACKED RATE LIMITING FOR DISTRIBUTED SYSTEMS
// Replaces in-memory rate limiting for production scale
// =====================================================

import { NextRequest } from 'next/server';
import { getDefaultRedisClient } from '@/lib/queue/redis-config';
import { logSecurityEvent } from '@/lib/logging/audit-logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
}

/**
 * Redis-backed rate limiter using sliding window algorithm
 */
export class RedisRateLimiter {
  private static instance: RedisRateLimiter;

  private constructor() {}

  public static getInstance(): RedisRateLimiter {
    if (!RedisRateLimiter.instance) {
      RedisRateLimiter.instance = new RedisRateLimiter();
    }
    return RedisRateLimiter.instance;
  }

  /**
   * Get client identifier from request
   */
  private getClientId(req: NextRequest, userId?: string): string {
    // Prefer user ID if authenticated
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    return `ip:${ip}`;
  }

  /**
   * Check rate limit using Redis sliding window counter
   */
  async checkRateLimit(
    req: NextRequest,
    config: RateLimitConfig,
    userId?: string
  ): Promise<RateLimitResult> {
    const redis = getDefaultRedisClient();
    const clientId = this.getClientId(req, userId);
    const key = `ratelimit:${clientId}:${req.nextUrl.pathname}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, '-inf', windowStart);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Count requests in window
      pipeline.zcard(key);

      // Set expiry to clean up old keys
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      // Extract count from pipeline results
      const count = results[2][1] as number;
      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetAt = now + config.windowMs;

      // Log rate limit exceeded
      if (!allowed && userId) {
        await logSecurityEvent(userId, 'rate_limit_exceeded', {
          endpoint: req.nextUrl.pathname,
          count,
          limit: config.maxRequests,
          clientId,
        });
      }

      return {
        allowed,
        count,
        remaining,
        resetAt,
      };
    } catch (error) {
      console.error('[RateLimiter] Redis error, falling back to allow:', error);
      // Fail open - allow request if Redis is unavailable
      // In production, you might want to fail closed instead
      return {
        allowed: true,
        count: 0,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
  }

  /**
   * Clear rate limit for a client
   */
  async clearRateLimit(clientId: string, pathname?: string): Promise<void> {
    const redis = getDefaultRedisClient();

    try {
      if (pathname) {
        await redis.del(`ratelimit:${clientId}:${pathname}`);
      } else {
        // Clear all rate limits for this client
        const keys = await redis.keys(`ratelimit:${clientId}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('[RateLimiter] Failed to clear rate limit:', error);
    }
  }

  /**
   * Get current rate limit info
   */
  async getRateLimitInfo(
    req: NextRequest,
    config: RateLimitConfig,
    userId?: string
  ): Promise<{
    limit: number;
    remaining: number;
    resetAt: number;
  }> {
    const redis = getDefaultRedisClient();
    const clientId = this.getClientId(req, userId);
    const key = `ratelimit:${clientId}:${req.nextUrl.pathname}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Count current requests in window
      const count = await redis.zcount(key, windowStart, '+inf');

      return {
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        resetAt: now + config.windowMs,
      };
    } catch (error) {
      console.error('[RateLimiter] Failed to get rate limit info:', error);
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
  }
}

/**
 * Default rate limit configurations (same as original)
 */
export const RATE_LIMITS = {
  // Strict limits for sensitive endpoints
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
  DATA_EXPORT: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 per hour
  DATA_DELETION: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1 }, // 1 per day

  // Standard API limits
  API_STANDARD: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
  API_UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  API_HEAVY: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute

  // Generous limits for reads
  API_READ: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
};

/**
 * Convenience function to check rate limit
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<RateLimitResult> {
  const limiter = RedisRateLimiter.getInstance();
  return limiter.checkRateLimit(req, config, userId);
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<Response | null> {
  const result = await checkRateLimit(req, config, userId);

  if (!result.allowed) {
    const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${resetInSeconds} seconds.`,
        retryAfter: resetInSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(resetInSeconds),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Clear rate limit for a user
 */
export async function clearRateLimit(clientId: string, pathname?: string): Promise<void> {
  const limiter = RedisRateLimiter.getInstance();
  return limiter.clearRateLimit(clientId, pathname);
}

/**
 * Get rate limit info for a request
 */
export async function getRateLimitInfo(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<{
  limit: number;
  remaining: number;
  resetAt: number;
}> {
  const limiter = RedisRateLimiter.getInstance();
  return limiter.getRateLimitInfo(req, config, userId);
}