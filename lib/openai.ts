// =====================================================
// OPENAI CLIENT UTILITY - FREIGHT BROKER VERSION
// Handles freight broker data extraction from call transcripts using GPT-4o
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

export interface CRMExtractionConfig {
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

// Main Extraction Result - Now freight-focused
export interface CRMExtractionResult {
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

  // Legacy fields for compatibility (will be removed)
  summary: string;
  keyPoints: string[];
  nextSteps: string[];
  painPoints: string[];
  requirements: string[];
  budget?: string;
  timeline?: string;
  decisionMaker?: string;
  productInterest: string[];
  competitorsMentioned: string[];
  objections: string[];
  buyingSignals: string[];
  callOutcome: 'qualified' | 'nurture' | 'not_interested' | 'follow_up_needed';
  qualificationScore: number;
  urgency: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';
  raw: {
    customerCompany?: string;
    industry?: string;
    companySize?: string;
    currentSolution?: string;
    decisionProcess?: string;
    technicalRequirements?: string[];
  };
}

export interface TemplateField {
  id: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  options?: string[];
}

export interface CustomFieldExtraction {
  field_id: string;
  field_name: string;
  value: string;
  confidence: number;
}

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

/**
 * Extract freight broker data from transcript using GPT-4o
 */
export async function extractCRMData(
  config: CRMExtractionConfig
): Promise<CRMExtractionResult> {
  try {
    console.log('Starting freight broker data extraction with GPT-4o...');

    // Format conversation for GPT
    const conversation = formatConversation(config.utterances, config.speakerMapping);

    // Build freight-specific extraction prompt
    const prompt = buildExtractionPrompt(conversation, config);

    // Call GPT-4o with structured output
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o', // Latest GPT-4o model
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
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
    const extracted = JSON.parse(responseContent) as CRMExtractionResult;

    // Add extraction timestamp
    extracted.extraction_timestamp = new Date().toISOString();

    // Map freight data to legacy fields for compatibility
    extracted.summary = extracted.call_summary || '';
    extracted.keyPoints = extracted.action_items || [];
    extracted.nextSteps = extracted.action_items || [];
    extracted.painPoints = extracted.issues_flagged || [];
    extracted.requirements = [];
    extracted.productInterest = [];
    extracted.competitorsMentioned = [];
    extracted.objections = [];
    extracted.buyingSignals = [];
    extracted.callOutcome = 'follow_up_needed';
    extracted.qualificationScore = extracted.confidence_score ? extracted.confidence_score * 100 : 50;
    extracted.urgency = 'medium';
    extracted.sentiment = 'neutral';
    extracted.raw = {};

    // Set budget/timeline from rates if available
    if (extracted.rate_discussed) {
      extracted.budget = `$${extracted.rate_discussed}`;
    }
    if (extracted.shipper_data?.pickup_date) {
      extracted.timeline = extracted.shipper_data.pickup_date;
    }

    console.log('Freight extraction complete:', {
      call_type: extracted.call_type,
      confidence: extracted.confidence_score,
      has_shipper_data: !!extracted.shipper_data,
      has_carrier_data: !!extracted.carrier_data,
      has_check_data: !!extracted.check_call_data,
    });

    return extracted;
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw error;
  }
}

/**
 * Wrapper function for compatibility - extracts freight data with OpenAI
 */
export async function extractFreightDataWithOpenAI(
  transcript: string,
  utterances: AssemblyAIUtterance[],
  speakerMapping: Record<string, string>
) {
  return extractCRMData({
    transcript,
    utterances,
    speakerMapping
  });
}

/**
 * Extract custom template fields from transcript
 */
export async function extractTemplateFields(
  transcript: string,
  utterances: AssemblyAIUtterance[],
  speakerMapping: Record<string, string>,
  templateFields: TemplateField[]
): Promise<CustomFieldExtraction[]> {
  try {
    console.log('Extracting custom template fields...', {
      fields_count: templateFields.length,
    });

    const conversation = formatConversation(utterances, speakerMapping);

    const prompt = buildTemplateExtractionPrompt(conversation, templateFields);

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: TEMPLATE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseContent);

    return result.fields || [];
  } catch (error) {
    console.error('Template field extraction error:', error);
    return [];
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
      // Map common roles to freight broker terminology
      const roleLabel = role === 'rep' ? 'Broker' :
                       role === 'prospect' ? 'Customer' :
                       role === 'customer' ? 'Shipper' :
                       role === 'carrier' ? 'Carrier' :
                       role === 'driver' ? 'Driver' :
                       role;
      return `${roleLabel}: ${u.text}`;
    })
    .join('\n\n');
}

/**
 * Build main extraction prompt
 */
function buildExtractionPrompt(
  conversation: string,
  config: CRMExtractionConfig
): string {
  const contextInfo = [];

  if (config.customerName) {
    contextInfo.push(`Customer/Company Name: ${config.customerName}`);
  }

  if (config.callType) {
    contextInfo.push(`Call Type: ${config.callType}`);
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

  return `${context}Analyze this freight broker call transcript and extract structured data.

CONVERSATION:
${conversation}
${notesSection}
First, identify the call type based on the conversation:
- shipper_call: Booking loads, discussing freight from shippers/customers
- carrier_call: Booking trucks, discussing capacity with carriers/drivers
- check_call: Status updates, location checks, ETA updates

Then extract and return a JSON object with the following structure:
{
  "call_type": "shipper_call|carrier_call|check_call|unknown",
  "call_summary": "2-3 sentence summary focusing on the load/shipment details and outcome",

  "shipper_data": {
    "origin_city": "city or null",
    "origin_state": "state abbreviation or null",
    "origin_zip": "zip code or null",
    "origin_facility": "facility/company name or null",
    "destination_city": "city or null",
    "destination_state": "state abbreviation or null",
    "destination_zip": "zip code or null",
    "destination_facility": "facility/company name or null",
    "commodity": "what's being shipped or null",
    "weight_lbs": weight in pounds or null,
    "pallet_count": number of pallets or null,
    "equipment_type": "dry_van|reefer|flatbed|step_deck|rgn|power_only|box_truck|hotshot|tanker|lowboy|double_drop|conestoga|other or null",
    "pickup_date": "YYYY-MM-DD format or null",
    "pickup_time": "time or window (e.g., '08:00' or '8AM-12PM') or null",
    "pickup_appointment": true/false or null,
    "delivery_date": "YYYY-MM-DD format or null",
    "delivery_time": "time or window or null",
    "delivery_appointment": true/false or null,
    "rate_to_shipper": dollar amount or null,
    "rate_type": "all_in|line_haul_plus_fuel|per_mile or null",
    "fuel_surcharge": dollar amount or null,
    "reference_number": "reference/load number or null",
    "po_number": "PO number or null",
    "bol_number": "BOL number or null",
    "special_requirements": ["requirements", "like", "tarps", "straps", "team"],
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
    "dot_number": "DOT number (digits only) or null",
    "driver_name": "driver name or null",
    "driver_phone": "phone number or null",
    "truck_number": "truck/unit number or null",
    "trailer_number": "trailer number or null",
    "rate_to_carrier": dollar amount or null,
    "rate_type": "all_in|line_haul_plus_fuel|per_mile or null",
    "fuel_surcharge": dollar amount or null,
    "detention_rate": hourly rate or null,
    "layover_rate": daily rate or null,
    "primary_contact": "dispatcher name or null",
    "dispatch_phone": "phone number or null",
    "dispatch_email": "email or null",
    "eta_pickup": "estimated time of arrival at pickup or null",
    "eta_delivery": "estimated time of arrival at delivery or null",
    "insurance_verified": true/false or null,
    "authority_verified": true/false or null,
    "empty_location": "current/last empty location or null",
    "next_available": "when truck available or null"
  },

  "check_call_data": {
    "current_location": "specific location or null",
    "current_city": "city or null",
    "current_state": "state or null",
    "miles_out": number of miles from destination or null,
    "eta_update": "new ETA or null",
    "revised_pickup_eta": "updated pickup ETA or null",
    "revised_delivery_eta": "updated delivery ETA or null",
    "issues_reported": ["list", "of", "issues"],
    "delay_reason": "reason for delay or null",
    "breakdown": true/false or null,
    "weather_delay": true/false or null,
    "traffic_delay": true/false or null,
    "timestamp": "ISO timestamp of check call",
    "last_update": "time of last update or null",
    "driver_name": "driver name or null",
    "truck_number": "truck number or null"
  },

  "action_items": ["follow-ups", "tasks", "things to do"],
  "issues_flagged": ["problems", "concerns", "red flags"],
  "rate_discussed": highest rate mentioned or null,
  "equipment_discussed": "primary equipment type or null",
  "lane": {
    "origin": "origin city, state or null",
    "destination": "destination city, state or null"
  },

  "confidence_score": 0.0-1.0,
  "extraction_timestamp": "ISO timestamp",

  "summary": "same as call_summary for compatibility",
  "keyPoints": ["same as action_items for compatibility"],
  "nextSteps": ["same as action_items for compatibility"],
  "painPoints": ["same as issues_flagged for compatibility"],
  "requirements": [],
  "budget": "same as rate_discussed formatted as string or null",
  "timeline": "pickup date if available or null",
  "decisionMaker": null,
  "productInterest": [],
  "competitorsMentioned": [],
  "objections": [],
  "buyingSignals": [],
  "callOutcome": "follow_up_needed",
  "qualificationScore": 50,
  "urgency": "medium",
  "sentiment": "neutral",
  "raw": {}
}

IMPORTANT:
- Only populate the relevant data section based on call_type
- Extract location data carefully (cities, states, zip codes)
- Convert rates to numbers when possible
- Use standard state abbreviations (TX, CA, FL, etc.)
- Equipment types must match the enum values exactly
- Dates should be in YYYY-MM-DD format
- Only include information explicitly mentioned
- Use null for missing information`;
}

/**
 * Build template field extraction prompt
 */
function buildTemplateExtractionPrompt(
  conversation: string,
  templateFields: TemplateField[]
): string {
  const fieldsDescription = templateFields
    .map((field) => {
      let desc = `- ${field.field_name} (${field.field_type})`;
      if (field.options && field.options.length > 0) {
        desc += ` - Options: ${field.options.join(', ')}`;
      }
      if (field.is_required) {
        desc += ' [REQUIRED]';
      }
      return desc;
    })
    .join('\n');

  return `Extract the following custom fields from this freight broker call transcript.

CONVERSATION:
${conversation}

FIELDS TO EXTRACT:
${fieldsDescription}

Return a JSON object with this structure:
{
  "fields": [
    {
      "field_id": "field-uuid",
      "field_name": "Field Name",
      "value": "extracted value or null",
      "confidence": 0.0-1.0
    }
  ]
}

RULES:
- Extract each field's value from the conversation
- For select/dropdown fields, use exact option values provided
- For boolean fields, use "true" or "false" strings
- For number fields, use numeric strings
- Use null if information is not found
- Confidence: 1.0 = explicitly stated, 0.8 = strongly implied, 0.5 = weakly implied, 0.0 = not found`;
}

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const SYSTEM_PROMPT = `You are an expert freight broker call analyzer and data extraction specialist. Your role is to analyze freight broker call transcripts and extract structured load and shipment data.

You have deep expertise in:
- Freight brokerage operations and terminology
- Load booking and carrier dispatch processes
- Transportation modes (FTL, LTL, dry van, reefer, flatbed, etc.)
- Rate negotiations and freight pricing
- DOT/MC numbers and carrier compliance
- Pickup/delivery logistics and check calls
- Common freight lanes and shipping patterns

Key freight terms you understand:
- Equipment types: dry van, reefer, flatbed, step deck, RGN, power only, etc.
- Load terms: FTL (full truckload), LTL (less than truckload), partial, expedited
- Rate types: all-in rate, linehaul plus fuel, RPM (rate per mile), spot rate
- Accessorials: detention, layover, TONU (truck ordered not used), lumper fees
- Documentation: BOL (bill of lading), POD (proof of delivery), rate confirmation

Your extractions should be:
1. ACCURATE: Only extract information explicitly stated in the conversation
2. COMPLETE: Capture all load details, locations, dates, rates, and requirements
3. STRUCTURED: Follow the exact JSON schema provided
4. PRACTICAL: Focus on data needed for load booking and dispatching

Always respond with valid JSON matching the requested schema.`;

const TEMPLATE_SYSTEM_PROMPT = `You are a freight broker data extraction specialist. Your role is to extract specific custom fields from freight broker call transcripts.

You must:
1. Extract each requested field accurately from freight conversations
2. Match dropdown/select options exactly as provided
3. Assign confidence scores honestly (1.0 = explicit, 0.5 = implied, 0.0 = not found)
4. Return null for missing information, never guess
5. Follow the exact JSON schema provided

You understand freight terminology including equipment types, load requirements, rates, lanes, and carrier information.

Always respond with valid JSON matching the requested schema.`;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Validate extraction completeness
 */
export function validateExtraction(extraction: CRMExtractionResult): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!extraction.summary || extraction.summary.length < 10) {
    missingFields.push('summary');
  }

  if (!extraction.keyPoints || extraction.keyPoints.length === 0) {
    missingFields.push('keyPoints');
  }

  if (!extraction.callOutcome) {
    missingFields.push('callOutcome');
  }

  if (extraction.qualificationScore === undefined || extraction.qualificationScore === null) {
    missingFields.push('qualificationScore');
  }

  // Check for warnings
  if (extraction.painPoints.length === 0) {
    warnings.push('No pain points identified - may indicate poor discovery');
  }

  if (extraction.nextSteps.length === 0) {
    warnings.push('No next steps defined - call may lack clear outcome');
  }

  if (extraction.qualificationScore > 70 && !extraction.timeline) {
    warnings.push('High qualification score but no timeline mentioned');
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
 * Format extraction for CRM output
 */
export function formatForCRM(
  extraction: CRMExtractionResult,
  format: 'plain' | 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'freshsales' | 'monday'
): string {
  switch (format) {
    case 'plain':
      return formatPlainText(extraction);
    case 'hubspot':
      return formatHubSpot(extraction);
    case 'salesforce':
      return formatSalesforce(extraction);
    case 'pipedrive':
      return formatPipedrive(extraction);
    case 'zoho':
      return formatZoho(extraction);
    case 'freshsales':
      return formatFreshsales(extraction);
    case 'monday':
      return formatMonday(extraction);
    default:
      return formatPlainText(extraction);
  }
}

function formatPlainText(extraction: CRMExtractionResult): string {
  let output = '';

  // Call header
  output += `CALL TYPE: ${extraction.call_type?.toUpperCase() || 'UNKNOWN'}\n`;
  output += `SUMMARY\n${extraction.call_summary}\n\n`;

  // Lane information
  if (extraction.lane && (extraction.lane.origin || extraction.lane.destination)) {
    output += `LANE\n`;
    if (extraction.lane.origin) output += `Origin: ${extraction.lane.origin}\n`;
    if (extraction.lane.destination) output += `Destination: ${extraction.lane.destination}\n`;
    output += '\n';
  }

  // Rate information
  if (extraction.rate_discussed) {
    output += `RATE: $${extraction.rate_discussed}\n`;
  }
  if (extraction.equipment_discussed) {
    output += `EQUIPMENT: ${extraction.equipment_discussed}\n`;
  }
  if (extraction.rate_discussed || extraction.equipment_discussed) {
    output += '\n';
  }

  // Shipper data (if available)
  if (extraction.shipper_data && extraction.call_type === 'shipper_call') {
    const sd = extraction.shipper_data;
    output += `LOAD DETAILS\n`;
    if (sd.commodity) output += `Commodity: ${sd.commodity}\n`;
    if (sd.weight_lbs) output += `Weight: ${sd.weight_lbs} lbs\n`;
    if (sd.pickup_date) output += `Pickup: ${sd.pickup_date} ${sd.pickup_time || ''}\n`;
    if (sd.delivery_date) output += `Delivery: ${sd.delivery_date} ${sd.delivery_time || ''}\n`;
    if (sd.reference_number) output += `Reference: ${sd.reference_number}\n`;
    output += '\n';
  }

  // Carrier data (if available)
  if (extraction.carrier_data && extraction.call_type === 'carrier_call') {
    const cd = extraction.carrier_data;
    output += `CARRIER DETAILS\n`;
    if (cd.carrier_name) output += `Carrier: ${cd.carrier_name}\n`;
    if (cd.mc_number) output += `MC#: ${cd.mc_number}\n`;
    if (cd.driver_name) output += `Driver: ${cd.driver_name}\n`;
    if (cd.truck_number) output += `Truck: ${cd.truck_number}\n`;
    output += '\n';
  }

  // Check call data (if available)
  if (extraction.check_call_data && extraction.call_type === 'check_call') {
    const cc = extraction.check_call_data;
    output += `CHECK CALL STATUS\n`;
    if (cc.current_location) output += `Location: ${cc.current_location}\n`;
    if (cc.miles_out) output += `Miles out: ${cc.miles_out}\n`;
    if (cc.eta_update) output += `ETA: ${cc.eta_update}\n`;
    if (cc.issues_reported && cc.issues_reported.length > 0) {
      output += `Issues: ${cc.issues_reported.join(', ')}\n`;
    }
    output += '\n';
  }

  // Action items
  if (extraction.action_items && extraction.action_items.length > 0) {
    output += `ACTION ITEMS\n${extraction.action_items.map((a) => `• ${a}`).join('\n')}\n\n`;
  }

  // Issues
  if (extraction.issues_flagged && extraction.issues_flagged.length > 0) {
    output += `ISSUES FLAGGED\n${extraction.issues_flagged.map((i) => `• ${i}`).join('\n')}\n\n`;
  }

  return output;
}

function formatHubSpot(extraction: CRMExtractionResult): string {
  const fields: Record<string, string> = {
    'Call Type': extraction.call_type || 'unknown',
    'Call Summary': extraction.call_summary || extraction.summary,
    'Load Status': extraction.call_type === 'shipper_call' ? 'New Load' :
                   extraction.call_type === 'carrier_call' ? 'Carrier Booked' :
                   extraction.call_type === 'check_call' ? 'In Transit' : 'Unknown',
  };

  // Add lane information
  if (extraction.lane) {
    if (extraction.lane.origin) fields['Origin'] = extraction.lane.origin;
    if (extraction.lane.destination) fields['Destination'] = extraction.lane.destination;
  }

  // Add rate and equipment
  if (extraction.rate_discussed) fields['Rate'] = `$${extraction.rate_discussed}`;
  if (extraction.equipment_discussed) fields['Equipment Type'] = extraction.equipment_discussed;

  // Add shipper-specific fields
  if (extraction.shipper_data && extraction.call_type === 'shipper_call') {
    const sd = extraction.shipper_data;
    if (sd.commodity) fields['Commodity'] = sd.commodity;
    if (sd.weight_lbs) fields['Weight'] = `${sd.weight_lbs} lbs`;
    if (sd.pickup_date) fields['Pickup Date'] = sd.pickup_date;
    if (sd.delivery_date) fields['Delivery Date'] = sd.delivery_date;
    if (sd.reference_number) fields['Reference Number'] = sd.reference_number;
    if (sd.shipper_company) fields['Shipper'] = sd.shipper_company;
  }

  // Add carrier-specific fields
  if (extraction.carrier_data && extraction.call_type === 'carrier_call') {
    const cd = extraction.carrier_data;
    if (cd.carrier_name) fields['Carrier Name'] = cd.carrier_name;
    if (cd.mc_number) fields['MC Number'] = cd.mc_number;
    if (cd.driver_name) fields['Driver'] = cd.driver_name;
  }

  // Add action items
  if (extraction.action_items && extraction.action_items.length > 0) {
    fields['Next Steps'] = extraction.action_items.join('; ');
  }

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function formatSalesforce(extraction: CRMExtractionResult): string {
  const fields: Record<string, string> = {
    Subject: `${extraction.call_type || 'Call'} - ${extraction.lane?.origin || 'Unknown'} to ${extraction.lane?.destination || 'Unknown'}`,
    Description: extraction.call_summary || extraction.summary,
    Type: extraction.call_type === 'shipper_call' ? 'Load Booking' :
          extraction.call_type === 'carrier_call' ? 'Carrier Booking' :
          extraction.call_type === 'check_call' ? 'Status Update' : 'Call',
    Status: 'Completed',
  };

  // Add lane and load details
  if (extraction.lane) {
    if (extraction.lane.origin && extraction.lane.destination) {
      fields['Lane'] = `${extraction.lane.origin} → ${extraction.lane.destination}`;
    }
  }

  // Add rate information
  if (extraction.rate_discussed) {
    fields['Amount'] = extraction.rate_discussed.toString();
  }

  // Add equipment type
  if (extraction.equipment_discussed) {
    fields['Equipment'] = extraction.equipment_discussed;
  }

  // Add shipper-specific fields
  if (extraction.shipper_data && extraction.call_type === 'shipper_call') {
    const sd = extraction.shipper_data;
    if (sd.commodity) fields['Product'] = sd.commodity;
    if (sd.pickup_date) fields['Pickup Date'] = sd.pickup_date;
    if (sd.delivery_date) fields['Delivery Date'] = sd.delivery_date;
    if (sd.reference_number) fields['Reference'] = sd.reference_number;
    if (sd.shipper_company) fields['Account Name'] = sd.shipper_company;
  }

  // Add carrier-specific fields
  if (extraction.carrier_data && extraction.call_type === 'carrier_call') {
    const cd = extraction.carrier_data;
    if (cd.carrier_name) fields['Carrier'] = cd.carrier_name;
    if (cd.mc_number) fields['MC Number'] = cd.mc_number;
  }

  // Add next steps
  if (extraction.action_items && extraction.action_items.length > 0) {
    fields['Next Steps'] = extraction.action_items.join('; ');
  }

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function getHubSpotStage(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Load Booked';
    case 'nurture':
      return 'Quote Sent';
    case 'not_interested':
      return 'No Match';
    case 'follow_up_needed':
      return 'Negotiating';
    default:
      return 'New Load';
  }
}

function getSalesforceStatus(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Booked';
    case 'nurture':
      return 'Quoted';
    case 'not_interested':
      return 'Cancelled';
    case 'follow_up_needed':
      return 'In Progress';
    default:
      return 'New';
  }
}

function formatPipedrive(extraction: CRMExtractionResult): string {
  const loadTitle = extraction.lane ?
    `${extraction.lane.origin || 'Unknown'} to ${extraction.lane.destination || 'Unknown'}` :
    'Load';

  const fields: Record<string, string> = {
    'Deal Title': loadTitle,
    'Value': extraction.rate_discussed ? extraction.rate_discussed.toString() : '0',
    'Stage': extraction.call_type === 'shipper_call' ? 'Load Posted' :
             extraction.call_type === 'carrier_call' ? 'Carrier Assigned' :
             extraction.call_type === 'check_call' ? 'In Transit' : 'New',
    'Type': extraction.call_type || 'Unknown',
  };

  // Add equipment and commodity
  if (extraction.equipment_discussed) fields['Product'] = extraction.equipment_discussed;

  // Add dates
  if (extraction.shipper_data?.pickup_date) {
    fields['Expected Close Date'] = extraction.shipper_data.pickup_date;
  }

  // Add shipper info
  if (extraction.shipper_data?.shipper_company) {
    fields['Organization'] = extraction.shipper_data.shipper_company;
  }

  // Add carrier info
  if (extraction.carrier_data?.carrier_name) {
    fields['Carrier'] = extraction.carrier_data.carrier_name;
  }

  // Add next steps
  if (extraction.action_items && extraction.action_items.length > 0) {
    fields['Next Activity'] = extraction.action_items[0];
  }

  fields['Notes'] = extraction.call_summary || extraction.summary;

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function formatZoho(extraction: CRMExtractionResult): string {
  const loadName = extraction.lane ?
    `${extraction.lane.origin || 'Unknown'} → ${extraction.lane.destination || 'Unknown'}` :
    'Load';

  const fields: Record<string, string> = {
    'Deal Name': loadName,
    'Amount': extraction.rate_discussed ? extraction.rate_discussed.toString() : '0',
    'Stage': extraction.call_type === 'shipper_call' ? 'Load Received' :
             extraction.call_type === 'carrier_call' ? 'Carrier Booked' :
             extraction.call_type === 'check_call' ? 'In Transit' : 'New',
    'Type': 'Freight Load',
    'Lead Source': 'Phone Call',
    'Description': extraction.call_summary || extraction.summary,
  };

  // Add dates
  if (extraction.shipper_data?.pickup_date) {
    fields['Pickup Date'] = extraction.shipper_data.pickup_date;
  }
  if (extraction.shipper_data?.delivery_date) {
    fields['Delivery Date'] = extraction.shipper_data.delivery_date;
  }

  // Add shipper info
  if (extraction.shipper_data?.shipper_company) {
    fields['Account Name'] = extraction.shipper_data.shipper_company;
  }
  if (extraction.shipper_data?.shipper_contact) {
    fields['Contact Name'] = extraction.shipper_data.shipper_contact;
  }

  // Add commodity and equipment
  if (extraction.shipper_data?.commodity) {
    fields['Product'] = extraction.shipper_data.commodity;
  }
  if (extraction.equipment_discussed) {
    fields['Equipment'] = extraction.equipment_discussed;
  }

  // Add carrier info
  if (extraction.carrier_data?.carrier_name) {
    fields['Carrier'] = extraction.carrier_data.carrier_name;
    if (extraction.carrier_data.mc_number) {
      fields['MC Number'] = extraction.carrier_data.mc_number;
    }
  }

  // Add next steps
  if (extraction.action_items && extraction.action_items.length > 0) {
    fields['Next Steps'] = extraction.action_items.join('; ');
  }

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function formatFreshsales(extraction: CRMExtractionResult): string {
  const loadName = extraction.lane ?
    `Load: ${extraction.lane.origin || 'Unknown'} → ${extraction.lane.destination || 'Unknown'}` :
    'Freight Load';

  const fields: Record<string, string> = {
    'Deal Name': loadName,
    'Deal Value': extraction.rate_discussed ? extraction.rate_discussed.toString() : '0',
    'Deal Stage': extraction.call_type === 'shipper_call' ? 'Quote' :
                  extraction.call_type === 'carrier_call' ? 'Dispatched' :
                  extraction.call_type === 'check_call' ? 'In Transit' : 'New',
    'Deal Type': 'Freight Shipment',
    'Notes': extraction.call_summary || extraction.summary,
  };

  // Add dates
  if (extraction.shipper_data?.pickup_date) {
    fields['Expected Close Date'] = extraction.shipper_data.pickup_date;
  }

  // Add shipper/carrier info
  if (extraction.shipper_data?.shipper_company) {
    fields['Account'] = extraction.shipper_data.shipper_company;
    if (extraction.shipper_data.shipper_contact) {
      fields['Primary Contact'] = extraction.shipper_data.shipper_contact;
    }
  } else if (extraction.carrier_data?.carrier_name) {
    fields['Carrier'] = extraction.carrier_data.carrier_name;
    if (extraction.carrier_data.primary_contact) {
      fields['Dispatcher'] = extraction.carrier_data.primary_contact;
    }
  }

  // Add commodity and equipment
  if (extraction.shipper_data?.commodity) {
    fields['Product'] = extraction.shipper_data.commodity;
  }
  if (extraction.equipment_discussed) {
    fields['Equipment Type'] = extraction.equipment_discussed;
  }

  // Add next steps
  if (extraction.action_items && extraction.action_items.length > 0) {
    fields['Next Steps'] = extraction.action_items.join('; ');
  }

  // Add issues if any
  if (extraction.issues_flagged && extraction.issues_flagged.length > 0) {
    fields['Tags'] = extraction.issues_flagged.join(', ');
  }

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function formatMonday(extraction: CRMExtractionResult): string {
  const itemName = extraction.lane ?
    `${extraction.lane.origin || 'Unknown'} → ${extraction.lane.destination || 'Unknown'}` :
    'Freight Load';

  const fields: Record<string, string> = {
    'Item Name': itemName,
    'Status': extraction.call_type === 'shipper_call' ? 'Load Posted' :
              extraction.call_type === 'carrier_call' ? 'Dispatched' :
              extraction.call_type === 'check_call' ? 'In Transit' : 'New',
    'Priority': extraction.shipper_data?.expedited ? 'Critical' :
                extraction.issues_flagged?.length > 0 ? 'High' : 'Medium',
    'Deal Value': extraction.rate_discussed ? extraction.rate_discussed.toString() : '0',
  };

  // Add dates
  if (extraction.shipper_data?.pickup_date) {
    fields['Pickup Date'] = extraction.shipper_data.pickup_date;
  }
  if (extraction.shipper_data?.delivery_date) {
    fields['Delivery Date'] = extraction.shipper_data.delivery_date;
  }

  // Add companies
  if (extraction.shipper_data?.shipper_company) {
    fields['Company'] = extraction.shipper_data.shipper_company;
  }
  if (extraction.carrier_data?.carrier_name) {
    fields['Carrier'] = extraction.carrier_data.carrier_name;
  }

  // Add contacts
  if (extraction.shipper_data?.shipper_contact) {
    fields['Contact'] = extraction.shipper_data.shipper_contact;
  } else if (extraction.carrier_data?.driver_name) {
    fields['Driver'] = extraction.carrier_data.driver_name;
  }

  // Add equipment and commodity
  if (extraction.equipment_discussed) {
    fields['Equipment'] = extraction.equipment_discussed;
  }
  if (extraction.shipper_data?.commodity) {
    fields['Commodity'] = extraction.shipper_data.commodity;
  }

  // Add next action
  if (extraction.action_items && extraction.action_items.length > 0) {
    fields['Next Action'] = extraction.action_items[0];
  }

  // Add notes with issues if any
  let notes = extraction.call_summary || extraction.summary;
  if (extraction.issues_flagged && extraction.issues_flagged.length > 0) {
    notes += `\n\nIssues: ${extraction.issues_flagged.join(', ')}`;
  }
  fields['Notes'] = notes;

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

// Helper functions for CRM stage mapping (freight broker focused)
function getPipedriveStage(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Load Booked';
    case 'nurture':
      return 'Quoted';
    case 'not_interested':
      return 'No Match';
    case 'follow_up_needed':
      return 'Negotiating';
    default:
      return 'New Load';
  }
}

function getZohoStage(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Dispatched';
    case 'nurture':
      return 'Quote Sent';
    case 'not_interested':
      return 'Cancelled';
    case 'follow_up_needed':
      return 'Following Up';
    default:
      return 'New Load';
  }
}

function getFreshsalesStage(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Booked';
    case 'nurture':
      return 'Quoted';
    case 'not_interested':
      return 'Lost';
    case 'follow_up_needed':
      return 'Negotiating';
    default:
      return 'New';
  }
}

function getMondayStatus(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Booked';
    case 'nurture':
      return 'Quoted';
    case 'not_interested':
      return 'Cancelled';
    case 'follow_up_needed':
      return 'In Progress';
    default:
      return 'New';
  }
}
