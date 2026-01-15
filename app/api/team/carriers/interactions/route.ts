import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const {
      carrier_id,
      call_id,
      interaction_type,
      notes,
      rate_discussed,
      lane_discussed
    } = await request.json();

    // Verify carrier belongs to organization
    const { data: carrier } = await supabase
      .from('carriers')
      .select('id')
      .eq('id', carrier_id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (!carrier) {
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
    }

    // Create interaction record
    const { data: interaction, error: interactionError } = await supabase
      .from('carrier_interactions')
      .insert({
        organization_id: userOrg.organization_id,
        carrier_id,
        call_id,
        user_id: user.id,
        interaction_type,
        notes,
        rate_discussed,
        lane_discussed,
        interaction_date: new Date().toISOString()
      })
      .select()
      .single();

    if (interactionError) {
      throw interactionError;
    }

    // Update carrier's last contact info
    const { error: updateError } = await supabase
      .from('carriers')
      .update({
        last_contact_date: new Date().toISOString().split('T')[0],
        last_contact_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', carrier_id)
      .eq('organization_id', userOrg.organization_id);

    if (updateError) {
      console.error('Error updating carrier last contact:', updateError);
      // Don't fail the request if this update fails
    }

    return NextResponse.json(interaction);
  } catch (error) {
    console.error('Error creating carrier interaction:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create interaction'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const carrier_id = searchParams.get('carrier_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('carrier_interactions')
      .select(`
        *,
        user:profiles!carrier_interactions_user_id_fkey(
          id,
          email,
          full_name
        ),
        carrier:carriers!carrier_interactions_carrier_id_fkey(
          id,
          carrier_name,
          mc_number
        )
      `)
      .eq('organization_id', userOrg.organization_id)
      .order('interaction_date', { ascending: false })
      .limit(limit);

    if (carrier_id) {
      query = query.eq('carrier_id', carrier_id);
    }

    const { data: interactions, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    return NextResponse.json(interactions || []);
  } catch (error) {
    console.error('Error fetching carrier interactions:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch interactions'
    }, { status: 500 });
  }
}