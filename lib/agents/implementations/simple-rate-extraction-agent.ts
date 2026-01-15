/**
 * Simple Rate Extraction Agent - Extracts straightforward rates without complex negotiation
 * For calls where rates are quoted or accepted without haggling
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface SimpleRateExtractionOutput extends BaseAgentOutput {
  rates: Array<{
    loadId?: string; // Links to load if multiple
    amount: number;
    type: 'flat' | 'per_mile' | 'hourly' | 'percentage';
    currency: string; // USD, CAD
    includesFuel: boolean | 'unknown';
    includesAccessorials: boolean | 'unknown';

    direction: 'broker_to_carrier' | 'shipper_to_broker' | 'broker_quote';
    status: 'quoted' | 'accepted' | 'declined' | 'pending';

    breakdown?: {
      base?: number;
      fuel?: number;
      accessorials?: number;
      other?: number;
    };

    miles?: number; // For per-mile calculations
    totalIfPerMile?: number; // Calculated total

    quickPayRate?: number; // If quick pay discussed
    standardPayRate?: number; // If different from quick pay

    mentionedBy?: string; // Speaker ID
    confidence: number;
  }>;

  accessorials: Array<{
    type: string; // detention, lumper, TONU, stop, layover
    amount?: number;
    terms?: string; // "after 2 hours", "per stop", etc.
    includedInRate: boolean;
  }>;

  paymentTerms?: {
    standard?: string; // Net 30, Net 15, etc.
    quickPay?: {
      available: boolean;
      discount?: number;
      terms?: string;
    };
    fuelAdvance?: {
      available: boolean;
      amount?: number;
      percentage?: number;
    };
  };

  rateContext?: {
    market?: 'spot' | 'contract' | 'dedicated';
    validity?: string; // "today only", "this week", etc.
    volumeCommitment?: string;
  };
}

export class SimpleRateExtractionAgent extends BaseAgent<void, SimpleRateExtractionOutput> {
  name = 'simple_rate_extraction';
  version = '1.0.0';
  description = 'Simple rate and payment terms extraction';
  dependencies = ['classification', 'speaker_identification'];

  constructor() {
    super({
      timeout: 12000,
      critical: false,
      parallel: false,
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<SimpleRateExtractionOutput> {
    this.log('Starting simple rate extraction');

    const classification = context.getAgentOutput<any>('classification');
    const loads = context.getAgentOutput<any>('load_extraction');

    // Build prompt
    const prompt = this.getPrompt(context, loads?.loads?.length);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.2, // Low temperature for accuracy
      'gpt-4o-mini'
    );

    // Parse and validate
    const output = this.parseResponse(response, context);

    this.log(`Extracted ${output.rates.length} rates`);

    return output;
  }

  getPrompt(context: AgentContextData, loadCount?: number): string {
    const transcript = context.transcript;
    const loadNote = loadCount && loadCount > 1
      ? `Note: ${loadCount} loads were discussed. Link rates to specific loads if possible.`
      : '';

    return `Extract all rates and payment terms from this freight broker call.
Focus on straightforward rate quotes and acceptances (not complex negotiations).

${loadNote}

TRANSCRIPT:
${transcript}

EXTRACTION TASK:

1. RATES MENTIONED:
   For each rate discussed, extract:
   - Amount (number)
   - Type (flat rate, per mile, hourly, percentage)
   - Currency (USD assumed if not stated)
   - Includes fuel? (all-in rate or plus fuel)
   - Includes accessorials?
   - Who quoted it (broker to carrier, shipper to broker, etc.)
   - Status (quoted, accepted, declined, pending)
   - Associated load ID if multiple loads
   - If per mile: total miles and calculated total

2. ACCESSORIALS:
   - Detention rates and terms
   - Lumper fees
   - TONU (Truck Ordered Not Used)
   - Stop charges
   - Layover rates
   - Other extras mentioned

3. PAYMENT TERMS:
   - Standard payment terms (Net 30, etc.)
   - Quick pay options and discount
   - Fuel advance availability

4. RATE CONTEXT:
   - Spot vs contract rate
   - How long rate is valid
   - Volume commitments

IMPORTANT:
- Extract ALL rates mentioned, even if rejected
- Note imprecise rates ("around $2000" = 2000 with lower confidence)
- Distinguish base rate from all-in rate
- Convert "twenty-one hundred" to 2100

Extract as JSON:
{
  "rates": [
    {
      "amount": number,
      "type": "flat|per_mile|hourly|percentage",
      "currency": "USD",
      "includesFuel": boolean or "unknown",
      "includesAccessorials": boolean or "unknown",
      "direction": "broker_to_carrier|shipper_to_broker|broker_quote",
      "status": "quoted|accepted|declined|pending",
      "miles": number if mentioned,
      "totalIfPerMile": calculated total if per mile,
      "mentionedBy": "speaker ID",
      "confidence": 0.0-1.0,
      "notes": "any context about this rate"
    }
  ],
  "accessorials": [
    {
      "type": "detention|lumper|tonu|stop|layover|other",
      "amount": number or null,
      "terms": "after 2 hours free, per stop, etc",
      "includedInRate": boolean
    }
  ],
  "paymentTerms": {
    "standard": "Net 30|Net 15|COD|etc",
    "quickPay": {
      "available": boolean,
      "discount": percentage,
      "terms": "Net 3 with 3% discount"
    },
    "fuelAdvance": {
      "available": boolean,
      "amount": number,
      "percentage": number
    }
  },
  "rateContext": {
    "market": "spot|contract|dedicated",
    "validity": "today only, this week, etc",
    "volumeCommitment": "if mentioned"
  },
  "extractionConfidence": {
    "rates": 0.0-1.0,
    "terms": 0.0-1.0
  }
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert rate extraction system for LoadVoice.
Extract all rates, accessorials, and payment terms mentioned in freight broker calls.
Be precise with numbers and distinguish between different types of rates.
Convert verbal numbers to digits ("twenty-one hundred" = 2100).
Note whether rates include fuel and accessorials.
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, context: AgentContextData): SimpleRateExtractionOutput {
    const rates: SimpleRateExtractionOutput['rates'] = [];

    // Parse rates
    if (response.rates && Array.isArray(response.rates)) {
      for (const rateData of response.rates) {
        const rate = this.parseRate(rateData);
        if (rate.amount > 0) {
          rates.push(rate);
        }
      }
    }

    // Parse accessorials
    const accessorials = response.accessorials || [];

    // Parse payment terms
    const paymentTerms = response.paymentTerms;

    // Parse context
    const rateContext = response.rateContext;

    // Calculate confidence
    const confidence = this.calculateConfidence({
      rateExtraction: response.extractionConfidence?.rates || 0.5,
      rateCount: rates.length > 0 ? 0.9 : 0.3,
      completeness: this.assessCompleteness(rates, accessorials)
    });

    return {
      rates,
      accessorials,
      paymentTerms,
      rateContext,
      confidence
    };
  }

  private parseRate(data: any): SimpleRateExtractionOutput['rates'][0] {
    // Clean and parse amount
    let amount = 0;
    if (data.amount) {
      // Handle string amounts like "$2,500" or "2500"
      const cleaned = data.amount.toString().replace(/[$,]/g, '');
      amount = parseFloat(cleaned) || 0;
    }

    // Calculate total if per mile
    let totalIfPerMile: number | undefined;
    if (data.type === 'per_mile' && data.miles) {
      totalIfPerMile = amount * data.miles;
    }

    return {
      loadId: data.loadId,
      amount,
      type: data.type || 'flat',
      currency: data.currency || 'USD',
      includesFuel: data.includesFuel === true ? true :
                    data.includesFuel === false ? false :
                    'unknown',
      includesAccessorials: data.includesAccessorials === true ? true :
                           data.includesAccessorials === false ? false :
                           'unknown',
      direction: data.direction || 'broker_to_carrier',
      status: data.status || 'quoted',
      breakdown: data.breakdown,
      miles: data.miles,
      totalIfPerMile,
      quickPayRate: data.quickPayRate,
      standardPayRate: data.standardPayRate,
      mentionedBy: data.mentionedBy,
      confidence: data.confidence || 0.5
    };
  }

  private assessCompleteness(rates: any[], accessorials: any[]): number {
    let score = 0;

    if (rates.length > 0) score += 0.5;
    if (accessorials.length > 0) score += 0.3;
    if (rates.some(r => r.includesFuel !== 'unknown')) score += 0.2;

    return Math.min(score, 1.0);
  }

  getDefaultOutput(): SimpleRateExtractionOutput {
    return {
      rates: [],
      accessorials: [],
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No rates extracted']
      },
      processingNotes: ['Simple rate extraction found no rates']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.rates) &&
      Array.isArray(output.accessorials) &&
      output.confidence !== undefined
    );
  }
}