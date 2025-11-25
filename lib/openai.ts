// =====================================================
// OPENAI CLIENT UTILITY
// Handles CRM data extraction from transcripts using GPT-4o
// =====================================================

import OpenAI from 'openai';
import type { AssemblyAIUtterance } from './assemblyai';

// Validate API key exists
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Create OpenAI client
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// TYPES
// =====================================================

export interface CRMExtractionConfig {
  transcript: string;
  utterances: AssemblyAIUtterance[];
  speakerMapping: Record<string, string>;
  customerName?: string;
  callType?: string;
}

export interface CRMExtractionResult {
  // Core fields
  summary: string;
  keyPoints: string[];
  nextSteps: string[];

  // Customer intelligence
  painPoints: string[];
  requirements: string[];
  budget?: string;
  timeline?: string;
  decisionMaker?: string;

  // Opportunity data
  productInterest: string[];
  competitorsMentioned: string[];
  objections: string[];
  buyingSignals: string[];

  // Call outcome
  callOutcome: 'qualified' | 'nurture' | 'not_interested' | 'follow_up_needed';
  qualificationScore: number; // 0-100

  // Additional context
  urgency: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';

  // Raw structured data
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
 * Extract CRM-ready data from transcript using GPT-4o
 */
export async function extractCRMData(
  config: CRMExtractionConfig
): Promise<CRMExtractionResult> {
  try {
    console.log('Starting CRM extraction with GPT-4o...');

    // Format conversation for GPT
    const conversation = formatConversation(config.utterances, config.speakerMapping);

    // Build extraction prompt
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

    console.log('CRM extraction complete:', {
      summary_length: extracted.summary?.length || 0,
      pain_points: extracted.painPoints?.length || 0,
      next_steps: extracted.nextSteps?.length || 0,
      qualification_score: extracted.qualificationScore,
    });

    return extracted;
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw error;
  }
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
      const roleLabel = role === 'rep' ? 'Sales Rep' : role === 'prospect' ? 'Prospect' : role;
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
    contextInfo.push(`Customer Name: ${config.customerName}`);
  }

  if (config.callType) {
    contextInfo.push(`Call Type: ${config.callType}`);
  }

  const context = contextInfo.length > 0 ? contextInfo.join('\n') + '\n\n' : '';

  return `${context}Analyze this sales call transcript and extract structured CRM data.

CONVERSATION:
${conversation}

Extract and return a JSON object with the following structure:
{
  "summary": "2-3 sentence executive summary of the call",
  "keyPoints": ["array", "of", "key", "discussion", "points"],
  "nextSteps": ["array", "of", "action", "items"],
  "painPoints": ["customer", "pain", "points", "discussed"],
  "requirements": ["customer", "requirements", "or", "needs"],
  "budget": "budget mentioned or null",
  "timeline": "timeline mentioned or null",
  "decisionMaker": "decision maker name or null",
  "productInterest": ["products", "or", "features", "discussed"],
  "competitorsMentioned": ["competitors", "mentioned"],
  "objections": ["objections", "raised"],
  "buyingSignals": ["positive", "buying", "signals"],
  "callOutcome": "qualified|nurture|not_interested|follow_up_needed",
  "qualificationScore": 0-100,
  "urgency": "high|medium|low",
  "sentiment": "positive|neutral|negative",
  "raw": {
    "customerCompany": "company name or null",
    "industry": "industry or null",
    "companySize": "company size or null",
    "currentSolution": "current solution or null",
    "decisionProcess": "decision process or null",
    "technicalRequirements": ["technical", "requirements"]
  }
}

IMPORTANT:
- Be thorough but concise
- Only include information explicitly mentioned in the conversation
- Use null for missing information, not empty strings
- Qualification score should reflect: pain points, budget, timeline, authority, fit
- Buying signals include: urgency, positive language, next steps commitment`;
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

  return `Extract the following custom CRM fields from this sales call transcript.

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

const SYSTEM_PROMPT = `You are an expert sales call analyzer and CRM data extraction specialist. Your role is to analyze sales call transcripts and extract structured, actionable CRM data.

You have deep expertise in:
- Sales qualification (BANT, MEDDIC, etc.)
- Identifying customer pain points and requirements
- Recognizing buying signals and objections
- Assessing deal urgency and fit
- Understanding B2B sales processes

Your extractions should be:
1. ACCURATE: Only extract information explicitly stated or strongly implied
2. STRUCTURED: Follow the exact JSON schema provided
3. ACTIONABLE: Focus on data that helps sales reps close deals
4. CONSISTENT: Use consistent formatting and terminology

Always respond with valid JSON matching the requested schema.`;

const TEMPLATE_SYSTEM_PROMPT = `You are a CRM data extraction specialist. Your role is to extract specific custom fields from sales call transcripts.

You must:
1. Extract each requested field accurately
2. Match dropdown/select options exactly as provided
3. Assign confidence scores honestly (1.0 = explicit, 0.5 = implied, 0.0 = not found)
4. Return null for missing information, never guess
5. Follow the exact JSON schema provided

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
  format: 'plain' | 'hubspot' | 'salesforce'
): string {
  switch (format) {
    case 'plain':
      return formatPlainText(extraction);
    case 'hubspot':
      return formatHubSpot(extraction);
    case 'salesforce':
      return formatSalesforce(extraction);
    default:
      return formatPlainText(extraction);
  }
}

function formatPlainText(extraction: CRMExtractionResult): string {
  let output = '';

  output += `CALL SUMMARY\n${extraction.summary}\n\n`;

  if (extraction.keyPoints.length > 0) {
    output += `KEY POINTS\n${extraction.keyPoints.map((p) => `• ${p}`).join('\n')}\n\n`;
  }

  if (extraction.painPoints.length > 0) {
    output += `PAIN POINTS\n${extraction.painPoints.map((p) => `• ${p}`).join('\n')}\n\n`;
  }

  if (extraction.requirements.length > 0) {
    output += `REQUIREMENTS\n${extraction.requirements.map((r) => `• ${r}`).join('\n')}\n\n`;
  }

  if (extraction.productInterest.length > 0) {
    output += `PRODUCT INTEREST\n${extraction.productInterest.map((p) => `• ${p}`).join('\n')}\n\n`;
  }

  if (extraction.objections.length > 0) {
    output += `OBJECTIONS\n${extraction.objections.map((o) => `• ${o}`).join('\n')}\n\n`;
  }

  if (extraction.nextSteps.length > 0) {
    output += `NEXT STEPS\n${extraction.nextSteps.map((s) => `• ${s}`).join('\n')}\n\n`;
  }

  output += `QUALIFICATION\n`;
  output += `Score: ${extraction.qualificationScore}/100\n`;
  output += `Outcome: ${extraction.callOutcome}\n`;
  output += `Urgency: ${extraction.urgency}\n`;
  output += `Sentiment: ${extraction.sentiment}\n`;

  return output;
}

function formatHubSpot(extraction: CRMExtractionResult): string {
  const fields: Record<string, string> = {
    'Call Summary': extraction.summary,
    'Call Outcome': extraction.callOutcome,
    'Deal Stage': getHubSpotStage(extraction.callOutcome),
    'Lead Score': extraction.qualificationScore.toString(),
    'Priority': extraction.urgency,
    'Pain Points': extraction.painPoints.join('; '),
    'Requirements': extraction.requirements.join('; '),
    'Next Steps': extraction.nextSteps.join('; '),
  };

  if (extraction.budget) fields['Budget'] = extraction.budget;
  if (extraction.timeline) fields['Timeline'] = extraction.timeline;
  if (extraction.decisionMaker) fields['Decision Maker'] = extraction.decisionMaker;
  if (extraction.raw.customerCompany) fields['Company'] = extraction.raw.customerCompany;
  if (extraction.raw.industry) fields['Industry'] = extraction.raw.industry;

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function formatSalesforce(extraction: CRMExtractionResult): string {
  const fields: Record<string, string> = {
    Subject: `Call Summary - ${extraction.callOutcome}`,
    Description: extraction.summary,
    Status: getSalesforceStatus(extraction.callOutcome),
    Priority: extraction.urgency === 'high' ? 'High' : extraction.urgency === 'low' ? 'Low' : 'Medium',
    'Lead Score': extraction.qualificationScore.toString(),
    'Pain Points': extraction.painPoints.join('; '),
    'Next Steps': extraction.nextSteps.join('; '),
  };

  if (extraction.budget) fields['Budget'] = extraction.budget;
  if (extraction.timeline) fields['Close Date Estimate'] = extraction.timeline;
  if (extraction.raw.customerCompany) fields['Company'] = extraction.raw.customerCompany;

  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function getHubSpotStage(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Qualified Lead';
    case 'nurture':
      return 'Nurture';
    case 'not_interested':
      return 'Closed Lost';
    case 'follow_up_needed':
      return 'Appointment Scheduled';
    default:
      return 'New';
  }
}

function getSalesforceStatus(outcome: string): string {
  switch (outcome) {
    case 'qualified':
      return 'Qualified';
    case 'nurture':
      return 'Working';
    case 'not_interested':
      return 'Closed - Not Converted';
    case 'follow_up_needed':
      return 'Open';
    default:
      return 'New';
  }
}
