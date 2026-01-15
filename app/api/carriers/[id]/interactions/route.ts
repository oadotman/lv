import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET carrier interactions
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

    // Fetch interactions for the carrier
    const { data: interactions, error } = await supabase
      .from('carrier_interactions')
      .select(`
        *,
        profiles!carrier_interactions_user_id_fkey (
          full_name,
          avatar_url
        ),
        calls (
          id,
          recording_url,
          duration,
          status
        )
      `)
      .eq('carrier_id', params.id)
      .eq('organization_id', profile.organization_id)
      .order('interaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching interactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interactions' },
        { status: 500 }
      );
    }

    return NextResponse.json(interactions || []);
  } catch (error) {
    console.error('Error in get interactions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST a new interaction
export async function POST(
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
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.interaction_type || !body.notes) {
      return NextResponse.json(
        { error: 'Interaction type and notes are required' },
        { status: 400 }
      );
    }

    // Create interaction record
    const interactionData = {
      carrier_id: params.id,
      organization_id: profile.organization_id,
      user_id: user.id,
      interaction_type: body.interaction_type,
      interaction_date: body.interaction_date || new Date().toISOString(),
      notes: body.notes,
      rate_discussed: body.rate_discussed,
      lane_discussed: body.lane_discussed,
      call_id: body.call_id
    };

    const { data: interaction, error: interactionError } = await supabase
      .from('carrier_interactions')
      .insert(interactionData)
      .select(`
        *,
        profiles!carrier_interactions_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (interactionError) {
      console.error('Error creating interaction:', interactionError);
      return NextResponse.json(
        { error: 'Failed to create interaction' },
        { status: 500 }
      );
    }

    // Update carrier's last contact date
    const { error: updateError } = await supabase
      .from('carriers')
      .update({
        last_contact_date: interactionData.interaction_date,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      console.error('Error updating carrier last contact:', updateError);
    }

    return NextResponse.json(interaction);
  } catch (error) {
    console.error('Error in create interaction API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}