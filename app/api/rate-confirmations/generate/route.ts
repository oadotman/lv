import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createRateConfirmationPDFDocument } from '@/lib/rate-confirmation/pdf-template';
import {
  generateRateConNumber,
  fetchLoadData,
  fetchOrganizationData,
  createRateConfirmation,
} from '@/lib/rate-confirmation/generator';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { load_id } = body;

    if (!load_id) {
      return NextResponse.json({ error: 'Load ID is required' }, { status: 400 });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check permissions (only admins and owners can generate rate confirmations)
    if (!['admin', 'owner'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organizationId = userOrg.organization_id;

    // Fetch load data
    const load = await fetchLoadData(load_id);
    if (!load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Verify load belongs to organization
    const { data: loadCheck } = await supabase
      .from('loads')
      .select('organization_id')
      .eq('id', load_id)
      .single();

    if (!loadCheck || loadCheck.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Load not found in organization' }, { status: 404 });
    }

    // Fetch organization data
    const organization = await fetchOrganizationData(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization data not found' }, { status: 404 });
    }

    // Validate required fields
    const validationErrors = [];

    if (!load.carrier) {
      validationErrors.push('Carrier information is required');
    }

    if (!organization.mc_number && !organization.dot_number) {
      validationErrors.push('Organization MC or DOT number is required');
    }

    if (!load.carrier_rate) {
      validationErrors.push('Carrier rate is required');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    // Generate rate confirmation number
    const rateConNumber = await generateRateConNumber(organizationId);

    // Generate PDF
    console.log('Generating PDF for rate confirmation:', rateConNumber);

    const pdfBuffer = await renderToBuffer(
      createRateConfirmationPDFDocument({
        load: load,
        organization: organization,
        rateConNumber: rateConNumber,
      })
    );

    // Create storage bucket name
    const bucketName = 'rate-confirmations';
    const fileName = `${organizationId}/${load_id}/${rateConNumber}.pdf`;

    // Upload PDF to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return NextResponse.json({
        error: 'Failed to upload PDF',
        details: uploadError.message
      }, { status: 500 });
    }

    // Get public URL for the PDF
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Create rate confirmation record
    const rateConfirmation = await createRateConfirmation(
      load_id,
      organizationId,
      publicUrl,
      rateConNumber
    );

    // Update load status if needed
    await supabase
      .from('loads')
      .update({
        rate_confirmation_id: rateConfirmation.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', load_id);

    return NextResponse.json({
      success: true,
      rate_confirmation: {
        id: rateConfirmation.id,
        rate_con_number: rateConNumber,
        pdf_url: publicUrl,
        status: rateConfirmation.status,
        created_at: rateConfirmation.created_at,
      }
    });

  } catch (error) {
    console.error('Error generating rate confirmation:', error);
    return NextResponse.json({
      error: 'Failed to generate rate confirmation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to fetch rate confirmations for a load
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const loadId = searchParams.get('load_id');

    if (!loadId) {
      return NextResponse.json({ error: 'Load ID is required' }, { status: 400 });
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

    // Fetch rate confirmations for the load
    const { data: rateConfirmations, error } = await supabase
      .from('rate_confirmations')
      .select('*')
      .eq('load_id', loadId)
      .eq('organization_id', userOrg.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rate confirmations:', error);
      return NextResponse.json({
        error: 'Failed to fetch rate confirmations'
      }, { status: 500 });
    }

    return NextResponse.json({
      rate_confirmations: rateConfirmations || []
    });

  } catch (error) {
    console.error('Error fetching rate confirmations:', error);
    return NextResponse.json({
      error: 'Failed to fetch rate confirmations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}