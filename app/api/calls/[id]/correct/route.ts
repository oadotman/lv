/**
 * API endpoint for correcting extracted fields
 * Logs corrections for AI improvement and updates the field value
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/calls/[id]/correct
 * Correct an extracted field value
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  try {
    // Authenticate user
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get correction data
    const body = await req.json();
    const {
      field_name,
      original_value,
      corrected_value,
      field_type = 'text',
      call_type,
    } = body;

    if (!field_name || corrected_value === undefined) {
      return NextResponse.json(
        { error: 'field_name and corrected_value are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id, organization_id, call_type')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if user owns the call or is in the organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', call.organization_id)
      .single();

    if (call.user_id !== user.id && !userOrg) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Log the correction using the database function
    const { data: result, error: correctionError } = await supabase
      .rpc('log_field_correction', {
        p_call_id: callId,
        p_field_name: field_name,
        p_original_value: original_value || null,
        p_corrected_value: corrected_value,
        p_field_type: field_type,
        p_call_type: call_type || call.call_type || 'unknown'
      });

    if (correctionError) {
      console.error('Correction error:', correctionError);
      return NextResponse.json(
        { error: 'Failed to save correction' },
        { status: 500 }
      );
    }

    // Log for analytics
    console.log(`Field correction logged:`, {
      call_id: callId,
      field_name,
      original_value,
      corrected_value,
      user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Field corrected successfully',
      correction_id: result?.correction_id,
    });

  } catch (error) {
    console.error('Field correction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calls/[id]/correct
 * Get correction history for a call
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get corrections for this call
    const { data: corrections, error } = await supabase
      .from('extraction_corrections')
      .select(`
        *,
        corrected_by_user:users!corrected_by(
          id,
          full_name,
          email
        )
      `)
      .eq('call_id', callId)
      .order('corrected_at', { ascending: false });

    if (error) {
      console.error('Error fetching corrections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch corrections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      corrections: corrections || [],
      total: corrections?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}