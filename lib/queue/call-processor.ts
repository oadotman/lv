/**
 * Call Processing Pipeline - The Core AI Engine
 * Handles transcription (AssemblyAI) and extraction (OpenAI)
 * With retry logic and error handling
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { transcribeWithAssemblyAI } from '@/lib/assemblyai';
import { extractFreightDataWithOpenAI } from '@/lib/openai';
import { generateSignedRecordingUrl } from '@/lib/twilio/security';

export interface ProcessCallOptions {
  callId: string;
  organizationId: string;
  recordingUrl?: string;
  recordingSid?: string;
  retryCount?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Main entry point for call processing
 * Called by status webhook when call completes
 */
export async function triggerCallProcessing(options: ProcessCallOptions) {
  console.log('[Call Processor] Starting processing for call:', options.callId);

  const supabase = createAdminClient();

  try {
    // Update call status to processing
    await supabase
      .from('calls')
      .update({
        transcription_status: 'processing',
        extraction_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', options.callId);

    // Check organization's usage limits
    const canProcess = await checkUsageLimits(options.organizationId);
    if (!canProcess) {
      throw new Error('Usage limits exceeded');
    }

    // Step 1: Download and secure the recording
    let secureRecordingUrl = options.recordingUrl;
    if (options.recordingUrl && options.recordingSid) {
      // Generate a signed URL for secure access
      secureRecordingUrl = generateSignedRecordingUrl(options.recordingUrl, 120); // 2 hours
    }

    if (!secureRecordingUrl) {
      throw new Error('No recording URL available');
    }

    // Step 2: Transcribe with AssemblyAI
    const transcription = await processTranscription(
      options.callId,
      secureRecordingUrl,
      options.organizationId
    );

    if (!transcription) {
      throw new Error('Transcription failed');
    }

    // Step 3: Extract freight data with OpenAI
    const extractedData = await processExtraction(
      options.callId,
      transcription,
      options.organizationId
    );

    // Step 4: Update call as completed
    await supabase
      .from('calls')
      .update({
        transcription_status: 'completed',
        extraction_status: extractedData ? 'completed' : 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', options.callId);

    // Step 5: Send success notification
    await sendNotification(options.organizationId, {
      type: 'processing_complete',
      title: 'Call Processing Complete',
      message: 'Your call has been transcribed and analyzed successfully',
      callId: options.callId
    });

    console.log('[Call Processor] Successfully processed call:', options.callId);
    return { success: true, callId: options.callId };

  } catch (error) {
    console.error('[Call Processor] Error processing call:', error);

    // Handle retries
    const retryCount = options.retryCount || 0;
    if (retryCount < MAX_RETRIES) {
      console.log(`[Call Processor] Retrying (${retryCount + 1}/${MAX_RETRIES})...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));

      // Retry with incremented count
      return triggerCallProcessing({
        ...options,
        retryCount: retryCount + 1
      });
    }

    // Max retries exceeded, mark as failed
    await supabase
      .from('calls')
      .update({
        transcription_status: 'failed',
        extraction_status: 'failed',
        updated_at: new Date().toISOString(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        }
      })
      .eq('id', options.callId);

    // Send failure notification
    await sendNotification(options.organizationId, {
      type: 'processing_failed',
      title: 'Call Processing Failed',
      message: 'We couldn\'t process your call. Please try uploading it manually.',
      callId: options.callId
    });

    throw error;
  }
}

/**
 * Process transcription with AssemblyAI
 */
async function processTranscription(
  callId: string,
  recordingUrl: string,
  organizationId: string
): Promise<string | null> {
  console.log('[Call Processor] Starting transcription for call:', callId);

  const supabase = createAdminClient();

  try {
    // Call AssemblyAI
    const result = await transcribeWithAssemblyAI(recordingUrl);

    if (!result || !result.text) {
      throw new Error('No transcription text received');
    }

    // Save transcription to database
    const { error } = await supabase
      .from('call_transcriptions')
      .insert({
        call_id: callId,
        transcription_text: result.text,
        transcription_provider: 'assemblyai',
        provider_transcript_id: result.id,
        confidence_score: (result as any).confidence,
        word_timings: (result as any).words,
        speakers: (result as any).utterances,
        processing_time_ms: (result as any).processingTime,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Call Processor] Error saving transcription:', error);
      throw error;
    }

    // Update usage
    const words = result.text.split(' ').length;
    const minutes = Math.ceil(words / 150); // Approximate speaking rate

    // Get current usage
    const { data: currentUsage } = await supabase
      .from('usage_limits')
      .select('current_transcription_minutes')
      .eq('organization_id', organizationId)
      .single();

    await supabase
      .from('usage_limits')
      .update({
        current_transcription_minutes: (currentUsage?.current_transcription_minutes || 0) + minutes
      })
      .eq('organization_id', organizationId);

    console.log('[Call Processor] Transcription complete for call:', callId);
    return result.text;

  } catch (error) {
    console.error('[Call Processor] Transcription error:', error);
    return null;
  }
}

/**
 * Process extraction with OpenAI
 */
async function processExtraction(
  callId: string,
  transcription: string,
  organizationId: string
): Promise<any> {
  console.log('[Call Processor] Starting extraction for call:', callId);

  const supabase = createAdminClient();

  try {
    // Call OpenAI for extraction
    const extractedData: any = await extractFreightDataWithOpenAI(transcription, [], {});

    if (!extractedData) {
      throw new Error('No data extracted');
    }

    // Save extracted data to database
    const { error } = await supabase
      .from('extracted_freight_data')
      .insert({
        call_id: callId,
        organization_id: organizationId,

        // Load information
        load_number: extractedData.loadNumber || extractedData.load_number,
        pickup_location: extractedData.pickup?.location,
        pickup_city: extractedData.pickup?.city,
        pickup_state: extractedData.pickup?.state,
        pickup_zip: extractedData.pickup?.zip,
        pickup_date: extractedData.pickup?.date,
        pickup_time: extractedData.pickup?.time,

        delivery_location: extractedData.delivery?.location,
        delivery_city: extractedData.delivery?.city,
        delivery_state: extractedData.delivery?.state,
        delivery_zip: extractedData.delivery?.zip,
        delivery_date: extractedData.delivery?.date,
        delivery_time: extractedData.delivery?.time,

        // Commodity
        commodity: extractedData.commodity,
        weight_pounds: extractedData.weight,
        pallet_count: extractedData.pallets,
        equipment_type: extractedData.equipmentType,
        special_requirements: extractedData.specialRequirements,

        // Financial
        rate_amount: extractedData.rate,
        payment_terms: extractedData.paymentTerms,

        // Carrier info
        carrier_name: extractedData.carrier?.name,
        carrier_mc_number: extractedData.carrier?.mcNumber,
        carrier_contact_name: extractedData.carrier?.contactName,
        carrier_phone: extractedData.carrier?.phone,

        // Shipper info
        shipper_name: extractedData.shipper?.name,
        shipper_contact: extractedData.shipper?.contact,
        shipper_phone: extractedData.shipper?.phone,

        // Metadata
        extraction_confidence: extractedData.confidence || 0.85,
        extracted_by: 'openai',
        extraction_model: 'gpt-4-turbo-preview',
        extraction_timestamp: new Date().toISOString(),

        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Call Processor] Error saving extraction:', error);
      throw error;
    }

    // Update usage
    // Get current extraction count first
    const { data: currentUsage } = await supabase
      .from('usage_limits')
      .select('current_extractions')
      .eq('organization_id', organizationId)
      .single();

    await supabase
      .from('usage_limits')
      .update({
        current_extractions: (currentUsage?.current_extractions || 0) + 1
      })
      .eq('organization_id', organizationId);

    // Auto-create load if confidence is high
    if (extractedData.confidence >= 0.8 && extractedData.loadNumber) {
      await createLoadFromExtraction(callId, organizationId, extractedData);
    }

    console.log('[Call Processor] Extraction complete for call:', callId);
    return extractedData;

  } catch (error) {
    console.error('[Call Processor] Extraction error:', error);
    return null;
  }
}

/**
 * Check if organization has usage remaining
 */
async function checkUsageLimits(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: limits } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (!limits) {
    // No limits set, create defaults
    await supabase
      .from('usage_limits')
      .insert({
        organization_id: organizationId,
        monthly_call_minutes: 60,
        monthly_transcription_minutes: 60,
        monthly_extractions: 100,
        reset_date: new Date().toISOString()
      });
    return true;
  }

  // Check if within limits
  const withinLimits =
    limits.current_call_minutes < limits.monthly_call_minutes &&
    limits.current_transcription_minutes < limits.monthly_transcription_minutes &&
    limits.current_extractions < limits.monthly_extractions;

  // Check if overage is enabled
  if (!withinLimits && limits.overage_enabled) {
    console.log('[Call Processor] Organization using overage for:', organizationId);
    return true;
  }

  return withinLimits;
}

/**
 * Auto-create a load from high-confidence extraction
 */
async function createLoadFromExtraction(
  callId: string,
  organizationId: string,
  extractedData: any
) {
  const supabase = createAdminClient();

  try {
    // Get the extraction record ID
    const { data: extraction } = await supabase
      .from('extracted_freight_data')
      .select('id')
      .eq('call_id', callId)
      .single();

    if (!extraction) return;

    // Check if load already exists
    const { data: existingLoad } = await supabase
      .from('loads')
      .select('id')
      .eq('load_number', extractedData.loadNumber)
      .eq('organization_id', organizationId)
      .single();

    if (existingLoad) {
      console.log('[Call Processor] Load already exists:', extractedData.loadNumber);
      return;
    }

    // Create new load
    const { error } = await supabase
      .from('loads')
      .insert({
        organization_id: organizationId,
        extracted_data_id: extraction.id,
        load_number: extractedData.loadNumber,
        status: 'quoted',

        pickup_location: extractedData.pickup?.location,
        pickup_city: extractedData.pickup?.city,
        pickup_state: extractedData.pickup?.state,
        pickup_date: extractedData.pickup?.date,

        delivery_location: extractedData.delivery?.location,
        delivery_city: extractedData.delivery?.city,
        delivery_state: extractedData.delivery?.state,
        delivery_date: extractedData.delivery?.date,

        commodity: extractedData.commodity,
        weight_pounds: extractedData.weight,
        rate_amount: extractedData.rate,

        created_at: new Date().toISOString(),
        metadata: {
          auto_created: true,
          source_call_id: callId
        }
      });

    if (!error) {
      console.log('[Call Processor] Auto-created load:', extractedData.loadNumber);
    }
  } catch (error) {
    console.error('[Call Processor] Error auto-creating load:', error);
    // Don't fail the process if load creation fails
  }
}

/**
 * Send notification to organization
 */
async function sendNotification(
  organizationId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    callId: string;
  }
) {
  const supabase = createAdminClient();

  try {
    await supabase.from('notifications').insert({
      organization_id: organizationId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: { callId: notification.callId },
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Call Processor] Error sending notification:', error);
  }
}

/**
 * Wrapper function to enqueue call processing
 * This is for backward compatibility with existing code
 */
export async function enqueueCallProcessing(callId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get the call and organization info
  const { data: call } = await supabase
    .from('calls')
    .select('*, organization_id')
    .eq('id', callId)
    .single();

  if (!call) {
    throw new Error(`Call not found: ${callId}`);
  }

  // Trigger the processing
  await triggerCallProcessing({
    callId: call.id,
    organizationId: call.organization_id,
    recordingUrl: call.recording_url,
    recordingSid: call.recording_sid
  });
}