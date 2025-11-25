// =====================================================
// ASSEMBLYAI WEBHOOK HANDLER (Optional - Phase 5)
// Receives transcription completion notifications in production
// NOTE: With Inngest, this webhook is optional (Inngest polls instead)
//       But webhooks are more efficient when available!
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { isWebhookProcessed, markWebhookProcessed, validateWebhookTimestamp } from '@/lib/security/webhook-replay-prevention';

export const runtime = 'nodejs';

/**
 * Verify AssemblyAI webhook signature
 * AssemblyAI signs webhooks with HMAC-SHA256
 */
function verifyAssemblyAIWebhook(
  signature: string | null,
  payload: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.error('Missing signature or secret for webhook verification');
    return false;
  }

  try {
    // AssemblyAI sends signature in 'assemblyai-signature' header
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying AssemblyAI webhook signature:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('assemblyai-signature');

    // Verify webhook signature (REQUIRED for production security)
    const webhookSecret = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('🚨 CRITICAL: ASSEMBLYAI_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook verification failed: secret not configured' },
        { status: 500 }
      );
    }

    const isValid = verifyAssemblyAIWebhook(signature, rawBody, webhookSecret);
    if (!isValid) {
      console.error('Invalid AssemblyAI webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    console.log('✅ AssemblyAI webhook signature verified');

    // Parse payload after verification
    const payload = JSON.parse(rawBody);

    const transcriptId = payload.transcript_id;
    const status = payload.status;
    const webhookId = payload.webhook_id || transcriptId; // Use webhook_id if available

    if (!transcriptId) {
      console.error('No transcript_id in webhook payload');
      return NextResponse.json(
        { error: 'No transcript_id in payload' },
        { status: 400 }
      );
    }

    // Check for replay attacks
    const alreadyProcessed = await isWebhookProcessed(webhookId, 'assemblyai');
    if (alreadyProcessed) {
      console.warn(`⚠️ Duplicate webhook detected: ${webhookId}`);
      // Return success to acknowledge receipt but don't process
      return NextResponse.json({ success: true, message: 'Webhook already processed' });
    }

    // Validate timestamp if provided
    if (payload.created) {
      const isValidTimestamp = validateWebhookTimestamp(payload.created, 10); // 10 min tolerance
      if (!isValidTimestamp) {
        console.error('Webhook timestamp validation failed');
        return NextResponse.json(
          { error: 'Webhook timestamp invalid or too old' },
          { status: 400 }
        );
      }
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Find call by transcript_id
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('assemblyai_transcript_id', transcriptId)
      .single();

    if (callError || !call) {
      console.error('Call not found for transcript:', transcriptId, callError);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    console.log('Found call:', call.id, 'Status:', status);

    // Handle completion
    if (status === 'completed') {
      console.log('Transcription completed via webhook');

      // With Inngest: Just update the status
      // The Inngest job will detect completion on next poll
      // This speeds up processing by not waiting for next poll interval

      await supabase
        .from('calls')
        .update({
          status: 'transcribing', // Inngest job will update to 'completed'
        })
        .eq('id', call.id);

      console.log('Webhook processed - Inngest will handle the rest');

      // Mark webhook as processed
      await markWebhookProcessed(webhookId, 'assemblyai', {
        transcript_id: transcriptId,
        status,
        call_id: call.id,
      });

      return NextResponse.json({ success: true });
    }

    // Handle error
    if (status === 'error') {
      console.error('Transcription failed via webhook:', payload.error);

      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: payload.error || 'Transcription failed',
        })
        .eq('id', call.id);

      // Send failure notification
      await supabase.from('notifications').insert({
        user_id: call.user_id,
        notification_type: 'call_failed',
        title: 'Call transcription failed',
        message: `Failed to transcribe your call: ${payload.error || 'Unknown error'}`,
        link: `/calls/${call.id}`,
        call_id: call.id,
      });

      // Mark webhook as processed
      await markWebhookProcessed(webhookId, 'assemblyai', {
        transcript_id: transcriptId,
        status,
        call_id: call.id,
        error: payload.error,
      });

      return NextResponse.json({ success: true });
    }

    // Handle other statuses (queued, processing)
    console.log('Transcription status:', status);

    // Mark webhook as processed even for intermediate statuses
    await markWebhookProcessed(webhookId, 'assemblyai', {
      transcript_id: transcriptId,
      status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing webhook is accessible
export async function GET() {
  return NextResponse.json({
    message: 'AssemblyAI webhook endpoint (Phase 5: Inngest-enabled)',
    status: 'ready',
    note: 'With Inngest, webhooks are optional but improve efficiency',
  });
}
