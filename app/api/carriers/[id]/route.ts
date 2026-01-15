import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET a single carrier
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch carrier with interactions and related data
    const { data: carrier, error } = await supabase
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
          created_at,
          profiles!carrier_interactions_user_id_fkey (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('carrier_interactions.interaction_date', { ascending: false })
      .single();

    // Get related calls separately if needed
    if (carrier) {
      const { data: calls } = await supabase
        .from('calls')
        .select(`
          id,
          recording_url,
          duration,
          status,
          created_at,
          profiles!calls_user_id_fkey (
            full_name
          )
        `)
        .eq('organization_id', profile.organization_id)
        .or(`metadata->>carrier_id.eq.${params.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      carrier.calls = calls || [];
    }

    if (error) {
      console.error('Error fetching carrier:', error);
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
    }

    return NextResponse.json(carrier);
  } catch (error) {
    console.error('Error in get carrier API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE a carrier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Update carrier data
    const updateData = {
      ...body,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.organization_id;
    delete updateData.created_at;
    delete updateData.created_by;

    const { data: carrier, error } = await supabase
      .from('carriers')
      .update(updateData)
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating carrier:', error);
      return NextResponse.json(
        { error: 'Failed to update carrier' },
        { status: 500 }
      );
    }

    return NextResponse.json(carrier);
  } catch (error) {
    console.error('Error in update carrier API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a carrier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Soft delete by setting status to 'deleted'
    const { error } = await supabase
      .from('carriers')
      .update({
        status: 'deleted',
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error('Error deleting carrier:', error);
      return NextResponse.json(
        { error: 'Failed to delete carrier' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete carrier API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}