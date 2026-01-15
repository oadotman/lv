import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get request body
    const body = await request.json();
    const {
      rate_confirmation_id,
      tracking_token,
      signature_data
    } = body;

    if (!rate_confirmation_id && !tracking_token) {
      return NextResponse.json({
        error: 'Either rate confirmation ID or tracking token is required'
      }, { status: 400 });
    }

    if (!signature_data) {
      return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
    }

    // Validate signature data
    const requiredFields = ['signatureImage', 'signerName', 'signerTitle', 'signerEmail', 'signedAt', 'acceptedTerms'];
    const missingFields = requiredFields.filter(field => !signature_data[field]);

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required signature fields',
        details: missingFields
      }, { status: 400 });
    }

    // Get IP address and user agent
    const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const user_agent = request.headers.get('user-agent') || null;

    // Add to signature data
    signature_data.ipAddress = ip_address;
    signature_data.userAgent = user_agent;

    let rateConfirmationId = rate_confirmation_id;
    let organizationId = null;

    // If using tracking token, find the rate confirmation
    if (tracking_token && !rate_confirmation_id) {
      const { data: tracking, error: trackingError } = await supabase
        .from('rate_confirmation_tracking')
        .select('rate_confirmation_id')
        .eq('tracking_token', tracking_token)
        .single();

      if (trackingError || !tracking) {
        return NextResponse.json({ error: 'Invalid tracking token' }, { status: 404 });
      }

      rateConfirmationId = tracking.rate_confirmation_id;
    }

    // Get the rate confirmation
    const { data: rateConfirmation, error: rcError } = await supabase
      .from('rate_confirmations')
      .select('*, organization_id')
      .eq('id', rateConfirmationId)
      .single();

    if (rcError || !rateConfirmation) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    organizationId = rateConfirmation.organization_id;

    // Check if already signed
    if (rateConfirmation.signed_at) {
      return NextResponse.json({
        error: 'Rate confirmation has already been signed',
        signed_at: rateConfirmation.signed_at,
        signed_by: rateConfirmation.signed_by
      }, { status: 400 });
    }

    // Store signature image in storage
    const signatureImageData = signature_data.signatureImage.replace(/^data:image\/\w+;base64,/, '');
    const signatureBuffer = Buffer.from(signatureImageData, 'base64');
    const signatureFileName = `${organizationId}/${rateConfirmationId}/signature-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rate-confirmations')
      .upload(signatureFileName, signatureBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading signature:', uploadError);
      return NextResponse.json({
        error: 'Failed to store signature image'
      }, { status: 500 });
    }

    // Get public URL for the signature
    const { data: { publicUrl: signatureUrl } } = supabase.storage
      .from('rate-confirmations')
      .getPublicUrl(signatureFileName);

    // Update rate confirmation with signature data
    const { error: updateError } = await supabase
      .from('rate_confirmations')
      .update({
        signed_at: signature_data.signedAt,
        signed_by: signature_data.signerName,
        signature_data: {
          ...signature_data,
          signatureImage: signatureUrl // Replace base64 with URL
        },
        acceptance_status: 'accepted',
        acceptance_notes: signature_data.notes,
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', rateConfirmationId);

    if (updateError) {
      console.error('Error updating rate confirmation:', updateError);
      return NextResponse.json({
        error: 'Failed to save signature'
      }, { status: 500 });
    }

    // Log signature activity
    await supabase
      .from('rate_confirmation_activities')
      .insert({
        rate_confirmation_id: rateConfirmationId,
        activity_type: 'signed',
        details: {
          signer_name: signature_data.signerName,
          signer_title: signature_data.signerTitle,
          signer_email: signature_data.signerEmail,
          accepted_terms: signature_data.acceptedTerms,
          signature_url: signatureUrl,
          tracking_token: tracking_token || null
        },
        ip_address,
        user_agent,
        created_at: new Date().toISOString()
      });

    // Update load status if configured
    const { data: load } = await supabase
      .from('loads')
      .select('id, status')
      .eq('id', rateConfirmation.load_id)
      .single();

    if (load && load.status === 'dispatched') {
      // Optionally update load status to indicate carrier acceptance
      await supabase
        .from('loads')
        .update({
          status: 'carrier_confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', load.id);
    }

    // Send confirmation email to signer
    if (signature_data.signerEmail) {
      // This would trigger an email confirmation to the signer
      // You can implement this using your email service
    }

    return NextResponse.json({
      success: true,
      message: 'Signature captured successfully',
      rate_confirmation_id: rateConfirmationId,
      signed_at: signature_data.signedAt,
      signed_by: signature_data.signerName
    });

  } catch (error) {
    console.error('Error processing signature:', error);
    return NextResponse.json({
      error: 'Failed to process signature',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check signature status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const rateConfirmationId = searchParams.get('rate_confirmation_id');
    const trackingToken = searchParams.get('tracking_token');

    if (!rateConfirmationId && !trackingToken) {
      return NextResponse.json({
        error: 'Either rate confirmation ID or tracking token is required'
      }, { status: 400 });
    }

    let rcId = rateConfirmationId;

    // If using tracking token, find the rate confirmation
    if (trackingToken && !rateConfirmationId) {
      const { data: tracking } = await supabase
        .from('rate_confirmation_tracking')
        .select('rate_confirmation_id')
        .eq('tracking_token', trackingToken)
        .single();

      if (!tracking) {
        return NextResponse.json({ error: 'Invalid tracking token' }, { status: 404 });
      }

      rcId = tracking.rate_confirmation_id;
    }

    // Get signature status
    const { data: rateConfirmation, error } = await supabase
      .from('rate_confirmations')
      .select('id, signed_at, signed_by, acceptance_status, status')
      .eq('id', rcId)
      .single();

    if (error || !rateConfirmation) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    return NextResponse.json({
      is_signed: !!rateConfirmation.signed_at,
      signed_at: rateConfirmation.signed_at,
      signed_by: rateConfirmation.signed_by,
      acceptance_status: rateConfirmation.acceptance_status,
      status: rateConfirmation.status
    });

  } catch (error) {
    console.error('Error checking signature status:', error);
    return NextResponse.json({
      error: 'Failed to check signature status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}