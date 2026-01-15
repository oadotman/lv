import { carrierExtractionProcessor } from './extractionProcessor';
import type { FreightExtraction } from '@/lib/extraction/freightExtraction';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Hook that integrates with call processing pipeline
 * Automatically populates carrier database from calls
 */

export interface CallProcessingResult {
  success: boolean;
  carrierId?: string;
  loadId?: string;
  message?: string;
  statistics?: {
    isNewCarrier: boolean;
    confidence: number;
    updatedFields?: string[];
  };
}

export class CarrierCallProcessingHook {
  /**
   * Process a call after transcription and extraction
   */
  async processCall(
    callId: string,
    extraction: FreightExtraction,
    organizationId: string
  ): Promise<CallProcessingResult> {
    try {
      // Get call metadata
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError || !call) {
        throw new Error('Failed to fetch call data');
      }

      // Process based on call type
      switch (extraction.call_type) {
        case 'carrier_call':
          return await this.processCarrierCall(
            callId,
            extraction,
            organizationId,
            call.created_at
          );

        case 'shipper_call':
          return await this.processShipperCall(
            callId,
            extraction,
            organizationId
          );

        case 'check_call':
          return await this.processCheckCall(
            callId,
            extraction,
            organizationId
          );

        default:
          return {
            success: true,
            message: 'No specific processing for this call type',
          };
      }
    } catch (error) {
      console.error('Error in call processing hook:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process carrier call
   */
  private async processCarrierCall(
    callId: string,
    extraction: FreightExtraction,
    organizationId: string,
    callDate: string
  ): Promise<CallProcessingResult> {
    // Check if there's an associated load
    const loadId = await this.findOrCreateLoad(extraction, organizationId);

    // Process carrier extraction
    const result = await carrierExtractionProcessor.processCarrierCallExtraction(
      extraction,
      {
        callId,
        organizationId,
        callDate,
        loadId,
      }
    );

    // Update call record with carrier association
    if (result.carrierId) {
      await supabase
        .from('calls')
        .update({
          carrier_id: result.carrierId,
          load_id: loadId,
          processing_status: 'completed',
          processing_notes: {
            carrier_extracted: true,
            is_new_carrier: result.isNewCarrier,
            confidence: result.confidence,
            mc_number: result.mcNumber,
          },
        })
        .eq('id', callId);
    }

    return {
      success: true,
      carrierId: result.carrierId,
      loadId,
      message: result.isNewCarrier
        ? `New carrier "${result.carrierName}" added to database`
        : `Carrier "${result.carrierName}" information updated`,
      statistics: {
        isNewCarrier: result.isNewCarrier,
        confidence: result.confidence,
      },
    };
  }

  /**
   * Process shipper call
   */
  private async processShipperCall(
    callId: string,
    extraction: FreightExtraction,
    organizationId: string
  ): Promise<CallProcessingResult> {
    // Create or update load from shipper call
    const loadId = await this.findOrCreateLoad(extraction, organizationId);

    if (loadId) {
      // Update load with shipper details
      await this.updateLoadFromExtraction(loadId, extraction);

      // Update call record
      await supabase
        .from('calls')
        .update({
          load_id: loadId,
          processing_status: 'completed',
          processing_notes: {
            load_created: true,
            origin: `${extraction.route_details?.origin?.city}, ${extraction.route_details?.origin?.state}`,
            destination: `${extraction.route_details?.destination?.city}, ${extraction.route_details?.destination?.state}`,
          },
        })
        .eq('id', callId);
    }

    return {
      success: true,
      loadId,
      message: 'Shipper call processed and load created/updated',
    };
  }

  /**
   * Process check call
   */
  private async processCheckCall(
    callId: string,
    extraction: FreightExtraction,
    organizationId: string
  ): Promise<CallProcessingResult> {
    // Find load by reference number or other identifiers
    const loadId = await this.findLoadFromCheckCall(extraction, organizationId);

    if (loadId) {
      // Update load status if mentioned
      if (extraction.load_status) {
        await this.updateLoadStatus(loadId, extraction.load_status);
      }

      // Update call record
      await supabase
        .from('calls')
        .update({
          load_id: loadId,
          processing_status: 'completed',
          processing_notes: {
            type: 'check_call',
            status_update: extraction.load_status,
          },
        })
        .eq('id', callId);
    }

    return {
      success: true,
      loadId,
      message: 'Check call processed',
    };
  }

  /**
   * Find or create load from extraction
   */
  private async findOrCreateLoad(
    extraction: FreightExtraction,
    organizationId: string
  ): Promise<string | undefined> {
    // Try to find existing load by reference number
    if (extraction.reference_numbers?.length) {
      const { data: existingLoad } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', organizationId)
        .in('reference_number', extraction.reference_numbers)
        .single();

      if (existingLoad) {
        return existingLoad.id;
      }
    }

    // Create new load if we have enough information
    if (
      extraction.route_details?.origin?.city &&
      extraction.route_details?.origin?.state &&
      extraction.route_details?.destination?.city &&
      extraction.route_details?.destination?.state
    ) {
      const loadData = {
        organization_id: organizationId,
        status: 'quoted' as const,

        // Origin
        origin_city: extraction.route_details.origin.city,
        origin_state: extraction.route_details.origin.state,
        origin_zip: extraction.route_details.origin.zip,

        // Destination
        destination_city: extraction.route_details.destination.city,
        destination_state: extraction.route_details.destination.state,
        destination_zip: extraction.route_details.destination.zip,

        // Dates
        pickup_date: extraction.route_details.pickup_date,
        delivery_date: extraction.route_details.delivery_date,

        // Details
        commodity: extraction.equipment_details?.commodity,
        weight: extraction.equipment_details?.weight,
        equipment_type: extraction.equipment_details?.type,
        special_instructions: extraction.equipment_details?.special_requirements?.join(', '),

        // Pricing
        rate_to_shipper: extraction.pricing?.total_rate,
        rate_to_carrier: extraction.pricing?.carrier_rate,

        // Reference
        reference_number: extraction.reference_numbers?.[0],

        // Metadata
        created_from_call: true,
        source: extraction.call_type,
      };

      const { data: newLoad, error } = await supabase
        .from('loads')
        .insert(loadData)
        .select()
        .single();

      if (!error && newLoad) {
        return newLoad.id;
      }
    }

    return undefined;
  }

  /**
   * Update load from extraction data
   */
  private async updateLoadFromExtraction(
    loadId: string,
    extraction: FreightExtraction
  ): Promise<void> {
    const updates: Record<string, any> = {};

    // Update route details if more complete
    if (extraction.route_details) {
      const route = extraction.route_details;

      if (route.pickup_date) updates.pickup_date = route.pickup_date;
      if (route.delivery_date) updates.delivery_date = route.delivery_date;
      if (route.pickup_time) updates.pickup_time_window = route.pickup_time;
      if (route.delivery_time) updates.delivery_time_window = route.delivery_time;
    }

    // Update equipment details
    if (extraction.equipment_details) {
      const equipment = extraction.equipment_details;

      if (equipment.type) updates.equipment_type = equipment.type;
      if (equipment.commodity) updates.commodity = equipment.commodity;
      if (equipment.weight) updates.weight = equipment.weight;
      if (equipment.pallets) updates.pallets = equipment.pallets;
      if (equipment.special_requirements) {
        updates.special_instructions = equipment.special_requirements.join(', ');
      }
    }

    // Update pricing
    if (extraction.pricing) {
      const pricing = extraction.pricing;

      if (pricing.total_rate) updates.rate_to_shipper = pricing.total_rate;
      if (pricing.carrier_rate) updates.rate_to_carrier = pricing.carrier_rate;
      if (pricing.fuel_surcharge) updates.fuel_surcharge = pricing.fuel_surcharge;

      // Calculate margin
      if (pricing.total_rate && pricing.carrier_rate) {
        updates.margin = pricing.total_rate - pricing.carrier_rate;
        updates.margin_percentage = ((updates.margin / pricing.total_rate) * 100).toFixed(1);
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('loads')
        .update(updates)
        .eq('id', loadId);
    }
  }

  /**
   * Find load from check call
   */
  private async findLoadFromCheckCall(
    extraction: FreightExtraction,
    organizationId: string
  ): Promise<string | undefined> {
    // Try reference number first
    if (extraction.reference_numbers?.length) {
      const { data } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', organizationId)
        .in('reference_number', extraction.reference_numbers)
        .single();

      if (data) return data.id;
    }

    // Try to match by route and date
    if (
      extraction.route_details?.origin?.city &&
      extraction.route_details?.destination?.city
    ) {
      const { data } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('origin_city', extraction.route_details.origin.city)
        .eq('destination_city', extraction.route_details.destination.city)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) return data.id;
    }

    return undefined;
  }

  /**
   * Update load status
   */
  private async updateLoadStatus(
    loadId: string,
    status: string
  ): Promise<void> {
    // Map extracted status to system status
    const statusMap: Record<string, string> = {
      'quoted': 'quoted',
      'booked': 'needs_carrier',
      'dispatched': 'dispatched',
      'picked up': 'in_transit',
      'in transit': 'in_transit',
      'delivered': 'delivered',
      'completed': 'completed',
      'cancelled': 'cancelled',
    };

    const mappedStatus = statusMap[status.toLowerCase()];

    if (mappedStatus) {
      await supabase
        .from('loads')
        .update({
          status: mappedStatus,
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', loadId);
    }
  }
}

// Export singleton instance
export const carrierCallProcessingHook = new CarrierCallProcessingHook();