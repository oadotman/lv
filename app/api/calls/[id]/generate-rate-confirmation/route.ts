import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to generate a rate confirmation directly from a call
 * This streamlines the process: Call → Load → Rate Confirmation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const callId = params.id;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { extractedData, overrides } = body;

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = userOrg.organization_id;

    // Step 1: Check if a load already exists for this call
    const { data: existingMapping } = await supabase
      .from('extraction_mappings')
      .select('load_id')
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .single();

    let loadId = existingMapping?.load_id;

    // Step 2: If no load exists, create one from extraction data
    if (!loadId) {
      // Merge extracted data with any overrides
      const finalData = {
        ...extractedData,
        ...overrides,
      };

      // Create or find carrier
      let carrierId = null;
      if (finalData.carrier) {
        const carrierData = finalData.carrier;

        // Try to find existing carrier by MC number
        if (carrierData.mc_number) {
          const { data: existingCarrier } = await supabase
            .from('carriers')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('mc_number', carrierData.mc_number)
            .single();

          if (existingCarrier) {
            carrierId = existingCarrier.id;

            // Update carrier with any new info
            await supabase
              .from('carriers')
              .update({
                carrier_name: carrierData.carrier_name || undefined,
                primary_contact: carrierData.primary_contact || undefined,
                dispatch_phone: carrierData.dispatch_phone || undefined,
                dispatch_email: carrierData.dispatch_email || undefined,
                dot_number: carrierData.dot_number || undefined,
                updated_at: new Date().toISOString(),
              })
              .eq('id', carrierId);
          }
        }

        // Create new carrier if not found
        if (!carrierId) {
          const { data: newCarrier, error: carrierError } = await supabase
            .from('carriers')
            .insert({
              organization_id: organizationId,
              carrier_name: carrierData.carrier_name || 'Unknown Carrier',
              mc_number: carrierData.mc_number,
              dot_number: carrierData.dot_number,
              primary_contact: carrierData.primary_contact,
              dispatch_phone: carrierData.dispatch_phone,
              dispatch_email: carrierData.dispatch_email,
              driver_name: carrierData.driver_name,
              driver_phone: carrierData.driver_phone,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (carrierError) {
            console.error('Error creating carrier:', carrierError);
            return NextResponse.json({ error: 'Failed to create carrier' }, { status: 500 });
          }

          carrierId = newCarrier.id;
        }
      }

      // Create the load
      const loadNumber = `LD-${Date.now().toString().slice(-8)}`;

      const { data: newLoad, error: loadError } = await supabase
        .from('loads')
        .insert({
          organization_id: organizationId,
          load_number: loadNumber,
          status: carrierId ? 'dispatched' : 'needs_carrier',
          carrier_id: carrierId,
          source_call_id: callId,

          // Location data
          origin_city: finalData.load?.origin_city,
          origin_state: finalData.load?.origin_state,
          destination_city: finalData.load?.destination_city,
          destination_state: finalData.load?.destination_state,

          // Dates
          pickup_date: finalData.load?.pickup_date,
          delivery_date: finalData.load?.delivery_date,

          // Details
          commodity: finalData.load?.commodity,
          weight: finalData.load?.weight,
          equipment_type: finalData.load?.equipment_type || 'Dry Van',
          reference_number: finalData.load?.reference_number,

          // Rates
          carrier_rate: finalData.rate?.carrier_rate,
          shipper_rate: finalData.rate?.shipper_rate,

          created_at: new Date().toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (loadError) {
        console.error('Error creating load:', loadError);
        return NextResponse.json({ error: 'Failed to create load' }, { status: 500 });
      }

      loadId = newLoad.id;

      // Create extraction mapping
      await supabase
        .from('extraction_mappings')
        .insert({
          organization_id: organizationId,
          call_id: callId,
          load_id: loadId,
          carrier_id: carrierId,
          extraction_data: finalData,
          created_at: new Date().toISOString(),
        });
    }

    // Step 3: Generate the rate confirmation
    const rateConResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/rate-confirmations/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ load_id: loadId }),
      }
    );

    if (!rateConResponse.ok) {
      const error = await rateConResponse.json();
      return NextResponse.json(
        { error: error.details || 'Failed to generate rate confirmation' },
        { status: rateConResponse.status }
      );
    }

    const rateConResult = await rateConResponse.json();

    // Step 4: Update call status to indicate rate confirmation was generated
    // First get the existing metadata
    const { data: existingCall } = await supabase
      .from('calls')
      .select('metadata')
      .eq('id', callId)
      .single();

    const updatedMetadata = {
      ...(existingCall?.metadata || {}),
      rate_confirmation_generated: true,
      rate_confirmation_id: rateConResult.rate_confirmation?.id
    };

    await supabase
      .from('calls')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    return NextResponse.json({
      success: true,
      load_id: loadId,
      rate_confirmation: rateConResult.rate_confirmation,
      message: 'Rate confirmation generated successfully from call',
    });

  } catch (error) {
    console.error('Error in call-to-rate-confirmation flow:', error);
    return NextResponse.json(
      { error: 'Failed to generate rate confirmation from call' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if rate confirmation exists for a call
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const callId = params.id;

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
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if extraction mapping exists for this call
    const { data: mapping } = await supabase
      .from('extraction_mappings')
      .select(`
        load_id,
        loads (
          id,
          load_number,
          rate_confirmation_id,
          rate_confirmations (
            id,
            rate_con_number,
            pdf_url,
            status,
            created_at
          )
        )
      `)
      .eq('call_id', callId)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (!mapping || !mapping.loads) {
      return NextResponse.json({
        has_rate_confirmation: false,
        message: 'No load or rate confirmation found for this call',
      });
    }

    const load = mapping.loads[0]; // loads is an array, get first element
    const rateConfirmation = load?.rate_confirmations?.[0];

    return NextResponse.json({
      has_rate_confirmation: !!rateConfirmation,
      load_id: load?.id,
      load_number: load?.load_number,
      rate_confirmation: rateConfirmation || null,
    });

  } catch (error) {
    console.error('Error checking rate confirmation status:', error);
    return NextResponse.json(
      { error: 'Failed to check rate confirmation status' },
      { status: 500 }
    );
  }
}