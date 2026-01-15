import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { RateConfirmationEmail } from '@/lib/emails/rate-confirmation-email';
import { formatDate } from '@/lib/rate-confirmation/generator';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const {
      rate_confirmation_id,
      to_emails,
      cc_emails,
      subject_override,
      message_override,
      include_acceptance_link
    } = body;

    if (!rate_confirmation_id) {
      return NextResponse.json({ error: 'Rate confirmation ID is required' }, { status: 400 });
    }

    if (!to_emails || to_emails.length === 0) {
      return NextResponse.json({ error: 'At least one recipient email is required' }, { status: 400 });
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

    // Fetch rate confirmation details
    const { data: rateConfirmation, error: rcError } = await supabase
      .from('rate_confirmations')
      .select('*')
      .eq('id', rate_confirmation_id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (rcError || !rateConfirmation) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    // Fetch load details with carrier and organization info
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        carriers (
          id,
          carrier_name,
          primary_contact,
          dispatch_email,
          mc_number,
          dot_number
        )
      `)
      .eq('id', rateConfirmation.load_id)
      .single();

    if (loadError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Fetch organization details
    const { data: organization, error: orgDataError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userOrg.organization_id)
      .single();

    if (orgDataError || !organization) {
      return NextResponse.json({ error: 'Organization data not found' }, { status: 404 });
    }

    // Generate tracking URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://loadvoice.com';
    const trackingUrl = `${baseUrl}/track/rate-confirmation/${rateConfirmation.id}`;

    // Generate acceptance URL if requested
    const acceptanceUrl = include_acceptance_link
      ? `${baseUrl}/accept/rate-confirmation/${rateConfirmation.id}`
      : undefined;

    // Prepare email data
    const emailData = {
      carrierName: load.carriers?.carrier_name || 'Carrier',
      dispatcherName: load.carriers?.primary_contact,
      loadNumber: load.load_number || load.reference_number || load.id.slice(0, 8),
      rateConNumber: rateConfirmation.rate_con_number,
      pickupLocation: {
        city: load.origin_city,
        state: load.origin_state,
        date: formatDate(load.pickup_date),
      },
      deliveryLocation: {
        city: load.destination_city,
        state: load.destination_state,
        date: formatDate(load.delivery_date),
      },
      equipment: load.equipment_type || 'Dry Van',
      commodity: load.commodity || 'General Freight',
      rate: load.carrier_rate || 0,
      pdfUrl: rateConfirmation.pdf_url,
      brokerName: organization.name,
      brokerPhone: organization.company_phone,
      brokerEmail: organization.billing_email || organization.company_email,
      acceptanceUrl,
      trackingUrl,
    };

    // Send email using Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${organization.name} <${process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com'}>`,
      to: to_emails,
      cc: cc_emails,
      subject: subject_override || `Rate Confirmation ${rateConfirmation.rate_con_number} - ${load.origin_city}, ${load.origin_state} to ${load.destination_city}, ${load.destination_state}`,
      react: RateConfirmationEmail(emailData),
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({
        error: 'Failed to send email',
        details: emailError.message
      }, { status: 500 });
    }

    // Update rate confirmation status to 'sent'
    await supabase
      .from('rate_confirmations')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: to_emails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rate_confirmation_id);

    // Log email activity
    await supabase
      .from('rate_confirmation_activities')
      .insert({
        rate_confirmation_id: rate_confirmation_id,
        activity_type: 'email_sent',
        details: {
          to: to_emails,
          cc: cc_emails,
          email_id: emailResult?.id,
          subject: subject_override || `Rate Confirmation ${rateConfirmation.rate_con_number}`,
        },
        created_by: user.id,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      email_id: emailResult?.id,
      message: `Rate confirmation sent to ${to_emails.join(', ')}`,
    });

  } catch (error) {
    console.error('Error sending rate confirmation email:', error);
    return NextResponse.json({
      error: 'Failed to send rate confirmation email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to fetch email history for a rate confirmation
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
    const rateConfirmationId = searchParams.get('rate_confirmation_id');

    if (!rateConfirmationId) {
      return NextResponse.json({ error: 'Rate confirmation ID is required' }, { status: 400 });
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

    // Verify rate confirmation belongs to organization
    const { data: rateConfirmation } = await supabase
      .from('rate_confirmations')
      .select('organization_id')
      .eq('id', rateConfirmationId)
      .single();

    if (!rateConfirmation || rateConfirmation.organization_id !== userOrg.organization_id) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    // Fetch email activities
    const { data: emailActivities, error } = await supabase
      .from('rate_confirmation_activities')
      .select('*')
      .eq('rate_confirmation_id', rateConfirmationId)
      .eq('activity_type', 'email_sent')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email history:', error);
      return NextResponse.json({
        error: 'Failed to fetch email history'
      }, { status: 500 });
    }

    return NextResponse.json({
      email_history: emailActivities || []
    });

  } catch (error) {
    console.error('Error fetching email history:', error);
    return NextResponse.json({
      error: 'Failed to fetch email history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}