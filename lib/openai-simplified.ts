// =====================================================
// SIMPLIFIED CRM EXTRACTION FOR LOADVOICE
// Removes generic sales fields, focuses on freight operations
// =====================================================

import OpenAI from 'openai';
import type { AssemblyAIUtterance } from './assemblyai';

// Import freight-specific types
import type {
  CallType,
  Sentiment,
  ShipperCallData,
  CarrierCallData,
  CheckCallData,
  SimplifiedFreightExtractionResult,
} from './openai-freight-simplified';

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
// SIMPLIFIED CRM EXTRACTION RESULT
// =====================================================

export interface SimplifiedCRMExtractionResult {
  // Core Fields (KEPT)
  summary: string; // 2-3 sentence context summary
  sentiment: Sentiment;
  action_items: string[];
  next_steps: string[];

  // Freight-Specific (delegated to freight extraction)
  call_type: CallType;
  shipper_data?: ShipperCallData;
  carrier_data?: CarrierCallData;
  check_call_data?: CheckCallData;

  // Key Information
  lane?: {
    origin: string;
    destination: string;
  };
  rate_discussed?: number;
  equipment_discussed?: string;

  // Metadata
  confidence_score: number;
  extraction_timestamp: string;

  // DEPRECATED FIELDS (kept for backwards compatibility but not populated)
  // These will return default/empty values
  keyPoints?: string[];
  painPoints?: string[];
  requirements?: string[];
  budget?: string;
  timeline?: string;
  decisionMaker?: string;
  productInterest?: string[];
  competitorsMentioned?: string[];
  objections?: string[];
  buyingSignals?: string[];
  callOutcome?: 'qualified' | 'nurture' | 'not_interested' | 'follow_up_needed';
  qualificationScore?: number;
  urgency?: 'high' | 'medium' | 'low';
  raw?: {
    customerCompany?: string;
    industry?: string;
    companySize?: string;
    currentSolution?: string;
    decisionProcess?: string;
    technicalRequirements?: string[];
  };
}

// =====================================================
// SIMPLIFIED EXTRACTION PROMPT
// =====================================================

const SIMPLIFIED_CRM_PROMPT = `You are LoadVoice AI, specialized in extracting actionable data from freight broker calls.

Your job is to extract ONLY:
1. A brief 2-3 sentence summary capturing context and dynamics
2. Overall sentiment (positive/neutral/negative)
3. Specific action items that need to be completed
4. Clear next steps in the process
5. Freight-specific operational data

For the SUMMARY, focus on:
- Negotiation dynamics and leverage ("Carrier accepted quickly, seemed eager for backhaul")
- Relationship context ("Long-time customer, usually reliable")
- Red flags or opportunities ("Driver mentioned equipment issues")
- Key context not captured in structured fields

DO NOT extract or analyze:
- Sales qualification scores
- Buying signals or objections
- Competitive intelligence
- Company size or industry analysis
- Generic CRM metrics

Keep all extractions factual and directly from the conversation.`;

// =====================================================
// MAIN EXTRACTION FUNCTION
// =====================================================

export async function extractSimplifiedCRMData(
  config: {
    transcript: string;
    utterances: AssemblyAIUtterance[];
    speakerMapping: Record<string, string>;
    customerName?: string;
    callType?: string;
    typedNotes?: string;
  }
): Promise<SimplifiedCRMExtractionResult> {
  try {
    console.log('Starting simplified CRM extraction...');

    const client = getOpenAIClient();

    // First, get freight-specific extraction
    const { extractSimplifiedFreightData } = await import('./openai-freight-simplified');

    const freightExtraction = await extractSimplifiedFreightData({
      transcript: config.transcript,
      utterances: config.utterances,
      speakerMapping: config.speakerMapping,
      customerName: config.customerName,
      callType: config.callType,
    });

    // Build CRM extraction result
    const result: SimplifiedCRMExtractionResult = {
      // Core fields from freight extraction
      summary: freightExtraction.summary,
      sentiment: freightExtraction.sentiment,
      action_items: freightExtraction.action_items,
      next_steps: freightExtraction.next_steps,

      // Freight-specific data
      call_type: freightExtraction.call_type,
      shipper_data: freightExtraction.shipper_data,
      carrier_data: freightExtraction.carrier_data,
      check_call_data: freightExtraction.check_call_data,

      // Key information
      lane: freightExtraction.lane,
      rate_discussed: freightExtraction.rate_discussed,
      equipment_discussed: freightExtraction.equipment_discussed,

      // Metadata
      confidence_score: freightExtraction.confidence_score,
      extraction_timestamp: freightExtraction.extraction_timestamp,

      // DEPRECATED FIELDS - return empty/default values for backwards compatibility
      keyPoints: [],
      painPoints: [],
      requirements: [],
      budget: undefined,
      timeline: undefined,
      decisionMaker: undefined,
      productInterest: [],
      competitorsMentioned: [],
      objections: [],
      buyingSignals: [],
      callOutcome: 'follow_up_needed',
      qualificationScore: 0,
      urgency: 'medium',
      raw: {
        customerCompany: config.customerName,
        industry: undefined,
        companySize: undefined,
        currentSolution: undefined,
        decisionProcess: undefined,
        technicalRequirements: [],
      },
    };

    console.log('Simplified CRM extraction complete');
    return result;

  } catch (error) {
    console.error('Simplified CRM extraction error:', error);

    // Return minimal valid result on error
    return {
      summary: 'Unable to extract call summary',
      sentiment: 'neutral',
      action_items: [],
      next_steps: [],
      call_type: 'unknown',
      confidence_score: 0,
      extraction_timestamp: new Date().toISOString(),

      // Deprecated fields with defaults
      keyPoints: [],
      painPoints: [],
      requirements: [],
      productInterest: [],
      competitorsMentioned: [],
      objections: [],
      buyingSignals: [],
      callOutcome: 'follow_up_needed',
      qualificationScore: 0,
      urgency: 'medium',
      raw: {},
    };
  }
}

// =====================================================
// TEMPLATE FIELD EXTRACTION (Kept for custom fields)
// =====================================================

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

export async function extractTemplateFields(
  transcript: string,
  utterances: AssemblyAIUtterance[],
  speakerMapping: Record<string, string>,
  templateFields: TemplateField[]
): Promise<CustomFieldExtraction[]> {
  try {
    const client = getOpenAIClient();

    const fieldDescriptions = templateFields
      .map((field) => {
        const optionsStr = field.options ? ` (options: ${field.options.join(', ')})` : '';
        return `- ${field.field_name}: ${field.field_type}${optionsStr}${
          field.is_required ? ' (required)' : ''
        }`;
      })
      .join('\n');

    const prompt = `
Extract the following custom fields from this freight broker call:

FIELDS TO EXTRACT:
${fieldDescriptions}

TRANSCRIPT:
${transcript.substring(0, 8000)}

Return a JSON array of extracted fields:
[
  {
    "field_id": "field_id",
    "field_name": "field_name",
    "value": "extracted_value",
    "confidence": 0.95
  }
]

Only include fields where you found relevant information. Leave out fields with no data.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a freight broker AI extracting custom template fields from call transcripts.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '[]';
    const response = JSON.parse(responseContent);

    // Handle both array and object responses
    const extracted = Array.isArray(response) ? response : response.fields || [];

    return extracted.map((field: any) => ({
      field_id: field.field_id || '',
      field_name: field.field_name || field.name || '',
      value: field.value || '',
      confidence: field.confidence || 0.85,
    }));

  } catch (error) {
    console.error('Template field extraction error:', error);
    return [];
  }
}

// =====================================================
// EXPORTS
// =====================================================

export {
  getOpenAIClient,
  CallType,
  Sentiment,
  ShipperCallData,
  CarrierCallData,
  CheckCallData,
};