// =====================================================
// RATE LIMITING UTILITY
// Implements token bucket algorithm for API rate limiting
// =====================================================

interface RateLimiterOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens to track
  tokensPerInterval: number; // Max requests per interval
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private interval: number;
  private tokensPerInterval: number;
  private buckets: Map<string, TokenBucket>;
  private maxBuckets: number;

  constructor(options: RateLimiterOptions) {
    this.interval = options.interval;
    this.tokensPerInterval = options.tokensPerInterval;
    this.maxBuckets = options.uniqueTokenPerInterval;
    this.buckets = new Map();
  }

  /**
   * Check if request is allowed for given identifier
   * @param identifier - Usually IP address or user ID
   * @throws Error if rate limit exceeded
   */
  async check(identifier: string): Promise<void> {
    const now = Date.now();

    // Get or create bucket
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      // Create new bucket
      bucket = {
        tokens: this.tokensPerInterval - 1,
        lastRefill: now,
      };

      // Clean up old buckets if at capacity
      if (this.buckets.size >= this.maxBuckets) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey) {
          this.buckets.delete(oldestKey);
        }
      }

      this.buckets.set(identifier, bucket);
      return;
    }

    // Refill tokens if interval has passed
    const timeSinceLastRefill = now - bucket.lastRefill;
    const intervalsElapsed = Math.floor(timeSinceLastRefill / this.interval);

    if (intervalsElapsed > 0) {
      bucket.tokens = Math.min(
        this.tokensPerInterval,
        bucket.tokens + (intervalsElapsed * this.tokensPerInterval)
      );
      bucket.lastRefill = now;
    }

    // Check if tokens available
    if (bucket.tokens <= 0) {
      const resetTime = bucket.lastRefill + this.interval;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
    }

    // Consume token
    bucket.tokens--;
  }

  /**
   * Get current rate limit status for identifier
   */
  getStatus(identifier: string): { remaining: number; resetAt: Date } | null {
    const bucket = this.buckets.get(identifier);

    if (!bucket) {
      return {
        remaining: this.tokensPerInterval,
        resetAt: new Date(Date.now() + this.interval),
      };
    }

    return {
      remaining: Math.max(0, bucket.tokens),
      resetAt: new Date(bucket.lastRefill + this.interval),
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }
}

// =====================================================
// PRE-CONFIGURED RATE LIMITERS
// =====================================================

// Upload API: 5 uploads per minute per user
export const uploadRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 5,
});

// General API: 60 requests per minute per user
export const apiRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 60,
});

// Auth API: 10 attempts per 15 minutes (stricter)
export const authRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 10,
});

// Team invitation: 10 invites per hour
export const inviteRateLimiter = new RateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 10,
});

// Extract API: 20 extractions per minute per user (expensive GPT-4 operations)
export const extractRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 20,
});

// Poll API: 60 polls per minute per user
export const pollRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 60,
});

// Health check: 30 checks per minute per IP (prevent information disclosure attacks)
export const healthRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  tokensPerInterval: 30,
});
