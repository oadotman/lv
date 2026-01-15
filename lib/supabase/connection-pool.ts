import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Production-ready Supabase connection management
 * Implements connection pooling, timeout protection, and retry logic
 */

// Connection pool configuration
const POOL_CONFIG = {
  MIN_CONNECTIONS: 2,
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  IDLE_TIMEOUT: 60000, // 1 minute
  ACQUIRE_TIMEOUT: 10000, // 10 seconds to acquire connection
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second base delay
};

// Connection health check interval
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Connection pool implementation
 */
class SupabaseConnectionPool {
  private pool: SupabaseClient[] = [];
  private activeConnections = new Map<string, {
    client: SupabaseClient;
    inUse: boolean;
    lastUsed: Date;
    id: string;
  }>();
  private waitQueue: Array<(client: SupabaseClient) => void> = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    private supabaseUrl: string,
    private supabaseKey: string,
    private options?: {
      minConnections?: number;
      maxConnections?: number;
    }
  ) {
    this.initializePool();
    this.startHealthChecks();
  }

  /**
   * Initialize the connection pool with minimum connections
   */
  private async initializePool() {
    const minConnections = this.options?.minConnections || POOL_CONFIG.MIN_CONNECTIONS;

    for (let i = 0; i < minConnections; i++) {
      const client = this.createConnection();
      const connectionId = `conn-${Date.now()}-${i}`;

      this.activeConnections.set(connectionId, {
        client,
        inUse: false,
        lastUsed: new Date(),
        id: connectionId,
      });
    }

    console.log(`[ConnectionPool] Initialized with ${minConnections} connections`);
  }

  /**
   * Create a new Supabase client connection
   */
  private createConnection(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: this.createFetchWithTimeout(POOL_CONFIG.CONNECTION_TIMEOUT),
      },
      db: {
        schema: 'public',
      },
    });
  }

  /**
   * Create fetch with timeout wrapper
   */
  private createFetchWithTimeout(timeout: number) {
    return async (url: RequestInfo, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    };
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<SupabaseClient> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    const startTime = Date.now();
    const maxConnections = this.options?.maxConnections || POOL_CONFIG.MAX_CONNECTIONS;

    // Try to find an available connection
    while (Date.now() - startTime < POOL_CONFIG.ACQUIRE_TIMEOUT) {
      // Find an idle connection
      for (const [id, conn] of this.activeConnections.entries()) {
        if (!conn.inUse) {
          conn.inUse = true;
          conn.lastUsed = new Date();
          console.log(`[ConnectionPool] Acquired connection ${id}`);
          return conn.client;
        }
      }

      // Create a new connection if under max limit
      if (this.activeConnections.size < maxConnections) {
        const client = this.createConnection();
        const connectionId = `conn-${Date.now()}-${this.activeConnections.size}`;

        this.activeConnections.set(connectionId, {
          client,
          inUse: true,
          lastUsed: new Date(),
          id: connectionId,
        });

        console.log(`[ConnectionPool] Created new connection ${connectionId}`);
        return client;
      }

      // Wait for a connection to become available
      await new Promise<SupabaseClient>((resolve) => {
        this.waitQueue.push(resolve);
        setTimeout(() => {
          const index = this.waitQueue.indexOf(resolve);
          if (index > -1) {
            this.waitQueue.splice(index, 1);
            resolve(null as any);
          }
        }, POOL_CONFIG.ACQUIRE_TIMEOUT);
      });
    }

    throw new Error(`Failed to acquire connection within ${POOL_CONFIG.ACQUIRE_TIMEOUT}ms`);
  }

  /**
   * Release a connection back to the pool
   */
  release(client: SupabaseClient) {
    // Find the connection
    for (const [id, conn] of this.activeConnections.entries()) {
      if (conn.client === client) {
        conn.inUse = false;
        conn.lastUsed = new Date();
        console.log(`[ConnectionPool] Released connection ${id}`);

        // Notify waiting requests
        if (this.waitQueue.length > 0) {
          const waiter = this.waitQueue.shift();
          if (waiter) {
            conn.inUse = true;
            waiter(conn.client);
          }
        }

        return;
      }
    }

    console.warn('[ConnectionPool] Attempted to release unknown connection');
  }

  /**
   * Execute a query with automatic connection management
   */
  async execute<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    options?: {
      timeout?: number;
      retries?: number;
    }
  ): Promise<T> {
    const timeout = options?.timeout || POOL_CONFIG.CONNECTION_TIMEOUT;
    const maxRetries = options?.retries || POOL_CONFIG.RETRY_ATTEMPTS;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const client = await this.acquire();

      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
        });

        // Race between query and timeout
        const result = await Promise.race([
          queryFn(client),
          timeoutPromise,
        ]) as T;

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[ConnectionPool] Query failed (attempt ${attempt + 1}):`, error);

        // Exponential backoff for retries
        if (attempt < maxRetries - 1) {
          const delay = POOL_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } finally {
        this.release(client);
      }
    }

    throw lastError || new Error('Query failed after all retries');
  }

  /**
   * Start health checks for connections
   */
  private startHealthChecks() {
    this.healthCheckTimer = setInterval(() => {
      this.checkConnectionHealth();
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Check health of all connections
   */
  private async checkConnectionHealth() {
    const now = Date.now();

    for (const [id, conn] of this.activeConnections.entries()) {
      // Skip connections in use
      if (conn.inUse) continue;

      // Remove idle connections
      const idleTime = now - conn.lastUsed.getTime();
      if (idleTime > POOL_CONFIG.IDLE_TIMEOUT && this.activeConnections.size > POOL_CONFIG.MIN_CONNECTIONS) {
        this.activeConnections.delete(id);
        console.log(`[ConnectionPool] Removed idle connection ${id}`);
        continue;
      }

      // Test connection health
      try {
        const { error } = await conn.client
          .from('_health_check')
          .select('1')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (expected)
          console.warn(`[ConnectionPool] Unhealthy connection ${id}:`, error);
          // Replace unhealthy connection
          conn.client = this.createConnection();
        }
      } catch (error) {
        console.error(`[ConnectionPool] Health check failed for ${id}:`, error);
        // Replace failed connection
        conn.client = this.createConnection();
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    let inUse = 0;
    let idle = 0;

    for (const conn of this.activeConnections.values()) {
      if (conn.inUse) {
        inUse++;
      } else {
        idle++;
      }
    }

    return {
      total: this.activeConnections.size,
      inUse,
      idle,
      waiting: this.waitQueue.length,
    };
  }

  /**
   * Shutdown the connection pool
   */
  async shutdown() {
    console.log('[ConnectionPool] Shutting down...');
    this.isShuttingDown = true;

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Wait for all connections to be released (max 10 seconds)
    const shutdownTimeout = 10000;
    const startTime = Date.now();

    while (Date.now() - startTime < shutdownTimeout) {
      const stats = this.getStats();
      if (stats.inUse === 0) {
        break;
      }
      console.log(`[ConnectionPool] Waiting for ${stats.inUse} connections to be released...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clear all connections
    this.activeConnections.clear();
    this.waitQueue = [];

    console.log('[ConnectionPool] Shutdown complete');
  }
}

// Singleton instance
let poolInstance: SupabaseConnectionPool | null = null;

/**
 * Get or create the connection pool instance
 */
export function getConnectionPool(): SupabaseConnectionPool {
  if (!poolInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    poolInstance = new SupabaseConnectionPool(supabaseUrl, supabaseKey, {
      minConnections: parseInt(process.env.SUPABASE_MIN_CONNECTIONS || '2'),
      maxConnections: parseInt(process.env.SUPABASE_MAX_CONNECTIONS || '10'),
    });
  }

  return poolInstance;
}

/**
 * Execute a query using the connection pool
 */
export async function executePooledQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<T>,
  options?: {
    timeout?: number;
    retries?: number;
  }
): Promise<T> {
  const pool = getConnectionPool();
  return pool.execute(queryFn, options);
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  const pool = getConnectionPool();
  return pool.getStats();
}

/**
 * Gracefully shutdown the pool
 */
export async function shutdownPool() {
  if (poolInstance) {
    await poolInstance.shutdown();
    poolInstance = null;
  }
}

export default {
  getConnectionPool,
  executePooledQuery,
  getPoolStats,
  shutdownPool,
};