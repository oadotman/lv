/**
 * Shipper Information Agent - Extracts shipper company and contact details
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface ShipperInformationOutput extends BaseAgentOutput {
  shipper: {
    companyName?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    facilityName?: string;
    facilityAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    pickupHours?: string;
    pickupInstructions?: string;
    appointmentRequired?: boolean;
    dockNumber?: string;
  };
  receiver: {
    companyName?: string;
    contactName?: string;
    contactPhone?: string;
    facilityName?: string;
    facilityAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    deliveryHours?: string;
    deliveryInstructions?: string;
    appointmentRequired?: boolean;
    lumperRequired?: boolean;
  };
  billing: {
    paymentTerms?: string; // Net 30, Quick Pay, etc.
    quickPayAvailable?: boolean;
    quickPayRate?: number;
    creditApproved?: boolean;
    poNumber?: string;
  };
  requirements: {
    insurance?: string[];
    certifications?: string[];
    equipmentSpecs?: string[];
    driverRequirements?: string[];
  };
  extractedFromSpeaker?: string;
}

export class ShipperInformationAgent extends BaseAgent<void, ShipperInformationOutput> {
  name = 'shipper_information';
  version = '1.0.0';
  description = 'Shipper and receiver information extraction';
  dependencies = ['classification', 'speaker_identification'];

  constructor() {
    super({
      timeout: 15000,
      critical: false,
      parallel: false,
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<ShipperInformationOutput> {
    this.log('Starting shipper information extraction');

    const classification = context.getAgentOutput<any>('classification');
    const speakers = context.getAgentOutput<any>('speaker_identification');

    // Only extract for relevant call types
    const relevantTypes = ['new_booking', 'check_call'];
    if (!relevantTypes.includes(classification?.primaryType || '')) {
      return this.getDefaultOutput();
    }

    // Find shipper speaker
    const shipperSpeakerId = this.findShipperSpeaker(speakers);

    // Build prompt
    const prompt = this.getPrompt(context, shipperSpeakerId);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o-mini'
    );

    // Parse and validate
    const output = this.parseResponse(response, shipperSpeakerId);

    this.log(`Extracted shipper: ${output.shipper.companyName}`);

    return output;
  }

  private findShipperSpeaker(speakers: any): string | undefined {
    if (!speakers?.speakers) return undefined;

    for (const [id, speaker] of speakers.speakers.entries()) {
      if (speaker.role === 'shipper') {
        return id;
      }
    }
    return undefined;
  }

  getPrompt(context: AgentContextData, shipperSpeakerId?: string): string {
    const transcript = context.transcript;
    const speakerNote = shipperSpeakerId
      ? `Note: Speaker ${shipperSpeakerId} is likely the shipper.`
      : '';

    return `Extract shipper, receiver, and billing information from this freight broker call.

${speakerNote}

TRANSCRIPT:
${transcript}

EXTRACTION TASK:

1. SHIPPER INFORMATION:
   - Company name
   - Contact person name
   - Contact phone and email
   - Facility/warehouse name
   - Pickup address (street, city, state, zip)
   - Pickup hours/window
   - Special pickup instructions
   - Appointment requirements
   - Dock/door number

2. RECEIVER/CONSIGNEE INFORMATION:
   - Company name
   - Contact person name
   - Contact phone
   - Facility name
   - Delivery address (street, city, state, zip)
   - Delivery hours/window
   - Special delivery instructions
   - Appointment requirements
   - Lumper requirements

3. BILLING & PAYMENT:
   - Payment terms (Net 30, Quick Pay, etc.)
   - Quick pay available? Rate?
   - Credit approval status
   - PO/reference numbers

4. REQUIREMENTS:
   - Insurance requirements (liability amounts, cargo, etc.)
   - Required certifications (TWIC, hazmat, etc.)
   - Equipment specifications
   - Driver requirements

Extract as JSON:
{
  "shipper": {
    "companyName": "...",
    "contactName": "...",
    "contactPhone": "...",
    "contactEmail": "...",
    "facilityName": "...",
    "facilityAddress": {
      "street": "...",
      "city": "...",
      "state": "...",
      "zip": "..."
    },
    "pickupHours": "8 AM - 5 PM",
    "pickupInstructions": "check in at office, FCFS, etc.",
    "appointmentRequired": boolean,
    "dockNumber": "..."
  },
  "receiver": {
    "companyName": "...",
    "contactName": "...",
    "contactPhone": "...",
    "facilityName": "...",
    "facilityAddress": {
      "street": "...",
      "city": "...",
      "state": "...",
      "zip": "..."
    },
    "deliveryHours": "...",
    "deliveryInstructions": "...",
    "appointmentRequired": boolean,
    "lumperRequired": boolean
  },
  "billing": {
    "paymentTerms": "Net 30|Quick Pay|COD|etc",
    "quickPayAvailable": boolean,
    "quickPayRate": number (percentage),
    "creditApproved": boolean,
    "poNumber": "..."
  },
  "requirements": {
    "insurance": ["1M liability", "100K cargo", "..."],
    "certifications": ["TWIC", "Hazmat", "..."],
    "equipmentSpecs": ["air ride", "food grade", "..."],
    "driverRequirements": ["2 years experience", "clean MVR", "..."]
  },
  "confidence": {
    "shipper": 0.0-1.0,
    "receiver": 0.0-1.0,
    "billing": 0.0-1.0
  }
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert shipper information extraction system for LoadVoice.
Extract shipper company details, receiver information, and billing requirements.
Be precise with addresses and contact information.
Note special requirements and instructions carefully.
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, shipperSpeakerId?: string): ShipperInformationOutput {
    // Parse shipper info
    const shipper = {
      companyName: response.shipper?.companyName,
      contactName: response.shipper?.contactName,
      contactPhone: this.cleanPhone(response.shipper?.contactPhone),
      contactEmail: response.shipper?.contactEmail,
      facilityName: response.shipper?.facilityName,
      facilityAddress: this.parseAddress(response.shipper?.facilityAddress),
      pickupHours: response.shipper?.pickupHours,
      pickupInstructions: response.shipper?.pickupInstructions,
      appointmentRequired: response.shipper?.appointmentRequired === true,
      dockNumber: response.shipper?.dockNumber
    };

    // Parse receiver info
    const receiver = {
      companyName: response.receiver?.companyName,
      contactName: response.receiver?.contactName,
      contactPhone: this.cleanPhone(response.receiver?.contactPhone),
      facilityName: response.receiver?.facilityName,
      facilityAddress: this.parseAddress(response.receiver?.facilityAddress),
      deliveryHours: response.receiver?.deliveryHours,
      deliveryInstructions: response.receiver?.deliveryInstructions,
      appointmentRequired: response.receiver?.appointmentRequired === true,
      lumperRequired: response.receiver?.lumperRequired === true
    };

    // Parse billing
    const billing = {
      paymentTerms: response.billing?.paymentTerms,
      quickPayAvailable: response.billing?.quickPayAvailable === true,
      quickPayRate: response.billing?.quickPayRate,
      creditApproved: response.billing?.creditApproved === true,
      poNumber: response.billing?.poNumber
    };

    // Parse requirements
    const requirements = {
      insurance: response.requirements?.insurance || [],
      certifications: response.requirements?.certifications || [],
      equipmentSpecs: response.requirements?.equipmentSpecs || [],
      driverRequirements: response.requirements?.driverRequirements || []
    };

    // Calculate confidence
    const confidence = this.calculateConfidence({
      shipper: this.assessCompleteness(shipper),
      receiver: this.assessCompleteness(receiver),
      billing: billing.paymentTerms ? 0.8 : 0.3,
      overall: response.confidence?.shipper || 0.5
    });

    return {
      shipper,
      receiver,
      billing,
      requirements,
      extractedFromSpeaker: shipperSpeakerId,
      confidence
    };
  }

  private parseAddress(address: any): any {
    if (!address) return undefined;

    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip
    };
  }

  private cleanPhone(value: any): string | undefined {
    if (!value) return undefined;
    const cleaned = value.toString().replace(/[^\d\-\(\)\s]/g, '');
    return cleaned || undefined;
  }

  private assessCompleteness(data: any): number {
    let score = 0;
    let total = 0;

    const fields = ['companyName', 'contactName', 'contactPhone'];
    fields.forEach(field => {
      total++;
      if (data[field]) score++;
    });

    return total > 0 ? score / total : 0;
  }

  getDefaultOutput(): ShipperInformationOutput {
    return {
      shipper: {},
      receiver: {},
      billing: {},
      requirements: {},
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No shipper information extracted']
      },
      processingNotes: ['Shipper information not applicable for this call type']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      output.shipper !== undefined &&
      output.receiver !== undefined &&
      output.confidence !== undefined
    );
  }
}