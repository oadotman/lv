import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Types for parsed query intents
interface ParsedQuery {
  intent: 'find_carriers' | 'get_rates' | 'show_history' | 'get_info' | 'unknown';
  entities: {
    carriers?: string[];
    lanes?: { origin?: string; destination?: string }[];
    equipment?: string[];
    dateRange?: { start: Date; end: Date };
    rateQuery?: 'average' | 'cheapest' | 'highest' | 'last_quote';
    timeReference?: string;
  };
  originalQuery: string;
}

interface QueryResponse {
  answer: string;
  data?: any[];
  suggestions?: string[];
  links?: Array<{ label: string; url: string }>;
  queryType: string;
}

// Parse natural language query using OpenAI
async function parseQuery(query: string): Promise<ParsedQuery> {
  try {
    const systemPrompt = `You are a query parser for a logistics carrier database. Parse the user's natural language query and extract:

    1. Intent (choose one):
       - find_carriers: Looking for carriers for lanes, equipment, or availability
       - get_rates: Asking about rates, quotes, or pricing
       - show_history: Requesting historical data about calls, loads, or interactions
       - get_info: General information about a specific carrier
       - unknown: Cannot determine intent

    2. Entities:
       - carriers: Array of carrier names mentioned
       - lanes: Array of origin/destination pairs (e.g., "Atlanta to Miami" -> {origin: "Atlanta, GA", destination: "Miami, FL"})
       - equipment: Array of equipment types (dry_van, reefer, flatbed, etc.)
       - dateRange: Time period referenced (convert relative dates like "last week" to actual dates, today is ${new Date().toISOString()})
       - rateQuery: Type of rate question (average, cheapest, highest, last_quote)
       - timeReference: Original time phrase used

    Return a JSON object with these fields. Be smart about inferring locations (add state abbreviations when obvious).

    Examples:
    - "Find carriers for Atlanta to Miami" -> intent: find_carriers, lanes: [{origin: "Atlanta, GA", destination: "Miami, FL"}]
    - "What's my average rate for Chicago to Dallas?" -> intent: get_rates, rateQuery: average, lanes: [{origin: "Chicago, IL", destination: "Dallas, TX"}]
    - "Show me carriers I haven't used in 30 days" -> intent: find_carriers, dateRange: {start: 30 days ago, end: now}
    - "When did I last talk to ABC Trucking?" -> intent: show_history, carriers: ["ABC Trucking"]
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');

    // Convert date strings to Date objects if present
    if (parsed.entities?.dateRange) {
      parsed.entities.dateRange = {
        start: new Date(parsed.entities.dateRange.start),
        end: new Date(parsed.entities.dateRange.end)
      };
    }

    return {
      intent: parsed.intent || 'unknown',
      entities: parsed.entities || {},
      originalQuery: query
    };
  } catch (error) {
    console.error('Error parsing query with OpenAI:', error);

    // Fallback to basic pattern matching
    return fallbackParser(query);
  }
}

// Fallback parser using pattern matching
function fallbackParser(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  let intent: ParsedQuery['intent'] = 'unknown';
  const entities: ParsedQuery['entities'] = {};

  // Detect intent based on keywords
  if (lowerQuery.includes('find') || lowerQuery.includes('show') || lowerQuery.includes('who')) {
    intent = 'find_carriers';
  } else if (lowerQuery.includes('rate') || lowerQuery.includes('price') || lowerQuery.includes('quote') || lowerQuery.includes('cheapest')) {
    intent = 'get_rates';
  } else if (lowerQuery.includes('when') || lowerQuery.includes('last') || lowerQuery.includes('history') || lowerQuery.includes('yesterday')) {
    intent = 'show_history';
  }

  // Extract lanes (simple pattern: "X to Y")
  const laneMatch = query.match(/(\w+(?:\s+\w+)*)\s+to\s+(\w+(?:\s+\w+)*)/i);
  if (laneMatch) {
    entities.lanes = [{
      origin: laneMatch[1].trim(),
      destination: laneMatch[2].trim()
    }];
  }

  // Extract equipment types
  const equipmentTypes = ['dry van', 'reefer', 'flatbed', 'step deck', 'lowboy', 'power only', 'hotshot'];
  equipmentTypes.forEach(type => {
    if (lowerQuery.includes(type)) {
      if (!entities.equipment) entities.equipment = [];
      entities.equipment.push(type.replace(' ', '_'));
    }
  });

  // Extract date ranges
  if (lowerQuery.includes('yesterday')) {
    const yesterday = subDays(new Date(), 1);
    entities.dateRange = {
      start: startOfDay(yesterday),
      end: endOfDay(yesterday)
    };
  } else if (lowerQuery.includes('last week')) {
    entities.dateRange = {
      start: startOfWeek(subDays(new Date(), 7)),
      end: endOfWeek(subDays(new Date(), 7))
    };
  } else if (lowerQuery.includes('30 days')) {
    entities.dateRange = {
      start: subDays(new Date(), 30),
      end: new Date()
    };
  }

  return { intent, entities, originalQuery: query };
}

// Execute the parsed query
async function executeQuery(
  parsedQuery: ParsedQuery,
  organizationId: string,
  supabase: any
): Promise<QueryResponse> {
  switch (parsedQuery.intent) {
    case 'find_carriers':
      return await findCarriers(parsedQuery, organizationId, supabase);

    case 'get_rates':
      return await getRates(parsedQuery, organizationId, supabase);

    case 'show_history':
      return await showHistory(parsedQuery, organizationId, supabase);

    case 'get_info':
      return await getCarrierInfo(parsedQuery, organizationId, supabase);

    default:
      return {
        answer: "I couldn't understand your query. Here are some examples of what you can ask:",
        suggestions: [
          "Find carriers for Atlanta to Miami",
          "What's my average rate for Chicago to Dallas?",
          "Show me carriers with dry van equipment",
          "When did I last talk to ABC Trucking?",
          "What loads did I book last week?",
          "Cheapest carrier for Houston to Phoenix?"
        ],
        queryType: 'unknown'
      };
  }
}

// Find carriers based on criteria
async function findCarriers(
  parsedQuery: ParsedQuery,
  organizationId: string,
  supabase: any
): Promise<QueryResponse> {
  const { entities } = parsedQuery;

  try {
    let query = supabase
      .from('carriers')
      .select(`
        *,
        carrier_interactions!carrier_interactions_carrier_id_fkey (
          id,
          interaction_date,
          interaction_type,
          rate_discussed,
          lane_discussed
        )
      `)
      .eq('organization_id', organizationId)
      .neq('status', 'deleted');

    // Filter by equipment if specified
    if (entities.equipment && entities.equipment.length > 0) {
      query = query.contains('equipment_types', entities.equipment);
    }

    // Filter by date range (carriers not contacted in X days)
    if (entities.dateRange) {
      // This is complex - we need carriers NOT contacted in the range
      // We'll fetch all and filter in JavaScript
    }

    const { data: carriers, error } = await query;

    if (error) throw error;

    let filteredCarriers = carriers || [];

    // Handle lane-based search
    if (entities.lanes && entities.lanes.length > 0) {
      const lane = entities.lanes[0];

      // Filter carriers by lane experience
      filteredCarriers = filteredCarriers.filter(carrier => {
        // Check preferred lanes
        if (carrier.preferred_lanes && Array.isArray(carrier.preferred_lanes)) {
          return carrier.preferred_lanes.some((pLane: any) => {
            const originMatch = lane.origin && pLane.origin?.toLowerCase().includes(lane.origin.toLowerCase());
            const destMatch = lane.destination && pLane.destination?.toLowerCase().includes(lane.destination.toLowerCase());
            return originMatch || destMatch;
          });
        }

        // Check interactions for lane discussions
        if (carrier.carrier_interactions) {
          return carrier.carrier_interactions.some((interaction: any) => {
            if (!interaction.lane_discussed) return false;
            const discussed = interaction.lane_discussed.toLowerCase();
            return (lane.origin && discussed.includes(lane.origin.toLowerCase())) ||
                   (lane.destination && discussed.includes(lane.destination.toLowerCase()));
          });
        }

        return false;
      });
    }

    // Handle "not contacted in X days" filter
    if (entities.dateRange && parsedQuery.originalQuery.toLowerCase().includes("haven't")) {
      const cutoffDate = entities.dateRange.start;
      filteredCarriers = filteredCarriers.filter(carrier => {
        if (!carrier.carrier_interactions || carrier.carrier_interactions.length === 0) {
          return true; // Never contacted
        }
        const lastContact = carrier.carrier_interactions
          .map((i: any) => new Date(i.interaction_date))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

        return lastContact < cutoffDate;
      });
    }

    // Format response
    let answer = '';
    const links: Array<{ label: string; url: string }> = [];

    if (filteredCarriers.length === 0) {
      answer = "No carriers found matching your criteria.";
    } else if (entities.lanes && entities.lanes.length > 0) {
      const lane = entities.lanes[0];
      answer = `Found ${filteredCarriers.length} carrier${filteredCarriers.length === 1 ? '' : 's'} for ${lane.origin} to ${lane.destination}.`;
    } else if (entities.equipment && entities.equipment.length > 0) {
      answer = `Found ${filteredCarriers.length} carrier${filteredCarriers.length === 1 ? '' : 's'} with ${entities.equipment.join(', ')} equipment.`;
    } else if (entities.dateRange) {
      answer = `Found ${filteredCarriers.length} carrier${filteredCarriers.length === 1 ? '' : 's'} you haven't contacted recently.`;
    } else {
      answer = `Found ${filteredCarriers.length} carrier${filteredCarriers.length === 1 ? '' : 's'}.`;
    }

    // Add links to top carriers
    filteredCarriers.slice(0, 5).forEach(carrier => {
      links.push({
        label: carrier.carrier_name,
        url: `/carriers/${carrier.id}`
      });
    });

    return {
      answer,
      data: filteredCarriers.slice(0, 10),
      links,
      queryType: 'carriers'
    };

  } catch (error) {
    console.error('Error finding carriers:', error);
    return {
      answer: "Sorry, I encountered an error while searching for carriers.",
      queryType: 'error'
    };
  }
}

// Get rate information
async function getRates(
  parsedQuery: ParsedQuery,
  organizationId: string,
  supabase: any
): Promise<QueryResponse> {
  const { entities } = parsedQuery;

  try {
    // Get loads for rate data
    let loadsQuery = supabase
      .from('loads')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'delivered');

    // Filter by lane if specified
    if (entities.lanes && entities.lanes.length > 0) {
      const lane = entities.lanes[0];
      if (lane.origin) {
        loadsQuery = loadsQuery.ilike('origin_city', `%${lane.origin.split(',')[0]}%`);
      }
      if (lane.destination) {
        loadsQuery = loadsQuery.ilike('destination_city', `%${lane.destination.split(',')[0]}%`);
      }
    }

    // Filter by carrier if specified
    if (entities.carriers && entities.carriers.length > 0) {
      loadsQuery = loadsQuery.ilike('carrier_name', `%${entities.carriers[0]}%`);
    }

    const { data: loads, error } = await loadsQuery;

    if (error) throw error;

    if (!loads || loads.length === 0) {
      return {
        answer: "No rate data found for the specified criteria.",
        queryType: 'rates'
      };
    }

    // Calculate rates based on query type
    const rates = loads.map(l => l.rate).filter(r => r > 0);
    let answer = '';
    let relevantData = [];

    if (entities.rateQuery === 'average') {
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      answer = `The average rate is $${avgRate.toFixed(2).toLocaleString()}`;
      relevantData = [{ average: avgRate, count: rates.length }];
    } else if (entities.rateQuery === 'cheapest') {
      const minRate = Math.min(...rates);
      const cheapestLoad = loads.find(l => l.rate === minRate);
      answer = `The cheapest rate was $${minRate.toLocaleString()}`;
      if (cheapestLoad?.carrier_name) {
        answer += ` from ${cheapestLoad.carrier_name}`;
      }
      relevantData = [cheapestLoad];
    } else if (entities.rateQuery === 'highest') {
      const maxRate = Math.max(...rates);
      const highestLoad = loads.find(l => l.rate === maxRate);
      answer = `The highest rate was $${maxRate.toLocaleString()}`;
      if (highestLoad?.carrier_name) {
        answer += ` from ${highestLoad.carrier_name}`;
      }
      relevantData = [highestLoad];
    } else if (entities.rateQuery === 'last_quote') {
      const latestLoad = loads.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      if (latestLoad) {
        answer = `The last quoted rate was $${latestLoad.rate?.toLocaleString() || 'N/A'}`;
        if (latestLoad.carrier_name) {
          answer += ` from ${latestLoad.carrier_name}`;
        }
        answer += ` on ${format(new Date(latestLoad.created_at), 'MMM d, yyyy')}`;
        relevantData = [latestLoad];
      }
    } else {
      // General rate summary
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);
      answer = `Rate summary: Average $${avgRate.toFixed(2)}, Range $${minRate} - $${maxRate}`;
      relevantData = loads.slice(0, 5);
    }

    // Add lane info to answer if specified
    if (entities.lanes && entities.lanes.length > 0) {
      const lane = entities.lanes[0];
      answer += ` for ${lane.origin} to ${lane.destination}`;
    }

    return {
      answer,
      data: relevantData,
      queryType: 'rates'
    };

  } catch (error) {
    console.error('Error getting rates:', error);
    return {
      answer: "Sorry, I encountered an error while fetching rate information.",
      queryType: 'error'
    };
  }
}

// Show historical data
async function showHistory(
  parsedQuery: ParsedQuery,
  organizationId: string,
  supabase: any
): Promise<QueryResponse> {
  const { entities } = parsedQuery;

  try {
    // Check if asking about carrier interactions
    if (entities.carriers && entities.carriers.length > 0) {
      const carrierName = entities.carriers[0];

      // Find the carrier
      const { data: carrier } = await supabase
        .from('carriers')
        .select(`
          *,
          carrier_interactions!carrier_interactions_carrier_id_fkey (
            id,
            interaction_date,
            interaction_type,
            notes
          )
        `)
        .eq('organization_id', organizationId)
        .ilike('carrier_name', `%${carrierName}%`)
        .single();

      if (carrier && carrier.carrier_interactions?.length > 0) {
        const lastInteraction = carrier.carrier_interactions
          .sort((a: any, b: any) =>
            new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime()
          )[0];

        const answer = `You last talked to ${carrier.carrier_name} on ${format(new Date(lastInteraction.interaction_date), 'MMM d, yyyy')} (${lastInteraction.interaction_type})`;

        return {
          answer,
          data: [carrier],
          links: [{
            label: `View ${carrier.carrier_name} profile`,
            url: `/carriers/${carrier.id}`
          }],
          queryType: 'history'
        };
      } else {
        return {
          answer: `No interaction history found for "${carrierName}".`,
          queryType: 'history'
        };
      }
    }

    // Check if asking about loads
    if (parsedQuery.originalQuery.toLowerCase().includes('load')) {
      let loadsQuery = supabase
        .from('loads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (entities.dateRange) {
        loadsQuery = loadsQuery
          .gte('created_at', entities.dateRange.start.toISOString())
          .lte('created_at', entities.dateRange.end.toISOString());
      }

      const { data: loads } = await loadsQuery.limit(10);

      if (loads && loads.length > 0) {
        const answer = `Found ${loads.length} load${loads.length === 1 ? '' : 's'}${entities.timeReference ? ' from ' + entities.timeReference : ''}.`;

        return {
          answer,
          data: loads,
          queryType: 'history'
        };
      }
    }

    // Check if asking about calls
    if (parsedQuery.originalQuery.toLowerCase().includes('call')) {
      let callsQuery = supabase
        .from('calls')
        .select(`
          *,
          profiles!calls_user_id_fkey (
            full_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (entities.dateRange) {
        callsQuery = callsQuery
          .gte('created_at', entities.dateRange.start.toISOString())
          .lte('created_at', entities.dateRange.end.toISOString());
      }

      const { data: calls } = await callsQuery.limit(10);

      if (calls && calls.length > 0) {
        const answer = `Found ${calls.length} call${calls.length === 1 ? '' : 's'}${entities.timeReference ? ' from ' + entities.timeReference : ''}.`;

        const links = calls.slice(0, 5).map((call: any) => ({
          label: `Call from ${format(new Date(call.created_at), 'MMM d, h:mm a')}`,
          url: `/calls/${call.id}`
        }));

        return {
          answer,
          data: calls,
          links,
          queryType: 'history'
        };
      }
    }

    return {
      answer: "No historical data found for your query.",
      queryType: 'history'
    };

  } catch (error) {
    console.error('Error fetching history:', error);
    return {
      answer: "Sorry, I encountered an error while fetching historical data.",
      queryType: 'error'
    };
  }
}

// Get specific carrier information
async function getCarrierInfo(
  parsedQuery: ParsedQuery,
  organizationId: string,
  supabase: any
): Promise<QueryResponse> {
  const { entities } = parsedQuery;

  if (!entities.carriers || entities.carriers.length === 0) {
    return {
      answer: "Please specify a carrier name to get information about.",
      queryType: 'info'
    };
  }

  try {
    const carrierName = entities.carriers[0];

    const { data: carrier } = await supabase
      .from('carriers')
      .select(`
        *,
        carrier_interactions!carrier_interactions_carrier_id_fkey (
          id,
          interaction_date,
          interaction_type,
          rate_discussed,
          lane_discussed
        )
      `)
      .eq('organization_id', organizationId)
      .ilike('carrier_name', `%${carrierName}%`)
      .single();

    if (!carrier) {
      return {
        answer: `No carrier found with name "${carrierName}".`,
        queryType: 'info'
      };
    }

    let answer = `${carrier.carrier_name}:\n`;

    if (carrier.mc_number) answer += `• MC# ${carrier.mc_number}\n`;
    if (carrier.dot_number) answer += `• DOT# ${carrier.dot_number}\n`;
    if (carrier.dispatch_phone) answer += `• Phone: ${carrier.dispatch_phone}\n`;
    if (carrier.equipment_types?.length > 0) {
      answer += `• Equipment: ${carrier.equipment_types.map((e: string) => e.replace('_', ' ')).join(', ')}\n`;
    }
    if (carrier.internal_rating) answer += `• Rating: ${carrier.internal_rating}/5\n`;

    if (carrier.carrier_interactions?.length > 0) {
      answer += `• ${carrier.carrier_interactions.length} interaction${carrier.carrier_interactions.length === 1 ? '' : 's'} on record`;
    }

    return {
      answer,
      data: [carrier],
      links: [{
        label: `View ${carrier.carrier_name} full profile`,
        url: `/carriers/${carrier.id}`
      }],
      queryType: 'info'
    };

  } catch (error) {
    console.error('Error getting carrier info:', error);
    return {
      answer: "Sorry, I encountered an error while fetching carrier information.",
      queryType: 'error'
    };
  }
}

// Main API handler
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
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Parse the natural language query
    const parsedQuery = await parseQuery(query);

    // Execute the query
    const response = await executeQuery(parsedQuery, profile.organization_id, supabase);

    return NextResponse.json({
      ...response,
      parsedQuery // Include for debugging
    });

  } catch (error) {
    console.error('Error in NL search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}