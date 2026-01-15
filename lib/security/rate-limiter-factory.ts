// =====================================================
// RATE LIMITER FACTORY
// Selects appropriate rate limiter based on environment
// =====================================================

import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Check if Redis is available
const USE_REDIS_RATE_LIMITER =
  process.env.REDIS_URL ||
  process.env.REDIS_HOST ||
  process.env.NODE_ENV === 'production';

/**
 * Get the appropriate rate limiter based on environment
 */
async function getRateLimiter() {
  if (USE_REDIS_RATE_LIMITER) {
    try {
      // Try to use Redis rate limiter
      const { checkRateLimit, rateLimit, clearRateLimit, getRateLimitInfo, RATE_LIMITS } =
        await import('./redis-rate-limiter');
      return { checkRateLimit, rateLimit, clearRateLimit, getRateLimitInfo, RATE_LIMITS };
    } catch (error) {
      console.warn('[RateLimiter] Redis rate limiter unavailable, falling back to in-memory:', error);
    }
  }

  // Fall back to in-memory rate limiter
  const { checkRateLimit, rateLimit, clearRateLimit, getRateLimitInfo, RATE_LIMITS } =
    await import('./rate-limiter');
  return { checkRateLimit, rateLimit, clearRateLimit, getRateLimitInfo, RATE_LIMITS };
}

// Export wrapped functions that dynamically select implementation
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
) {
  const limiter = await getRateLimiter();
  return limiter.checkRateLimit(req, config, userId);
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
) {
  const limiter = await getRateLimiter();
  return limiter.rateLimit(req, config, userId);
}

export async function clearRateLimit(clientId: string, pathname?: string) {
  const limiter = await getRateLimiter();
  return limiter.clearRateLimit(clientId, pathname);
}

export async function getRateLimitInfo(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
) {
  const limiter = await getRateLimiter();
  return limiter.getRateLimitInfo(req, config, userId);
}

// Re-export RATE_LIMITS (same in both implementations)
export { RATE_LIMITS } from './rate-limiter';