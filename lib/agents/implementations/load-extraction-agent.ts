/**
 * Load Extraction Agent - Extracts load details from freight calls
 * Handles single loads, multi-loads, multi-stop, and load modifications
 */

import { BaseAgent } from '../base-agent';
import {
  AgentContextData,
  LoadExtractionOutput,
  LoadDetails,
  Location,
  DateWindow
} from '../types';

export class LoadExtractionAgent extends BaseAgent<void, LoadExtractionOutput> {
  name = 'load_extraction';
  version = '1.0.0';
  description = 'Load and shipment details extraction';
  dependencies = ['classification', 'speaker_identification'];

  constructor() {
    super({
      timeout: 20000, // 20 seconds - may need more time for multi-load
      critical: false, // Can continue without load details in some cases
      parallel: false,
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<LoadExtractionOutput> {
    this.log('Starting load extraction');

    const classification = context.getAgentOutput<any>('classification');
    const speakers = context.getAgentOutput<any>('speaker_identification');

    // Skip if wrong number or voicemail
    if (classification?.primaryType === 'wrong_number' ||
        classification?.primaryType === 'voicemail') {
      return this.getDefaultOutput();
    }

    // Build prompt
    const prompt = this.getPrompt(context);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o' // Use better model for complex extraction
    );

    // Parse and validate
    const output = this.parseResponse(response, context);

    this.log(`Extracted ${output.loads.length} loads, multi-load: ${output.multiLoadCall}`);

    return output;
  }

  getPrompt(context: AgentContextData): string {
    const transcript = context.transcript;
    const classification = context.getAgentOutput<any>('classification');
    const isMultiLoad = classification?.multiLoadCall || false;

    return `Extract all load/shipment details from this freight broker call.

TRANSCRIPT:
${transcript}

EXTRACTION REQUIREMENTS:

1. LOADS - Extract each load separately if multiple discussed:
   - Origin (city, state, zip if mentioned)
   - Destination (city, state, zip if mentioned)
   - Stops (any intermediate stops with city/state)
   - Commodity (what's being shipped)
   - Weight (in lbs, convert if given in tons)
   - Pallet count
   - Equipment type (dry van, reefer, flatbed, etc.)
   - Pickup date/time/window
   - Delivery date/time/window
   - Reference/PO numbers
   - Special requirements (tarps, team, hazmat, etc.)
   - Distance/miles if mentioned

2. MULTI-LOAD HANDLING:
   ${isMultiLoad ? 'This appears to be a multi-load call. Extract each load separately.' : ''}
   - Assign unique IDs (load_1, load_2, etc.)
   - Track which details belong to which load
   - Note if loads are related (backhaul, round trip, etc.)

3. LOAD MODIFICATIONS:
   Track any changes to load details during the call:
   - Original vs updated values
   - What changed (weight, dates, locations, etc.)
   - When in conversation it changed

4. MULTI-STOP LOADS:
   For loads with multiple stops:
   - List all stops in order
   - Note what's picked up/delivered at each stop
   - Track partial unloads

Extract as JSON:
{
  "loads": [
    {
      "id": "load_1",
      "origin": {
        "city": "...",
        "state": "...",
        "zip": "...",
        "facility": "shipper name/location if mentioned",
        "rawText": "exactly what was said"
      },
      "destination": {
        "city": "...",
        "state": "...",
        "zip": "...",
        "facility": "receiver name/location if mentioned",
        "rawText": "exactly what was said"
      },
      "stops": [
        {
          "city": "...",
          "state": "...",
          "action": "deliver 10 pallets",
          "rawText": "..."
        }
      ],
      "commodity": "...",
      "weight": number or null,
      "palletCount": number or null,
      "equipmentType": "dry_van|reefer|flatbed|step_deck|rgn|other",
      "pickupDate": {
        "date": "YYYY-MM-DD or null",
        "startTime": "HH:MM or null",
        "endTime": "HH:MM or null",
        "isFlexible": boolean,
        "rawText": "tomorrow morning",
        "notes": "FCFS, appointment needed, etc."
      },
      "deliveryDate": {
        "date": "YYYY-MM-DD or null",
        "startTime": "HH:MM or null",
        "endTime": "HH:MM or null",
        "isFlexible": boolean,
        "rawText": "by Monday EOD",
        "notes": "..."
      },
      "referenceNumber": "...",
      "specialRequirements": ["tarps", "team drivers", "..."],
      "distance": number or null,
      "status": "discussed|booked|cancelled|modified",
      "confidence": {
        "origin": 0.0-1.0,
        "destination": 0.0-1.0,
        "dates": 0.0-1.0,
        "details": 0.0-1.0
      }
    }
  ],
  "multiLoadCall": boolean,
  "loadModifications": [
    {
      "loadId": "load_1",
      "changeType": "weight|date|location|commodity|other",
      "originalValue": "...",
      "newValue": "...",
      "description": "Weight changed from 20k to 25k lbs"
    }
  ],
  "relatedLoads": {
    "backhaul": ["load_1", "load_2"],
    "roundTrip": ["load_3", "load_4"]
  },
  "extractionNotes": ["any important context or uncertainties"]
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert load extraction system for LoadVoice, specializing in freight broker calls.
Extract all shipment details accurately. Be precise with locations and dates.
Handle multiple loads, multi-stop shipments, and load modifications correctly.
If information is unclear or missing, note it rather than guessing.
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, context: AgentContextData): LoadExtractionOutput {
    const loads: LoadDetails[] = [];

    // Parse loads array
    if (response.loads && Array.isArray(response.loads)) {
      for (const loadData of response.loads) {
        const load = this.parseLoad(loadData);
        if (load) {
          loads.push(load);
        }
      }
    }

    // Ensure at least one load for non-check calls
    if (loads.length === 0 && context.getAgentOutput<any>('classification')?.primaryType !== 'check_call') {
      loads.push(this.createEmptyLoad());
    }

    // Calculate confidence
    const avgConfidence = loads.length > 0
      ? loads.reduce((sum, l) => {
          const conf = (
            (l.origin.confidence || 0) +
            (l.destination.confidence || 0) +
            (l.pickupDate?.confidence || 0) +
            (l.deliveryDate?.confidence || 0)
          ) / 4;
          return sum + conf;
        }, 0) / loads.length
      : 0.3;

    const output: LoadExtractionOutput = {
      loads,
      multiLoadCall: response.multiLoadCall || loads.length > 1,
      loadModifications: response.loadModifications || [],
      confidence: this.calculateConfidence({
        loadExtraction: avgConfidence,
        completeness: this.assessCompleteness(loads),
        consistency: this.assessConsistency(loads)
      })
    };

    // Add processing notes
    if (response.extractionNotes && response.extractionNotes.length > 0) {
      output.processingNotes = response.extractionNotes;
    }

    return output;
  }

  private parseLoad(data: any): LoadDetails | null {
    if (!data) return null;

    return {
      id: data.id || `load_${Date.now()}`,
      origin: this.parseLocation(data.origin),
      destination: this.parseLocation(data.destination),
      stops: data.stops?.map((s: any) => this.parseLocation(s)) || undefined,
      commodity: data.commodity || undefined,
      weight: this.parseNumber(data.weight),
      palletCount: this.parseNumber(data.palletCount),
      equipmentType: data.equipmentType || undefined,
      pickupDate: this.parseDateWindow(data.pickupDate),
      deliveryDate: this.parseDateWindow(data.deliveryDate),
      referenceNumber: data.referenceNumber || undefined,
      specialRequirements: data.specialRequirements || undefined,
      distance: this.parseNumber(data.distance),
      status: data.status || 'discussed'
    };
  }

  private parseLocation(data: any): Location {
    if (!data) {
      return {
        rawText: '',
        confidence: 0
      };
    }

    return {
      city: data.city || undefined,
      state: data.state || undefined,
      zip: data.zip || undefined,
      country: data.country || 'USA',
      rawText: data.rawText || '',
      confidence: this.parseNumber(data.confidence) || 0.5
    };
  }

  private parseDateWindow(data: any): DateWindow | undefined {
    if (!data) return undefined;

    const dateStr = data.date;
    let date: Date | undefined;

    if (dateStr && dateStr !== 'null') {
      try {
        date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          date = undefined;
        }
      } catch {
        date = undefined;
      }
    }

    return {
      date,
      startTime: this.parseTime(data.startTime),
      endTime: this.parseTime(data.endTime),
      isFlexible: data.isFlexible !== false,
      rawText: data.rawText || '',
      confidence: this.parseNumber(data.confidence) || 0.5
    };
  }

  private parseTime(timeStr: any): Date | undefined {
    if (!timeStr || timeStr === 'null') return undefined;

    // Parse HH:MM format
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const date = new Date();
      date.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
      return date;
    }

    return undefined;
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  private assessCompleteness(loads: LoadDetails[]): number {
    if (loads.length === 0) return 0;

    const scores = loads.map(load => {
      let score = 0;
      let total = 0;

      // Check required fields
      const checks = [
        load.origin.city,
        load.destination.city,
        load.commodity,
        load.equipmentType,
        load.pickupDate
      ];

      checks.forEach(field => {
        total++;
        if (field) score++;
      });

      return total > 0 ? score / total : 0;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private assessConsistency(loads: LoadDetails[]): number {
    // Check for logical consistency
    // E.g., pickup before delivery, reasonable distances, etc.
    return 0.8; // Simplified for now
  }

  private createEmptyLoad(): LoadDetails {
    return {
      id: `load_empty_${Date.now()}`,
      origin: { rawText: '', confidence: 0 },
      destination: { rawText: '', confidence: 0 },
      status: 'discussed'
    };
  }

  getDefaultOutput(): LoadExtractionOutput {
    return {
      loads: [],
      multiLoadCall: false,
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No loads extracted']
      },
      processingNotes: ['Load extraction failed or not applicable']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.loads) &&
      output.confidence &&
      typeof output.multiLoadCall === 'boolean'
    );
  }
}