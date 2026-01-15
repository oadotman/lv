/**
 * Classification Agent - Determines the type and nature of the call
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, ClassificationOutput, CallType } from '../types';

export class ClassificationAgent extends BaseAgent<void, ClassificationOutput> {
  name = 'classification';
  version = '1.0.0';
  description = 'Call type classification and routing';

  constructor() {
    super({
      timeout: 15000, // 15 seconds
      critical: true,  // Must succeed for pipeline to continue
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<ClassificationOutput> {
    this.log('Starting call classification');

    // Build prompt
    const prompt = this.getPrompt(context);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.2, // Lower temperature for consistent classification
      'gpt-4o-mini'
    );

    // Clean and validate
    const output = this.parseResponse(response, context);

    this.log(`Classified as: ${output.primaryType} with confidence ${output.confidence.value}`);

    return output;
  }

  getPrompt(context: AgentContextData): string {
    const transcript = context.transcript;
    const utteranceCount = context.utterances.length;
    const duration = context.metadata.duration || 0;

    return `Analyze this freight broker call transcript and classify it.

TRANSCRIPT:
${transcript.substring(0, 4000)} // Limit for classification

METADATA:
- Utterance count: ${utteranceCount}
- Duration: ${duration} seconds
- Has customer name: ${!!context.metadata.customerName}

CLASSIFICATION TASK:
Determine the primary type of this call and any relevant subtypes.

CALL TYPES:
1. new_booking - Shipper calling to book a new load
   Indicators: "I need to ship", "I have a load", "can you quote", pickup/delivery locations

2. carrier_quote - Carrier offering capacity or discussing rates
   Indicators: MC number, "I have trucks", "what's the rate", rate negotiation

3. check_call - Checking on existing load status
   Indicators: "checking on", "where is the driver", "status update", reference numbers

4. renegotiation - Changing terms of existing agreement
   Indicators: "need to change the rate", "can we adjust", references to previous agreement

5. callback_acceptance - Carrier calling back to accept previous offer
   Indicators: "calling back about", "I'll take that load", "decided to accept"

6. wrong_number - Not a freight-related call
   Indicators: wrong industry, personal call, unrelated business

7. voicemail - Voicemail message
   Indicators: "please leave a message", one-sided conversation, greeting message

SUBTYPES (can have multiple):
- multi_load: Multiple loads discussed
- continuation: References previous calls
- urgent: Time-sensitive or hot load
- team_required: Needs team drivers
- partial: Partial load or LTL

Extract:
{
  "primaryType": "...", // One of the types above
  "subTypes": [...],    // Array of applicable subtypes
  "confidence": 0.0-1.0,
  "indicators": [...],  // Key phrases that led to classification
  "multiLoadCall": boolean,
  "continuationCall": boolean,
  "isVoicemail": boolean,
  "callPurpose": "Brief description of what caller wants"
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert call classification system for LoadVoice, specializing in freight broker calls.
Your job is to accurately classify calls to route them to the appropriate extraction pipeline.
Be precise in your classification - the entire extraction flow depends on getting this right.
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, context: AgentContextData): ClassificationOutput {
    // Validate primary type
    const validTypes: CallType[] = [
      'new_booking', 'carrier_quote', 'check_call',
      'renegotiation', 'callback_acceptance', 'wrong_number', 'voicemail'
    ];

    let primaryType = response.primaryType as CallType;
    if (!validTypes.includes(primaryType)) {
      this.warn(`Invalid primary type: ${primaryType}, defaulting to check_call`);
      primaryType = 'check_call';
    }

    // Calculate confidence based on indicators
    const indicatorCount = response.indicators?.length || 0;
    let confidenceValue = response.confidence || 0.5;

    // Adjust confidence based on indicator strength
    if (indicatorCount >= 3) {
      confidenceValue = Math.min(confidenceValue * 1.2, 1.0);
    } else if (indicatorCount <= 1) {
      confidenceValue = Math.max(confidenceValue * 0.8, 0.3);
    }

    // Build output
    const output: ClassificationOutput = {
      primaryType,
      subTypes: response.subTypes || [],
      indicators: response.indicators || [],
      multiLoadCall: response.multiLoadCall || false,
      continuationCall: response.continuationCall || false,
      confidence: this.calculateConfidence({
        classification: confidenceValue,
        indicators: indicatorCount >= 2 ? 0.9 : 0.5,
        context: this.hasGoodContext(context) ? 0.8 : 0.4
      })
    };

    // Add warnings for low confidence
    if (output.confidence.value < 0.5) {
      output.processingNotes = ['Low confidence classification - may need human review'];
    }

    return output;
  }

  private hasGoodContext(context: AgentContextData): boolean {
    // Check if we have good context for classification
    return (
      context.transcript.length > 100 &&
      context.utterances.length > 2 &&
      (context.metadata.duration || 0) > 10
    );
  }

  getDefaultOutput(): ClassificationOutput {
    return {
      primaryType: 'check_call', // Safest default
      subTypes: [],
      indicators: [],
      multiLoadCall: false,
      continuationCall: false,
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['Using default classification']
      },
      processingNotes: ['Classification failed - using default']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      output.primaryType &&
      output.confidence &&
      Array.isArray(output.indicators)
    );
  }
}