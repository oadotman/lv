/**
 * LoadVoice Extraction to CRM Save API
 * Saves extracted data to loads, carriers, and shippers with auto-population
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Parse request body
    const { extractionData, callId } = await request.json();

    if (!extractionData || !callId) {
      return NextResponse.json({ error: 'Missing extraction data or call ID' }, { status: 400 });
    }

    const organizationId = userOrg.organization_id;
    let loadId = null;
    let carrierId = null;
    let shipperId = null;

    // Start a transaction-like operation
    try {
      // 1. Handle Shipper Data (if present)
      if (extractionData.data?.shipper?.shipper_name) {
        const shipperData = extractionData.data.shipper;

        // Check if shipper exists (by name for now, could enhance with fuzzy matching)
        const { data: existingShipper } = await supabase
          .from('shippers')
          .select('id')
          .eq('organization_id', organizationId)
          .ilike('shipper_name', shipperData.shipper_name)
          .single();

        if (existingShipper) {
          shipperId = existingShipper.id;

          // Update shipper with new info if provided
          await supabase
            .from('shippers')
            .update({
              contact_name: shipperData.shipper_contact || undefined,
              phone: shipperData.shipper_phone || undefined,
              email: shipperData.shipper_email || undefined,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            })
            .eq('id', shipperId);
        } else {
          // Create new shipper
          const { data: newShipper } = await supabase
            .from('shippers')
            .insert({
              organization_id: organizationId,
              shipper_name: shipperData.shipper_name,
              contact_name: shipperData.shipper_contact,
              phone: shipperData.shipper_phone,
              email: shipperData.shipper_email,
              auto_created: true,
              source_call_ids: [callId],
              created_by: user.id,
              updated_by: user.id
            })
            .select()
            .single();

          if (newShipper) {
            shipperId = newShipper.id;
          }
        }
      }

      // 2. Handle Carrier Data (if present)
      if (extractionData.data?.carrier) {
        const carrierData = extractionData.data.carrier;

        // Check if carrier exists by MC number
        let existingCarrier = null;
        if (carrierData.mc_number) {
          const { data } = await supabase
            .from('carriers')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('mc_number', carrierData.mc_number)
            .single();
          existingCarrier = data;
        }

        if (existingCarrier) {
          carrierId = existingCarrier.id;

          // Update carrier with new info
          const updates: any = {
            updated_at: new Date().toISOString(),
            updated_by: user.id
          };

          if (carrierData.primary_contact) updates.primary_contact = carrierData.primary_contact;
          if (carrierData.dispatch_phone) updates.dispatch_phone = carrierData.dispatch_phone;
          if (carrierData.driver_name) updates.driver_name = carrierData.driver_name;
          if (carrierData.driver_phone) updates.driver_phone = carrierData.driver_phone;
          if (extractionData.data.equipment?.equipment_type) {
            updates.equipment_types = [extractionData.data.equipment.equipment_type];
          }

          await supabase
            .from('carriers')
            .update(updates)
            .eq('id', carrierId);
        } else {
          // Create new carrier
          const { data: newCarrier } = await supabase
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
              equipment_types: extractionData.data.equipment?.equipment_type ? [extractionData.data.equipment.equipment_type] : [],
              auto_created: true,
              source_call_ids: [callId],
              created_by: user.id,
              updated_by: user.id
            })
            .select()
            .single();

          if (newCarrier) {
            carrierId = newCarrier.id;
          }
        }
      }

      // 3. Create Load (if load data present)
      if (extractionData.data?.load) {
        const loadData = extractionData.data.load;

        // Prepare load data
        const newLoadData: any = {
          organization_id: organizationId,
          origin_city: loadData.origin_city,
          origin_state: loadData.origin_state,
          origin_zip: loadData.origin_zip,
          origin_address: loadData.origin_address,
          destination_city: loadData.destination_city,
          destination_state: loadData.destination_state,
          destination_zip: loadData.destination_zip,
          destination_address: loadData.destination_address,
          commodity: loadData.commodity,
          weight_lbs: loadData.weight_lbs,
          pallet_count: loadData.pallet_count,
          equipment_type: loadData.equipment_type,
          special_requirements: loadData.special_requirements,
          pickup_date: loadData.pickup_date,
          pickup_time: loadData.pickup_time,
          pickup_window_start: loadData.pickup_window_start,
          pickup_window_end: loadData.pickup_window_end,
          delivery_date: loadData.delivery_date,
          delivery_time: loadData.delivery_time,
          delivery_window_start: loadData.delivery_window_start,
          delivery_window_end: loadData.delivery_window_end,
          shipper_rate: loadData.shipper_rate,
          reference_number: loadData.reference_number,
          source_call_id: callId,
          shipper_id: shipperId,
          carrier_id: carrierId,
          created_by: user.id,
          updated_by: user.id,
          status: carrierId ? 'dispatched' : 'needs_carrier' // Auto-set status based on carrier assignment
        };

        // Add carrier rate if available
        if (extractionData.data.rate?.carrier_rate) {
          newLoadData.carrier_rate = extractionData.data.rate.carrier_rate;
        }

        const { data: newLoad, error: loadError } = await supabase
          .from('loads')
          .insert(newLoadData)
          .select()
          .single();

        if (loadError) {
          throw loadError;
        }

        loadId = newLoad.id;
      }

      // 4. Create extraction mapping record
      const { data: mapping, error: mappingError } = await supabase
        .from('extraction_mappings')
        .insert({
          organization_id: organizationId,
          call_id: callId,
          extraction_type: extractionData.extraction_type || 'unknown',
          load_id: loadId,
          carrier_id: carrierId,
          shipper_id: shipperId,
          extracted_data: extractionData,
          confidence_scores: extractionData.confidence || {},
          status: 'saved',
          saved_at: new Date().toISOString(),
          saved_by: user.id
        })
        .select()
        .single();

      if (mappingError) {
        throw mappingError;
      }

      // 5. Update the extraction inbox if this call was in the inbox
      await supabase
        .from('extraction_inbox')
        .update({
          status: 'saved',
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('call_id', callId)
        .eq('organization_id', organizationId);

      // 6. Return the created/updated entities
      const response: any = {
        success: true,
        message: 'Extraction saved to CRM successfully',
        entities: {
          loadId,
          carrierId,
          shipperId,
          mappingId: mapping.id
        }
      };

      // Fetch the created entities for the response
      if (loadId) {
        const { data: load } = await supabase
          .from('loads')
          .select('*, carrier:carriers(*), shipper:shippers(*)')
          .eq('id', loadId)
          .single();
        response.load = load;
      }

      if (carrierId && !loadId) {
        const { data: carrier } = await supabase
          .from('carriers')
          .select('*')
          .eq('id', carrierId)
          .single();
        response.carrier = carrier;
      }

      if (shipperId && !loadId) {
        const { data: shipper } = await supabase
          .from('shippers')
          .select('*')
          .eq('id', shipperId)
          .single();
        response.shipper = shipper;
      }

      return NextResponse.json(response, { status: 201 });

    } catch (dbError) {
      console.error('Database error in save-to-CRM:', dbError);
      return NextResponse.json({
        error: 'Failed to save extraction to CRM',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/extraction/save-to-crm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}