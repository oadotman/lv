/**
 * Rate Negotiation Agent - Handles complex multi-round rate negotiations
 * Tracks offer/counter-offer patterns and identifies final agreements
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface NegotiationRound {
  roundNumber: number;
  speaker: string;
  speakerRole: 'broker' | 'carrier' | 'shipper';
  amount: number;
  rateType: 'flat' | 'per_mile' | 'all_in' | 'base_plus';
  action: 'initial_offer' | 'counter' | 'accept' | 'reject' | 'thinking' | 'final_offer';
  reasoning?: string;
  timestamp?: number;
  rawText: string;
}

export interface RateNegotiationOutput extends BaseAgentOutput {
  negotiations: Array<{
    negotiationId: string;
    loadId?: string;

    // Negotiation status
    status: 'agreed' | 'pending' | 'rejected' | 'stalled' | 'callback_requested';

    // Final agreement details
    agreedRate?: number;
    rateType: 'flat' | 'per_mile' | 'hourly' | 'percentage';
    rateStructure: 'all_in' | 'base_plus_fuel' | 'base_plus_accessorials';
    includesFuel: boolean | 'unknown';
    includesAccessorials: boolean | 'partial' | 'unknown';

    // Negotiation history
    priceHistory: NegotiationRound[];

    // Position tracking
    initialPositions: {
      broker?: number;
      carrier?: number;
      shipper?: number;
    };

    finalPositions: {
      broker?: number;
      carrier?: number;
      shipper?: number;
    };

    // Negotiation metrics
    numberOfRounds: number;
    priceMovement: {
      brokerConcession?: number; // How much broker moved from initial
      carrierConcession?: number; // How much carrier moved from initial
      meetingPoint?: 'middle' | 'closer_to_broker' | 'closer_to_carrier';
    };

    // Special conditions
    conditions?: Array<{
      type: 'volume_based' | 'time_based' | 'equipment_based' | 'route_based';
      description: string;
      impact?: 'increases_rate' | 'decreases_rate';
    }>;

    // Negotiation tactics identified
    tactics: Array<{
      tactic: 'anchoring' | 'splitting_difference' | 'take_it_or_leave_it' |
              'referring_to_market' | 'volume_leverage' | 'relationship_leverage' |
              'competition_mention' | 'walking_away';
      usedBy: string;
      effectiveness?: 'successful' | 'unsuccessful' | 'neutral';
    }>;

    // Deadlock or special situations
    deadlockReason?: string;
    requiresApproval?: {
      from: 'manager' | 'customer' | 'owner';
      status: 'pending' | 'approved' | 'denied';
    };

    alternativeProposed?: {
      type: 'different_rate' | 'different_terms' | 'different_equipment';
      description: string;
    };

    confidence: {
      negotiationComplete: number;
      rateAccuracy: number;
      statusAccuracy: number;
    };
  }>;

  // Overall negotiation analysis
  negotiationSummary: {
    style: 'collaborative' | 'competitive' | 'accommodating' | 'avoiding';
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    duration: 'quick' | 'standard' | 'extended';
    outcome: 'win_win' | 'broker_favorable' | 'carrier_favorable' | 'no_deal';
  };

  // Key insights
  insights: string[];

  // Warning flags
  warnings?: Array<{
    type: 'rate_confusion' | 'terms_mismatch' | 'incomplete_agreement' | 'verbal_only';
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>
}

export class RateNegotiationAgent extends BaseAgent<void, RateNegotiationOutput> {
  name = 'rate_negotiation';
  version = '1.0.0';
  description = 'Complex rate negotiation tracking and analysis';
  dependencies = ['classification', 'speaker_identification', 'load_extraction'];

  constructor() {
    super({
      timeout: 20000, // May need more time for complex negotiations
      critical: true, // Critical for carrier quotes and renegotiations
      parallel: false,
      retryOnFailure: true
    });
  }

  getPrompt(context: AgentContextData): string {
    const speakers = context.getAgentOutput<any>('speaker_identification');
    const loads = context.getAgentOutput<any>('load_extraction');
    return this.buildNegotiationPrompt(context, speakers, loads);
  }

  async execute(context: AgentContextData): Promise<RateNegotiationOutput> {
    this.log('Starting complex rate negotiation analysis');

    const classification = context.getAgentOutput<any>('classification');
    const speakers = context.getAgentOutput<any>('speaker_identification');
    const loads = context.getAgentOutput<any>('load_extraction');

    // Skip if not relevant call type
    if (!this.isNegotiationRelevant(classification?.primaryType)) {
      return this.getDefaultOutput();
    }

    // Build comprehensive prompt
    const prompt = this.buildNegotiationPrompt(context, speakers, loads);

    // Use better model for complex analysis
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o'
    );

    // Parse and validate response
    const output = this.parseNegotiationResponse(response, context);

    this.log(`Analyzed ${output.negotiations.length} negotiations, complexity: ${output.negotiationSummary.complexity}`);

    return output;
  }

  private isNegotiationRelevant(callType?: string): boolean {
    const relevantTypes = ['carrier_quote', 'renegotiation', 'callback_acceptance', 'new_booking'];
    return relevantTypes.includes(callType || '');
  }

  private buildNegotiationPrompt(
    context: AgentContextData,
    speakers: any,
    loads: any
  ): string {
    const loadCount = loads?.loads?.length || 1;
    const speakerInfo = this.formatSpeakerInfo(speakers);

    return `Analyze the complex rate negotiation in this freight broker call.
Track every offer, counter-offer, and the final agreement.

TRANSCRIPT:
${context.transcript}

CONTEXT:
- Number of loads discussed: ${loadCount}
- ${speakerInfo}

EXTRACTION REQUIREMENTS:

1. NEGOTIATION ROUNDS - Track each price mention chronologically:
   - Who said it (broker/carrier/shipper)
   - Amount and type (flat rate, per mile, etc.)
   - Action (initial offer, counter, accept, reject, thinking)
   - Exact words used
   - Any reasoning given

2. NEGOTIATION ANALYSIS:
   - Initial positions of each party
   - Final agreed rate (if any)
   - How many rounds of negotiation
   - Who made concessions and by how much
   - Negotiation tactics used (anchoring, splitting difference, walking away, etc.)

3. RATE STRUCTURE:
   - Is it all-inclusive or base + extras?
   - Does it include fuel?
   - Does it include accessorials?
   - Any conditions that affect the rate?

4. SPECIAL SITUATIONS:
   - Conditional agreements ("if you can do X, then Y")
   - Volume-based pricing
   - Requires approval from someone else
   - Alternative proposals
   - Deadlocks or impasses

5. NEGOTIATION STYLE:
   - Collaborative vs competitive
   - Quick agreement vs extended negotiation
   - Win-win vs one-sided outcome

6. WARNING FLAGS:
   - Confusion about rate structure
   - Mismatched understanding
   - Verbal-only agreements
   - Incomplete terms

Return as JSON:
{
  "negotiations": [
    {
      "negotiationId": "neg_1",
      "loadId": "load_1 or null if general",
      "status": "agreed|pending|rejected|stalled|callback_requested",

      "agreedRate": number or null,
      "rateType": "flat|per_mile|hourly",
      "rateStructure": "all_in|base_plus_fuel|base_plus_accessorials",
      "includesFuel": boolean or "unknown",
      "includesAccessorials": boolean or "partial" or "unknown",

      "priceHistory": [
        {
          "roundNumber": 1,
          "speaker": "speaker_id",
          "speakerRole": "broker|carrier|shipper",
          "amount": number,
          "rateType": "flat|per_mile|all_in|base_plus",
          "action": "initial_offer|counter|accept|reject|thinking|final_offer",
          "reasoning": "optional reasoning given",
          "rawText": "exact quote from transcript"
        }
      ],

      "initialPositions": {
        "broker": number or null,
        "carrier": number or null
      },

      "finalPositions": {
        "broker": number or null,
        "carrier": number or null
      },

      "numberOfRounds": number,

      "priceMovement": {
        "brokerConcession": number or null,
        "carrierConcession": number or null,
        "meetingPoint": "middle|closer_to_broker|closer_to_carrier" or null
      },

      "conditions": [
        {
          "type": "volume_based|time_based|equipment_based|route_based",
          "description": "description of condition",
          "impact": "increases_rate|decreases_rate"
        }
      ],

      "tactics": [
        {
          "tactic": "anchoring|splitting_difference|take_it_or_leave_it|etc",
          "usedBy": "broker|carrier",
          "effectiveness": "successful|unsuccessful|neutral"
        }
      ],

      "deadlockReason": "optional reason if negotiation stalled",

      "requiresApproval": {
        "from": "manager|customer|owner",
        "status": "pending|approved|denied"
      },

      "alternativeProposed": {
        "type": "different_rate|different_terms|different_equipment",
        "description": "description of alternative"
      },

      "confidence": {
        "negotiationComplete": 0.0-1.0,
        "rateAccuracy": 0.0-1.0,
        "statusAccuracy": 0.0-1.0
      }
    }
  ],

  "negotiationSummary": {
    "style": "collaborative|competitive|accommodating|avoiding",
    "complexity": "simple|moderate|complex|very_complex",
    "duration": "quick|standard|extended",
    "outcome": "win_win|broker_favorable|carrier_favorable|no_deal"
  },

  "insights": [
    "Key insights about the negotiation"
  ],

  "warnings": [
    {
      "type": "rate_confusion|terms_mismatch|incomplete_agreement|verbal_only",
      "description": "description of warning",
      "severity": "high|medium|low"
    }
  ]
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert negotiation analyst for LoadVoice, specializing in freight rate negotiations.
Track every price mention, offer, and counter-offer in chronological order.
Identify negotiation tactics, concessions, and the final agreement.
Be precise with numbers and identify who said what.
Detect any confusion, misunderstandings, or incomplete agreements.
Return valid JSON without markdown formatting.`;
  }

  private formatSpeakerInfo(speakers: any): string {
    if (!speakers?.speakers) return 'Speaker roles unknown';

    const roles = Object.entries(speakers.speakers)
      .map(([id, info]: [string, any]) => `${id}: ${info.role}`)
      .join(', ');

    return `Speakers identified: ${roles}`;
  }

  private parseNegotiationResponse(response: any, context: AgentContextData): RateNegotiationOutput {
    const negotiations = this.parseNegotiations(response.negotiations);

    // Calculate overall confidence
    const avgConfidence = negotiations.length > 0
      ? negotiations.reduce((sum, n) => {
          const conf = (
            n.confidence.negotiationComplete +
            n.confidence.rateAccuracy +
            n.confidence.statusAccuracy
          ) / 3;
          return sum + conf;
        }, 0) / negotiations.length
      : 0.3;

    return {
      negotiations,
      negotiationSummary: response.negotiationSummary || this.getDefaultSummary(),
      insights: response.insights || [],
      warnings: response.warnings || [],
      confidence: this.calculateConfidence({
        negotiationAnalysis: avgConfidence,
        dataCompleteness: this.assessCompleteness(negotiations),
        complexity: this.assessComplexity(negotiations)
      })
    };
  }

  private parseNegotiations(data: any): RateNegotiationOutput['negotiations'] {
    if (!Array.isArray(data)) return [];

    return data.map(neg => ({
      negotiationId: neg.negotiationId || `neg_${Date.now()}`,
      loadId: neg.loadId,
      status: neg.status || 'pending',
      agreedRate: this.parseNumber(neg.agreedRate),
      rateType: neg.rateType || 'flat',
      rateStructure: neg.rateStructure || 'all_in',
      includesFuel: neg.includesFuel ?? 'unknown',
      includesAccessorials: neg.includesAccessorials ?? 'unknown',
      priceHistory: this.parsePriceHistory(neg.priceHistory),
      initialPositions: neg.initialPositions || {},
      finalPositions: neg.finalPositions || {},
      numberOfRounds: neg.numberOfRounds || neg.priceHistory?.length || 0,
      priceMovement: neg.priceMovement || {},
      conditions: neg.conditions || [],
      tactics: neg.tactics || [],
      deadlockReason: neg.deadlockReason,
      requiresApproval: neg.requiresApproval,
      alternativeProposed: neg.alternativeProposed,
      confidence: {
        negotiationComplete: neg.confidence?.negotiationComplete || 0.5,
        rateAccuracy: neg.confidence?.rateAccuracy || 0.5,
        statusAccuracy: neg.confidence?.statusAccuracy || 0.5
      }
    }));
  }

  private parsePriceHistory(history: any): NegotiationRound[] {
    if (!Array.isArray(history)) return [];

    return history.map((round, index) => ({
      roundNumber: round.roundNumber || index + 1,
      speaker: round.speaker || 'unknown',
      speakerRole: round.speakerRole || 'unknown',
      amount: this.parseNumber(round.amount) || 0,
      rateType: round.rateType || 'flat',
      action: round.action || 'offer',
      reasoning: round.reasoning,
      timestamp: round.timestamp,
      rawText: round.rawText || ''
    }));
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  private assessCompleteness(negotiations: any[]): number {
    if (negotiations.length === 0) return 0;

    const scores = negotiations.map(neg => {
      let score = 0;
      let checks = 0;

      // Check for essential fields
      if (neg.status) { score++; checks++; }
      if (neg.priceHistory?.length > 0) { score++; checks++; }
      if (neg.agreedRate !== undefined || neg.status === 'rejected') { score++; checks++; }
      if (neg.numberOfRounds > 0) { score++; checks++; }

      return checks > 0 ? score / checks : 0;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private assessComplexity(negotiations: any[]): number {
    if (negotiations.length === 0) return 0.5;

    const maxRounds = Math.max(...negotiations.map(n => n.numberOfRounds || 0));
    const avgTactics = negotiations.reduce((sum, n) => sum + (n.tactics?.length || 0), 0) / negotiations.length;

    // Higher complexity = lower confidence adjustment
    if (maxRounds > 5 || avgTactics > 3) return 0.7;
    if (maxRounds > 3 || avgTactics > 1) return 0.8;
    return 0.9;
  }

  private getDefaultSummary(): RateNegotiationOutput['negotiationSummary'] {
    return {
      style: 'collaborative',
      complexity: 'simple',
      duration: 'quick',
      outcome: 'no_deal'
    };
  }

  getDefaultOutput(): RateNegotiationOutput {
    return {
      negotiations: [],
      negotiationSummary: this.getDefaultSummary(),
      insights: [],
      warnings: [],
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No negotiation detected or agent not applicable']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.negotiations) &&
      output.negotiationSummary &&
      output.confidence
    );
  }
}