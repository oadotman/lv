import Redis from 'ioredis';

/**
 * Redis Configuration for Production Scale
 * Provides connection pooling, retry logic, and health monitoring
 */

// Redis connection options with production-ready settings
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),

  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,

  // Reconnection strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },

  // Connection timeout
  connectTimeout: 10000,

  // Command timeout
  commandTimeout: 5000,

  // Keep alive
  keepAlive: 30000,

  // Enable offline queue
  enableOfflineQueue: true,

  // Connection name for debugging
  connectionName: 'loadvoice-queue',
};

// Parse Redis URL if provided (for cloud Redis services like Upstash, Redis Cloud)
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
        username: url.username || undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        ...redisOptions,
      };
    } catch (error) {
      console.error('[Redis] Error parsing Redis URL:', error);
      // Fall back to default config
    }
  }

  return redisOptions;
};

// Create Redis client with health monitoring
export const createRedisClient = (name: string = 'default'): Redis => {
  const config = getRedisConfig();
  const client = new Redis(config);

  // Connection event handlers
  client.on('connect', () => {
    console.log(`[Redis:${name}] Connected to Redis`);
  });

  client.on('ready', () => {
    console.log(`[Redis:${name}] Redis client ready`);
  });

  client.on('error', (error) => {
    console.error(`[Redis:${name}] Redis error:`, error);
  });

  client.on('close', () => {
    console.log(`[Redis:${name}] Redis connection closed`);
  });

  client.on('reconnecting', (delay: number) => {
    console.log(`[Redis:${name}] Reconnecting to Redis in ${delay}ms`);
  });

  client.on('end', () => {
    console.log(`[Redis:${name}] Redis connection ended`);
  });

  return client;
};

// Singleton Redis clients for different purposes
let defaultClient: Redis | null = null;
let subscriberClient: Redis | null = null;

/**
 * Get default Redis client (singleton)
 */
export const getDefaultRedisClient = (): Redis => {
  if (!defaultClient) {
    defaultClient = createRedisClient('default');
  }
  return defaultClient;
};

/**
 * Get subscriber Redis client for pub/sub (singleton)
 */
export const getSubscriberRedisClient = (): Redis => {
  if (!subscriberClient) {
    subscriberClient = createRedisClient('subscriber');
  }
  return subscriberClient;
};

/**
 * Health check for Redis connection
 */
export const checkRedisHealth = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  const client = getDefaultRedisClient();
  const startTime = Date.now();

  try {
    const result = await client.ping();
    const latency = Date.now() - startTime;

    return {
      healthy: result === 'PONG',
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Gracefully close all Redis connections
 */
export const closeRedisConnections = async (): Promise<void> => {
  const promises: Promise<void>[] = [];

  if (defaultClient) {
    console.log('[Redis] Closing default client...');
    promises.push(defaultClient.quit().then(() => {}));
  }

  if (subscriberClient) {
    console.log('[Redis] Closing subscriber client...');
    promises.push(subscriberClient.quit().then(() => {}));
  }

  await Promise.all(promises);

  defaultClient = null;
  subscriberClient = null;

  console.log('[Redis] All connections closed');
};

// Export Redis type for use in other files
export type { Redis };