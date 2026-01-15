import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { originCity, originState, destinationCity, destinationState } = body;

    if (!originState || !destinationState) {
      return NextResponse.json(
        { error: 'Origin and destination states are required' },
        { status: 400 }
      );
    }

    // First, check if we have this lane in the lanes table
    const laneKey = `${originState}-${destinationState}`;
    const { data: lane } = await supabase
      .from('lanes')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('origin_state', originState)
      .eq('destination_state', destinationState)
      .single();

    // Get carriers that have this lane in their preferred_lanes
    let carriersQuery = supabase
      .from('carriers')
      .select(`
        *,
        carrier_interactions!carrier_interactions_carrier_id_fkey (
          id,
          interaction_type,
          interaction_date,
          rate_discussed,
          lane_discussed,
          notes
        )
      `)
      .eq('organization_id', profile.organization_id)
      .neq('status', 'deleted');

    // Filter by preferred lanes - looking for carriers who run this lane
    const { data: carriers, error } = await carriersQuery;

    if (error) {
      console.error('Error fetching carriers by lane:', error);
      return NextResponse.json(
        { error: 'Failed to fetch carriers' },
        { status: 500 }
      );
    }

    // Filter and score carriers based on lane experience
    const scoredCarriers = (carriers || []).map(carrier => {
      let score = 0;
      let hasLane = false;

      // Check if carrier has this lane in preferred_lanes
      if (carrier.preferred_lanes) {
        const lanes = carrier.preferred_lanes;
        if (typeof lanes === 'object') {
          // Check if the lane exists in various formats
          const laneKeys = [
            laneKey,
            `${originCity}, ${originState} - ${destinationCity}, ${destinationState}`,
            `${originState} to ${destinationState}`,
            `${originCity}-${destinationCity}`
          ];

          for (const key of laneKeys) {
            if (lanes[key] ||
                Object.keys(lanes).some(k =>
                  k.toLowerCase().includes(originState.toLowerCase()) &&
                  k.toLowerCase().includes(destinationState.toLowerCase())
                )) {
              hasLane = true;
              score += 50;
              break;
            }
          }
        }
      }

      // Check recent interactions for this lane
      if (carrier.carrier_interactions) {
        const laneInteractions = carrier.carrier_interactions.filter(interaction => {
          if (!interaction.lane_discussed) return false;
          const discussedLane = interaction.lane_discussed.toLowerCase();
          return discussedLane.includes(originState.toLowerCase()) &&
                 discussedLane.includes(destinationState.toLowerCase());
        });

        if (laneInteractions.length > 0) {
          hasLane = true;
          score += 30 + (laneInteractions.length * 5);

          // Bonus for recent discussions
          const recentInteraction = laneInteractions.find(i => {
            const date = new Date(i.interaction_date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return date >= thirtyDaysAgo;
          });

          if (recentInteraction) {
            score += 20;
            carrier.last_lane_rate = recentInteraction.rate_discussed;
          }
        }
      }

      // Add performance score
      if (carrier.internal_rating) {
        score += carrier.internal_rating * 10;
      }

      // Add points for completed loads
      if (carrier.completed_loads) {
        score += Math.min(carrier.completed_loads, 20);
      }

      return {
        ...carrier,
        lane_score: score,
        has_lane: hasLane
      };
    });

    // Sort by score and filter
    const relevantCarriers = scoredCarriers
      .sort((a, b) => b.lane_score - a.lane_score)
      .filter(c => c.has_lane || c.lane_score > 0);

    // Get best carriers from the lane record if it exists
    let bestCarriers = [];
    if (lane?.best_carriers) {
      const { data: bestCarriersData } = await supabase
        .from('carriers')
        .select('*')
        .in('id', lane.best_carriers)
        .eq('organization_id', profile.organization_id);
      bestCarriers = bestCarriersData || [];
    }

    return NextResponse.json({
      carriers: relevantCarriers.slice(0, 20), // Return top 20 carriers
      lane: lane || null,
      bestCarriers: bestCarriers || [],
      stats: {
        total: relevantCarriers.length,
        withLaneExperience: relevantCarriers.filter(c => c.has_lane).length,
        averageRate: lane?.average_rate || null
      }
    });
  } catch (error) {
    console.error('Error in search by lane API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}