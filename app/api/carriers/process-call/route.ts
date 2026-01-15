import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { carrierCallProcessingHook } from '@/lib/carriers/callProcessingHook';

/**
 * API endpoint to process a call and populate carrier database
 * POST /api/carriers/process-call
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { callId, organizationId } = await request.json();

    if (!callId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get call extraction data
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, extraction_data')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    if (!call.extraction_data) {
      return NextResponse.json(
        { error: 'No extraction data available for this call' },
        { status: 400 }
      );
    }

    // Process the call
    const result = await carrierCallProcessingHook.processCall(
      callId,
      call.extraction_data,
      organizationId
    );

    return NextResponse.json({
      success: result.success,
      data: {
        carrierId: result.carrierId,
        loadId: result.loadId,
        message: result.message,
        statistics: result.statistics,
      },
    });
  } catch (error) {
    console.error('Error processing carrier call:', error);
    return NextResponse.json(
      { error: 'Failed to process call' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check carrier processing status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId parameter' },
        { status: 400 }
      );
    }

    // Get call processing status
    const { data: call, error } = await supabase
      .from('calls')
      .select('processing_status, processing_notes, carrier_id, load_id')
      .eq('id', callId)
      .single();

    if (error || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // If carrier was extracted, get carrier details
    let carrier = null;
    if (call.carrier_id) {
      const { data: carrierData } = await supabase
        .from('carriers')
        .select('id, name, mc_number, performance_score')
        .eq('id', call.carrier_id)
        .single();

      carrier = carrierData;
    }

    return NextResponse.json({
      status: call.processing_status,
      notes: call.processing_notes,
      carrier,
      loadId: call.load_id,
    });
  } catch (error) {
    console.error('Error checking processing status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}