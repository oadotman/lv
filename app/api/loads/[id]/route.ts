/**
 * LoadVoice Load Detail API
 * Handles individual load operations (GET, PUT, DELETE)
 * Includes status workflow management and activity tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'quoted': ['booked', 'cancelled'],
  'booked': ['dispatched', 'cancelled'],
  'dispatched': ['in-transit', 'cancelled'],
  'in-transit': ['delivered', 'cancelled'],
  'delivered': [],
  'cancelled': []
};

/**
 * GET /api/loads/[id]
 * Get single load with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const adminSupabase = createAdminClient();

    // Fetch load with all related data
    const { data: load, error } = await adminSupabase
      .from('loads')
      .select(`
        *,
        carriers!left(
          id,
          carrier_name,
          mc_number,
          dot_number,
          contact_name,
          phone,
          email,
          rating,
          insurance_expiry,
          authority_status
        ),
        shippers!left(
          id,
          shipper_name,
          contact_name,
          phone,
          email,
          address,
          rating
        ),
        extracted_freight_data!left(
          id,
          transcription_id,
          extraction_confidence,
          special_requirements,
          extraction_timestamp
        ),
        load_activities!left(
          id,
          activity_type,
          description,
          user_id,
          created_at,
          metadata
        ),
        rate_confirmations!left(
          id,
          confirmation_number,
          signed_at,
          signed_by_name,
          signature_url,
          document_url
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (error || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Get associated call if load was created from extraction
    let associatedCall = null;
    if (load.extracted_freight_data?.transcription_id) {
      const { data: transcription } = await adminSupabase
        .from('call_transcriptions')
        .select('call_id')
        .eq('id', load.extracted_freight_data.transcription_id)
        .single();

      if (transcription) {
        const { data: call } = await adminSupabase
          .from('calls')
          .select('id, phone_number, duration_seconds, recording_url, created_at')
          .eq('id', transcription.call_id)
          .single();

        associatedCall = call;
      }
    }

    return NextResponse.json({
      load,
      associatedCall,
      statusTransitions: STATUS_TRANSITIONS[load.status] || []
    });

  } catch (error) {
    console.error('[Load Detail API] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/loads/[id]
 * Update load including status transitions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await request.json();
    const adminSupabase = createAdminClient();

    // Get current load to check status transitions
    const { data: currentLoad, error: fetchError } = await adminSupabase
      .from('loads')
      .select('status, load_number')
      .eq('id', params.id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (fetchError || !currentLoad) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check if status change is valid
    if (body.status && body.status !== currentLoad.status) {
      const validTransitions = STATUS_TRANSITIONS[currentLoad.status] || [];
      if (!validTransitions.includes(body.status)) {
        return NextResponse.json({
          error: `Invalid status transition from ${currentLoad.status} to ${body.status}`
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    // Only include fields that are being updated
    const updateableFields = [
      'status', 'carrier_id', 'shipper_id',
      'pickup_location', 'pickup_city', 'pickup_state', 'pickup_zip', 'pickup_date', 'pickup_time',
      'delivery_location', 'delivery_city', 'delivery_state', 'delivery_zip', 'delivery_date', 'delivery_time',
      'commodity', 'weight_pounds', 'pallet_count', 'equipment_type', 'special_requirements',
      'rate_amount', 'payment_terms'
    ];

    updateableFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Handle metadata update
    if (body.notes || body.metadata) {
      const { data: currentMeta } = await adminSupabase
        .from('loads')
        .select('metadata')
        .eq('id', params.id)
        .single();

      updateData.metadata = {
        ...(currentMeta?.metadata || {}),
        ...(body.metadata || {}),
        notes: body.notes || currentMeta?.metadata?.notes,
        last_updated_by: user.id,
        last_updated_at: new Date().toISOString()
      };
    }

    // Perform update
    const { data: updatedLoad, error: updateError } = await adminSupabase
      .from('loads')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        carriers!left(carrier_name, mc_number),
        shippers!left(shipper_name, contact_name)
      `)
      .single();

    if (updateError) {
      console.error('[Load Detail API] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log activity
    const activities: any[] = [];

    // Log status change
    if (body.status && body.status !== currentLoad.status) {
      activities.push({
        load_id: params.id,
        organization_id: userOrg.organization_id,
        user_id: user.id,
        activity_type: 'status_changed',
        description: `Status changed from ${currentLoad.status} to ${body.status}`,
        metadata: {
          old_status: currentLoad.status,
          new_status: body.status,
          reason: body.status_change_reason
        },
        created_at: new Date().toISOString()
      });

      // Special handling for delivered status
      if (body.status === 'delivered') {
        activities.push({
          load_id: params.id,
          organization_id: userOrg.organization_id,
          user_id: user.id,
          activity_type: 'delivered',
          description: `Load ${currentLoad.load_number} delivered successfully`,
          metadata: {
            delivered_date: body.delivery_date || new Date().toISOString(),
            pod_number: body.pod_number
          },
          created_at: new Date().toISOString()
        });
      }
    }

    // Log general update
    if (Object.keys(updateData).length > 2) { // More than just updated_at and updated_by
      activities.push({
        load_id: params.id,
        organization_id: userOrg.organization_id,
        user_id: user.id,
        activity_type: 'updated',
        description: `Load details updated`,
        metadata: {
          fields_updated: Object.keys(updateData).filter(k => !['updated_at', 'updated_by', 'metadata'].includes(k))
        },
        created_at: new Date().toISOString()
      });
    }

    // Insert all activities
    if (activities.length > 0) {
      await adminSupabase.from('load_activities').insert(activities);
    }

    return NextResponse.json({
      load: updatedLoad,
      message: 'Load updated successfully'
    });

  } catch (error) {
    console.error('[Load Detail API] PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loads/[id]
 * Soft delete a load (marks as deleted but keeps in database)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check role
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Only admins and owners can delete loads
    if (!['admin', 'owner'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Check if load exists and belongs to organization
    const { data: load, error: fetchError } = await adminSupabase
      .from('loads')
      .select('load_number, status, metadata')
      .eq('id', params.id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (fetchError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Don't allow deletion of delivered loads
    if (load.status === 'delivered') {
      return NextResponse.json({
        error: 'Cannot delete delivered loads. Archive them instead.'
      }, { status: 400 });
    }

    // Soft delete by marking as deleted
    const updatedMetadata = {
      ...(load.metadata || {}),
      deleted_reason: 'Manual deletion',
      deleted_from_status: load.status
    };

    const { error: deleteError } = await adminSupabase
      .from('loads')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        metadata: updatedMetadata
      })
      .eq('id', params.id);

    if (deleteError) {
      console.error('[Load Detail API] Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // Log deletion activity
    await adminSupabase.from('load_activities').insert({
      load_id: params.id,
      organization_id: userOrg.organization_id,
      user_id: user.id,
      activity_type: 'deleted',
      description: `Load ${load.load_number} deleted`,
      metadata: {
        status_at_deletion: load.status
      },
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      message: `Load ${load.load_number} deleted successfully`
    });

  } catch (error) {
    console.error('[Load Detail API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}