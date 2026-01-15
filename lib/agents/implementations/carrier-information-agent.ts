/**
 * Carrier Information Agent - Extracts carrier and driver details
 * Distinguishes between company info and driver info
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput, ConfidenceScore } from '../types';

export interface CarrierInformationOutput extends BaseAgentOutput {
  carrier: {
    companyName?: string;
    mcNumber?: string;
    dotNumber?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    dispatcherName?: string;
    dispatcherPhone?: string;
    insurance?: {
      hasLiability?: boolean;
      hasCargo?: boolean;
      amount?: number;
    };
  };
  driver: {
    name?: string;
    phone?: string;
    truckNumber?: string;
    trailerNumber?: string;
    currentLocation?: string;
    availability?: string;
    teamDriver?: boolean;
    coDriverName?: string;
  };
  equipment: {
    type?: string; // dry van, reefer, flatbed
    length?: number; // 48, 53
    features?: string[]; // tarps, straps, load bars
    condition?: string;
    ownership?: 'company' | 'owner_operator' | 'leased';
  };
  lanes: {
    preferred?: string[];
    currentLane?: string;
    backhaul?: string;
  };
  extractedFromSpeaker?: string; // Speaker ID who provided info
}

export class CarrierInformationAgent extends BaseAgent<void, CarrierInformationOutput> {
  name = 'carrier_information';
  version = '1.0.0';
  description = 'Carrier, driver, and equipment information extraction';
  dependencies = ['classification', 'speaker_identification'];

  constructor() {
    super({
      timeout: 15000,
      critical: false,
      parallel: false,
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<CarrierInformationOutput> {
    this.log('Starting carrier information extraction');

    const classification = context.getAgentOutput<any>('classification');
    const speakers = context.getAgentOutput<any>('speaker_identification');

    // Only extract for relevant call types
    const relevantTypes = ['carrier_quote', 'callback_acceptance', 'renegotiation'];
    if (!relevantTypes.includes(classification?.primaryType || '')) {
      return this.getDefaultOutput();
    }

    // Find carrier speaker
    const carrierSpeakerId = this.findCarrierSpeaker(speakers);

    // Build prompt
    const prompt = this.getPrompt(context, carrierSpeakerId);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o-mini'
    );

    // Parse and validate
    const output = this.parseResponse(response, carrierSpeakerId);

    this.log(`Extracted carrier: ${output.carrier.companyName}, MC: ${output.carrier.mcNumber}`);

    return output;
  }

  private findCarrierSpeaker(speakers: any): string | undefined {
    if (!speakers?.speakers) return undefined;

    for (const [id, speaker] of speakers.speakers.entries()) {
      if (speaker.role === 'carrier' || speaker.role === 'driver') {
        return id;
      }
    }
    return undefined;
  }

  getPrompt(context: AgentContextData, carrierSpeakerId?: string): string {
    const transcript = context.transcript;
    const speakerNote = carrierSpeakerId
      ? `Note: Speaker ${carrierSpeakerId} is likely the carrier/driver.`
      : '';

    return `Extract carrier, driver, and equipment information from this freight broker call.

${speakerNote}

TRANSCRIPT:
${transcript}

EXTRACTION TASK:

1. CARRIER COMPANY INFORMATION:
   - Company name
   - MC number (motor carrier number - numbers only)
   - DOT number (numbers only)
   - Contact person name
   - Contact phone
   - Contact email
   - Dispatcher name and phone
   - Insurance status

2. DRIVER INFORMATION (if different from company contact):
   - Driver name
   - Driver phone
   - Truck/unit number
   - Trailer number
   - Current location
   - When available
   - Team driver? Co-driver name?

3. EQUIPMENT DETAILS:
   - Type (dry van, reefer, flatbed, step deck, etc.)
   - Length (48', 53', etc.)
   - Special features (tarps, straps, load bars, etc.)
   - Condition/age
   - Company owned or owner-operator

4. LANES AND PREFERENCES:
   - Preferred lanes/routes
   - Current lane they're running
   - Looking for backhaul?

IMPORTANT:
- Extract exact MC/DOT numbers without letters
- Distinguish between company contact and actual driver
- Note if driver is owner-operator vs company driver

Extract as JSON:
{
  "carrier": {
    "companyName": "...",
    "mcNumber": "numbers only, no MC prefix",
    "dotNumber": "numbers only, no DOT prefix",
    "contactName": "...",
    "contactPhone": "...",
    "contactEmail": "...",
    "dispatcherName": "...",
    "dispatcherPhone": "...",
    "insurance": {
      "mentioned": boolean,
      "hasLiability": boolean,
      "hasCargo": boolean
    }
  },
  "driver": {
    "name": "...",
    "phone": "...",
    "truckNumber": "...",
    "trailerNumber": "...",
    "currentLocation": "city, state",
    "availability": "now, tomorrow, specific date",
    "teamDriver": boolean,
    "coDriverName": "..."
  },
  "equipment": {
    "type": "dry_van|reefer|flatbed|step_deck|other",
    "length": number,
    "features": ["tarps", "straps", "..."],
    "condition": "good|fair|new",
    "ownership": "company|owner_operator|leased"
  },
  "lanes": {
    "preferred": ["Chicago to Dallas", "..."],
    "currentLane": "...",
    "backhaul": "looking for loads to..."
  },
  "confidence": {
    "carrier": 0.0-1.0,
    "driver": 0.0-1.0,
    "equipment": 0.0-1.0
  },
  "extractedFromSpeaker": "${carrierSpeakerId || 'unknown'}"
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert carrier information extraction system for LoadVoice.
Extract carrier company details, driver information, and equipment specifications.
Distinguish between company representatives and actual drivers.
MC and DOT numbers should be numeric only (remove MC/DOT prefixes).
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, carrierSpeakerId?: string): CarrierInformationOutput {
    // Clean MC/DOT numbers
    const mcNumber = this.cleanNumber(response.carrier?.mcNumber);
    const dotNumber = this.cleanNumber(response.carrier?.dotNumber);

    // Parse carrier info
    const carrier = {
      companyName: response.carrier?.companyName,
      mcNumber,
      dotNumber,
      contactName: response.carrier?.contactName,
      contactPhone: this.cleanPhone(response.carrier?.contactPhone),
      contactEmail: response.carrier?.contactEmail,
      dispatcherName: response.carrier?.dispatcherName,
      dispatcherPhone: this.cleanPhone(response.carrier?.dispatcherPhone),
      insurance: response.carrier?.insurance
    };

    // Parse driver info
    const driver = {
      name: response.driver?.name,
      phone: this.cleanPhone(response.driver?.phone),
      truckNumber: response.driver?.truckNumber,
      trailerNumber: response.driver?.trailerNumber,
      currentLocation: response.driver?.currentLocation,
      availability: response.driver?.availability,
      teamDriver: response.driver?.teamDriver === true,
      coDriverName: response.driver?.coDriverName
    };

    // Parse equipment
    const equipment = {
      type: response.equipment?.type,
      length: response.equipment?.length,
      features: response.equipment?.features || [],
      condition: response.equipment?.condition,
      ownership: response.equipment?.ownership
    };

    // Parse lanes
    const lanes = {
      preferred: response.lanes?.preferred || [],
      currentLane: response.lanes?.currentLane,
      backhaul: response.lanes?.backhaul
    };

    // Calculate confidence
    const confidence = this.calculateConfidence({
      carrier: this.assessCarrierCompleteness(carrier),
      driver: driver.name ? 0.8 : 0.3,
      equipment: equipment.type ? 0.8 : 0.3,
      overall: response.confidence?.carrier || 0.5
    });

    return {
      carrier,
      driver,
      equipment,
      lanes,
      extractedFromSpeaker: carrierSpeakerId,
      confidence
    };
  }

  private cleanNumber(value: any): string | undefined {
    if (!value) return undefined;
    // Remove all non-numeric characters
    const cleaned = value.toString().replace(/\D/g, '');
    return cleaned || undefined;
  }

  private cleanPhone(value: any): string | undefined {
    if (!value) return undefined;
    // Keep only digits and common phone characters
    const cleaned = value.toString().replace(/[^\d\-\(\)\s]/g, '');
    return cleaned || undefined;
  }

  private assessCarrierCompleteness(carrier: any): number {
    let score = 0;
    let total = 0;

    const fields = ['companyName', 'mcNumber', 'contactName', 'contactPhone'];
    fields.forEach(field => {
      total++;
      if (carrier[field]) score++;
    });

    return total > 0 ? score / total : 0;
  }

  getDefaultOutput(): CarrierInformationOutput {
    return {
      carrier: {},
      driver: {},
      equipment: {},
      lanes: {},
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No carrier information extracted']
      },
      processingNotes: ['Carrier information not applicable for this call type']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      output.carrier !== undefined &&
      output.driver !== undefined &&
      output.equipment !== undefined &&
      output.confidence !== undefined
    );
  }
}