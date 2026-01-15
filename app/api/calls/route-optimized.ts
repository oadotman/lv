import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPaginationParams,
  applyDefaultQueryOptions,
  getSafeCountOption,
  QUERY_LIMITS,
  executeWithTimeout,
  QUERY_TIMEOUTS,
  checkResultSize
} from '@/lib/query-limits';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get query parameters with proper pagination
    const searchParams = request.nextUrl.searchParams;
    const { page, pageSize, offset, limit } = getPaginationParams(searchParams);

    // Ensure limit doesn't exceed call-specific max
    const safeLimit = Math.min(limit, QUERY_LIMITS.CALLS_LIST);

    // Get filter parameters
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const callType = searchParams.get('callType');
    const search = searchParams.get('search');

    // Build the optimized query
    let query = supabase
      .from('calls')
      .select('*', { count: getSafeCountOption() }) // Use estimated count
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null); // Soft delete check

    // Apply status filter
    if (status && status !== 'all') {
      if (status === 'pending') {
        // Pending includes multiple statuses
        query = query.in('status', ['uploaded', 'queued', 'processing', 'transcribing', 'extracting']);
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply call type filter
    if (callType && callType !== 'all') {
      query = query.eq('call_type', callType);
    }

    // Apply search filter (limited to essential fields)
    if (search) {
      query = query.or(`
        file_name.ilike.%${search}%,
        transcript_summary.ilike.%${search}%
      `);
    }

    // Apply optimized sorting and pagination
    query = applyDefaultQueryOptions(query, {
      orderBy: 'created_at',
      ascending: false,
      limit: safeLimit,
      context: 'CALLS_LIST'
    });

    // Apply range for pagination
    query = query.range(offset, offset + safeLimit - 1);

    // Execute query with timeout - query is a promise when executed
    const queryResult = await executeWithTimeout(
      async () => query,
      QUERY_TIMEOUTS.MEDIUM,
      'calls-list'
    );

    const { data: calls, error, count } = queryResult;

    if (error) {
      console.error('Error fetching calls:', error);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    // Check result size for monitoring
    const sizeCheck = checkResultSize(calls || [], 'CALLS_LIST');
    if (sizeCheck.warning) {
      console.warn('[Calls API]', sizeCheck.warning);
    }

    // Calculate statistics (on limited dataset for performance)
    const stats = {
      total: count || 0,
      completed: 0,
      processing: 0,
      failed: 0,
      totalDuration: 0
    };

    // Only calculate detailed stats if we have a reasonable number of results
    if (calls && calls.length <= 100) {
      calls.forEach(call => {
        switch (call.status) {
          case 'completed':
            stats.completed++;
            break;
          case 'uploaded':
          case 'queued':
          case 'processing':
          case 'transcribing':
          case 'extracting':
            stats.processing++;
            break;
          case 'failed':
            stats.failed++;
            break;
        }
        stats.totalDuration += call.duration_minutes || 0;
      });
    }

    return NextResponse.json({
      calls: calls || [],
      pagination: {
        page,
        pageSize: safeLimit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / safeLimit),
        hasMore: offset + safeLimit < (count || 0)
      },
      stats,
      performance: {
        queryLimit: safeLimit,
        returnedCount: calls?.length || 0,
        countType: 'estimated'
      }
    });

  } catch (error) {
    console.error('Error in calls API:', error);

    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Query timeout - please try with more specific filters' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optimized batch delete with limits
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { callIds } = await request.json();

    // Validate input
    if (!Array.isArray(callIds) || callIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid call IDs provided' },
        { status: 400 }
      );
    }

    // CRITICAL: Limit batch size to prevent table locks
    const MAX_BATCH_SIZE = 100;
    if (callIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}. Please delete in smaller batches.`,
          maxBatchSize: MAX_BATCH_SIZE,
          providedCount: callIds.length
        },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Verify ownership of all calls before deletion
    const { data: calls, error: verifyError } = await supabase
      .from('calls')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .in('id', callIds);

    if (verifyError) {
      console.error('Error verifying calls:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify call ownership' },
        { status: 500 }
      );
    }

    if (!calls || calls.length !== callIds.length) {
      return NextResponse.json(
        {
          error: 'Some calls not found or unauthorized',
          requested: callIds.length,
          verified: calls?.length || 0
        },
        { status: 403 }
      );
    }

    // Perform soft delete with timeout
    const deleteResult = await executeWithTimeout(
      async () => supabase
        .from('calls')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('organization_id', profile.organization_id)
        .in('id', callIds),
      QUERY_TIMEOUTS.LONG,
      'batch-delete-calls'
    );

    if (deleteResult.error) {
      console.error('Error deleting calls:', deleteResult.error);
      return NextResponse.json(
        { error: 'Failed to delete calls' },
        { status: 500 }
      );
    }

    // Log the batch deletion for audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        action: 'batch_delete_calls',
        entity_type: 'call',
        entity_id: callIds[0], // Log first ID as reference
        metadata: {
          count: callIds.length,
          call_ids: callIds.slice(0, 10) // Log first 10 IDs only
        }
      });

    return NextResponse.json({
      success: true,
      deletedCount: callIds.length,
      message: `Successfully deleted ${callIds.length} calls`
    });

  } catch (error) {
    console.error('Error in batch delete:', error);

    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Operation timeout - please try deleting fewer items' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}