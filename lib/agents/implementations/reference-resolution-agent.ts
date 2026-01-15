/**
 * Reference Resolution Agent - Resolves references to previous calls, loads, or agreements
 * Handles "that load we discussed", "same as last time", "the Chicago run"
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface ResolvedReference {
  id: string;

  // The reference as stated
  originalReference: {
    text: string;
    type: 'previous_call' | 'previous_load' | 'previous_rate' | 'previous_agreement' |
           'standard_lane' | 'regular_run' | 'customer_specific' | 'equipment_specific';
    speakerId?: string;
    confidence: number;
  };

  // What it refers to
  resolvedTo: {
    type: 'load' | 'rate' | 'lane' | 'customer' | 'agreement' | 'equipment';
    identifier?: string; // Load ID, lane name, customer name, etc.
    description: string;

    // Specific details if resolved
    details?: {
      origin?: string;
      destination?: string;
      rate?: number;
      commodity?: string;
      equipment?: string;
      customer?: string;
      previousDate?: Date;
      previousCallId?: string;
    };
  };

  // Context clues used for resolution
  contextClues: Array<{
    clueType: 'location' | 'commodity' | 'customer' | 'equipment' | 'rate' | 'time';
    clueText: string;
    relevance: 'high' | 'medium' | 'low';
  }>;

  // Resolution status
  resolutionStatus: {
    resolved: boolean;
    confidence: number;
    ambiguity?: string; // If partially resolved
    alternativeInterpretations?: Array<{
      interpretation: string;
      likelihood: number;
    }>;
  };

  // Impact on current call
  impact: {
    affectsRate: boolean;
    affectsRoute: boolean;
    affectsTerms: boolean;
    carryOverDetails: string[]; // Which details carry over from reference
  };
}

export interface ReferenceResolutionOutput extends BaseAgentOutput {
  references: ResolvedReference[];

  // Common references patterns detected
  referencePatterns: {
    hasRegularLanes: boolean;
    hasRepeatCustomer: boolean;
    hasStandardRates: boolean;
    hasPreviousNegotiation: boolean;
  };

  // Inferred context from references
  inferredContext: {
    relationshipType?: 'new' | 'occasional' | 'regular' | 'long_term';
    familiarityLevel: 'first_time' | 'somewhat_familiar' | 'very_familiar';
    previousInteractions?: number; // Estimated number

    // Standard business patterns
    standardLanes?: Array<{
      lane: string; // "Chicago to Atlanta"
      frequency?: string; // "weekly", "twice a month"
      standardRate?: number;
      standardTerms?: string[];
    }>;

    // Regular agreements
    standardAgreements?: Array<{
      type: 'rate' | 'terms' | 'equipment';
      description: string;
      details?: any;
    }>;
  };

  // Information gaps that need clarification
  clarificationNeeded: Array<{
    referenceId: string;
    missingInfo: string;
    question: string; // Question to ask for clarification
    priority: 'critical' | 'important' | 'nice_to_have';
  }>;

  // Assumptions made during resolution
  assumptions: Array<{
    assumption: string;
    basis: string; // Why this assumption was made
    confidence: number;
    risk: 'low' | 'medium' | 'high';
  }>;

  // Continuity checks
  continuityIssues?: Array<{
    type: 'conflicting_info' | 'missing_context' | 'ambiguous_reference';
    description: string;
    resolution?: string;
    severity: 'minor' | 'moderate' | 'severe';
  }>
}

export class ReferenceResolutionAgent extends BaseAgent<void, ReferenceResolutionOutput> {
  name = 'reference_resolution';
  version = '1.0.0';
  description = 'Previous call and load reference resolution';
  dependencies = ['classification', 'speaker_identification'];

  constructor() {
    super({
      timeout: 15000,
      critical: false, // Critical for check calls and callbacks
      parallel: true, // Can run early in parallel
      retryOnFailure: true
    });
  }
  getPrompt(context: AgentContextData): string {
    const entities = context.getAgentOutput<any>('entity_extraction');
    const simpleEntities = context.getAgentOutput<any>('simple_entity_extraction');
    return this.buildReferencePrompt(context, entities || simpleEntities);
  }

  async execute(context: AgentContextData): Promise<ReferenceResolutionOutput> {
    this.log('Resolving references to previous calls and loads');

    const classification = context.getAgentOutput<any>('classification');
    const speakers = context.getAgentOutput<any>('speaker_identification');

    // More relevant for certain call types
    const isHighlyRelevant = this.isHighlyRelevant(classification?.primaryType);

    // Build reference extraction prompt
    const prompt = this.buildReferencePrompt(context, isHighlyRelevant);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o'
    );

    // Parse and analyze response
    const output = this.parseReferenceResponse(response, context);

    this.log(`Resolved ${output.references.length} references, familiarity: ${output.inferredContext.familiarityLevel}`);

    return output;
  }

  private isHighlyRelevant(callType?: string): boolean {
    const highlyRelevantTypes = ['check_call', 'renegotiation', 'callback_acceptance'];
    return highlyRelevantTypes.includes(callType || '');
  }

  private buildReferencePrompt(context: AgentContextData, isHighlyRelevant: boolean): string {
    return `Identify and resolve all references to previous calls, loads, or agreements in this freight broker conversation.
${isHighlyRelevant ? 'This appears to be a follow-up call, so references to previous interactions are likely.' : ''}

TRANSCRIPT:
${context.transcript}

EXTRACTION REQUIREMENTS:

1. IDENTIFY REFERENCES:
   Look for phrases that refer to previous interactions:
   - "That load we discussed yesterday"
   - "Same as last time"
   - "The usual Chicago run"
   - "Like we did before"
   - "Remember when we..."
   - "The one from last week"
   - "Our standard rate"
   - "The regular Tuesday pickup"
   - "That customer's loads"
   - "Same terms as always"

2. CATEGORIZE REFERENCE TYPES:
   - Previous calls: "when we talked yesterday"
   - Previous loads: "that Atlanta load"
   - Standard lanes: "our regular Chicago-Atlanta lane"
   - Regular customers: "the Ford loads"
   - Standard agreements: "our usual terms"
   - Previous negotiations: "the rate we agreed on"

3. EXTRACT CONTEXT CLUES:
   What information helps identify what they're referring to:
   - Locations mentioned
   - Commodities discussed
   - Customer names
   - Equipment types
   - Rate amounts
   - Time references

4. RESOLVE REFERENCES:
   Based on context, determine what each reference likely refers to:
   - Specific load details
   - Rate agreements
   - Standard lanes
   - Customer-specific arrangements

5. ASSESS RELATIONSHIP:
   Based on the references, infer:
   - How familiar are the parties?
   - Is this a regular business relationship?
   - Are there standard agreements in place?
   - How many previous interactions implied?

6. IDENTIFY GAPS:
   What information is assumed but not explicit:
   - Missing load details assumed from reference
   - Rate assumptions based on "usual" or "standard"
   - Terms carried over from previous agreements

Return as JSON:
{
  "references": [
    {
      "id": "ref_1",

      "originalReference": {
        "text": "exact quote from transcript",
        "type": "previous_call|previous_load|previous_rate|standard_lane|etc",
        "speakerId": "speaker_0",
        "confidence": 0.0-1.0
      },

      "resolvedTo": {
        "type": "load|rate|lane|customer|agreement|equipment",
        "identifier": "Chicago-Atlanta lane",
        "description": "What this reference resolves to",

        "details": {
          "origin": "Chicago, IL",
          "destination": "Atlanta, GA",
          "rate": 2500,
          "commodity": "auto parts",
          "equipment": "dry van",
          "customer": "customer name if mentioned",
          "previousDate": "ISO date if mentioned"
        }
      },

      "contextClues": [
        {
          "clueType": "location|commodity|customer|equipment|rate|time",
          "clueText": "text that provides context",
          "relevance": "high|medium|low"
        }
      ],

      "resolutionStatus": {
        "resolved": boolean,
        "confidence": 0.0-1.0,
        "ambiguity": "what remains unclear",
        "alternativeInterpretations": [
          {
            "interpretation": "alternative meaning",
            "likelihood": 0.0-1.0
          }
        ]
      },

      "impact": {
        "affectsRate": boolean,
        "affectsRoute": boolean,
        "affectsTerms": boolean,
        "carryOverDetails": ["rate", "terms", "equipment"]
      }
    }
  ],

  "referencePatterns": {
    "hasRegularLanes": boolean,
    "hasRepeatCustomer": boolean,
    "hasStandardRates": boolean,
    "hasPreviousNegotiation": boolean
  },

  "inferredContext": {
    "relationshipType": "new|occasional|regular|long_term",
    "familiarityLevel": "first_time|somewhat_familiar|very_familiar",
    "previousInteractions": estimated number or null,

    "standardLanes": [
      {
        "lane": "Chicago to Atlanta",
        "frequency": "weekly",
        "standardRate": 2500,
        "standardTerms": ["2 hours detention free", "lumper reimbursable"]
      }
    ],

    "standardAgreements": [
      {
        "type": "rate|terms|equipment",
        "description": "description of standard agreement",
        "details": {}
      }
    ]
  },

  "clarificationNeeded": [
    {
      "referenceId": "ref_1",
      "missingInfo": "specific pickup date",
      "question": "When do you need the Chicago pickup?",
      "priority": "critical|important|nice_to_have"
    }
  ],

  "assumptions": [
    {
      "assumption": "Same rate as last time means $2,500",
      "basis": "Previous rate of $2,500 mentioned earlier",
      "confidence": 0.8,
      "risk": "low|medium|high"
    }
  ],

  "continuityIssues": [
    {
      "type": "conflicting_info|missing_context|ambiguous_reference",
      "description": "description of issue",
      "resolution": "how to resolve",
      "severity": "minor|moderate|severe"
    }
  ]
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert at resolving references in freight broker conversations.
Identify when speakers refer to previous calls, loads, or agreements.
Use context clues to determine what they're referring to.
Assess the familiarity level between parties based on these references.
Identify what information is being assumed or carried over from previous interactions.
Flag any ambiguous references that need clarification.
Return valid JSON without markdown formatting.`;
  }

  private parseReferenceResponse(response: any, context: AgentContextData): ReferenceResolutionOutput {
    const references = this.parseReferences(response.references);

    // Calculate confidence
    const avgConfidence = references.length > 0
      ? references.reduce((sum, r) => sum + r.resolutionStatus.confidence, 0) / references.length
      : 0.5;

    // Infer context if not provided
    const inferredContext = response.inferredContext || this.inferContext(references);

    return {
      references,
      referencePatterns: response.referencePatterns || this.detectPatterns(references),
      inferredContext,
      clarificationNeeded: response.clarificationNeeded || [],
      assumptions: response.assumptions || [],
      continuityIssues: response.continuityIssues || [],
      confidence: this.calculateConfidence({
        referenceResolution: avgConfidence,
        contextInference: this.assessContextQuality(inferredContext),
        assumptionRisk: this.assessAssumptionRisk(response.assumptions)
      })
    };
  }

  private parseReferences(data: any): ResolvedReference[] {
    if (!Array.isArray(data)) return [];

    return data.map((ref, index) => ({
      id: ref.id || `ref_${index + 1}`,

      originalReference: {
        text: ref.originalReference?.text || '',
        type: ref.originalReference?.type || 'previous_load',
        speakerId: ref.originalReference?.speakerId,
        confidence: ref.originalReference?.confidence || 0.5
      },

      resolvedTo: {
        type: ref.resolvedTo?.type || 'load',
        identifier: ref.resolvedTo?.identifier,
        description: ref.resolvedTo?.description || '',
        details: ref.resolvedTo?.details ? {
          origin: ref.resolvedTo.details.origin,
          destination: ref.resolvedTo.details.destination,
          rate: this.parseNumber(ref.resolvedTo.details.rate),
          commodity: ref.resolvedTo.details.commodity,
          equipment: ref.resolvedTo.details.equipment,
          customer: ref.resolvedTo.details.customer,
          previousDate: this.parseDate(ref.resolvedTo.details.previousDate),
          previousCallId: ref.resolvedTo.details.previousCallId
        } : undefined
      },

      contextClues: ref.contextClues || [],

      resolutionStatus: {
        resolved: ref.resolutionStatus?.resolved || false,
        confidence: ref.resolutionStatus?.confidence || 0.5,
        ambiguity: ref.resolutionStatus?.ambiguity,
        alternativeInterpretations: ref.resolutionStatus?.alternativeInterpretations
      },

      impact: {
        affectsRate: ref.impact?.affectsRate || false,
        affectsRoute: ref.impact?.affectsRoute || false,
        affectsTerms: ref.impact?.affectsTerms || false,
        carryOverDetails: ref.impact?.carryOverDetails || []
      }
    }));
  }

  private inferContext(references: ResolvedReference[]): ReferenceResolutionOutput['inferredContext'] {
    // Determine familiarity based on references
    const hasMultipleRefs = references.length > 2;
    const hasStandardTerms = references.some(r =>
      r.originalReference.text.toLowerCase().includes('usual') ||
      r.originalReference.text.toLowerCase().includes('standard') ||
      r.originalReference.text.toLowerCase().includes('always')
    );

    let familiarityLevel: 'first_time' | 'somewhat_familiar' | 'very_familiar' = 'first_time';
    if (hasStandardTerms || hasMultipleRefs) {
      familiarityLevel = 'very_familiar';
    } else if (references.length > 0) {
      familiarityLevel = 'somewhat_familiar';
    }

    let relationshipType: 'new' | 'occasional' | 'regular' | 'long_term' = 'new';
    if (hasStandardTerms) {
      relationshipType = 'regular';
    } else if (references.length > 0) {
      relationshipType = 'occasional';
    }

    return {
      relationshipType,
      familiarityLevel,
      previousInteractions: references.length > 0 ? Math.max(1, references.length) : undefined
    };
  }

  private detectPatterns(references: ResolvedReference[]): ReferenceResolutionOutput['referencePatterns'] {
    return {
      hasRegularLanes: references.some(r => r.originalReference.type === 'standard_lane'),
      hasRepeatCustomer: references.some(r => r.originalReference.type === 'customer_specific'),
      hasStandardRates: references.some(r => r.originalReference.type === 'previous_rate'),
      hasPreviousNegotiation: references.some(r => r.originalReference.type === 'previous_agreement')
    };
  }

  private assessContextQuality(context: ReferenceResolutionOutput['inferredContext']): number {
    let score = 0.5; // Base score

    if (context.relationshipType !== 'new') score += 0.2;
    if (context.familiarityLevel === 'very_familiar') score += 0.2;
    if (context.standardLanes && context.standardLanes.length > 0) score += 0.1;

    return Math.min(1.0, score);
  }

  private assessAssumptionRisk(assumptions: any[]): number {
    if (!assumptions || assumptions.length === 0) return 1.0;

    const highRiskCount = assumptions.filter(a => a.risk === 'high').length;
    const mediumRiskCount = assumptions.filter(a => a.risk === 'medium').length;

    // More high-risk assumptions = lower confidence
    return Math.max(0.3, 1.0 - (highRiskCount * 0.2) - (mediumRiskCount * 0.1));
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  private parseDate(dateStr: any): Date | undefined {
    if (!dateStr || dateStr === 'null') return undefined;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      return date;
    } catch {
      return undefined;
    }
  }

  getDefaultOutput(): ReferenceResolutionOutput {
    return {
      references: [],
      referencePatterns: {
        hasRegularLanes: false,
        hasRepeatCustomer: false,
        hasStandardRates: false,
        hasPreviousNegotiation: false
      },
      inferredContext: {
        relationshipType: 'new',
        familiarityLevel: 'first_time'
      },
      clarificationNeeded: [],
      assumptions: [],
      confidence: {
        value: 0.5,
        level: 'medium',
        factors: ['No references detected']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.references) &&
      output.referencePatterns &&
      output.inferredContext &&
      output.confidence
    );
  }
}