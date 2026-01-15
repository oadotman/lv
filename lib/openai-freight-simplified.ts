// =====================================================
// SIMPLIFIED FREIGHT BROKER AI EXTRACTION
// Focuses on freight-specific data, removes generic CRM fields
// =====================================================

import OpenAI from 'openai';
import type { AssemblyAIUtterance } from './assemblyai';

// Lazy-loaded client
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

// =====================================================
// TYPES - FREIGHT SPECIFIC ONLY
// =====================================================

export type CallType = 'shipper_call' | 'carrier_call' | 'check_call' | 'unknown';
export type Sentiment = 'positive' | 'neutral' | 'negative';

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

// Shipper Call Fields (UNCHANGED - ALL KEPT)
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

// Carrier Call Data (UNCHANGED - ALL KEPT)
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

// Check Call Data (UNCHANGED - ALL KEPT)
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

// SIMPLIFIED Extraction Result
export interface SimplifiedFreightExtractionResult {
  // Call Classification
  call_type: CallType;

  // Context Summary (2-3 sentences capturing tone, relationship, leverage)
  summary: string;

  // Sentiment (simple classification)
  sentiment: Sentiment;

  // Action Items & Next Steps
  action_items: string[];
  next_steps: string[];

  // Freight-Specific Data (only one populated based on call type)
  shipper_data?: ShipperCallData;
  carrier_data?: CarrierCallData;
  check_call_data?: CheckCallData;

  // Key Lane/Rate Info (always extracted if mentioned)
  lane?: {
    origin: string;
    destination: string;
  };
  rate_discussed?: number;
  equipment_discussed?: EquipmentType;

  // Metadata
  confidence_score: number;
  extraction_timestamp: string;
}

// =====================================================
// SIMPLIFIED EXTRACTION PROMPT
// =====================================================

const SIMPLIFIED_SYSTEM_PROMPT = `You are a freight broker AI assistant specialized in extracting actionable data from broker-carrier phone calls.

FOCUS ONLY ON:
1. Freight-specific operational data (locations, rates, equipment, dates)
2. Action items that need to be completed
3. Next steps in the load process
4. Brief context summary (2-3 sentences max)

For the SUMMARY field, capture:
- Tone and negotiation dynamics (e.g., "Carrier eager to book, accepted first offer")
- Relationship context (e.g., "Recurring customer, previously reliable")
- Red flags or opportunities (e.g., "Carrier hesitant about delivery time")
- Leverage points (e.g., "Shipper flexible on pickup date for better rate")

DO NOT extract:
- Generic sales metrics (qualification scores, buying signals)
- Competitive intelligence
- Industry/company size analysis
- Current solutions or objections

Keep responses factual and freight-focused. Extract only clearly stated information.`;

// =====================================================
// EXTRACTION FUNCTION
// =====================================================

export async function extractSimplifiedFreightData(
  config: {
    transcript: string;
    utterances: AssemblyAIUtterance[];
    speakerMapping: Record<string, string>;
    customerName?: string;
    callType?: string;
  }
): Promise<SimplifiedFreightExtractionResult> {
  try {
    console.log('Starting simplified freight extraction...');

    const client = getOpenAIClient();

    // Format the conversation
    const conversation = formatConversation(config.utterances, config.speakerMapping);

    // Build the extraction prompt
    const userPrompt = `
Extract freight broker data from this call transcript.

CONVERSATION:
${conversation}

${config.customerName ? `Customer/Company: ${config.customerName}` : ''}
${config.callType ? `Expected Call Type: ${config.callType}` : ''}

Return a JSON object with:
{
  "call_type": "shipper_call" | "carrier_call" | "check_call" | "unknown",
  "summary": "2-3 sentence context summary focusing on tone, relationship, and negotiation dynamics",
  "sentiment": "positive" | "neutral" | "negative",
  "action_items": ["specific tasks to complete"],
  "next_steps": ["what happens next in the process"],
  "shipper_data": { /* if shipper call */ },
  "carrier_data": { /* if carrier call */ },
  "check_call_data": { /* if check call */ },
  "lane": { "origin": "city, state", "destination": "city, state" },
  "rate_discussed": numeric value or null,
  "equipment_discussed": "equipment type" or null,
  "confidence_score": 0.0 to 1.0
}

IMPORTANT:
- Keep summary to 2-3 sentences maximum
- Focus on freight operational data only
- Extract dates in YYYY-MM-DD format when possible
- Extract all phone numbers, MC numbers, and reference numbers
- Include special requirements as an array of strings
- For check calls, focus on current location and ETA updates`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SIMPLIFIED_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const extracted = JSON.parse(responseContent) as SimplifiedFreightExtractionResult;

    // Add timestamp
    extracted.extraction_timestamp = new Date().toISOString();

    // Ensure confidence score is set
    if (!extracted.confidence_score) {
      extracted.confidence_score = 0.85; // Default confidence
    }

    console.log('Simplified extraction complete:', {
      call_type: extracted.call_type,
      sentiment: extracted.sentiment,
      has_shipper_data: !!extracted.shipper_data,
      has_carrier_data: !!extracted.carrier_data,
      has_check_call_data: !!extracted.check_call_data,
      action_items_count: extracted.action_items.length,
    });

    return extracted;
  } catch (error) {
    console.error('Simplified freight extraction error:', error);
    throw error;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatConversation(
  utterances: AssemblyAIUtterance[],
  speakerMapping: Record<string, string>
): string {
  if (!utterances || utterances.length === 0) {
    return 'No utterances available';
  }

  return utterances
    .map((u) => {
      const speaker = speakerMapping[u.speaker] || `Speaker ${u.speaker}`;
      return `${speaker}: ${u.text}`;
    })
    .join('\n\n');
}

// =====================================================
// USER CORRECTION LOGGING
// =====================================================

export interface UserCorrection {
  call_id: string;
  field_name: string;
  original_value: any;
  corrected_value: any;
  corrected_by: string;
  corrected_at: string;
  call_type: CallType;
}

export async function logUserCorrection(correction: UserCorrection): Promise<void> {
  try {
    // This would save to a corrections table for future prompt improvement
    console.log('Logging user correction:', correction);

    // In production, this would:
    // 1. Save to database table 'extraction_corrections'
    // 2. Trigger analysis job to identify patterns
    // 3. Update prompt templates based on frequent corrections

    // For now, we'll just log it
    console.log('Correction logged successfully');
  } catch (error) {
    console.error('Failed to log correction:', error);
  }
}

// =====================================================
// EXPORTS
// =====================================================

export {
  formatConversation,
  getOpenAIClient
};