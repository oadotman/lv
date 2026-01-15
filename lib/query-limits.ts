/**
 * Query Limits Configuration for Production Scale
 * Prevents unbounded queries that can cause OOM errors
 */

export const QUERY_LIMITS = {
  // Default limits for different query types
  DEFAULT: 100,
  SMALL: 10,
  MEDIUM: 50,
  LARGE: 100,
  MAX: 500,

  // Specific limits by entity type
  CALLS_LIST: 50,
  CALLS_DASHBOARD: 10,
  CARRIERS_LIST: 50,
  CARRIERS_SEARCH: 100,
  LOADS_LIST: 50,
  LOADS_BOARD: 100,
  TRANSCRIPTS_SEARCH: 20,
  AUDIT_LOGS: 100,
  TEAM_MEMBERS: 50,
  NOTIFICATIONS: 20,
  USAGE_METRICS: 30,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Parse and validate pagination parameters
 */
export function getPaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const requestedPageSize = parseInt(searchParams.get('pageSize') || String(QUERY_LIMITS.DEFAULT_PAGE_SIZE));

  // Enforce maximum page size
  const pageSize = Math.min(requestedPageSize, QUERY_LIMITS.MAX_PAGE_SIZE);

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return { page, pageSize, offset, limit };
}

/**
 * Apply query limits to a Supabase query
 */
export function applyQueryLimits(query: any, limit: number = QUERY_LIMITS.DEFAULT): any {
  // Ensure limit is within bounds
  const safeLimit = Math.min(Math.max(1, limit), QUERY_LIMITS.MAX);
  return query.limit(safeLimit);
}

/**
 * Get appropriate limit based on query context
 */
export function getQueryLimit(context: string, userLimit?: number): number {
  // Check if there's a specific limit for this context
  const contextLimit = (QUERY_LIMITS as any)[context] || QUERY_LIMITS.DEFAULT;

  // If user provided a limit, use the minimum of user limit and context limit
  if (userLimit !== undefined) {
    return Math.min(userLimit, contextLimit);
  }

  return contextLimit;
}

/**
 * Warning thresholds for monitoring
 */
export const WARNING_THRESHOLDS = {
  RESULT_COUNT: 1000, // Warn if query returns more than this
  QUERY_TIME_MS: 1000, // Warn if query takes longer than this
  MEMORY_MB: 100, // Warn if result set uses more than this
} as const;

/**
 * Check if a result set is too large
 */
export function checkResultSize(data: any[], context: string): {
  withinLimits: boolean;
  warning?: string;
  recommendation?: string;
} {
  if (!data || !Array.isArray(data)) {
    return { withinLimits: true };
  }

  const count = data.length;
  const limit = getQueryLimit(context);

  if (count >= limit) {
    return {
      withinLimits: false,
      warning: `Query returned ${count} results, which matches or exceeds the limit of ${limit}`,
      recommendation: 'Consider adding pagination or more specific filters',
    };
  }

  if (count > WARNING_THRESHOLDS.RESULT_COUNT) {
    return {
      withinLimits: true,
      warning: `Large result set: ${count} items`,
      recommendation: 'Consider implementing pagination',
    };
  }

  return { withinLimits: true };
}

/**
 * Build a safe count query (using estimated count for large tables)
 */
export function getSafeCountOption(estimateThreshold: number = 10000): 'exact' | 'estimated' {
  // For large tables, use estimated count to avoid full table scans
  // This can be determined dynamically based on table statistics
  return 'estimated'; // Always use estimated for production scale
}

/**
 * Apply default sorting and limits to ensure predictable query performance
 */
export function applyDefaultQueryOptions(
  query: any,
  options: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    context?: string;
  } = {}
): any {
  const {
    orderBy = 'created_at',
    ascending = false,
    limit,
    context = 'DEFAULT'
  } = options;

  let processedQuery = query;

  // Apply ordering
  processedQuery = processedQuery.order(orderBy, { ascending });

  // Apply limit
  const queryLimit = limit || getQueryLimit(context);
  processedQuery = applyQueryLimits(processedQuery, queryLimit);

  return processedQuery;
}

/**
 * Timeout configuration for queries
 */
export const QUERY_TIMEOUTS = {
  SHORT: 5000, // 5 seconds
  MEDIUM: 10000, // 10 seconds
  LONG: 30000, // 30 seconds
  MAX: 60000, // 1 minute
} as const;

/**
 * Create a query with timeout
 */
export async function executeWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUTS.MEDIUM,
  context: string = 'query'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms: ${context}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([queryFn(), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error(`[QueryLimits] Timeout in ${context}:`, error.message);
    }
    throw error;
  }
}

/**
 * Batch query helper for large datasets
 */
export async function* batchQuery<T>(
  baseQuery: () => any,
  batchSize: number = QUERY_LIMITS.DEFAULT,
  maxBatches: number = 10
): AsyncGenerator<T[], void, unknown> {
  let offset = 0;
  let batchCount = 0;
  let hasMore = true;

  while (hasMore && batchCount < maxBatches) {
    const query = baseQuery()
      .range(offset, offset + batchSize - 1)
      .limit(batchSize);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      yield data as T[];
      offset += data.length;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }

    batchCount++;
  }

  if (batchCount >= maxBatches) {
    console.warn(`[QueryLimits] Reached maximum batch count of ${maxBatches}`);
  }
}

export default QUERY_LIMITS;