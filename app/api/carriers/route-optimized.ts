import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPaginationParams,
  applyDefaultQueryOptions,
  getSafeCountOption,
  QUERY_LIMITS,
  executeWithTimeout,
  QUERY_TIMEOUTS
} from '@/lib/query-limits';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization - WITH LIMIT
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

    // Ensure limit doesn't exceed carrier-specific max
    const safeLimit = Math.min(limit, QUERY_LIMITS.CARRIERS_LIST);

    // Get filter parameters
    const search = searchParams.get('search') || '';
    const equipmentType = searchParams.get('equipment');
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');
    const lastContact = searchParams.get('lastContact');

    // Build the base query WITHOUT the expensive nested joins
    let baseQuery = supabase
      .from('carriers')
      .select('*', { count: getSafeCountOption() }) // Use estimated count
      .eq('organization_id', profile.organization_id)
      .is('deleted_at', null); // Add soft delete check

    // Apply search filter
    if (search) {
      // Limit search to most important fields to avoid expensive OR operations
      baseQuery = baseQuery.or(`
        carrier_name.ilike.%${search}%,
        mc_number.ilike.%${search}%
      `);
    }

    // Apply equipment type filter
    if (equipmentType && equipmentType !== 'all') {
      baseQuery = baseQuery.contains('equipment_types', [equipmentType]);
    }

    // Apply status filter
    if (status && status !== 'all') {
      baseQuery = baseQuery.eq('status', status);
    }

    // Apply rating filter
    if (rating && rating !== 'all') {
      const ratingNum = parseInt(rating);
      baseQuery = baseQuery.gte('internal_rating', ratingNum).lt('internal_rating', ratingNum + 1);
    }

    // Apply last contact filter
    if (lastContact && lastContact !== 'all') {
      const now = new Date();
      let dateFrom: Date;

      switch (lastContact) {
        case 'today':
          dateFrom = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          dateFrom = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateFrom = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'three_months':
          dateFrom = new Date(now.setMonth(now.getMonth() - 3));
          break;
        default:
          dateFrom = new Date(0);
      }

      baseQuery = baseQuery.gte('last_contact_date', dateFrom.toISOString());
    }

    // Apply optimized sorting and pagination
    baseQuery = applyDefaultQueryOptions(baseQuery, {
      orderBy: 'last_used_date',
      ascending: false,
      limit: safeLimit,
      context: 'CARRIERS_LIST'
    });

    // Apply range for pagination
    baseQuery = baseQuery.range(offset, offset + safeLimit - 1);

    // Execute query with timeout
    const queryResult = await executeWithTimeout(
      async () => baseQuery,
      QUERY_TIMEOUTS.MEDIUM,
      'carriers-list'
    );

    const { data: carriers, error, count } = queryResult;

    if (error) {
      console.error('Error fetching carriers:', error);
      return NextResponse.json({ error: 'Failed to fetch carriers' }, { status: 500 });
    }

    // Fetch interactions separately for the returned carriers (avoid N+1)
    let carrierInteractions: Record<string, any[]> = {};

    if (carriers && carriers.length > 0) {
      const carrierIds = carriers.map(c => c.id);

      // Batch fetch interactions with limit per carrier
      const { data: interactions } = await executeWithTimeout(
        async () => supabase
          .from('carrier_interactions')
          .select(`
            id,
            carrier_id,
            interaction_type,
            interaction_date,
            rate_discussed,
            lane_discussed,
            notes
          `)
          .in('carrier_id', carrierIds)
          .order('interaction_date', { ascending: false })
          .limit(500), // Total limit for all interactions
        QUERY_TIMEOUTS.SHORT,
        'carrier-interactions'
      );

      // Group interactions by carrier
      if (interactions) {
        interactions.forEach(interaction => {
          if (!carrierInteractions[interaction.carrier_id]) {
            carrierInteractions[interaction.carrier_id] = [];
          }
          // Limit to 5 most recent interactions per carrier
          if (carrierInteractions[interaction.carrier_id].length < 5) {
            carrierInteractions[interaction.carrier_id].push(interaction);
          }
        });
      }
    }

    // Combine carriers with their interactions
    const carriersWithInteractions = carriers?.map(carrier => ({
      ...carrier,
      carrier_interactions: carrierInteractions[carrier.id] || []
    })) || [];

    // Calculate statistics (on limited dataset)
    const stats = {
      totalCarriers: count || 0,
      activeCarriers: carriersWithInteractions.filter(c => c.status === 'active').length,
      averageRating: carriersWithInteractions.length ?
        Number((carriersWithInteractions.reduce((sum, c) => sum + (c.internal_rating || 0), 0) / carriersWithInteractions.length).toFixed(2)) : 0,
      withRecentContact: carriersWithInteractions.filter(c => {
        if (!c.last_contact_date) return false;
        const lastContact = new Date(c.last_contact_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastContact >= thirtyDaysAgo;
      }).length
    };

    return NextResponse.json({
      carriers: carriersWithInteractions,
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
        returnedCount: carriersWithInteractions.length,
        countType: 'estimated' // Indicate we're using estimated count
      }
    });

  } catch (error) {
    console.error('Error in carriers API:', error);

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

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

    // Add organization_id to the carrier data
    const carrierData = {
      ...body,
      organization_id: profile.organization_id,
      created_by: user.id
    };

    // Insert the carrier
    const { data: carrier, error } = await supabase
      .from('carriers')
      .insert(carrierData)
      .select()
      .single();

    if (error) {
      console.error('Error creating carrier:', error);
      return NextResponse.json({ error: 'Failed to create carrier' }, { status: 500 });
    }

    return NextResponse.json({ carrier });

  } catch (error) {
    console.error('Error in carriers POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}