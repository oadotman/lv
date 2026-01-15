/**
 * Digital Signature API for Rate Confirmations
 * Allows carriers to digitally sign rate confirmations
 * Tracks signature metadata and timestamps
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Get signature data from request
    const body = await request.json();
    const {
      signatureData, // Base64 encoded signature image
      signerName,
      signerTitle,
      signerEmail,
      ipAddress,
      userAgent,
      token // Optional: For carrier signing via emailed link
    } = body;

    // Validate required fields
    if (!signatureData || !signerName) {
      return NextResponse.json({
        error: 'Signature and signer name are required'
      }, { status: 400 });
    }

    let userId = null;
    let organizationId = null;
    let signerType: 'broker' | 'carrier' = 'broker';

    // Check if signing via token (carrier) or authenticated (broker)
    if (token) {
      // Carrier signing via token
      const { data: rateConf } = await adminSupabase
        .from('rate_confirmations')
        .select('*, loads!inner(carrier_id, carriers!inner(*))')
        .eq('id', params.id)
        .eq('signing_token', token)
        .single();

      if (!rateConf) {
        return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 401 });
      }

      if (rateConf.carrier_signed_at) {
        return NextResponse.json({ error: 'Document already signed by carrier' }, { status: 400 });
      }

      organizationId = rateConf.organization_id;
      signerType = 'carrier';

    } else {
      // Broker signing (authenticated)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      userId = user.id;

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userOrg) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
      }

      organizationId = userOrg.organization_id;
      signerType = 'broker';
    }

    // Get rate confirmation
    const { data: rateConfirmation, error: fetchError } = await adminSupabase
      .from('rate_confirmations')
      .select('*, loads!inner(*)')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !rateConfirmation) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    // Check if already fully signed
    if (rateConfirmation.status === 'signed' && rateConfirmation.broker_signed_at && rateConfirmation.carrier_signed_at) {
      return NextResponse.json({
        error: 'Document is already fully signed'
      }, { status: 400 });
    }

    // Generate signature ID
    const signatureId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Save signature image to storage
    const signatureFileName = `signatures/${organizationId}/${params.id}/${signatureId}.png`;
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('documents')
      .upload(signatureFileName, Buffer.from(signatureData.replace(/^data:image\/\w+;base64,/, ''), 'base64'), {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('[Signature] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
    }

    // Get signature URL
    const { data: { publicUrl: signatureUrl } } = adminSupabase.storage
      .from('documents')
      .getPublicUrl(signatureFileName);

    // Prepare update data based on signer type
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (signerType === 'broker') {
      updateData.broker_signed_at = new Date().toISOString();
      updateData.broker_signature_url = signatureUrl;
      updateData.broker_signer_name = signerName;
      updateData.broker_signer_title = signerTitle || 'Authorized Representative';
    } else {
      updateData.carrier_signed_at = new Date().toISOString();
      updateData.carrier_signature_url = signatureUrl;
      updateData.carrier_signer_name = signerName;
      updateData.carrier_signer_title = signerTitle || 'Authorized Representative';
      updateData.carrier_signer_email = signerEmail;
    }

    // Check if both parties have signed
    const isBrokerSigned = updateData.broker_signed_at || rateConfirmation.broker_signed_at;
    const isCarrierSigned = updateData.carrier_signed_at || rateConfirmation.carrier_signed_at;

    if (isBrokerSigned && isCarrierSigned) {
      updateData.status = 'signed';
      updateData.fully_signed_at = new Date().toISOString();
    } else {
      updateData.status = 'partially_signed';
    }

    // Update rate confirmation
    const { data: updated, error: updateError } = await adminSupabase
      .from('rate_confirmations')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Signature] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 });
    }

    // Create signature audit record
    await adminSupabase.from('signature_audit_log').insert({
      document_id: params.id,
      document_type: 'rate_confirmation',
      signer_type: signerType,
      signer_name: signerName,
      signer_title: signerTitle,
      signer_email: signerEmail || null,
      signature_url: signatureUrl,
      ip_address: ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: userAgent || request.headers.get('user-agent'),
      signed_at: new Date().toISOString(),
      metadata: {
        organization_id: organizationId,
        user_id: userId,
        load_id: rateConfirmation.load_id
      }
    });

    // Log activity
    await adminSupabase.from('load_activities').insert({
      load_id: rateConfirmation.load_id,
      organization_id: organizationId,
      user_id: userId,
      activity_type: 'rate_confirmation_signed',
      description: `Rate confirmation signed by ${signerType} - ${signerName}`,
      metadata: {
        signer_type: signerType,
        signer_name: signerName,
        fully_signed: updateData.status === 'signed'
      },
      created_at: new Date().toISOString()
    });

    // If fully signed, update load status to dispatched
    if (updateData.status === 'signed') {
      await adminSupabase
        .from('loads')
        .update({
          status: 'dispatched',
          updated_at: new Date().toISOString()
        })
        .eq('id', rateConfirmation.load_id)
        .eq('status', 'booked');

      // Send confirmation emails to both parties
      if (rateConfirmation.loads?.carriers?.email) {
        await adminSupabase.from('email_queue').insert({
          to: rateConfirmation.loads.carriers.email,
          subject: `Rate Confirmation Fully Executed - Load ${rateConfirmation.loads.load_number}`,
          template: 'rate_confirmation_executed',
          data: {
            loadNumber: rateConfirmation.loads.load_number,
            confirmationNumber: rateConfirmation.confirmation_number,
            pickupDate: rateConfirmation.loads.pickup_date,
            deliveryDate: rateConfirmation.loads.delivery_date
          },
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      signature: {
        id: signatureId,
        signedBy: signerName,
        signedAt: new Date().toISOString(),
        signerType,
        documentStatus: updateData.status
      },
      message: updateData.status === 'signed'
        ? 'Document fully signed and executed'
        : `Document signed by ${signerType}, awaiting ${signerType === 'broker' ? 'carrier' : 'broker'} signature`
    });

  } catch (error) {
    console.error('[Signature] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rate-confirmations/[id]/sign
 * Get signature status and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Check for token in query params (for carrier signing)
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    let organizationId = null;

    if (token) {
      // Carrier accessing via token
      const adminSupabase = createAdminClient();
      const { data: rateConf } = await adminSupabase
        .from('rate_confirmations')
        .select('organization_id')
        .eq('id', params.id)
        .eq('signing_token', token)
        .single();

      if (!rateConf) {
        return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 401 });
      }

      organizationId = rateConf.organization_id;

    } else {
      // Authenticated access
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userOrg) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
      }

      organizationId = userOrg.organization_id;
    }

    const adminSupabase = createAdminClient();

    // Get rate confirmation with signature status
    const { data: rateConfirmation, error } = await adminSupabase
      .from('rate_confirmations')
      .select(`
        id,
        confirmation_number,
        status,
        broker_signed_at,
        broker_signer_name,
        broker_signer_title,
        carrier_signed_at,
        carrier_signer_name,
        carrier_signer_title,
        fully_signed_at,
        document_url
      `)
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !rateConfirmation) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    return NextResponse.json({
      signatureStatus: {
        documentId: rateConfirmation.id,
        confirmationNumber: rateConfirmation.confirmation_number,
        status: rateConfirmation.status,
        brokerSigned: !!rateConfirmation.broker_signed_at,
        brokerSignedAt: rateConfirmation.broker_signed_at,
        brokerSignerName: rateConfirmation.broker_signer_name,
        carrierSigned: !!rateConfirmation.carrier_signed_at,
        carrierSignedAt: rateConfirmation.carrier_signed_at,
        carrierSignerName: rateConfirmation.carrier_signer_name,
        fullySignedAt: rateConfirmation.fully_signed_at,
        documentUrl: rateConfirmation.document_url
      }
    });

  } catch (error) {
    console.error('[Signature] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}