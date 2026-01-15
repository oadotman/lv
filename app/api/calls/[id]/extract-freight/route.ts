// =====================================================
// FREIGHT EXTRACTION API ROUTE
// Extracts structured freight broker data from transcripts using GPT-4o
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import {
  extractFreightData,
  validateFreightExtraction,
  formatForRateConfirmation,
  formatForLoadBoard,
  formatCheckCallUpdate,
  estimateTokens,
  calculateExtractionCost,
  FreightExtractionResult,
} from '@/lib/openai-freight';
import { extractRateLimiter } from '@/lib/rateLimit';
import { performanceMonitor } from '@/lib/performance/monitoring';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max for extraction

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;

    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting for expensive GPT-4 operations
    try {
      await extractRateLimiter.check(user.id);
    } catch (rateLimitError: any) {
      console.warn(`Extract rate limit exceeded for user: ${user.id}`);
      return NextResponse.json(
        { error: rateLimitError.message },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          }
        }
      );
    }

    const supabase = createServerClient();

    // Get call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Check if call is completed
    if (call.status !== 'completed') {
      return NextResponse.json(
        { error: 'Call must be transcribed first' },
        { status: 400 }
      );
    }

    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .single();

    if (transcriptError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    console.log('Starting freight data extraction for call:', callId);

    // Start performance monitoring
    const extractionMeasurement = performanceMonitor.startMeasurement('extraction_full', {
      callId,
      callType: call.call_type,
      transcriptLength: transcript.full_text.length,
    });

    // Check if extraction already exists
    const { data: existingExtraction } = await supabase
      .from('call_fields')
      .select('id')
      .eq('call_id', callId)
      .limit(1);

    if (existingExtraction && existingExtraction.length > 0) {
      console.log('Extraction already exists, re-extracting...');
      // Delete existing extraction
      await supabase.from('call_fields').delete().eq('call_id', callId);
    }

    // Update call status to extracting
    await supabase
      .from('calls')
      .update({ status: 'extracting' })
      .eq('id', callId);

    // Extract freight data using GPT-4o with performance tracking
    const aiMeasurement = performanceMonitor.startMeasurement('extraction_ai_processing', {
      callId,
      model: 'gpt-4o',
    });

    const extraction = await extractFreightData({
      transcript: transcript.full_text,
      utterances: transcript.utterances,
      speakerMapping: transcript.speaker_mapping,
      customerName: call.customer_name,
      callType: call.call_type,
      typedNotes: call.typed_notes,
    });

    aiMeasurement.end(true);

    // Validate extraction
    const validation = validateFreightExtraction(extraction);

    if (!validation.isValid) {
      console.error('Extraction validation failed:', validation.missingFields);
      // Continue anyway but log warnings
    }

    if (validation.warnings.length > 0) {
      console.warn('Extraction warnings:', validation.warnings);
    }

    // Store extracted fields based on call type
    const fieldsToStore = [];

    // Always store call type and summary
    fieldsToStore.push({
      name: 'call_type',
      value: extraction.call_type,
      type: 'select',
    });
    fieldsToStore.push({
      name: 'call_summary',
      value: extraction.call_summary,
      type: 'text',
    });

    // Store action items and issues
    if (extraction.action_items.length > 0) {
      fieldsToStore.push({
        name: 'action_items',
        value: JSON.stringify(extraction.action_items),
        type: 'json',
      });
    }

    if (extraction.issues_flagged.length > 0) {
      fieldsToStore.push({
        name: 'issues_flagged',
        value: JSON.stringify(extraction.issues_flagged),
        type: 'json',
      });
    }

    // Store lane information if present
    if (extraction.lane) {
      fieldsToStore.push({
        name: 'lane',
        value: JSON.stringify(extraction.lane),
        type: 'json',
      });
    }

    // Store data based on call type
    switch (extraction.call_type) {
      case 'shipper_call':
        if (extraction.shipper_data) {
          const shipperData = extraction.shipper_data;

          // Origin fields
          if (shipperData.origin_city) fieldsToStore.push({ name: 'origin_city', value: shipperData.origin_city, type: 'text' });
          if (shipperData.origin_state) fieldsToStore.push({ name: 'origin_state', value: shipperData.origin_state, type: 'text' });
          if (shipperData.origin_zip) fieldsToStore.push({ name: 'origin_zip', value: shipperData.origin_zip, type: 'text' });
          if (shipperData.origin_facility) fieldsToStore.push({ name: 'origin_facility', value: shipperData.origin_facility, type: 'text' });

          // Destination fields
          if (shipperData.destination_city) fieldsToStore.push({ name: 'destination_city', value: shipperData.destination_city, type: 'text' });
          if (shipperData.destination_state) fieldsToStore.push({ name: 'destination_state', value: shipperData.destination_state, type: 'text' });
          if (shipperData.destination_zip) fieldsToStore.push({ name: 'destination_zip', value: shipperData.destination_zip, type: 'text' });
          if (shipperData.destination_facility) fieldsToStore.push({ name: 'destination_facility', value: shipperData.destination_facility, type: 'text' });

          // Load details
          if (shipperData.commodity) fieldsToStore.push({ name: 'commodity', value: shipperData.commodity, type: 'text' });
          if (shipperData.weight_lbs) fieldsToStore.push({ name: 'weight_lbs', value: shipperData.weight_lbs.toString(), type: 'number' });
          if (shipperData.pallet_count) fieldsToStore.push({ name: 'pallet_count', value: shipperData.pallet_count.toString(), type: 'number' });
          if (shipperData.equipment_type) fieldsToStore.push({ name: 'equipment_type', value: shipperData.equipment_type, type: 'select' });

          // Dates and times
          if (shipperData.pickup_date) fieldsToStore.push({ name: 'pickup_date', value: shipperData.pickup_date, type: 'date' });
          if (shipperData.pickup_time) fieldsToStore.push({ name: 'pickup_time', value: shipperData.pickup_time, type: 'time' });
          if (shipperData.delivery_date) fieldsToStore.push({ name: 'delivery_date', value: shipperData.delivery_date, type: 'date' });
          if (shipperData.delivery_time) fieldsToStore.push({ name: 'delivery_time', value: shipperData.delivery_time, type: 'time' });

          // Rates and references
          if (shipperData.rate_to_shipper) fieldsToStore.push({ name: 'rate_to_shipper', value: shipperData.rate_to_shipper.toString(), type: 'number' });
          if (shipperData.reference_number) fieldsToStore.push({ name: 'reference_number', value: shipperData.reference_number, type: 'text' });
          if (shipperData.po_number) fieldsToStore.push({ name: 'po_number', value: shipperData.po_number, type: 'text' });
          if (shipperData.bol_number) fieldsToStore.push({ name: 'bol_number', value: shipperData.bol_number, type: 'text' });

          // Special requirements
          if (shipperData.special_requirements && shipperData.special_requirements.length > 0) {
            fieldsToStore.push({ name: 'special_requirements', value: JSON.stringify(shipperData.special_requirements), type: 'json' });
          }
          if (shipperData.hazmat !== null) fieldsToStore.push({ name: 'hazmat', value: shipperData.hazmat.toString(), type: 'boolean' });
          if (shipperData.team_required !== null) fieldsToStore.push({ name: 'team_required', value: shipperData.team_required.toString(), type: 'boolean' });

          // Shipper info
          if (shipperData.shipper_company) fieldsToStore.push({ name: 'shipper_company', value: shipperData.shipper_company, type: 'text' });
          if (shipperData.shipper_contact) fieldsToStore.push({ name: 'shipper_contact', value: shipperData.shipper_contact, type: 'text' });
          if (shipperData.shipper_phone) fieldsToStore.push({ name: 'shipper_phone', value: shipperData.shipper_phone, type: 'text' });
        }
        break;

      case 'carrier_call':
        if (extraction.carrier_data) {
          const carrierData = extraction.carrier_data;

          // Carrier info
          if (carrierData.carrier_name) fieldsToStore.push({ name: 'carrier_name', value: carrierData.carrier_name, type: 'text' });
          if (carrierData.mc_number) fieldsToStore.push({ name: 'mc_number', value: carrierData.mc_number, type: 'text' });
          if (carrierData.dot_number) fieldsToStore.push({ name: 'dot_number', value: carrierData.dot_number, type: 'text' });

          // Driver info
          if (carrierData.driver_name) fieldsToStore.push({ name: 'driver_name', value: carrierData.driver_name, type: 'text' });
          if (carrierData.driver_phone) fieldsToStore.push({ name: 'driver_phone', value: carrierData.driver_phone, type: 'text' });
          if (carrierData.truck_number) fieldsToStore.push({ name: 'truck_number', value: carrierData.truck_number, type: 'text' });
          if (carrierData.trailer_number) fieldsToStore.push({ name: 'trailer_number', value: carrierData.trailer_number, type: 'text' });

          // Rate info
          if (carrierData.rate_to_carrier) fieldsToStore.push({ name: 'rate_to_carrier', value: carrierData.rate_to_carrier.toString(), type: 'number' });
          if (carrierData.fuel_surcharge) fieldsToStore.push({ name: 'fuel_surcharge', value: carrierData.fuel_surcharge.toString(), type: 'number' });
          if (carrierData.detention_rate) fieldsToStore.push({ name: 'detention_rate', value: carrierData.detention_rate.toString(), type: 'number' });

          // Dispatcher info
          if (carrierData.primary_contact) fieldsToStore.push({ name: 'primary_contact', value: carrierData.primary_contact, type: 'text' });
          if (carrierData.dispatch_phone) fieldsToStore.push({ name: 'dispatch_phone', value: carrierData.dispatch_phone, type: 'text' });

          // ETAs
          if (carrierData.eta_pickup) fieldsToStore.push({ name: 'eta_pickup', value: carrierData.eta_pickup, type: 'text' });
          if (carrierData.eta_delivery) fieldsToStore.push({ name: 'eta_delivery', value: carrierData.eta_delivery, type: 'text' });
        }
        break;

      case 'check_call':
        if (extraction.check_call_data) {
          const checkData = extraction.check_call_data;

          // Current location
          if (checkData.current_location) fieldsToStore.push({ name: 'current_location', value: checkData.current_location, type: 'text' });
          if (checkData.current_city) fieldsToStore.push({ name: 'current_city', value: checkData.current_city, type: 'text' });
          if (checkData.current_state) fieldsToStore.push({ name: 'current_state', value: checkData.current_state, type: 'text' });
          if (checkData.miles_out) fieldsToStore.push({ name: 'miles_out', value: checkData.miles_out.toString(), type: 'number' });

          // ETA updates
          if (checkData.eta_update) fieldsToStore.push({ name: 'eta_update', value: checkData.eta_update, type: 'text' });
          if (checkData.revised_delivery_eta) fieldsToStore.push({ name: 'revised_delivery_eta', value: checkData.revised_delivery_eta, type: 'text' });

          // Issues
          if (checkData.issues_reported && checkData.issues_reported.length > 0) {
            fieldsToStore.push({ name: 'issues_reported', value: JSON.stringify(checkData.issues_reported), type: 'json' });
          }
          if (checkData.delay_reason) fieldsToStore.push({ name: 'delay_reason', value: checkData.delay_reason, type: 'text' });
          if (checkData.breakdown !== null) fieldsToStore.push({ name: 'breakdown', value: checkData.breakdown.toString(), type: 'boolean' });
          if (checkData.weather_delay !== null) fieldsToStore.push({ name: 'weather_delay', value: checkData.weather_delay.toString(), type: 'boolean' });

          // Timestamp
          if (checkData.timestamp) fieldsToStore.push({ name: 'check_call_timestamp', value: checkData.timestamp, type: 'timestamp' });
        }
        break;
    }

    // Insert fields into database
    const { error: fieldsError } = await supabase.from('call_fields').insert(
      fieldsToStore.map((field) => ({
        call_id: callId,
        field_name: field.name,
        field_value: field.value,
        field_type: field.type,
        confidence: extraction.confidence_score || 0.9,
        extracted_by: 'gpt-4o-freight',
      }))
    );

    if (fieldsError) {
      console.error('Error storing freight fields:', fieldsError);
      throw fieldsError;
    }

    // Generate freight outputs in different formats
    const freightOutputs = {
      rate_confirmation: formatForRateConfirmation(extraction),
      load_board: formatForLoadBoard(extraction),
      check_call_update: formatCheckCallUpdate(extraction),
      raw_json: JSON.stringify(extraction, null, 2),
    };

    // Store freight outputs
    await supabase
      .from('calls')
      .update({
        status: 'completed',
        crm_outputs: freightOutputs,
        extraction_completed_at: new Date().toISOString(),
        call_type: extraction.call_type, // Update call type based on extraction
      })
      .eq('id', callId);

    // Calculate and record token usage
    const inputTokens = estimateTokens(transcript.full_text);
    const outputTokens = estimateTokens(JSON.stringify(extraction));
    const costUsd = calculateExtractionCost(inputTokens, outputTokens);
    const costCents = Math.round(costUsd * 100);

    await supabase.from('usage_metrics').insert({
      user_id: user.id,
      organization_id: call.organization_id,
      metric_type: 'extraction_processed',
      metric_value: 1,
      call_id: callId,
      cost_cents: costCents,
      metadata: {
        provider: 'openai',
        model: 'gpt-4o',
        extraction_type: 'freight',
        call_type: extraction.call_type,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    });

    // Send notification
    const notificationMessage = () => {
      switch (extraction.call_type) {
        case 'shipper_call':
          const lane = extraction.lane;
          return `Load extracted: ${lane ? `${lane.origin} → ${lane.destination}` : 'New load'}`;
        case 'carrier_call':
          return `Carrier booked: ${extraction.carrier_data?.carrier_name || 'Carrier'} (MC# ${extraction.carrier_data?.mc_number || 'Unknown'})`;
        case 'check_call':
          return `Check call update: ${extraction.check_call_data?.current_location || 'Status update received'}`;
        default:
          return 'Call data extracted successfully';
      }
    };

    await supabase.from('notifications').insert({
      user_id: user.id,
      notification_type: 'extraction_completed',
      title: 'Freight data extracted',
      message: notificationMessage(),
      link: `/calls/${callId}`,
      call_id: callId,
    });

    // End performance monitoring
    const totalDuration = extractionMeasurement.end(true);

    console.log('Freight extraction completed successfully:', {
      callId,
      callType: extraction.call_type,
      fieldsCount: fieldsToStore.length,
      costCents,
      durationMs: totalDuration,
      withinTarget: totalDuration < 60000,
    });

    return NextResponse.json({
      success: true,
      extraction: {
        call_type: extraction.call_type,
        call_summary: extraction.call_summary,
        confidence_score: extraction.confidence_score,
        fieldsExtracted: fieldsToStore.length,
        has_shipper_data: !!extraction.shipper_data,
        has_carrier_data: !!extraction.carrier_data,
        has_check_data: !!extraction.check_call_data,
      },
      freightOutputs,
      validation,
      cost: {
        cents: costCents,
        usd: costUsd,
      },
    });
  } catch (error) {
    console.error('Freight extraction error:', error);

    // Update call status to failed
    try {
      const supabase = createServerClient();
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          extraction_error: error instanceof Error ? error.message : 'Extraction failed',
        })
        .eq('id', params.id);
    } catch (updateError) {
      console.error('Error updating call status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check extraction status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get call with fields
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, status, extraction_completed_at, crm_outputs, call_type')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Get extracted fields count
    const { data: fields, error: fieldsError } = await supabase
      .from('call_fields')
      .select('id, field_name')
      .eq('call_id', params.id);

    // Determine what type of data was extracted
    const hasShipperData = fields?.some(f =>
      ['origin_city', 'destination_city', 'commodity', 'equipment_type'].includes(f.field_name)
    );
    const hasCarrierData = fields?.some(f =>
      ['carrier_name', 'mc_number', 'driver_name'].includes(f.field_name)
    );
    const hasCheckData = fields?.some(f =>
      ['current_location', 'eta_update', 'miles_out'].includes(f.field_name)
    );

    return NextResponse.json({
      callId: call.id,
      status: call.status,
      callType: call.call_type,
      extractionCompleted: !!call.extraction_completed_at,
      extractionCompletedAt: call.extraction_completed_at,
      fieldsCount: fields?.length || 0,
      hasFreightOutputs: !!call.crm_outputs,
      dataTypes: {
        shipper: hasShipperData,
        carrier: hasCarrierData,
        checkCall: hasCheckData,
      },
    });
  } catch (error) {
    console.error('Get extraction status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}