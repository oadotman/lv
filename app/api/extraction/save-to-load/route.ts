/**
 * Save Extraction to Load API Endpoint
 * Creates Load, Carrier, and Shipper records from extraction data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const organizationId = profile.organization_id;
    const body = await req.json();
    const { extraction, callId } = body;

    if (!extraction || !extraction.data) {
      return NextResponse.json({ error: 'Invalid extraction data' }, { status: 400 });
    }

    const { callType, data } = extraction;

    // Begin transaction-like operation
    let shipperId = null;
    let carrierId = null;
    let loadId = null;

    try {
      // 1. Handle Shipper Data
      if (data.shipper) {
        const shipperData = data.shipper;

        // Check if shipper exists by name (fuzzy match)
        const { data: existingShippers } = await supabase
          .from('shippers')
          .select('*')
          .eq('organization_id', organizationId)
          .ilike('name', `%${shipperData.shipper_name || shipperData.name}%`);

        if (existingShippers && existingShippers.length > 0) {
          // Update existing shipper
          shipperId = existingShippers[0].id;
          await supabase
            .from('shippers')
            .update({
              contact_name: shipperData.contact_name || existingShippers[0].contact_name,
              phone: shipperData.phone || existingShippers[0].phone,
              email: shipperData.email || existingShippers[0].email,
              address: shipperData.address || existingShippers[0].address,
              updated_at: new Date().toISOString()
            })
            .eq('id', shipperId);
        } else {
          // Create new shipper
          const { data: newShipper, error: shipperError } = await supabase
            .from('shippers')
            .insert({
              organization_id: organizationId,
              name: shipperData.shipper_name || shipperData.name || 'Unknown Shipper',
              contact_name: shipperData.contact_name,
              phone: shipperData.phone,
              email: shipperData.email,
              address: shipperData.address,
              auto_created: true,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (shipperError) throw shipperError;
          shipperId = newShipper.id;
        }
      }

      // 2. Handle Carrier Data
      if (data.carrier) {
        const carrierData = data.carrier;

        // Check if carrier exists by MC number
        if (carrierData.mc_number) {
          const { data: existingCarriers } = await supabase
            .from('carriers')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('mc_number', carrierData.mc_number);

          if (existingCarriers && existingCarriers.length > 0) {
            // Update existing carrier
            carrierId = existingCarriers[0].id;
            await supabase
              .from('carriers')
              .update({
                contact_name: carrierData.primary_contact || carrierData.contact_name || existingCarriers[0].contact_name,
                phone: carrierData.dispatch_phone || carrierData.phone || existingCarriers[0].phone,
                email: carrierData.dispatch_email || carrierData.email || existingCarriers[0].email,
                driver_name: carrierData.driver_name || existingCarriers[0].driver_name,
                driver_phone: carrierData.driver_phone || existingCarriers[0].driver_phone,
                dot_number: carrierData.dot_number || existingCarriers[0].dot_number,
                updated_at: new Date().toISOString()
              })
              .eq('id', carrierId);
          } else {
            // Create new carrier
            const { data: newCarrier, error: carrierError } = await supabase
              .from('carriers')
              .insert({
                organization_id: organizationId,
                company_name: carrierData.carrier_name || carrierData.name || 'Unknown Carrier',
                mc_number: carrierData.mc_number,
                dot_number: carrierData.dot_number,
                contact_name: carrierData.primary_contact || carrierData.contact_name,
                phone: carrierData.dispatch_phone || carrierData.phone,
                email: carrierData.dispatch_email || carrierData.email,
                driver_name: carrierData.driver_name,
                driver_phone: carrierData.driver_phone,
                equipment_types: carrierData.equipment_types || [],
                auto_created: true,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (carrierError) throw carrierError;
            carrierId = newCarrier.id;

            // Trigger FMCSA verification for new carrier
            if (carrierData.mc_number || carrierData.dot_number) {
              try {
                const { verifyCarrier } = await import('@/lib/services/fmcsa-verification');
                const mc = carrierData.mc_number?.replace(/^MC-?/i, '').replace(/\D/g, '');
                const dot = carrierData.dot_number?.replace(/^DOT-?/i, '').replace(/\D/g, '');

                const verification = await verifyCarrier(mc, dot, false);

                if (verification.verified) {
                  const verificationStatus =
                    verification.riskLevel === 'LOW' ? 'VERIFIED_LOW_RISK' :
                    verification.riskLevel === 'MEDIUM' ? 'VERIFIED_MEDIUM_RISK' :
                    'VERIFIED_HIGH_RISK';

                  // Update carrier with verification status
                  await supabase
                    .from('carriers')
                    .update({
                      last_verification_date: new Date().toISOString(),
                      verification_status: verificationStatus,
                      verification_warnings: verification.warnings,
                    })
                    .eq('id', carrierId);
                }
              } catch (verifyError) {
                // Log but don't fail the request
                console.error('Carrier verification failed:', verifyError);
              }
            }
          }
        } else {
          // Create carrier without MC number (based on name)
          const { data: newCarrier, error: carrierError } = await supabase
            .from('carriers')
            .insert({
              organization_id: organizationId,
              company_name: carrierData.carrier_name || carrierData.name || 'Unknown Carrier',
              contact_name: carrierData.primary_contact || carrierData.contact_name,
              phone: carrierData.dispatch_phone || carrierData.phone,
              email: carrierData.dispatch_email || carrierData.email,
              driver_name: carrierData.driver_name,
              driver_phone: carrierData.driver_phone,
              auto_created: true,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (carrierError) throw carrierError;
          carrierId = newCarrier.id;
        }
      }

      // 3. Create Load Record
      if (data.load) {
        const loadData = data.load;

        // Generate load number
        const loadNumber = `LD-${Date.now().toString().slice(-8)}`;

        // Determine initial status
        let status = 'needs_carrier';
        if (carrierId) {
          status = 'dispatched';
        }

        // Calculate margin if both rates exist
        let margin = null;
        if (data.rate?.shipper_rate && data.rate?.carrier_rate) {
          margin = data.rate.shipper_rate - data.rate.carrier_rate;
        }

        const { data: newLoad, error: loadError } = await supabase
          .from('loads')
          .insert({
            organization_id: organizationId,
            load_number: loadNumber,
            status,
            shipper_id: shipperId,
            carrier_id: carrierId,

            // Location data
            pickup_city: loadData.origin_city || loadData.pickup_city,
            pickup_state: loadData.origin_state || loadData.pickup_state,
            pickup_address: loadData.pickup_address || loadData.origin_address,
            delivery_city: loadData.destination_city || loadData.delivery_city,
            delivery_state: loadData.destination_state || loadData.delivery_state,
            delivery_address: loadData.delivery_address || loadData.destination_address,

            // Dates
            pickup_date: loadData.pickup_date,
            pickup_time: loadData.pickup_time,
            delivery_date: loadData.delivery_date,
            delivery_time: loadData.delivery_time,

            // Shipment details
            commodity: loadData.commodity,
            weight: loadData.weight_lbs || loadData.weight,
            equipment_type: loadData.equipment_type,
            special_instructions: loadData.special_requirements || loadData.special_instructions,
            reference_number: loadData.reference_number,

            // Rates
            rate: data.rate?.shipper_rate,
            carrier_rate: data.rate?.carrier_rate,
            margin,

            // Metadata
            source_call_id: callId,
            created_at: new Date().toISOString(),
            created_by: session.user.id
          })
          .select()
          .single();

        if (loadError) throw loadError;
        loadId = newLoad.id;

        // 4. Create extraction mapping for tracking
        await supabase
          .from('extraction_mappings')
          .insert({
            organization_id: organizationId,
            call_id: callId,
            load_id: loadId,
            carrier_id: carrierId,
            shipper_id: shipperId,
            extraction_data: extraction,
            created_at: new Date().toISOString()
          });

        // 5. Update extraction inbox status if exists
        if (callId) {
          await supabase
            .from('extraction_inbox')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString(),
              load_id: loadId
            })
            .eq('id', callId)
            .eq('organization_id', organizationId);
        }

        // 6. Return complete load with relationships
        const { data: completeLoad } = await supabase
          .from('loads')
          .select(`
            *,
            shippers (
              id,
              name,
              contact_name,
              phone,
              email
            ),
            carriers (
              id,
              company_name,
              mc_number,
              contact_name,
              phone,
              email,
              driver_name,
              driver_phone
            )
          `)
          .eq('id', loadId)
          .single();

        return NextResponse.json({
          success: true,
          load: completeLoad,
          message: 'Extraction saved successfully',
          created: {
            loadId,
            shipperId,
            carrierId
          }
        });
      } else {
        // No load data, just return created entities
        return NextResponse.json({
          success: true,
          message: 'Entities created successfully',
          created: {
            shipperId,
            carrierId
          }
        });
      }

    } catch (innerError: any) {
      console.error('Error in save-to-load transaction:', innerError);

      // Attempt cleanup if partial success
      if (loadId) {
        await supabase.from('loads').delete().eq('id', loadId);
      }

      throw innerError;
    }

  } catch (error: any) {
    console.error('Error saving extraction to load:', error);
    return NextResponse.json(
      {
        error: 'Failed to save extraction',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if extraction has been saved
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get call ID from query params
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json({ error: 'Call ID required' }, { status: 400 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Check if extraction has been saved
    const { data: mapping } = await supabase
      .from('extraction_mappings')
      .select(`
        *,
        loads (*)
      `)
      .eq('call_id', callId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (mapping) {
      return NextResponse.json({
        saved: true,
        loadId: mapping.load_id,
        load: mapping.loads
      });
    } else {
      return NextResponse.json({
        saved: false
      });
    }

  } catch (error: any) {
    console.error('Error checking extraction status:', error);
    return NextResponse.json(
      { error: 'Failed to check extraction status' },
      { status: 500 }
    );
  }
}