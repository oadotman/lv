import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validatePaddleWebhook,
  PADDLE_WEBHOOK_EVENTS,
  LoadVoiceSubscriptionMetadata,
} from '@/lib/paddle-config';
import { PLANS } from '@/lib/pricing';

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('paddle-signature') || '';

    // Verify webhook signature
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET!;
    if (!validatePaddleWebhook(webhookSecret, signature, rawBody)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    console.log(`[Paddle Webhook] Received event: ${event.event_type}`);

    // Handle different event types
    switch (event.event_type) {
      case PADDLE_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED:
        await handleSubscriptionCreated(event);
        break;

      case PADDLE_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdated(event);
        break;

      case PADDLE_WEBHOOK_EVENTS.SUBSCRIPTION_CANCELED:
        await handleSubscriptionCanceled(event);
        break;

      case PADDLE_WEBHOOK_EVENTS.SUBSCRIPTION_PAUSED:
        await handleSubscriptionPaused(event);
        break;

      case PADDLE_WEBHOOK_EVENTS.SUBSCRIPTION_RESUMED:
        await handleSubscriptionResumed(event);
        break;

      case PADDLE_WEBHOOK_EVENTS.TRANSACTION_COMPLETED:
        await handleTransactionCompleted(event);
        break;

      case PADDLE_WEBHOOK_EVENTS.TRANSACTION_FAILED:
        await handleTransactionFailed(event);
        break;

      default:
        console.log(`[Paddle Webhook] Unhandled event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Paddle Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(event: any) {
  const { data } = event;
  const metadata = data.custom_data as LoadVoiceSubscriptionMetadata;

  console.log('[Paddle Webhook] Subscription created:', data.id);

  // Update organization with subscription details
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      subscription_id: data.id,
      subscription_status: 'active',
      subscription_plan: metadata.plan_type,
      billing_cycle: metadata.billing_cycle,
      subscription_current_period_start: data.current_billing_period?.starts_at,
      subscription_current_period_end: data.current_billing_period?.ends_at,
      max_minutes: metadata.included_minutes,
      max_members: metadata.included_users,
    })
    .eq('id', metadata.organization_id);

  if (updateError) {
    console.error('[Paddle Webhook] Failed to update organization:', updateError);
    throw updateError;
  }

  // Create subscription record
  const { error: insertError } = await supabase
    .from('subscriptions')
    .insert({
      paddle_subscription_id: data.id,
      organization_id: metadata.organization_id,
      plan_type: metadata.plan_type,
      billing_cycle: metadata.billing_cycle,
      status: 'active',
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
      cancel_at_period_end: false,
      metadata: metadata,
    });

  if (insertError) {
    console.error('[Paddle Webhook] Failed to create subscription record:', insertError);
  }

  // Send welcome email
  await sendSubscriptionEmail(metadata.organization_id, 'welcome', {
    planName: PLANS[metadata.plan_type as keyof typeof PLANS].name,
    billingCycle: metadata.billing_cycle,
  });
}

async function handleSubscriptionUpdated(event: any) {
  const { data } = event;
  const metadata = data.custom_data as LoadVoiceSubscriptionMetadata;

  console.log('[Paddle Webhook] Subscription updated:', data.id);

  // Update organization
  await supabase
    .from('organizations')
    .update({
      subscription_plan: metadata.plan_type,
      billing_cycle: metadata.billing_cycle,
      max_minutes: metadata.included_minutes,
      max_members: metadata.included_users,
    })
    .eq('id', metadata.organization_id);

  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      plan_type: metadata.plan_type,
      billing_cycle: metadata.billing_cycle,
      metadata: metadata,
    })
    .eq('paddle_subscription_id', data.id);
}

async function handleSubscriptionCanceled(event: any) {
  const { data } = event;

  console.log('[Paddle Webhook] Subscription canceled:', data.id);

  // Get organization ID from subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('paddle_subscription_id', data.id)
    .single();

  if (subscription) {
    // Update organization
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'canceled',
        subscription_cancel_at: data.scheduled_change?.effective_at,
      })
      .eq('id', subscription.organization_id);

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', data.id);

    // Send cancellation email
    await sendSubscriptionEmail(subscription.organization_id, 'canceled', {
      cancelDate: data.scheduled_change?.effective_at,
    });
  }
}

async function handleSubscriptionPaused(event: any) {
  const { data } = event;

  console.log('[Paddle Webhook] Subscription paused:', data.id);

  // Get organization ID
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('paddle_subscription_id', data.id)
    .single();

  if (subscription) {
    // Update organization
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'paused',
      })
      .eq('id', subscription.organization_id);

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', data.id);
  }
}

async function handleSubscriptionResumed(event: any) {
  const { data } = event;

  console.log('[Paddle Webhook] Subscription resumed:', data.id);

  // Get organization ID
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('paddle_subscription_id', data.id)
    .single();

  if (subscription) {
    // Update organization
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'active',
      })
      .eq('id', subscription.organization_id);

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        paused_at: null,
      })
      .eq('paddle_subscription_id', data.id);
  }
}

async function handleTransactionCompleted(event: any) {
  const { data } = event;

  console.log('[Paddle Webhook] Transaction completed:', data.id);

  // Check if this is an overage payment
  const customData = data.custom_data || {};
  if (customData.type === 'overage_payment') {
    console.log('[Paddle Webhook] Processing overage payment');

    // Handle overage payment
    const { handleOveragePayment } = await import('@/lib/overage-billing');

    try {
      await handleOveragePayment(
        customData.invoiceId,
        data.id // Paddle transaction ID
      );

      console.log('[Paddle Webhook] Overage payment processed successfully');
    } catch (error) {
      console.error('[Paddle Webhook] Failed to process overage payment:', error);
      // Don't throw - webhook should still return success
    }

    return; // Exit early for overage payments
  }

  // Regular subscription payment
  if (data.subscription_id) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('paddle_subscription_id', data.subscription_id)
      .single();

    if (subscription) {
      await supabase
        .from('payments')
        .insert({
          organization_id: subscription.organization_id,
          paddle_transaction_id: data.id,
          amount: data.details.totals.total,
          currency: data.currency_code,
          status: 'succeeded',
          description: data.items[0]?.product?.name || 'Subscription payment',
          paid_at: data.created_at,
        });

      // Reset usage for new billing period
      await supabase
        .from('usage_metrics')
        .insert({
          organization_id: subscription.organization_id,
          metric_type: 'billing_period_reset',
          metric_value: 0,
          metadata: {
            period_start: data.billing_period?.starts_at,
            period_end: data.billing_period?.ends_at,
          },
        });
    }
  }
}

async function handleTransactionFailed(event: any) {
  const { data } = event;

  console.log('[Paddle Webhook] Transaction failed:', data.id);

  // Record failed payment
  if (data.subscription_id) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('paddle_subscription_id', data.subscription_id)
      .single();

    if (subscription) {
      await supabase
        .from('payments')
        .insert({
          organization_id: subscription.organization_id,
          paddle_transaction_id: data.id,
          amount: data.details.totals.total,
          currency: data.currency_code,
          status: 'failed',
          failure_reason: data.checkout?.error_message,
          description: 'Failed payment attempt',
        });

      // Send payment failed email
      await sendSubscriptionEmail(subscription.organization_id, 'payment_failed', {
        amount: data.details.totals.total,
        currency: data.currency_code,
      });
    }
  }
}

async function sendSubscriptionEmail(
  organizationId: string,
  type: string,
  data: any
) {
  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // Get primary admin
  const { data: admin } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .single();

  if (admin) {
    const { data: user } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', admin.user_id)
      .single();

    if (user) {
      // Queue email for sending
      await supabase.from('email_queue').insert({
        to: user.email,
        template: `subscription_${type}`,
        data: {
          organizationName: org?.name,
          ...data,
        },
      });
    }
  }
}