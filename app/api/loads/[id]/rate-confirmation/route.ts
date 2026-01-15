import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createRateConfirmationDocument } from '@/lib/loads/rate-confirmation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Fetch load data with carrier and shipper info
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        carrier:carriers(
          id,
          company_name,
          mc_number,
          dot_number,
          contact_name,
          phone,
          email
        ),
        shipper:shippers(
          id,
          name,
          contact_name,
          phone,
          email
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (loadError || !load) {
      return NextResponse.json(
        { error: 'Load not found' },
        { status: 404 }
      )
    }

    // Get organization/broker info
    const { data: org } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', profile.organization_id)
      .single()

    // Prepare broker info (you might want to store this in organization settings)
    const brokerInfo = {
      name: org?.name || 'Your Brokerage',
      mc_number: org?.settings?.mc_number || 'MC-XXXXXX',
      address: org?.settings?.address || '',
      phone: org?.settings?.phone || '',
      email: org?.settings?.email || '',
    }

    // Format load data for the PDF
    const loadData = {
      load_number: load.load_number,
      status: load.status,

      // Shipper info
      shipper_name: load.shipper?.name,
      shipper_contact: load.shipper?.contact_name,
      shipper_phone: load.shipper?.phone,
      shipper_email: load.shipper?.email,

      // Carrier info
      carrier_name: load.carrier?.company_name,
      mc_number: load.carrier?.mc_number,
      dot_number: load.carrier?.dot_number,
      carrier_contact: load.carrier?.contact_name,
      carrier_phone: load.carrier?.phone,
      carrier_email: load.carrier?.email,
      driver_name: load.driver_name,
      driver_phone: load.driver_phone,

      // Pickup info
      pickup_date: load.pickup_date,
      pickup_time: load.pickup_time,
      pickup_address: load.pickup_address,
      pickup_city: load.pickup_city,
      pickup_state: load.pickup_state,
      pickup_zip: load.pickup_zip,
      pickup_contact: load.pickup_contact,
      pickup_phone: load.pickup_phone,

      // Delivery info
      delivery_date: load.delivery_date,
      delivery_time: load.delivery_time,
      delivery_address: load.delivery_address,
      delivery_city: load.delivery_city,
      delivery_state: load.delivery_state,
      delivery_zip: load.delivery_zip,
      delivery_contact: load.delivery_contact,
      delivery_phone: load.delivery_phone,

      // Load details
      commodity: load.commodity,
      weight: load.weight,
      pallets: load.pallets,
      equipment_type: load.equipment_type,
      miles: load.miles,
      rate: load.rate,
      special_instructions: load.special_instructions,
      temperature: load.temperature,
      hazmat: load.hazmat,
      team_required: load.team_required,
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      createRateConfirmationDocument({ load: loadData, brokerInfo: brokerInfo })
    )

    // Create and save rate confirmation record
    const { data: rateConfirmation } = await supabase
      .from('rate_confirmations')
      .insert({
        organization_id: profile.organization_id,
        load_id: load.id,
        carrier_id: load.carrier_id,
        confirmation_number: `RC-${load.load_number}`,
        rate: load.rate,
        sent_to: load.carrier?.email,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select('id')
      .single()

    // Return PDF as response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rate-confirmation-${load.load_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating rate confirmation:', error)
    return NextResponse.json(
      { error: 'Failed to generate rate confirmation' },
      { status: 500 }
    )
  }
}