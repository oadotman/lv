/**
 * LoadVoice Carriers API - Complete Carrier Management
 * Manages trucking carriers including MC/DOT verification
 * Tracks carrier performance, insurance, and load history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const equipmentType = searchParams.get('equipment');
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');
    const lastContact = searchParams.get('lastContact');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('carriers')
      .select(`
        *,
        carrier_interactions!carrier_interactions_carrier_id_fkey (
          id,
          interaction_type,
          interaction_date,
          rate_discussed,
          lane_discussed,
          notes,
          user_id,
          call_id,
          profiles!carrier_interactions_user_id_fkey (
            full_name
          )
        )
      `, { count: 'exact' })
      .eq('organization_id', userOrg.organization_id);

    // Apply search filter
    if (search) {
      query = query.or(`
        carrier_name.ilike.%${search}%,
        mc_number.ilike.%${search}%,
        dot_number.ilike.%${search}%,
        dispatch_phone.ilike.%${search}%,
        primary_contact.ilike.%${search}%
      `);
    }

    // Apply equipment type filter
    if (equipmentType && equipmentType !== 'all') {
      query = query.contains('equipment_types', [equipmentType]);
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply rating filter
    if (rating && rating !== 'all') {
      const ratingNum = parseInt(rating);
      query = query.gte('internal_rating', ratingNum).lt('internal_rating', ratingNum + 1);
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

      query = query.gte('last_contact_date', dateFrom.toISOString());
    }

    // Apply sorting and pagination
    query = query
      .order('last_used_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: carriers, error, count } = await query;

    if (error) {
      console.error('Error fetching carriers:', error);
      return NextResponse.json({ error: 'Failed to fetch carriers' }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      totalCarriers: count || 0,
      activeCarriers: carriers?.filter(c => c.status === 'active').length || 0,
      averageRating: carriers?.length ?
        carriers.reduce((sum, c) => sum + (c.internal_rating || 0), 0) / carriers.length : 0,
      withRecentContact: carriers?.filter(c => {
        if (!c.last_contact_date) return false;
        const lastContact = new Date(c.last_contact_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastContact >= thirtyDaysAgo;
      }).length || 0
    };

    return NextResponse.json({
      carriers: carriers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    });
  } catch (error) {
    console.error('Error in carriers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new carrier
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.carrier_name) {
      return NextResponse.json(
        { error: 'Carrier name is required' },
        { status: 400 }
      );
    }

    // Create carrier record
    const carrierData = {
      organization_id: profile.organization_id,
      carrier_name: body.carrier_name,
      mc_number: body.mc_number,
      dot_number: body.dot_number,
      primary_contact: body.primary_contact,
      dispatch_phone: body.dispatch_phone,
      dispatch_email: body.dispatch_email,
      driver_name: body.driver_name,
      driver_phone: body.driver_phone,
      equipment_types: body.equipment_types || [],
      preferred_lanes: body.preferred_lanes || {},
      internal_rating: body.internal_rating || 3,
      status: body.status || 'active',
      notes: body.notes,
      tags: body.tags || [],
      auto_created: false,
      created_by: user.id,
      updated_by: user.id
    };

    const { data: carrier, error } = await supabase
      .from('carriers')
      .insert(carrierData)
      .select()
      .single();

    if (error) {
      console.error('Error creating carrier:', error);
      return NextResponse.json(
        { error: 'Failed to create carrier' },
        { status: 500 }
      );
    }

    return NextResponse.json(carrier);
  } catch (error) {
    console.error('Error in create carrier API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}