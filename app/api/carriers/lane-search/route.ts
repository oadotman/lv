import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Fuzzy match function for city names
function fuzzyMatchLocation(input: string, target: string): number {
  // Normalize strings
  const normalizedInput = input.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase().trim();

  // Exact match
  if (normalizedInput === normalizedTarget) return 1.0;

  // Contains match
  if (normalizedTarget.includes(normalizedInput) || normalizedInput.includes(normalizedTarget)) {
    return 0.8;
  }

  // Calculate Levenshtein distance for fuzzy matching
  const matrix: number[][] = [];
  const len1 = normalizedInput.length;
  const len2 = normalizedTarget.length;

  if (len1 === 0) return len2 === 0 ? 1.0 : 0;
  if (len2 === 0) return 0;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (normalizedTarget[i - 1] === normalizedInput[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return Math.max(0, 1 - distance / maxLen);
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const { origin, destination, equipment, radius = 100 } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    // Get all carriers for the organization
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select(`
        *,
        carrier_interactions!carrier_interactions_carrier_id_fkey (
          id,
          interaction_date,
          rate_discussed,
          lane_discussed,
          notes
        )
      `)
      .eq('organization_id', profile.organization_id)
      .neq('status', 'deleted');

    if (carriersError) {
      console.error('Error fetching carriers:', carriersError);
      return NextResponse.json(
        { error: 'Failed to fetch carriers' },
        { status: 500 }
      );
    }

    // Get lanes data for matching
    const { data: lanes, error: lanesError } = await supabase
      .from('lanes')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (lanesError) {
      console.error('Error fetching lanes:', lanesError);
    }

    // Get loads data for historical performance
    const { data: loads, error: loadsError } = await supabase
      .from('loads')
      .select(`
        id,
        origin_city,
        origin_state,
        destination_city,
        destination_state,
        carrier_name,
        rate,
        rate_per_mile,
        equipment_type,
        distance,
        status,
        created_at
      `)
      .eq('organization_id', profile.organization_id)
      .eq('status', 'delivered');

    if (loadsError) {
      console.error('Error fetching loads:', loadsError);
    }

    // Process and score carriers
    const scoredCarriers = (carriers || []).map(carrier => {
      let laneScore = 0;
      let hasExactLane = false;
      let hasSimilarLane = false;
      const matchingLoads: any[] = [];
      const matchingInteractions: any[] = [];
      const rates: number[] = [];

      // Check preferred lanes (JSONB)
      if (carrier.preferred_lanes && Array.isArray(carrier.preferred_lanes)) {
        carrier.preferred_lanes.forEach((lane: any) => {
          const originMatch = fuzzyMatchLocation(origin, lane.origin || '');
          const destMatch = fuzzyMatchLocation(destination, lane.destination || '');
          const combinedScore = (originMatch + destMatch) / 2;

          if (combinedScore > 0.9) {
            hasExactLane = true;
            laneScore = Math.max(laneScore, 100);
          } else if (combinedScore > 0.7) {
            hasSimilarLane = true;
            laneScore = Math.max(laneScore, 70);
          } else if (originMatch > 0.7 || destMatch > 0.7) {
            laneScore = Math.max(laneScore, 40);
          }
        });
      }

      // Check carrier interactions
      if (carrier.carrier_interactions) {
        carrier.carrier_interactions.forEach((interaction: any) => {
          if (interaction.lane_discussed) {
            const laneMatch = fuzzyMatchLocation(
              `${origin} to ${destination}`,
              interaction.lane_discussed
            );
            if (laneMatch > 0.6) {
              matchingInteractions.push(interaction);
              laneScore = Math.max(laneScore, 60);
              if (interaction.rate_discussed) {
                rates.push(interaction.rate_discussed);
              }
            }
          }
        });
      }

      // Check historical loads
      if (loads) {
        loads.forEach((load: any) => {
          if (load.carrier_name?.toLowerCase() === carrier.carrier_name?.toLowerCase()) {
            const originMatch = fuzzyMatchLocation(
              origin,
              `${load.origin_city}, ${load.origin_state}`
            );
            const destMatch = fuzzyMatchLocation(
              destination,
              `${load.destination_city}, ${load.destination_state}`
            );
            const combinedScore = (originMatch + destMatch) / 2;

            if (combinedScore > 0.7) {
              matchingLoads.push(load);
              laneScore = Math.max(laneScore, 80);
              if (load.rate) {
                rates.push(load.rate);
              }
            }
          }
        });
      }

      // Check equipment type if specified
      let equipmentMatch = true;
      if (equipment && carrier.equipment_types) {
        equipmentMatch = carrier.equipment_types.includes(equipment);
        if (!equipmentMatch) {
          laneScore = laneScore * 0.5; // Reduce score if equipment doesn't match
        }
      }

      // Calculate average rate
      const averageRate = rates.length > 0
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : null;

      // Calculate performance metrics
      const totalLoads = matchingLoads.length;
      const onTimeLoads = matchingLoads.filter((l: any) => l.status === 'delivered').length;
      const performanceRate = totalLoads > 0 ? (onTimeLoads / totalLoads) * 100 : null;

      return {
        ...carrier,
        laneScore,
        hasExactLane,
        hasSimilarLane,
        matchingLoads: matchingLoads.length,
        matchingInteractions: matchingInteractions.length,
        averageRate,
        performanceRate,
        equipmentMatch,
        lastContactedForLane: matchingInteractions[0]?.interaction_date || null,
        rates
      };
    });

    // Filter carriers with score > 0 and sort by score
    const relevantCarriers = scoredCarriers
      .filter(c => c.laneScore > 0)
      .sort((a, b) => b.laneScore - a.laneScore);

    // Calculate market statistics
    const allRates = relevantCarriers.flatMap(c => c.rates).filter(r => r > 0);
    const marketStats = {
      averageRate: allRates.length > 0
        ? allRates.reduce((a, b) => a + b, 0) / allRates.length
        : null,
      minRate: allRates.length > 0 ? Math.min(...allRates) : null,
      maxRate: allRates.length > 0 ? Math.max(...allRates) : null,
      medianRate: allRates.length > 0
        ? allRates.sort((a, b) => a - b)[Math.floor(allRates.length / 2)]
        : null,
      totalCarriers: relevantCarriers.length,
      carriersWithExactLane: relevantCarriers.filter(c => c.hasExactLane).length,
      carriersWithSimilarLane: relevantCarriers.filter(c => c.hasSimilarLane).length,
    };

    return NextResponse.json({
      carriers: relevantCarriers.slice(0, 50), // Limit to top 50 results
      marketStats,
      searchParams: {
        origin,
        destination,
        equipment,
        radius
      }
    });

  } catch (error) {
    console.error('Error in lane search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}