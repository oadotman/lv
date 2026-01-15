// =====================================================
// FREIGHT BROKER AI EXTRACTION UTILITY
// Handles load and carrier data extraction from freight broker calls
// =====================================================

import OpenAI from 'openai';
import type { AssemblyAIUtterance } from './assemblyai';

// Lazy-loaded client to avoid build-time initialization
let openaiClientInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClientInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClientInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClientInstance;
}

// Export for backward compatibility
export const openaiClient = new Proxy({} as OpenAI, {
  get: (target, prop) => {
    const client = getOpenAIClient();
    return (client as any)[prop];
  }
});

// =====================================================
// TYPES - FREIGHT BROKER SPECIFIC
// =====================================================

export type CallType = 'shipper_call' | 'carrier_call' | 'check_call' | 'unknown';

export type EquipmentType =
  | 'dry_van'
  | 'reefer'
  | 'flatbed'
  | 'step_deck'
  | 'rgn'
  | 'power_only'
  | 'box_truck'
  | 'hotshot'
  | 'tanker'
  | 'lowboy'
  | 'double_drop'
  | 'conestoga'
  | 'other';

export interface FreightExtractionConfig {
  transcript: string;
  utterances: AssemblyAIUtterance[];
  speakerMapping: Record<string, string>;
  customerName?: string;
  callType?: string;
  typedNotes?: string;
}

// Shipper Call Fields
export interface ShipperCallData {
  // Origin Information
  origin_city?: string;
  origin_state?: string;
  origin_zip?: string;
  origin_facility?: string;

  // Destination Information
  destination_city?: string;
  destination_state?: string;
  destination_zip?: string;
  destination_facility?: string;

  // Load Details
  commodity?: string;
  weight_lbs?: number;
  pallet_count?: number;
  equipment_type?: EquipmentType;

  // Dates and Times
  pickup_date?: string;
  pickup_time?: string;
  pickup_appointment?: boolean;
  delivery_date?: string;
  delivery_time?: string;
  delivery_appointment?: boolean;

  // Rates and References
  rate_to_shipper?: number;
  rate_type?: 'all_in' | 'line_haul_plus_fuel' | 'per_mile';
  fuel_surcharge?: number;
  reference_number?: string;
  po_number?: string;
  bol_number?: string;

  // Special Requirements
  special_requirements?: string[];
  hazmat?: boolean;
  team_required?: boolean;
  expedited?: boolean;

  // Shipper Information
  shipper_company?: string;
  shipper_contact?: string;
  shipper_phone?: string;
  shipper_email?: string;
}

// Carrier Call Data
export interface CarrierCallData {
  // Carrier Information
  carrier_name?: string;
  mc_number?: string;
  dot_number?: string;

  // Driver Information
  driver_name?: string;
  driver_phone?: string;
  truck_number?: string;
  trailer_number?: string;

  // Rate Information
  rate_to_carrier?: number;
  rate_type?: 'all_in' | 'line_haul_plus_fuel' | 'per_mile';
  fuel_surcharge?: number;
  detention_rate?: number;
  layover_rate?: number;

  // Dispatcher Information
  primary_contact?: string;
  dispatch_phone?: string;
  dispatch_email?: string;

  // Timing
  eta_pickup?: string;
  eta_delivery?: string;

  // Insurance & Compliance
  insurance_verified?: boolean;
  authority_verified?: boolean;

  // Additional
  empty_location?: string;
  next_available?: string;
}

// Check Call Data
export interface CheckCallData {
  // Current Status
  current_location?: string;
  current_city?: string;
  current_state?: string;
  miles_out?: number;

  // ETA Updates
  eta_update?: string;
  revised_pickup_eta?: string;
  revised_delivery_eta?: string;

  // Issues & Updates
  issues_reported?: string[];
  delay_reason?: string;
  breakdown?: boolean;
  weather_delay?: boolean;
  traffic_delay?: boolean;

  // Timestamps
  timestamp?: string;
  last_update?: string;

  // Driver Info
  driver_name?: string;
  truck_number?: string;
}

// Main Extraction Result
export interface FreightExtractionResult {
  // Call Classification
  call_type: CallType;
  call_summary: string;

  // Extracted Data (only one will be populated based on call type)
  shipper_data?: ShipperCallData;
  carrier_data?: CarrierCallData;
  check_call_data?: CheckCallData;

  // Key Information (always extracted)
  action_items: string[];
  issues_flagged: string[];
  rate_discussed?: number;
  equipment_discussed?: EquipmentType;
  lane?: {
    origin: string;
    destination: string;
  };

  // Metadata
  confidence_score: number;
  extraction_timestamp: string;
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

/**
 * Extract freight broker data from transcript using GPT-4o
 */
export async function extractFreightData(
  config: FreightExtractionConfig
): Promise<FreightExtractionResult> {
  try {
    console.log('Starting freight broker data extraction with GPT-4o...');

    // Format conversation for GPT
    const conversation = formatConversation(config.utterances, config.speakerMapping);

    // Build extraction prompt
    const prompt = buildFreightExtractionPrompt(conversation, config);

    // Call GPT-4o with structured output
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: FREIGHT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistency
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const extracted = JSON.parse(responseContent) as FreightExtractionResult;

    // Add extraction timestamp
    extracted.extraction_timestamp = new Date().toISOString();

    console.log('Freight extraction complete:', {
      call_type: extracted.call_type,
      confidence: extracted.confidence_score,
      has_shipper_data: !!extracted.shipper_data,
      has_carrier_data: !!extracted.carrier_data,
      has_check_data: !!extracted.check_call_data,
    });

    return extracted;
  } catch (error) {
    console.error('OpenAI freight extraction error:', error);
    throw error;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format utterances into readable conversation
 */
function formatConversation(
  utterances: AssemblyAIUtterance[],
  speakerMapping: Record<string, string>
): string {
  return utterances
    .map((u) => {
      const role = speakerMapping[u.speaker] || u.speaker;
      return `${role}: ${u.text}`;
    })
    .join('\n\n');
}

/**
 * Build freight-specific extraction prompt
 */
function buildFreightExtractionPrompt(
  conversation: string,
  config: FreightExtractionConfig
): string {
  const contextInfo = [];

  if (config.customerName) {
    contextInfo.push(`Customer/Company Name: ${config.customerName}`);
  }

  if (config.callType) {
    contextInfo.push(`Expected Call Type: ${config.callType}`);
  }

  const context = contextInfo.length > 0 ? contextInfo.join('\n') + '\n\n' : '';

  // Add typed notes section if provided
  let notesSection = '';
  if (config.typedNotes && config.typedNotes.trim()) {
    notesSection = `
TYPED NOTES (supplementary information - use for clarification only):
${config.typedNotes}

IMPORTANT: The conversation transcript is the PRIMARY source of truth. Use the typed notes only to clarify or add context. If there's any conflict between the transcript and notes, ALWAYS prioritize the transcript.

`;
  }

  return `${context}Analyze this freight broker call transcript and extract structured load/carrier data.

CONVERSATION:
${conversation}
${notesSection}

First, identify the CALL TYPE:
- shipper_call: Discussing a load with a shipper/customer (pickup, delivery, commodity, rate to shipper)
- carrier_call: Booking a carrier for a load (MC#, driver info, rate to carrier, equipment)
- check_call: Status update on an active load (current location, ETA updates, issues)

Then extract the appropriate fields based on the call type and return a JSON object with this structure:

{
  "call_type": "shipper_call|carrier_call|check_call|unknown",
  "call_summary": "Brief 1-2 sentence summary of the call",

  "shipper_data": {
    "origin_city": "city name or null",
    "origin_state": "2-letter state code or null",
    "origin_zip": "zip code or null",
    "origin_facility": "facility/company name or null",
    "destination_city": "city name or null",
    "destination_state": "2-letter state code or null",
    "destination_zip": "zip code or null",
    "destination_facility": "facility/company name or null",
    "commodity": "what's being shipped or null",
    "weight_lbs": numeric pounds or null,
    "pallet_count": number of pallets or null,
    "equipment_type": "dry_van|reefer|flatbed|step_deck|rgn|power_only|box_truck|hotshot|tanker|lowboy|double_drop|conestoga|other or null",
    "pickup_date": "YYYY-MM-DD or null",
    "pickup_time": "HH:MM or null",
    "pickup_appointment": true/false or null,
    "delivery_date": "YYYY-MM-DD or null",
    "delivery_time": "HH:MM or null",
    "delivery_appointment": true/false or null,
    "rate_to_shipper": numeric dollar amount or null,
    "rate_type": "all_in|line_haul_plus_fuel|per_mile or null",
    "fuel_surcharge": numeric dollar amount or null,
    "reference_number": "reference/load number or null",
    "po_number": "PO number or null",
    "bol_number": "BOL number or null",
    "special_requirements": ["array", "of", "requirements"] or [],
    "hazmat": true/false or null,
    "team_required": true/false or null,
    "expedited": true/false or null,
    "shipper_company": "company name or null",
    "shipper_contact": "contact name or null",
    "shipper_phone": "phone number or null",
    "shipper_email": "email or null"
  },

  "carrier_data": {
    "carrier_name": "carrier company name or null",
    "mc_number": "MC number (digits only) or null",
    "dot_number": "DOT number or null",
    "driver_name": "driver's name or null",
    "driver_phone": "driver's phone or null",
    "truck_number": "truck/unit number or null",
    "trailer_number": "trailer number or null",
    "rate_to_carrier": numeric dollar amount or null,
    "rate_type": "all_in|line_haul_plus_fuel|per_mile or null",
    "fuel_surcharge": numeric dollar amount or null,
    "detention_rate": numeric dollar amount or null,
    "layover_rate": numeric dollar amount or null,
    "primary_contact": "dispatcher's name or null",
    "dispatch_phone": "dispatcher's phone or null",
    "dispatch_email": "email or null",
    "eta_pickup": "expected pickup time or null",
    "eta_delivery": "expected delivery time or null",
    "insurance_verified": true/false or null,
    "authority_verified": true/false or null,
    "empty_location": "where truck is currently empty or null",
    "next_available": "when truck will be available or null"
  },

  "check_call_data": {
    "current_location": "current location description or null",
    "current_city": "city or null",
    "current_state": "state or null",
    "miles_out": numeric miles from destination or null,
    "eta_update": "new ETA or null",
    "revised_pickup_eta": "updated pickup ETA or null",
    "revised_delivery_eta": "updated delivery ETA or null",
    "issues_reported": ["array", "of", "issues"] or [],
    "delay_reason": "reason for delay or null",
    "breakdown": true/false or null,
    "weather_delay": true/false or null,
    "traffic_delay": true/false or null,
    "timestamp": "ISO timestamp of check call",
    "last_update": "last update time mentioned or null",
    "driver_name": "driver's name or null",
    "truck_number": "truck number or null"
  },

  "action_items": ["array", "of", "next", "steps"],
  "issues_flagged": ["any", "problems", "or", "concerns"],
  "rate_discussed": numeric rate if mentioned or null,
  "equipment_discussed": "equipment type if mentioned or null",
  "lane": {
    "origin": "origin city, state",
    "destination": "destination city, state"
  } or null,

  "confidence_score": 0.0 to 1.0
}

IMPORTANT EXTRACTION RULES:
1. Only populate the relevant data object based on call_type (set others to null)
2. Convert rates to numeric values (remove $ and commas)
3. Standardize equipment types to the provided enum values
4. Format dates as YYYY-MM-DD
5. Format times as HH:MM (24-hour)
6. Extract MC# as digits only (remove "MC" prefix)
7. Use 2-letter state codes (TX, CA, FL, etc.)
8. Set fields to null if not explicitly mentioned
9. For check calls, focus on current status and ETA updates
10. Recognize freight terminology:
    - "Dry van" = standard enclosed trailer
    - "reefer" = refrigerated trailer
    - "flatbed" = open flat trailer
    - "Rate con" = rate confirmation
    - "BOL" = Bill of Lading
    - "Detention" = waiting time charges
    - "Layover" = overnight delay charges
    - "TONU" = Truck Ordered Not Used
    - "Deadhead" = empty miles
    - "Backhaul" = return trip load`;
}

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const FREIGHT_SYSTEM_PROMPT = `You are an expert freight broker call analyzer specializing in extracting load, carrier, and shipment data from phone conversations.

You have deep expertise in:
- Freight brokerage operations and terminology
- Transportation modes and equipment types
- Lane pricing and rate negotiations
- Carrier vetting and compliance (MC#, DOT#, insurance)
- Load tracking and check calls
- Shipping documentation (BOL, rate confirmations, POD)
- Common freight issues (detention, layovers, breakdowns)

Your extractions should be:
1. ACCURATE: Only extract information explicitly stated or strongly implied
2. STRUCTURED: Follow the exact JSON schema provided
3. COMPLETE: Capture all relevant freight details
4. PRACTICAL: Focus on data needed for load management and carrier booking

Key freight terminology to recognize:
- Equipment types: dry van, reefer, flatbed, step deck, RGN, conestoga, etc.
- Rate types: all-in, line haul, fuel surcharge, spot rate, contract rate
- Documents: rate con, BOL, POD, carrier packet
- Locations: shipper, consignee, receiver, pickup, delivery, origin, destination
- Issues: detention, layover, breakdown, TONU, claims, damage

Always respond with valid JSON matching the requested schema.`;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Validate freight extraction completeness
 */
export function validateFreightExtraction(extraction: FreightExtractionResult): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check required fields based on call type
  if (!extraction.call_type) {
    missingFields.push('call_type');
  }

  if (!extraction.call_summary) {
    missingFields.push('call_summary');
  }

  // Validate based on call type
  switch (extraction.call_type) {
    case 'shipper_call':
      if (extraction.shipper_data) {
        // Check critical shipper fields
        if (!extraction.shipper_data.origin_city && !extraction.shipper_data.origin_state) {
          warnings.push('Missing origin location');
        }
        if (!extraction.shipper_data.destination_city && !extraction.shipper_data.destination_state) {
          warnings.push('Missing destination location');
        }
        if (!extraction.shipper_data.commodity) {
          warnings.push('Missing commodity description');
        }
        if (!extraction.shipper_data.equipment_type) {
          warnings.push('Missing equipment type');
        }
        if (!extraction.shipper_data.pickup_date) {
          warnings.push('Missing pickup date');
        }
      } else {
        missingFields.push('shipper_data');
      }
      break;

    case 'carrier_call':
      if (extraction.carrier_data) {
        // Check critical carrier fields
        if (!extraction.carrier_data.carrier_name) {
          warnings.push('Missing carrier name');
        }
        if (!extraction.carrier_data.mc_number) {
          warnings.push('Missing MC number');
        }
        if (!extraction.carrier_data.rate_to_carrier) {
          warnings.push('Missing carrier rate');
        }
        if (!extraction.carrier_data.driver_name && !extraction.carrier_data.primary_contact) {
          warnings.push('Missing driver or dispatcher contact');
        }
      } else {
        missingFields.push('carrier_data');
      }
      break;

    case 'check_call':
      if (extraction.check_call_data) {
        // Check critical check call fields
        if (!extraction.check_call_data.current_location && !extraction.check_call_data.miles_out) {
          warnings.push('Missing current location information');
        }
        if (!extraction.check_call_data.eta_update && !extraction.check_call_data.revised_delivery_eta) {
          warnings.push('Missing ETA update');
        }
      } else {
        missingFields.push('check_call_data');
      }
      break;
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Calculate token estimate for conversation
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

/**
 * Calculate extraction cost
 * GPT-4o pricing: $2.50/1M input tokens, $10/1M output tokens
 */
export function calculateExtractionCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 2.5;
  const outputCost = (outputTokens / 1_000_000) * 10.0;
  return inputCost + outputCost;
}

/**
 * Format extraction for rate confirmation
 */
export function formatForRateConfirmation(extraction: FreightExtractionResult): string {
  if (!extraction.shipper_data && !extraction.carrier_data) {
    return 'No load or carrier data available for rate confirmation';
  }

  let output = 'RATE CONFIRMATION\n';
  output += '=================\n\n';

  // Load Information
  if (extraction.shipper_data) {
    const s = extraction.shipper_data;
    output += 'LOAD INFORMATION\n';
    output += `Reference #: ${s.reference_number || 'TBD'}\n`;
    output += `PO #: ${s.po_number || 'N/A'}\n\n`;

    output += 'PICKUP\n';
    output += `Location: ${s.origin_facility || 'TBD'}\n`;
    output += `City: ${s.origin_city || 'TBD'}, ${s.origin_state || 'TBD'} ${s.origin_zip || ''}\n`;
    output += `Date: ${s.pickup_date || 'TBD'}\n`;
    output += `Time: ${s.pickup_time || 'TBD'}${s.pickup_appointment ? ' (Appointment Required)' : ''}\n\n`;

    output += 'DELIVERY\n';
    output += `Location: ${s.destination_facility || 'TBD'}\n`;
    output += `City: ${s.destination_city || 'TBD'}, ${s.destination_state || 'TBD'} ${s.destination_zip || ''}\n`;
    output += `Date: ${s.delivery_date || 'TBD'}\n`;
    output += `Time: ${s.delivery_time || 'TBD'}${s.delivery_appointment ? ' (Appointment Required)' : ''}\n\n`;

    output += 'COMMODITY\n';
    output += `Description: ${s.commodity || 'TBD'}\n`;
    output += `Weight: ${s.weight_lbs ? s.weight_lbs.toLocaleString() + ' lbs' : 'TBD'}\n`;
    output += `Equipment: ${s.equipment_type || 'TBD'}\n`;
    if (s.special_requirements && s.special_requirements.length > 0) {
      output += `Special Requirements: ${s.special_requirements.join(', ')}\n`;
    }
    output += '\n';
  }

  // Carrier Information
  if (extraction.carrier_data) {
    const c = extraction.carrier_data;
    output += 'CARRIER INFORMATION\n';
    output += `Carrier: ${c.carrier_name || 'TBD'}\n`;
    output += `MC #: ${c.mc_number || 'TBD'}\n`;
    output += `DOT #: ${c.dot_number || 'TBD'}\n\n`;

    output += 'DRIVER INFORMATION\n';
    output += `Driver: ${c.driver_name || 'TBD'}\n`;
    output += `Phone: ${c.driver_phone || 'TBD'}\n`;
    output += `Truck #: ${c.truck_number || 'TBD'}\n`;
    output += `Trailer #: ${c.trailer_number || 'TBD'}\n\n`;

    output += 'RATE AGREEMENT\n';
    output += `Total Rate: $${c.rate_to_carrier?.toLocaleString() || 'TBD'}\n`;
    if (c.rate_type) {
      output += `Rate Type: ${c.rate_type.replace('_', ' ')}\n`;
    }
    if (c.fuel_surcharge) {
      output += `Fuel Surcharge: $${c.fuel_surcharge.toLocaleString()}\n`;
    }
    if (c.detention_rate) {
      output += `Detention: $${c.detention_rate}/hr after 2 hours\n`;
    }
    output += '\n';

    output += 'DISPATCHER CONTACT\n';
    output += `Name: ${c.primary_contact || 'TBD'}\n`;
    output += `Phone: ${c.dispatch_phone || 'TBD'}\n`;
    output += `Email: ${c.dispatch_email || 'TBD'}\n`;
  }

  return output;
}

/**
 * Format extraction for load posting
 */
export function formatForLoadBoard(extraction: FreightExtractionResult): string {
  if (!extraction.shipper_data) {
    return 'No shipper data available for load posting';
  }

  const s = extraction.shipper_data;
  let output = '';

  // Header with lane
  output += `${s.origin_city || 'TBD'}, ${s.origin_state || 'TBD'} → ${s.destination_city || 'TBD'}, ${s.destination_state || 'TBD'}\n\n`;

  // Load details
  output += `📦 ${s.commodity || 'General Freight'}\n`;
  output += `⚖️ ${s.weight_lbs ? s.weight_lbs.toLocaleString() + ' lbs' : 'Full Load'}\n`;
  output += `🚛 ${s.equipment_type ? s.equipment_type.replace('_', ' ').toUpperCase() : 'Equipment Needed'}\n\n`;

  // Dates
  output += `📅 Pick: ${s.pickup_date || 'ASAP'}${s.pickup_time ? ' @ ' + s.pickup_time : ''}\n`;
  output += `📅 Drop: ${s.delivery_date || 'TBD'}${s.delivery_time ? ' @ ' + s.delivery_time : ''}\n\n`;

  // Special requirements
  if (s.special_requirements && s.special_requirements.length > 0) {
    output += `⚠️ Requirements: ${s.special_requirements.join(', ')}\n`;
  }
  if (s.hazmat) output += '☣️ HAZMAT\n';
  if (s.team_required) output += '👥 TEAM REQUIRED\n';
  if (s.expedited) output += '⚡ EXPEDITED\n';

  // Reference
  if (s.reference_number) {
    output += `\nRef #: ${s.reference_number}`;
  }

  return output;
}

/**
 * Format check call update
 */
export function formatCheckCallUpdate(extraction: FreightExtractionResult): string {
  if (!extraction.check_call_data) {
    return 'No check call data available';
  }

  const c = extraction.check_call_data;
  let output = `CHECK CALL UPDATE - ${c.timestamp || new Date().toISOString()}\n`;
  output += '========================\n\n';

  if (c.driver_name || c.truck_number) {
    output += `Driver: ${c.driver_name || 'Unknown'} | Truck #${c.truck_number || 'Unknown'}\n\n`;
  }

  output += 'CURRENT STATUS\n';
  if (c.current_location) {
    output += `📍 Location: ${c.current_location}\n`;
  }
  if (c.current_city && c.current_state) {
    output += `📍 ${c.current_city}, ${c.current_state}\n`;
  }
  if (c.miles_out) {
    output += `📏 ${c.miles_out} miles out\n`;
  }
  output += '\n';

  if (c.eta_update || c.revised_delivery_eta) {
    output += 'ETA UPDATES\n';
    if (c.eta_update) output += `New ETA: ${c.eta_update}\n`;
    if (c.revised_pickup_eta) output += `Pickup ETA: ${c.revised_pickup_eta}\n`;
    if (c.revised_delivery_eta) output += `Delivery ETA: ${c.revised_delivery_eta}\n`;
    output += '\n';
  }

  if (c.issues_reported && c.issues_reported.length > 0) {
    output += '⚠️ ISSUES REPORTED\n';
    c.issues_reported.forEach(issue => {
      output += `• ${issue}\n`;
    });
    output += '\n';
  }

  if (c.delay_reason) {
    output += `🚨 DELAY REASON: ${c.delay_reason}\n`;
  }
  if (c.breakdown) output += '🔧 BREAKDOWN REPORTED\n';
  if (c.weather_delay) output += '🌧️ WEATHER DELAY\n';
  if (c.traffic_delay) output += '🚗 TRAFFIC DELAY\n';

  return output;
}