import { createClient } from '@supabase/supabase-js';
import { carrierCallProcessingHook } from '@/lib/carriers/callProcessingHook';
import { extractFreightData } from '@/lib/extraction/freightExtraction';
import type { FreightExtraction } from '@/lib/extraction/freightExtraction';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Integration layer that connects call processing with carrier database population
 * This runs after a call is transcribed and extracted
 */

export class CallProcessingIntegration {
  /**
   * Main integration point - called after extraction completes
   */
  async onExtractionComplete(
    callId: string,
    transcription: string,
    extraction: any,
    organizationId: string
  ): Promise<void> {
    try {
      console.log(`Processing extraction for call ${callId}`);

      // Convert extraction to FreightExtraction type if needed
      const freightExtraction = this.ensureFreightExtraction(extraction);

      // Process the call based on type
      const result = await carrierCallProcessingHook.processCall(
        callId,
        freightExtraction,
        organizationId
      );

      // Log the result
      await this.logProcessingResult(callId, result);

      // Trigger any follow-up actions
      await this.triggerFollowUpActions(callId, result, freightExtraction);

      console.log(`Call ${callId} processing complete:`, result.message);
    } catch (error) {
      console.error(`Error processing call ${callId}:`, error);

      // Mark call as failed processing
      await supabase
        .from('calls')
        .update({
          processing_status: 'failed',
          processing_notes: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        })
        .eq('id', callId);
    }
  }

  /**
   * Ensure extraction is in FreightExtraction format
   */
  private ensureFreightExtraction(extraction: any): FreightExtraction {
    // If it's already a FreightExtraction, return it
    if (extraction.call_type && extraction.route_details) {
      return extraction;
    }

    // Otherwise, try to convert from legacy format
    return {
      call_type: this.detectCallType(extraction),
      summary: extraction.summary || '',
      key_points: extraction.key_points || [],
      action_items: extraction.action_items || [],

      participants: extraction.participants || [],

      route_details: {
        origin: extraction.origin || {},
        destination: extraction.destination || {},
        pickup_date: extraction.pickup_date,
        delivery_date: extraction.delivery_date,
      },

      equipment_details: {
        type: extraction.equipment_type,
        commodity: extraction.commodity,
        weight: extraction.weight,
      },

      pricing: {
        total_rate: extraction.rate,
        carrier_rate: extraction.carrier_rate,
      },

      carrier_information: extraction.carrier || {},
      shipper_information: extraction.shipper || {},

      reference_numbers: extraction.reference_numbers || [],
      load_status: extraction.status,

      concerns: extraction.concerns || [],
      follow_up_needed: extraction.follow_up_needed || false,
    };
  }

  /**
   * Detect call type from extraction content
   */
  private detectCallType(extraction: any): FreightExtraction['call_type'] {
    const content = JSON.stringify(extraction).toLowerCase();

    if (content.includes('mc number') || content.includes('carrier rate')) {
      return 'carrier_call';
    }
    if (content.includes('need a truck') || content.includes('shipper rate')) {
      return 'shipper_call';
    }
    if (content.includes('check on') || content.includes('status update')) {
      return 'check_call';
    }

    return 'unknown';
  }

  /**
   * Log processing result for analytics
   */
  private async logProcessingResult(
    callId: string,
    result: any
  ): Promise<void> {
    await supabase
      .from('call_processing_logs')
      .insert({
        call_id: callId,
        processing_type: 'carrier_extraction',
        success: result.success,
        carrier_id: result.carrierId,
        load_id: result.loadId,
        is_new_carrier: result.statistics?.isNewCarrier,
        confidence_score: result.statistics?.confidence,
        message: result.message,
        processed_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger follow-up actions based on processing results
   */
  private async triggerFollowUpActions(
    callId: string,
    result: any,
    extraction: FreightExtraction
  ): Promise<void> {
    // If a new carrier was added, send notification
    if (result.statistics?.isNewCarrier && result.carrierId) {
      await this.notifyNewCarrier(result.carrierId, result.message);
    }

    // If high-value load, flag for attention
    if (extraction.pricing?.total_rate && extraction.pricing.total_rate > 5000) {
      await this.flagHighValueLoad(result.loadId, extraction.pricing.total_rate);
    }

    // If urgent follow-up needed, create task
    if (extraction.follow_up_needed) {
      await this.createFollowUpTask(callId, extraction.action_items);
    }

    // If carrier has low confidence score, flag for review
    if (result.statistics?.confidence && result.statistics.confidence < 50) {
      await this.flagForReview(callId, 'Low confidence carrier extraction');
    }
  }

  /**
   * Notify about new carrier addition
   */
  private async notifyNewCarrier(
    carrierId: string,
    message: string
  ): Promise<void> {
    // In production, this would send actual notifications
    console.log(`New carrier notification: ${message}`);

    await supabase
      .from('notifications')
      .insert({
        type: 'new_carrier',
        entity_id: carrierId,
        message,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Flag high-value load for attention
   */
  private async flagHighValueLoad(
    loadId: string | undefined,
    amount: number
  ): Promise<void> {
    if (!loadId) return;

    await supabase
      .from('loads')
      .update({
        is_high_value: true,
        flags: ['high_value'],
      })
      .eq('id', loadId);
  }

  /**
   * Create follow-up task
   */
  private async createFollowUpTask(
    callId: string,
    actionItems: string[]
  ): Promise<void> {
    await supabase
      .from('tasks')
      .insert({
        call_id: callId,
        type: 'follow_up',
        description: actionItems.join('\n'),
        priority: 'high',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Flag call for manual review
   */
  private async flagForReview(
    callId: string,
    reason: string
  ): Promise<void> {
    await supabase
      .from('calls')
      .update({
        needs_review: true,
        review_reason: reason,
      })
      .eq('id', callId);
  }

  /**
   * Process historical calls in batch
   */
  async processHistoricalCalls(
    organizationId: string,
    limit: number = 100
  ): Promise<{
    processed: number;
    newCarriers: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      newCarriers: 0,
      errors: [] as string[],
    };

    try {
      // Get unprocessed calls with extractions
      const { data: calls, error } = await supabase
        .from('calls')
        .select('id, extraction_data, created_at')
        .eq('organization_id', organizationId)
        .is('processing_status', null)
        .not('extraction_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!calls || calls.length === 0) {
        return results;
      }

      // Process each call
      for (const call of calls) {
        try {
          const freightExtraction = this.ensureFreightExtraction(call.extraction_data);

          const result = await carrierCallProcessingHook.processCall(
            call.id,
            freightExtraction,
            organizationId
          );

          results.processed++;
          if (result.statistics?.isNewCarrier) {
            results.newCarriers++;
          }

          // Add small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing historical call ${call.id}:`, error);
          results.errors.push(`Call ${call.id}: ${error}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing historical calls:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const callProcessingIntegration = new CallProcessingIntegration();

/**
 * Hook to be called from the main call processing pipeline
 * This should be integrated into your existing call processing flow
 */
export async function processCallAfterExtraction(
  callId: string,
  transcription: string,
  extraction: any,
  organizationId: string
): Promise<void> {
  await callProcessingIntegration.onExtractionComplete(
    callId,
    transcription,
    extraction,
    organizationId
  );
}