/**
 * LoadVoice Loads API - Complete CRUD Operations
 * Handles freight load lifecycle: quoted → booked → dispatched → in-transit → delivered
 * Includes carrier/shipper management and activity tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Valid load statuses
const LOAD_STATUSES = ['quoted', 'booked', 'dispatched', 'in-transit', 'delivered', 'cancelled'] as const;
type LoadStatus = typeof LOAD_STATUSES[number];

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

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const carrierId = searchParams.get('carrier_id');
    const shipperId = searchParams.get('shipper_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sort_by') || 'pickup_date';
    const sortOrder = searchParams.get('sort_order') === 'asc' ? true : false;

    // Use admin client for complex queries
    const adminSupabase = createAdminClient();

    // Build query
    let query = adminSupabase
      .from('loads')
      .select(`
        *,
        carriers!left(
          id,
          carrier_name,
          mc_number,
          dot_number,
          contact_name,
          phone,
          email,
          rating
        ),
        shippers!left(
          id,
          shipper_name,
          contact_name,
          phone,
          email,
          rating
        ),
        extracted_freight_data!left(
          id,
          extraction_confidence,
          commodity,
          special_requirements
        )
      `, { count: 'exact' })
      .eq('organization_id', userOrg.organization_id);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (carrierId) {
      query = query.eq('carrier_id', carrierId);
    }

    if (shipperId) {
      query = query.eq('shipper_id', shipperId);
    }

    if (dateFrom) {
      query = query.gte('pickup_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('pickup_date', dateTo);
    }

    // Apply search (searches load number, commodity, cities)
    if (search) {
      query = query.or(`
        load_number.ilike.%${search}%,
        commodity.ilike.%${search}%,
        pickup_city.ilike.%${search}%,
        delivery_city.ilike.%${search}%
      `);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder })
      .range(offset, offset + limit - 1);

    const { data: loads, error, count } = await query;

    if (error) {
      console.error('[Loads API] Error fetching loads:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get load statistics for dashboard
    const { data: stats } = await adminSupabase
      .from('loads')
      .select('status')
      .eq('organization_id', userOrg.organization_id);

    const statusCounts = stats?.reduce((acc, load) => {
      acc[load.status] = (acc[load.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      loads: loads || [],
      total: count || 0,
      statistics: {
        total: count || 0,
        byStatus: statusCounts || {},
        ...statusCounts
      }
    });
  } catch (error) {
    console.error('[Loads API] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['pickup_city', 'pickup_state', 'delivery_city', 'delivery_state', 'commodity'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const adminSupabase = createAdminClient();

    // Auto-create or find carrier if provided
    let carrierId = body.carrier_id;
    if (!carrierId && body.carrier_info) {
      const { carrier_name, mc_number, dot_number, contact_name, phone, email } = body.carrier_info;

      if (carrier_name && mc_number) {
        // Check if carrier exists
        const { data: existingCarrier } = await adminSupabase
          .from('carriers')
          .select('id')
          .eq('organization_id', userOrg.organization_id)
          .eq('mc_number', mc_number)
          .single();

        if (existingCarrier) {
          carrierId = existingCarrier.id;
        } else {
          // Create new carrier
          const { data: newCarrier, error: carrierError } = await adminSupabase
            .from('carriers')
            .insert({
              organization_id: userOrg.organization_id,
              carrier_name,
              mc_number,
              dot_number,
              contact_name,
              phone,
              email,
              status: 'active',
              created_by: user.id,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!carrierError && newCarrier) {
            carrierId = newCarrier.id;
          }
        }
      }
    }

    // Auto-create or find shipper if provided
    let shipperId = body.shipper_id;
    if (!shipperId && body.shipper_info) {
      const { shipper_name, contact_name, phone, email, address } = body.shipper_info;

      if (shipper_name) {
        // Check if shipper exists
        const { data: existingShipper } = await adminSupabase
          .from('shippers')
          .select('id')
          .eq('organization_id', userOrg.organization_id)
          .eq('shipper_name', shipper_name)
          .single();

        if (existingShipper) {
          shipperId = existingShipper.id;
        } else {
          // Create new shipper
          const { data: newShipper, error: shipperError } = await adminSupabase
            .from('shippers')
            .insert({
              organization_id: userOrg.organization_id,
              shipper_name,
              contact_name,
              phone,
              email,
              address,
              status: 'active',
              created_by: user.id,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!shipperError && newShipper) {
            shipperId = newShipper.id;
          }
        }
      }
    }

    // Generate load number if not provided
    const loadNumber = body.load_number || await generateLoadNumber(userOrg.organization_id);

    // Create load
    const loadData = {
      organization_id: userOrg.organization_id,
      load_number: loadNumber,
      status: body.status || 'quoted',

      // Locations
      pickup_location: body.pickup_location,
      pickup_city: body.pickup_city,
      pickup_state: body.pickup_state,
      pickup_zip: body.pickup_zip,
      pickup_date: body.pickup_date,
      pickup_time: body.pickup_time,

      delivery_location: body.delivery_location,
      delivery_city: body.delivery_city,
      delivery_state: body.delivery_state,
      delivery_zip: body.delivery_zip,
      delivery_date: body.delivery_date,
      delivery_time: body.delivery_time,

      // Freight details
      commodity: body.commodity,
      weight_pounds: body.weight_pounds,
      pallet_count: body.pallet_count,
      equipment_type: body.equipment_type,
      special_requirements: body.special_requirements,

      // Financial
      rate_amount: body.rate_amount,
      payment_terms: body.payment_terms,

      // References
      carrier_id: carrierId,
      shipper_id: shipperId,
      extracted_data_id: body.extracted_data_id,

      // Metadata
      created_by: user.id,
      created_at: new Date().toISOString(),
      metadata: {
        source: body.source || 'manual',
        source_call_id: body.source_call_id,
        notes: body.notes
      }
    };

    const { data: newLoad, error: insertError } = await adminSupabase
      .from('loads')
      .insert(loadData)
      .select(`
        *,
        carriers!left(carrier_name, mc_number),
        shippers!left(shipper_name, contact_name)
      `)
      .single();

    if (insertError) {
      console.error('[Loads API] Error creating load:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Log activity
    await adminSupabase.from('load_activities').insert({
      load_id: newLoad.id,
      organization_id: userOrg.organization_id,
      user_id: user.id,
      activity_type: 'created',
      description: `Load ${loadNumber} created`,
      metadata: { status: 'quoted' },
      created_at: new Date().toISOString()
    });

    // If this came from an extraction, update the extraction record
    if (body.extracted_data_id) {
      await adminSupabase
        .from('extracted_freight_data')
        .update({
          load_created: true,
          load_id: newLoad.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.extracted_data_id);
    }

    return NextResponse.json({
      load: newLoad,
      message: 'Load created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Loads API] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate unique load number
async function generateLoadNumber(organizationId: string): Promise<string> {
  const adminSupabase = createAdminClient();

  // Get organization prefix (first 3 letters of org name or 'LDV')
  const { data: org } = await adminSupabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  const prefix = org?.name ? org.name.substring(0, 3).toUpperCase() : 'LDV';

  // Get count of loads for this org
  const { count } = await adminSupabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  const nextNumber = (count || 0) + 1;
  const timestamp = Date.now().toString().slice(-4);

  return `${prefix}-${nextNumber.toString().padStart(4, '0')}-${timestamp}`;
}