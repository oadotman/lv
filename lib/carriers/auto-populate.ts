import { createClient } from '@/lib/supabase/server'

interface CarrierData {
  mc_number?: string
  dot_number?: string
  company_name?: string
  contact_name?: string
  phone?: string
  email?: string
  equipment_type?: string
}

interface ShipperData {
  name?: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  facility_hours?: string
}

/**
 * Auto-populate carrier from extraction data
 * Matches by MC number first, then by company name
 */
export async function autoPopulateCarrier(
  carrierData: CarrierData,
  organizationId: string
): Promise<{ carrierId: string | null; isNew: boolean }> {
  const supabase = createClient()

  try {
    // First, try to match by MC number if provided
    if (carrierData.mc_number) {
      const { data: existingCarrier } = await supabase
        .from('carriers')
        .select('id, total_loads')
        .eq('organization_id', organizationId)
        .eq('mc_number', carrierData.mc_number)
        .single()

      if (existingCarrier) {
        // Update carrier with new information if provided
        const updates: any = {
          updated_at: new Date().toISOString(),
          total_loads: (existingCarrier.total_loads || 0) + 1,
        }

        // Only update fields if they're provided and not already set
        if (carrierData.contact_name) updates.contact_name = carrierData.contact_name
        if (carrierData.phone) updates.phone = carrierData.phone
        if (carrierData.email) updates.email = carrierData.email

        await supabase
          .from('carriers')
          .update(updates)
          .eq('id', existingCarrier.id)

        return { carrierId: existingCarrier.id, isNew: false }
      }
    }

    // Try to match by company name if no MC match
    if (carrierData.company_name) {
      const { data: existingCarrier } = await supabase
        .from('carriers')
        .select('id, total_loads')
        .eq('organization_id', organizationId)
        .ilike('company_name', carrierData.company_name)
        .single()

      if (existingCarrier) {
        // Update with MC number if we have it
        const updates: any = {
          updated_at: new Date().toISOString(),
          total_loads: (existingCarrier.total_loads || 0) + 1,
        }

        if (carrierData.mc_number) updates.mc_number = carrierData.mc_number
        if (carrierData.dot_number) updates.dot_number = carrierData.dot_number
        if (carrierData.contact_name) updates.contact_name = carrierData.contact_name
        if (carrierData.phone) updates.phone = carrierData.phone
        if (carrierData.email) updates.email = carrierData.email

        await supabase
          .from('carriers')
          .update(updates)
          .eq('id', existingCarrier.id)

        return { carrierId: existingCarrier.id, isNew: false }
      }
    }

    // No match found - create new carrier
    if (carrierData.company_name || carrierData.mc_number) {
      const newCarrier = {
        organization_id: organizationId,
        mc_number: carrierData.mc_number || `PENDING-${Date.now()}`,
        company_name: carrierData.company_name || 'Unknown Carrier',
        dot_number: carrierData.dot_number,
        contact_name: carrierData.contact_name,
        phone: carrierData.phone,
        email: carrierData.email,
        equipment_types: carrierData.equipment_type ? [carrierData.equipment_type] : [],
        total_loads: 1,
        on_time_percentage: 100, // Start with 100% for new carriers
        safety_rating: 75, // Default safety rating
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('carriers')
        .insert([newCarrier])
        .select('id')
        .single()

      if (error) {
        console.error('Error creating carrier:', error)
        return { carrierId: null, isNew: false }
      }

      return { carrierId: data.id, isNew: true }
    }

    return { carrierId: null, isNew: false }
  } catch (error) {
    console.error('Error in autoPopulateCarrier:', error)
    return { carrierId: null, isNew: false }
  }
}

/**
 * Auto-populate shipper from extraction data
 * Matches by name and location
 */
export async function autoPopulateShipper(
  shipperData: ShipperData,
  organizationId: string
): Promise<{ shipperId: string | null; isNew: boolean }> {
  const supabase = createClient()

  try {
    if (!shipperData.name) {
      return { shipperId: null, isNew: false }
    }

    // Try to match by name and city/state if available
    let query = supabase
      .from('shippers')
      .select('id, total_loads')
      .eq('organization_id', organizationId)
      .ilike('name', shipperData.name)

    if (shipperData.city && shipperData.state) {
      query = query.eq('city', shipperData.city).eq('state', shipperData.state)
    }

    const { data: existingShipper } = await query.single()

    if (existingShipper) {
      // Update shipper with new information
      const updates: any = {
        updated_at: new Date().toISOString(),
        total_loads: (existingShipper.total_loads || 0) + 1,
        last_load_date: new Date().toISOString(),
      }

      // Only update fields if they're provided
      if (shipperData.contact_name) updates.contact_name = shipperData.contact_name
      if (shipperData.phone) updates.phone = shipperData.phone
      if (shipperData.email) updates.email = shipperData.email
      if (shipperData.address) updates.address = shipperData.address
      if (shipperData.facility_hours) updates.facility_hours = shipperData.facility_hours

      await supabase
        .from('shippers')
        .update(updates)
        .eq('id', existingShipper.id)

      return { shipperId: existingShipper.id, isNew: false }
    }

    // No match found - create new shipper
    const newShipper = {
      organization_id: organizationId,
      name: shipperData.name,
      contact_name: shipperData.contact_name,
      phone: shipperData.phone,
      email: shipperData.email,
      address: shipperData.address,
      city: shipperData.city,
      state: shipperData.state,
      facility_hours: shipperData.facility_hours,
      appointment_required: false,
      lumper_required: false,
      credit_status: 'good' as const,
      payment_terms: 'Net 30',
      total_loads: 1,
      active_loads: 0,
      lifetime_revenue: 0,
      last_load_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('shippers')
      .insert([newShipper])
      .select('id')
      .single()

    if (error) {
      console.error('Error creating shipper:', error)
      return { shipperId: null, isNew: false }
    }

    return { shipperId: data.id, isNew: true }
  } catch (error) {
    console.error('Error in autoPopulateShipper:', error)
    return { shipperId: null, isNew: false }
  }
}

/**
 * Update lane statistics based on load data
 */
export async function updateLaneStatistics(
  originCity: string,
  originState: string,
  destinationCity: string,
  destinationState: string,
  rate: number,
  miles: number,
  organizationId: string
): Promise<void> {
  const supabase = createClient()

  try {
    const laneKey = `${originState}-${destinationState}`
    const ratePerMile = miles > 0 ? rate / miles : 0

    // Check if lane exists
    const { data: existingLane } = await supabase
      .from('lanes')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('origin_state', originState)
      .eq('destination_state', destinationState)
      .single()

    if (existingLane) {
      // Update existing lane statistics
      const newLoadCount = (existingLane.load_count || 0) + 1
      const newAvgRate = ((existingLane.average_rate || 0) * (existingLane.load_count || 0) + rate) / newLoadCount
      const newAvgRpm = ((existingLane.average_rpm || 0) * (existingLane.load_count || 0) + ratePerMile) / newLoadCount

      await supabase
        .from('lanes')
        .update({
          load_count: newLoadCount,
          average_rate: newAvgRate,
          average_rpm: newAvgRpm,
          last_rate: rate,
          last_rpm: ratePerMile,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLane.id)
    } else {
      // Create new lane entry
      await supabase.from('lanes').insert([{
        organization_id: organizationId,
        lane_name: laneKey,
        origin_city: originCity,
        origin_state: originState,
        destination_city: destinationCity,
        destination_state: destinationState,
        average_rate: rate,
        average_rpm: ratePerMile,
        last_rate: rate,
        last_rpm: ratePerMile,
        load_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
    }
  } catch (error) {
    console.error('Error updating lane statistics:', error)
  }
}

/**
 * Enhanced extraction save with auto-population
 */
export async function saveExtractionWithAutoPopulation(
  extractionData: any,
  callId: string,
  organizationId: string
) {
  const supabase = createClient()

  try {
    // Auto-populate carrier if data exists
    let carrierId = null
    if (extractionData.carrier_name || extractionData.mc_number) {
      const carrierResult = await autoPopulateCarrier({
        mc_number: extractionData.mc_number,
        dot_number: extractionData.dot_number,
        company_name: extractionData.carrier_name,
        contact_name: extractionData.carrier_contact,
        phone: extractionData.carrier_phone,
        email: extractionData.carrier_email,
        equipment_type: extractionData.equipment_type,
      }, organizationId)

      carrierId = carrierResult.carrierId
    }

    // Auto-populate shipper if data exists
    let shipperId = null
    if (extractionData.shipper_name) {
      const shipperResult = await autoPopulateShipper({
        name: extractionData.shipper_name,
        contact_name: extractionData.pickup_contact,
        phone: extractionData.pickup_phone,
        address: extractionData.pickup_address,
        city: extractionData.pickup_city,
        state: extractionData.pickup_state,
        facility_hours: extractionData.pickup_hours,
      }, organizationId)

      shipperId = shipperResult.shipperId
    }

    // Create load record
    const loadData = {
      organization_id: organizationId,
      call_id: callId,
      carrier_id: carrierId,
      shipper_id: shipperId,
      load_number: extractionData.load_number || `LD-${Date.now()}`,
      status: 'quoted',

      // Pickup details
      pickup_date: extractionData.pickup_date,
      pickup_time: extractionData.pickup_time,
      pickup_address: extractionData.pickup_address,
      pickup_city: extractionData.pickup_city,
      pickup_state: extractionData.pickup_state,
      pickup_zip: extractionData.pickup_zip,
      pickup_contact: extractionData.pickup_contact,
      pickup_phone: extractionData.pickup_phone,

      // Delivery details
      delivery_date: extractionData.delivery_date,
      delivery_time: extractionData.delivery_time,
      delivery_address: extractionData.delivery_address,
      delivery_city: extractionData.delivery_city,
      delivery_state: extractionData.delivery_state,
      delivery_zip: extractionData.delivery_zip,
      delivery_contact: extractionData.delivery_contact,
      delivery_phone: extractionData.delivery_phone,

      // Load details
      commodity: extractionData.commodity,
      weight: extractionData.weight,
      pallets: extractionData.pallets,
      equipment_type: extractionData.equipment_type,

      // Rate details
      rate: extractionData.rate,
      miles: extractionData.miles,
      rate_per_mile: extractionData.miles > 0 ? extractionData.rate / extractionData.miles : null,

      // Additional details
      special_instructions: extractionData.special_instructions,
      temperature: extractionData.temperature,
      hazmat: extractionData.hazmat || false,
      team_required: extractionData.team_required || false,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: load, error: loadError } = await supabase
      .from('loads')
      .insert([loadData])
      .select('id')
      .single()

    if (loadError) throw loadError

    // Update lane statistics if we have origin and destination
    if (extractionData.pickup_city && extractionData.pickup_state &&
        extractionData.delivery_city && extractionData.delivery_state &&
        extractionData.rate && extractionData.miles) {
      await updateLaneStatistics(
        extractionData.pickup_city,
        extractionData.pickup_state,
        extractionData.delivery_city,
        extractionData.delivery_state,
        extractionData.rate,
        extractionData.miles,
        organizationId
      )
    }

    // Create extraction mapping record
    await supabase.from('extraction_mappings').insert([{
      organization_id: organizationId,
      call_id: callId,
      load_id: load.id,
      carrier_id: carrierId,
      shipper_id: shipperId,
      extraction_data: extractionData,
      auto_populated: true,
      created_at: new Date().toISOString(),
    }])

    return {
      success: true,
      loadId: load.id,
      carrierId,
      shipperId,
    }
  } catch (error) {
    console.error('Error saving extraction with auto-population:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}