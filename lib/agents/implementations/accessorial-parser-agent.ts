/**
 * Accessorial Parser Agent - Detailed extraction of accessorial charges and terms
 * Handles detention, lumper, TONU, layover, stops, and other additional charges
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface AccessorialCharge {
  id: string;
  type: 'detention' | 'lumper' | 'tonu' | 'layover' | 'stop_charge' | 'fuel_surcharge' |
        'inside_delivery' | 'liftgate' | 'pallet_jack' | 'driver_assist' | 'redelivery' |
        'reconsignment' | 'storage' | 'team_driver' | 'hazmat' | 'overweight' |
        'expedited' | 'weekend' | 'holiday' | 'after_hours' | 'other';

  // Charge details
  amount?: number;
  currency: string; // USD, CAD

  // How it's calculated
  calculation: {
    method: 'flat' | 'hourly' | 'per_mile' | 'percentage' | 'per_unit';
    rate?: number;
    unit?: string; // "hour", "mile", "pallet", "cwt"
    minimum?: number;
    maximum?: number;
  };

  // Terms and conditions
  terms: {
    freeTime?: number; // Free hours for detention
    freeTimeUnit?: 'minutes' | 'hours';
    trigger?: string; // What triggers this charge
    startTime?: string; // When charge starts (e.g., "after 2 hours")
    endTime?: string; // When charge stops
    includesWeekends?: boolean;
    includesHolidays?: boolean;
  };

  // Who pays and when
  billing: {
    paidBy: 'broker' | 'carrier' | 'shipper' | 'receiver' | 'driver' | 'reimbursable';
    reimbursable: boolean;
    requiresReceipt: boolean;
    requiresPreApproval: boolean;
    invoiceHandling?: 'direct_bill' | 'deduct_from_rate' | 'separate_invoice';
  };

  // Status of this accessorial
  status: 'included' | 'additional' | 'negotiable' | 'waived' | 'disputed';

  // Application details
  application: {
    loadId?: string; // Specific load this applies to
    locations?: string[]; // "pickup", "delivery", "all stops"
    frequency?: 'always' | 'conditional' | 'case_by_case';
    conditions?: string[]; // Conditions when this applies
  };

  confidence: number;
  rawText: string;
}

export interface AccessorialParserOutput extends BaseAgentOutput {
  accessorials: AccessorialCharge[];

  // Summary by type
  summary: {
    detention?: {
      rate: number;
      freeHours: number;
      locations: string[];
    };
    lumper?: {
      handling: 'reimbursable' | 'included' | 'driver_pays';
      maxAmount?: number;
      requiresReceipt: boolean;
    };
    tonu?: {
      amount: number;
      noticeRequired: string; // "24 hours", "same day"
      conditions: string[];
    };
    fuelSurcharge?: {
      method: 'included' | 'percentage' | 'per_mile' | 'floating';
      rate?: number;
      basePrice?: number;
    };
    stops?: {
      included: number;
      additionalRate: number;
      maxStops?: number;
    };
  };

  // Total accessorial impact
  totalImpact: {
    estimatedCharges?: number;
    worstCase?: number;
    bestCase?: number;
    includedInRate: string[]; // Which accessorials are in the base rate
    additional: string[]; // Which are extra charges
  };

  // Special provisions
  specialProvisions: Array<{
    type: 'driver_assist' | 'appointment' | 'equipment' | 'documentation';
    description: string;
    requirement?: string;
    consequence?: string; // What happens if not met
  }>;

  // Comparison with industry standards
  marketComparison?: {
    detention: 'below_market' | 'market_rate' | 'above_market';
    lumper: 'below_market' | 'market_rate' | 'above_market';
    tonu: 'below_market' | 'market_rate' | 'above_market';
    overall: 'carrier_favorable' | 'standard' | 'broker_favorable';
  };

  // Negotiation opportunities
  negotiationOpportunities: Array<{
    accessorialType: string;
    currentTerms: string;
    suggestion: string;
    potentialSavings?: number;
    priority: 'high' | 'medium' | 'low';
  }>;

  // Warnings and alerts
  warnings: Array<{
    type: 'missing_terms' | 'unusual_charge' | 'high_rate' | 'unclear_terms' | 'conflict';
    accessorialType: string;
    description: string;
    severity: 'critical' | 'important' | 'minor';
  }>;
}

export class AccessorialParserAgent extends BaseAgent<void, AccessorialParserOutput> {
  name = 'accessorial_parser';
  version = '1.0.0';
  description = 'Detailed accessorial charge extraction and analysis';
  dependencies = ['classification', 'simple_rate_extraction'];

  // Industry standard rates for comparison
  private readonly INDUSTRY_STANDARDS = {
    detention: { hourly: 75, freeHours: 2 },
    lumper: { typical: 150, max: 500 },
    tonu: { sameDay: 250, nextDay: 150 },
    stopCharge: { additional: 100 },
    layover: { daily: 350 },
    fuelSurcharge: { percentage: 25 } // Typical percentage of base rate
  };

  constructor() {
    super({
      timeout: 12000,
      critical: false,
      parallel: false,
      retryOnFailure: true
    });
  }

  getPrompt(context: AgentContextData): string {
    const simpleRate = context.getAgentOutput<any>('simple_rate_extraction');
    return this.buildAccessorialPrompt(context, simpleRate);
  }

  async execute(context: AgentContextData): Promise<AccessorialParserOutput> {
    this.log('Parsing accessorial charges and terms');

    const classification = context.getAgentOutput<any>('classification');
    const simpleRate = context.getAgentOutput<any>('simple_rate_extraction');

    // Skip if not relevant
    if (!this.isRelevant(classification?.primaryType)) {
      return this.getDefaultOutput();
    }

    // Build detailed prompt
    const prompt = this.buildAccessorialPrompt(context, simpleRate);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.2, // Low temperature for accuracy
      'gpt-4o'
    );

    // Parse and analyze response
    const output = this.parseAccessorialResponse(response, context);

    this.log(`Extracted ${output.accessorials.length} accessorial charges`);

    return output;
  }

  private isRelevant(callType?: string): boolean {
    const relevantTypes = ['carrier_quote', 'new_booking', 'renegotiation'];
    return relevantTypes.includes(callType || '');
  }

  private buildAccessorialPrompt(context: AgentContextData, simpleRate: any): string {
    const hasBaseRate = simpleRate?.rates?.length > 0;
    const baseRateInfo = hasBaseRate
      ? `Base rate identified: $${simpleRate.rates[0].amount} ${simpleRate.rates[0].type}`
      : 'No base rate identified';

    return `Extract all accessorial charges, additional fees, and special charge terms from this freight call.

TRANSCRIPT:
${context.transcript}

CONTEXT:
- ${baseRateInfo}
- Industry standard detention: $${this.INDUSTRY_STANDARDS.detention.hourly}/hour after ${this.INDUSTRY_STANDARDS.detention.freeHours} hours
- Industry standard TONU: $${this.INDUSTRY_STANDARDS.tonu.sameDay} same day
- Industry standard stop charge: $${this.INDUSTRY_STANDARDS.stopCharge.additional}/stop

EXTRACTION REQUIREMENTS:

1. IDENTIFY ALL ACCESSORIAL CHARGES:
   - Detention (waiting time charges)
   - Lumper fees (unloading assistance)
   - TONU (Truck Ordered Not Used)
   - Layover charges
   - Stop charges (additional stops)
   - Fuel surcharge
   - Inside delivery
   - Liftgate service
   - Driver assist/labor
   - Redelivery charges
   - Storage fees
   - Team driver charges
   - Hazmat fees
   - Overweight/overdimension
   - Weekend/holiday charges
   - Any other additional charges

2. FOR EACH ACCESSORIAL, EXTRACT:
   - Amount or rate
   - How it's calculated (flat, hourly, percentage)
   - Terms (free time, triggers, conditions)
   - Who pays (broker, carrier, shipper, reimbursable)
   - Whether it's included in base rate or additional
   - Any special conditions

3. DETENTION SPECIFIC:
   - Free hours at pickup
   - Free hours at delivery
   - Rate per hour after free time
   - How time is calculated
   - Weekend/holiday counting

4. LUMPER SPECIFIC:
   - Who pays initially
   - Reimbursement process
   - Receipt requirements
   - Maximum amount

5. FUEL SURCHARGE:
   - Included in rate or separate
   - Percentage or per mile
   - Base fuel price if mentioned

6. SPECIAL PROVISIONS:
   - Driver assist requirements
   - Appointment requirements
   - Equipment requirements
   - Documentation requirements

Return as JSON:
{
  "accessorials": [
    {
      "id": "acc_1",
      "type": "detention|lumper|tonu|layover|stop_charge|fuel_surcharge|etc",
      "amount": number or null,
      "currency": "USD",

      "calculation": {
        "method": "flat|hourly|per_mile|percentage|per_unit",
        "rate": number,
        "unit": "hour|mile|pallet|cwt",
        "minimum": number or null,
        "maximum": number or null
      },

      "terms": {
        "freeTime": number,
        "freeTimeUnit": "minutes|hours",
        "trigger": "what triggers this charge",
        "startTime": "after 2 hours",
        "includesWeekends": boolean,
        "includesHolidays": boolean
      },

      "billing": {
        "paidBy": "broker|carrier|shipper|receiver|driver|reimbursable",
        "reimbursable": boolean,
        "requiresReceipt": boolean,
        "requiresPreApproval": boolean,
        "invoiceHandling": "direct_bill|deduct_from_rate|separate_invoice"
      },

      "status": "included|additional|negotiable|waived|disputed",

      "application": {
        "loadId": "if specific to a load",
        "locations": ["pickup", "delivery"],
        "frequency": "always|conditional|case_by_case",
        "conditions": ["conditions when this applies"]
      },

      "confidence": 0.0-1.0,
      "rawText": "exact quote from transcript"
    }
  ],

  "summary": {
    "detention": {
      "rate": 75,
      "freeHours": 2,
      "locations": ["pickup", "delivery"]
    },
    "lumper": {
      "handling": "reimbursable",
      "requiresReceipt": true
    },
    "tonu": {
      "amount": 250,
      "noticeRequired": "24 hours",
      "conditions": ["if cancelled within 24 hours"]
    },
    "fuelSurcharge": {
      "method": "included|percentage|per_mile",
      "rate": 25
    },
    "stops": {
      "included": 1,
      "additionalRate": 100
    }
  },

  "totalImpact": {
    "estimatedCharges": number,
    "worstCase": number,
    "bestCase": number,
    "includedInRate": ["fuel surcharge"],
    "additional": ["detention", "lumper"]
  },

  "specialProvisions": [
    {
      "type": "driver_assist|appointment|equipment|documentation",
      "description": "description",
      "requirement": "specific requirement",
      "consequence": "what happens if not met"
    }
  ],

  "marketComparison": {
    "detention": "below_market|market_rate|above_market",
    "lumper": "below_market|market_rate|above_market",
    "tonu": "below_market|market_rate|above_market",
    "overall": "carrier_favorable|standard|broker_favorable"
  },

  "negotiationOpportunities": [
    {
      "accessorialType": "detention",
      "currentTerms": "current terms",
      "suggestion": "negotiation suggestion",
      "potentialSavings": 50,
      "priority": "high|medium|low"
    }
  ],

  "warnings": [
    {
      "type": "missing_terms|unusual_charge|high_rate|unclear_terms|conflict",
      "accessorialType": "type",
      "description": "warning description",
      "severity": "critical|important|minor"
    }
  ]
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert accessorial charge analyst for LoadVoice.
Extract all additional charges beyond the base freight rate.
Understand industry standard rates and terms for accessorials.
Identify whether charges are included in the base rate or additional.
Compare rates to industry standards when possible.
Flag any unusual or missing terms.
Return valid JSON without markdown formatting.`;
  }

  private parseAccessorialResponse(response: any, context: AgentContextData): AccessorialParserOutput {
    const accessorials = this.parseAccessorials(response.accessorials);

    // Add market comparison if not provided
    const marketComparison = response.marketComparison || this.analyzeMarketComparison(accessorials);

    // Generate warnings if not provided
    const warnings = response.warnings?.length > 0
      ? response.warnings
      : this.generateWarnings(accessorials);

    // Calculate total impact
    const totalImpact = response.totalImpact || this.calculateTotalImpact(accessorials);

    // Calculate confidence
    const avgConfidence = accessorials.length > 0
      ? accessorials.reduce((sum, a) => sum + a.confidence, 0) / accessorials.length
      : 0.5;

    return {
      accessorials,
      summary: response.summary || {},
      totalImpact,
      specialProvisions: response.specialProvisions || [],
      marketComparison,
      negotiationOpportunities: response.negotiationOpportunities || [],
      warnings,
      confidence: this.calculateConfidence({
        accessorialDetection: avgConfidence,
        termsCompleteness: this.assessTermsCompleteness(accessorials),
        marketAnalysis: marketComparison ? 0.8 : 0.5
      })
    };
  }

  private parseAccessorials(data: any): AccessorialCharge[] {
    if (!Array.isArray(data)) return [];

    return data.map((acc, index) => ({
      id: acc.id || `acc_${index + 1}`,
      type: acc.type || 'other',
      amount: this.parseNumber(acc.amount),
      currency: acc.currency || 'USD',

      calculation: {
        method: acc.calculation?.method || 'flat',
        rate: this.parseNumber(acc.calculation?.rate),
        unit: acc.calculation?.unit,
        minimum: this.parseNumber(acc.calculation?.minimum),
        maximum: this.parseNumber(acc.calculation?.maximum)
      },

      terms: {
        freeTime: this.parseNumber(acc.terms?.freeTime),
        freeTimeUnit: acc.terms?.freeTimeUnit || 'hours',
        trigger: acc.terms?.trigger,
        startTime: acc.terms?.startTime,
        endTime: acc.terms?.endTime,
        includesWeekends: acc.terms?.includesWeekends,
        includesHolidays: acc.terms?.includesHolidays
      },

      billing: {
        paidBy: acc.billing?.paidBy || 'broker',
        reimbursable: acc.billing?.reimbursable || false,
        requiresReceipt: acc.billing?.requiresReceipt || false,
        requiresPreApproval: acc.billing?.requiresPreApproval || false,
        invoiceHandling: acc.billing?.invoiceHandling
      },

      status: acc.status || 'additional',

      application: {
        loadId: acc.application?.loadId,
        locations: acc.application?.locations || [],
        frequency: acc.application?.frequency || 'always',
        conditions: acc.application?.conditions || []
      },

      confidence: acc.confidence || 0.5,
      rawText: acc.rawText || ''
    }));
  }

  private analyzeMarketComparison(accessorials: AccessorialCharge[]): AccessorialParserOutput['marketComparison'] {
    const comparison: any = {};

    // Check detention
    const detention = accessorials.find(a => a.type === 'detention');
    if (detention && detention.calculation.rate) {
      const rate = detention.calculation.rate;
      comparison.detention = rate < 60 ? 'below_market'
        : rate > 90 ? 'above_market'
        : 'market_rate';
    }

    // Check TONU
    const tonu = accessorials.find(a => a.type === 'tonu');
    if (tonu && tonu.amount) {
      comparison.tonu = tonu.amount < 200 ? 'below_market'
        : tonu.amount > 350 ? 'above_market'
        : 'market_rate';
    }

    // Overall assessment
    const favorable = Object.values(comparison).filter(v => v === 'below_market').length;
    const unfavorable = Object.values(comparison).filter(v => v === 'above_market').length;

    comparison.overall = favorable > unfavorable ? 'carrier_favorable'
      : unfavorable > favorable ? 'broker_favorable'
      : 'standard';

    return comparison;
  }

  private generateWarnings(accessorials: AccessorialCharge[]): AccessorialParserOutput['warnings'] {
    const warnings: AccessorialParserOutput['warnings'] = [];

    // Check for missing detention terms
    const detention = accessorials.find(a => a.type === 'detention');
    if (detention && !detention.terms.freeTime) {
      warnings.push({
        type: 'missing_terms',
        accessorialType: 'detention',
        description: 'Free time not specified for detention',
        severity: 'important'
      });
    }

    // Check for high rates
    accessorials.forEach(acc => {
      if (acc.type === 'detention' && acc.calculation.rate && acc.calculation.rate > 100) {
        warnings.push({
          type: 'high_rate',
          accessorialType: 'detention',
          description: `Detention rate of $${acc.calculation.rate}/hour is above market`,
          severity: 'important'
        });
      }

      if (acc.type === 'tonu' && acc.amount && acc.amount > 400) {
        warnings.push({
          type: 'high_rate',
          accessorialType: 'tonu',
          description: `TONU charge of $${acc.amount} is above market`,
          severity: 'important'
        });
      }
    });

    return warnings;
  }

  private calculateTotalImpact(accessorials: AccessorialCharge[]): AccessorialParserOutput['totalImpact'] {
    const included = accessorials
      .filter(a => a.status === 'included')
      .map(a => a.type);

    const additional = accessorials
      .filter(a => a.status === 'additional')
      .map(a => a.type);

    // Calculate estimated charges
    let estimated = 0;
    let worstCase = 0;
    let bestCase = 0;

    accessorials.forEach(acc => {
      if (acc.status === 'additional' && acc.amount) {
        estimated += acc.amount * 0.3; // Assume 30% probability
        worstCase += acc.amount;
        // Best case is 0 (no accessorials triggered)
      }
    });

    return {
      estimatedCharges: estimated,
      worstCase,
      bestCase,
      includedInRate: included,
      additional
    };
  }

  private assessTermsCompleteness(accessorials: AccessorialCharge[]): number {
    if (accessorials.length === 0) return 1.0;

    const scores = accessorials.map(acc => {
      let score = 0;
      let checks = 0;

      // Check essential fields based on type
      if (acc.type === 'detention') {
        if (acc.terms.freeTime !== undefined) { score++; checks++; }
        if (acc.calculation.rate !== undefined) { score++; checks++; }
      } else {
        if (acc.amount !== undefined || acc.calculation.rate !== undefined) {
          score++; checks++;
        }
      }

      if (acc.billing.paidBy) { score++; checks++; }
      if (acc.status) { score++; checks++; }

      return checks > 0 ? score / checks : 0;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  getDefaultOutput(): AccessorialParserOutput {
    return {
      accessorials: [],
      summary: {},
      totalImpact: {
        includedInRate: [],
        additional: []
      },
      specialProvisions: [],
      negotiationOpportunities: [],
      warnings: [],
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No accessorials detected or agent not applicable']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.accessorials) &&
      output.totalImpact &&
      output.confidence
    );
  }
}