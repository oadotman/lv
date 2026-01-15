import { carrierService, type ExtractedCarrierData } from './carrierService';
import type { FreightExtraction } from '@/lib/extraction/freightExtraction';

/**
 * Processes extracted call data to populate carrier database
 * Integrates with the AI extraction pipeline
 */

export interface CarrierExtractionResult {
  carrierId?: string;
  isNewCarrier: boolean;
  carrierName?: string;
  mcNumber?: string;
  confidence: number;
  linkedToLoad?: boolean;
  errors?: string[];
}

export class CarrierExtractionProcessor {
  /**
   * Process a carrier call extraction and update database
   */
  async processCarrierCallExtraction(
    extraction: FreightExtraction,
    callMetadata: {
      callId: string;
      organizationId: string;
      callDate: string;
      loadId?: string;
    }
  ): Promise<CarrierExtractionResult> {
    const errors: string[] = [];

    try {
      // Only process if it's a carrier call
      if (extraction.call_type !== 'carrier_call') {
        return {
          isNewCarrier: false,
          confidence: 0,
          errors: ['Not a carrier call'],
        };
      }

      // Extract carrier-specific data
      const carrierData = this.extractCarrierData(extraction, callMetadata);

      if (!carrierData) {
        return {
          isNewCarrier: false,
          confidence: 0,
          errors: ['No carrier data extracted'],
        };
      }

      // Calculate extraction confidence
      const confidence = this.calculateConfidence(carrierData);

      // Process carrier in database
      const { carrier, isNew, updated } = await carrierService.processCarrierFromCall(
        carrierData,
        callMetadata.loadId
      );

      return {
        carrierId: carrier.id,
        isNewCarrier: isNew,
        carrierName: (carrier as any).company_name || (carrier as any).name || 'Unknown',
        mcNumber: carrier.mc_number,
        confidence,
        linkedToLoad: !!callMetadata.loadId,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error processing carrier extraction:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');

      return {
        isNewCarrier: false,
        confidence: 0,
        errors,
      };
    }
  }

  /**
   * Extract carrier data from AI extraction
   */
  private extractCarrierData(
    extraction: FreightExtraction,
    metadata: {
      callId: string;
      organizationId: string;
      callDate: string;
    }
  ): ExtractedCarrierData | null {
    // Check for carrier information in the extraction
    const carrierInfo = extraction.carrier_information;

    if (!carrierInfo) {
      return null;
    }

    // Parse equipment types from extraction
    const equipmentTypes = this.parseEquipmentTypes(extraction);

    // Parse lanes from route information
    const preferredLanes = this.parseLanes(extraction);

    // Extract contact information
    const contactInfo = this.extractContactInfo(extraction);

    return {
      // Identification
      mc_number: carrierInfo.mc_number || this.extractMCNumber(extraction.key_points),
      dot_number: carrierInfo.dot_number || this.extractDOTNumber(extraction.key_points),
      company_name: carrierInfo.company_name || extraction.participants?.find(p =>
        p.role === 'Carrier'
      )?.name,

      // Contact Info
      contact_name: carrierInfo.contact_name || contactInfo.name,
      phone: carrierInfo.phone || contactInfo.phone,
      email: carrierInfo.email || contactInfo.email,

      // Address
      city: carrierInfo.city,
      state: carrierInfo.state,
      address: carrierInfo.address,
      zip_code: carrierInfo.zip,

      // Equipment & Operations
      equipment_types: equipmentTypes,
      preferred_lanes: preferredLanes,

      // Current conversation details
      quoted_rate: extraction.pricing?.carrier_rate || extraction.pricing?.linehaul,
      available_date: extraction.route_details?.pickup_date,
      driver_name: carrierInfo.driver_name || extraction.route_details?.driver_info?.name,
      driver_phone: carrierInfo.driver_phone || extraction.route_details?.driver_info?.phone,

      // Metadata
      call_id: metadata.callId,
      organization_id: metadata.organizationId,
      call_date: metadata.callDate,
    };
  }

  /**
   * Extract contact information from various extraction fields
   */
  private extractContactInfo(extraction: FreightExtraction): {
    name?: string;
    phone?: string;
    email?: string;
  } {
    const info: { name?: string; phone?: string; email?: string } = {};

    // Check participants
    const carrier = extraction.participants?.find(p => p.role === 'Carrier');
    if (carrier) {
      info.name = carrier.name;
      info.phone = carrier.phone;
    }

    // Check action items for contact mentions
    extraction.action_items?.forEach(item => {
      // Look for phone numbers in action items
      const phoneMatch = item.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
      if (phoneMatch) {
        info.phone = phoneMatch[0];
      }

      // Look for email addresses
      const emailMatch = item.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        info.email = emailMatch[0];
      }
    });

    return info;
  }

  /**
   * Parse equipment types from extraction
   */
  private parseEquipmentTypes(extraction: FreightExtraction): string[] {
    const equipmentSet = new Set<string>();

    // From direct equipment field
    if (extraction.equipment_details?.type) {
      equipmentSet.add(this.normalizeEquipmentType(extraction.equipment_details.type));
    }

    // From key points and summary
    const textFields = [
      extraction.summary,
      ...(extraction.key_points || []),
    ];

    const equipmentKeywords = [
      'dry van', 'reefer', 'flatbed', 'step deck', 'lowboy',
      'tanker', 'hopper', 'pneumatic', 'intermodal', 'container',
      'car hauler', 'dump truck', 'box truck', 'sprinter van'
    ];

    textFields.forEach(text => {
      if (!text) return;
      const lowerText = text.toLowerCase();

      equipmentKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          equipmentSet.add(this.normalizeEquipmentType(keyword));
        }
      });
    });

    return Array.from(equipmentSet);
  }

  /**
   * Normalize equipment type names
   */
  private normalizeEquipmentType(type: string): string {
    const normalized = type.toLowerCase().trim();

    const mappings: Record<string, string> = {
      'dryvan': 'Dry Van',
      'dry van': 'Dry Van',
      'van': 'Dry Van',
      'reefer': 'Reefer',
      'refrigerated': 'Reefer',
      'flatbed': 'Flatbed',
      'flat': 'Flatbed',
      'step deck': 'Step Deck',
      'stepdeck': 'Step Deck',
      'lowboy': 'Lowboy',
      'tanker': 'Tanker',
      'hopper': 'Hopper',
      'pneumatic': 'Pneumatic',
      'intermodal': 'Intermodal',
      'container': 'Container',
      'car hauler': 'Car Hauler',
      'auto carrier': 'Car Hauler',
      'dump': 'Dump Truck',
      'dump truck': 'Dump Truck',
      'box': 'Box Truck',
      'box truck': 'Box Truck',
      'sprinter': 'Sprinter Van',
      'sprinter van': 'Sprinter Van',
    };

    return mappings[normalized] || type;
  }

  /**
   * Parse lanes from route information
   */
  private parseLanes(extraction: FreightExtraction): string[] {
    const lanes = new Set<string>();

    // From direct route
    if (extraction.route_details?.origin?.state && extraction.route_details?.destination?.state) {
      lanes.add(
        `${extraction.route_details.origin.state}-${extraction.route_details.destination.state}`
      );
    }

    // From mentioned lanes in conversation
    if (extraction.key_points) {
      const lanePattern = /\b([A-Z]{2})\s*[-to]+\s*([A-Z]{2})\b/g;

      extraction.key_points.forEach(point => {
        const matches = Array.from(point.matchAll(lanePattern));
        matches.forEach(match => {
          lanes.add(`${match[1]}-${match[2]}`);
        });
      });
    }

    return Array.from(lanes);
  }

  /**
   * Extract MC number from text
   */
  private extractMCNumber(texts?: string[]): string | undefined {
    if (!texts) return undefined;

    const mcPattern = /\bMC[-\s]?(\d{5,7})\b/i;

    for (const text of texts) {
      const match = text.match(mcPattern);
      if (match) {
        return `MC-${match[1]}`;
      }
    }

    return undefined;
  }

  /**
   * Extract DOT number from text
   */
  private extractDOTNumber(texts?: string[]): string | undefined {
    if (!texts) return undefined;

    const dotPattern = /\bDOT[-\s]?(\d{6,8})\b/i;

    for (const text of texts) {
      const match = text.match(dotPattern);
      if (match) {
        return `DOT-${match[1]}`;
      }
    }

    return undefined;
  }

  /**
   * Calculate confidence score for extraction
   */
  private calculateConfidence(data: ExtractedCarrierData): number {
    let score = 0;
    let maxScore = 0;

    // Critical fields (high weight)
    const criticalFields = [
      { field: data.mc_number, weight: 30 },
      { field: data.company_name, weight: 20 },
      { field: data.phone, weight: 15 },
    ];

    // Important fields (medium weight)
    const importantFields = [
      { field: data.contact_name, weight: 10 },
      { field: data.state, weight: 5 },
      { field: data.quoted_rate, weight: 10 },
    ];

    // Nice to have fields (low weight)
    const niceToHaveFields = [
      { field: data.email, weight: 3 },
      { field: data.address, weight: 3 },
      { field: data.equipment_types && data.equipment_types.length > 0, weight: 2 },
      { field: data.preferred_lanes && data.preferred_lanes.length > 0, weight: 2 },
    ];

    // Calculate scores
    [...criticalFields, ...importantFields, ...niceToHaveFields].forEach(item => {
      maxScore += item.weight;
      if (item.field) {
        score += item.weight;
      }
    });

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Validate and enrich carrier data with external sources
   */
  async enrichCarrierData(
    mcNumber: string
  ): Promise<{
    valid: boolean;
    enrichedData?: Partial<ExtractedCarrierData>;
  }> {
    // This would integrate with FMCSA API or other data sources
    // For now, return placeholder
    return {
      valid: true,
      enrichedData: {
        // Would be populated from FMCSA data
      },
    };
  }

  /**
   * Process batch of carrier calls (for historical data)
   */
  async processBatchCarrierCalls(
    calls: Array<{
      extraction: FreightExtraction;
      callId: string;
      organizationId: string;
      callDate: string;
      loadId?: string;
    }>
  ): Promise<{
    processed: number;
    newCarriers: number;
    updatedCarriers: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      newCarriers: 0,
      updatedCarriers: 0,
      errors: [] as string[],
    };

    for (const call of calls) {
      try {
        const result = await this.processCarrierCallExtraction(
          call.extraction,
          {
            callId: call.callId,
            organizationId: call.organizationId,
            callDate: call.callDate,
            loadId: call.loadId,
          }
        );

        results.processed++;

        if (result.isNewCarrier) {
          results.newCarriers++;
        } else if (result.carrierId) {
          results.updatedCarriers++;
        }

        if (result.errors) {
          results.errors.push(...result.errors);
        }
      } catch (error) {
        console.error('Error processing call:', error);
        results.errors.push(`Failed to process call ${call.callId}`);
      }
    }

    return results;
  }
}

// Export singleton instance
export const carrierExtractionProcessor = new CarrierExtractionProcessor();