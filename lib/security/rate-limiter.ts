// =====================================================
// RATE LIMITING
// Protect API endpoints from abuse and DoS attacks
// =====================================================

import { NextRequest } from 'next/server';
import { logSecurityEvent } from '@/lib/logging/audit-logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Default rate limit configurations
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
 * Get client identifier from request
 */
function getClientId(req: NextRequest, userId?: string): string {
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
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const clientId = getClientId(req, userId);
  const key = `${clientId}:${req.nextUrl.pathname}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create or reset entry if expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment request count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  // Log rate limit exceeded
  if (!allowed && userId) {
    await logSecurityEvent(userId, 'rate_limit_exceeded', {
      endpoint: req.nextUrl.pathname,
      count: entry.count,
      limit: config.maxRequests,
    });
  }

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
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
 * Clear rate limit for a user (e.g., after successful auth)
 */
export function clearRateLimit(clientId: string, pathname?: string): void {
  if (pathname) {
    rateLimitStore.delete(`${clientId}:${pathname}`);
  } else {
    // Clear all entries for this client
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Get rate limit info for a request
 */
export function getRateLimitInfo(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): {
  limit: number;
  remaining: number;
  resetAt: number;
} {
  const clientId = getClientId(req, userId);
  const key = `${clientId}:${req.nextUrl.pathname}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
