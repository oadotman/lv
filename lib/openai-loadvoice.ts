/**
 * LoadVoice OpenAI Integration
 * Handles freight-specific extraction using the new prompt system
 */

import OpenAI from 'openai';
import {
  getFreightPrompts,
  selectPromptByCallType,
  validateAndCleanExtraction,
  FREIGHT_SYSTEM_PROMPT
} from './openai-freight-prompts';
import {
  NEGOTIATION_AWARE_CARRIER_PROMPT,
  NEGOTIATION_ANALYSIS_SYSTEM_PROMPT,
  validateNegotiationExtraction,
  shouldGenerateRateConfirmation,
  getNextSteps,
  analyzeRateProgression
} from './openai-freight-negotiation';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Main extraction function for LoadVoice
 */
export async function extractFreightData(
  transcript: string,
  callType?: 'shipper' | 'carrier' | 'check',
  templateId?: string
): Promise<any> {
  try {
    const client = getOpenAIClient();
    const prompts = getFreightPrompts();

    // Select appropriate prompt and system prompt
    let prompt: string;
    let systemPrompt: string = FREIGHT_SYSTEM_PROMPT;

    // For carrier calls, use the negotiation-aware prompt
    if (callType === 'carrier') {
      prompt = NEGOTIATION_AWARE_CARRIER_PROMPT;
      systemPrompt = NEGOTIATION_ANALYSIS_SYSTEM_PROMPT;
    } else if (callType) {
      prompt = prompts[callType];
    } else {
      // Auto-detect call type from transcript
      const detectedPrompt = selectPromptByCallType(transcript);

      // Check if it's a carrier call based on content
      const carrierIndicators = ['mc number', 'dot number', 'truck', 'driver', 'equipment', 'rate per mile', 'all miles', 'detention'];
      const isLikelyCarrier = carrierIndicators.some(indicator =>
        transcript.toLowerCase().includes(indicator)
      );

      if (isLikelyCarrier) {
        prompt = NEGOTIATION_AWARE_CARRIER_PROMPT;
        systemPrompt = NEGOTIATION_ANALYSIS_SYSTEM_PROMPT;
      } else {
        prompt = detectedPrompt;
      }
    }

    // Call OpenAI
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${prompt}\n\nTranscript:\n${transcript}`
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const rawExtraction = JSON.parse(response.choices[0].message.content || '{}');

    // Apply appropriate validation based on extraction type
    let cleanedExtraction;
    if (rawExtraction.extraction_type === 'carrier_negotiation' ||
        rawExtraction.negotiation_outcome) {
      // Use negotiation-specific validation
      cleanedExtraction = validateNegotiationExtraction(rawExtraction);

      // Add next steps based on negotiation outcome
      if (cleanedExtraction.negotiation_outcome) {
        cleanedExtraction.next_steps = getNextSteps(cleanedExtraction);

        // Determine if rate confirmation should be generated
        cleanedExtraction.should_generate_rate_con = shouldGenerateRateConfirmation(cleanedExtraction);

        // Analyze rate progression if available
        if (cleanedExtraction.negotiation_outcome.rate_history) {
          cleanedExtraction.rate_analysis = analyzeRateProgression(
            cleanedExtraction.negotiation_outcome.rate_history
          );
        }
      }
    } else {
      // Use standard validation
      cleanedExtraction = validateAndCleanExtraction(rawExtraction);
    }

    // Add metadata
    cleanedExtraction.metadata = {
      model: 'gpt-4o',
      extractedAt: new Date().toISOString(),
      templateId: templateId || null,
      promptUsed: callType || 'auto-detected',
      tokensUsed: response.usage?.total_tokens || 0,
      negotiationAware: !!cleanedExtraction.negotiation_outcome
    };

    return cleanedExtraction;
  } catch (error) {
    console.error('Error extracting freight data:', error);
    throw new Error(`Failed to extract freight data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate summary for a freight call
 */
export async function generateFreightCallSummary(transcript: string): Promise<string> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a freight broker assistant. Provide a concise 2-3 sentence summary of this call, focusing on the key business details: what load, where, when, and rate if discussed.'
        },
        {
          role: 'user',
          content: `Summarize this freight call:\n${transcript.substring(0, 3000)}` // Limit context for summary
        }
      ],
      temperature: 0.5,
      max_tokens: 150
    });

    return response.choices[0].message.content || 'Unable to generate summary';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Summary generation failed';
  }
}

/**
 * Extract action items from a freight call
 */
export async function extractActionItems(transcript: string): Promise<string[]> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a freight broker assistant. Extract clear, actionable next steps from this call. Focus on what the broker needs to do: find carriers, send rate cons, check on loads, etc.'
        },
        {
          role: 'user',
          content: `Extract action items from this call. Return as a JSON array of strings:\n${transcript.substring(0, 3000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"items":[]}');
    return result.items || [];
  } catch (error) {
    console.error('Error extracting action items:', error);
    return [];
  }
}

/**
 * Analyze sentiment and professionalism of a carrier
 */
export async function analyzeCarrierQuality(transcript: string): Promise<{
  professionalismScore: number;
  reliabilityIndicators: string[];
  redFlags: string[];
  recommendation: string;
}> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced freight broker. Analyze this carrier call for professionalism, reliability, and any red flags. Consider communication style, equipment description, availability, and rate discussion.'
        },
        {
          role: 'user',
          content: `Analyze this carrier's professionalism and reliability. Return JSON with: professionalismScore (0-100), reliabilityIndicators (array), redFlags (array), recommendation (short text):\n${transcript.substring(0, 3000)}`
        }
      ],
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"professionalismScore":50,"reliabilityIndicators":[],"redFlags":[],"recommendation":"Unable to assess"}');
  } catch (error) {
    console.error('Error analyzing carrier quality:', error);
    return {
      professionalismScore: 50,
      reliabilityIndicators: [],
      redFlags: ['Analysis failed'],
      recommendation: 'Manual review recommended'
    };
  }
}

/**
 * Match extracted load with potential carriers
 */
export async function suggestCarriersForLoad(
  loadData: any,
  availableCarriers: any[]
): Promise<{
  matchedCarriers: Array<{
    carrierId: string;
    matchScore: number;
    reasons: string[];
  }>;
}> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a freight broker AI. Match this load with the best available carriers based on equipment, location, and lane preferences.'
        },
        {
          role: 'user',
          content: `Match this load with carriers. Return JSON with matchedCarriers array, each with carrierId, matchScore (0-100), and reasons array.

Load: ${JSON.stringify(loadData)}
Available Carriers: ${JSON.stringify(availableCarriers)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"matchedCarriers":[]}');
  } catch (error) {
    console.error('Error matching carriers:', error);
    return { matchedCarriers: [] };
  }
}

/**
 * Generate rate confirmation terms
 */
export async function generateRateConTerms(loadData: any): Promise<string | null> {
  try {
    // Only generate rate confirmation for agreed negotiations
    if (loadData.negotiation_outcome) {
      if (loadData.negotiation_outcome.status !== 'agreed') {
        console.log('Skipping rate confirmation - negotiation status is:', loadData.negotiation_outcome.status);
        return null;
      }

      // Ensure we have an agreed rate
      if (!loadData.negotiation_outcome.agreed_rate) {
        console.warn('Cannot generate rate confirmation - no agreed rate despite agreed status');
        return null;
      }
    }

    const client = getOpenAIClient();

    // Build load details including negotiated rate
    const rateInfo = loadData.negotiation_outcome ?
      {
        agreed_rate: loadData.negotiation_outcome.agreed_rate,
        rate_type: loadData.negotiation_outcome.rate_type,
        rate_includes_fuel: loadData.negotiation_outcome.rate_includes_fuel,
        accessorials: loadData.negotiation_outcome.accessorials_discussed
      } : {};

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a freight broker. Generate professional rate confirmation terms and conditions for this load. Include payment terms, detention policy, and standard broker protections. Incorporate any specific accessorials or contingencies that were discussed.'
        },
        {
          role: 'user',
          content: `Generate rate confirmation terms for:
Load Data: ${JSON.stringify(loadData)}
Rate Agreement: ${JSON.stringify(rateInfo)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    return response.choices[0].message.content || 'Standard terms and conditions apply.';
  } catch (error) {
    console.error('Error generating rate con terms:', error);
    return 'Standard terms and conditions apply. Payment terms: Net 30 days upon receipt of POD and invoice.';
  }
}

export default {
  extractFreightData,
  generateFreightCallSummary,
  extractActionItems,
  analyzeCarrierQuality,
  suggestCarriersForLoad,
  generateRateConTerms
};