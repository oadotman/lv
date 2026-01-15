import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createPaddleCheckout,
  PLAN_TO_PADDLE_PRICE,
  LoadVoiceSubscriptionMetadata,
} from '@/lib/paddle-config';
import { PLANS } from '@/lib/pricing';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { planType, billingCycle } = body;

    if (!planType || !billingCycle) {
      return NextResponse.json(
        { error: 'Plan type and billing cycle are required' },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!PLANS[planType as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Get or create Paddle customer
    const { data: organization } = await supabase
      .from('organizations')
      .select('paddle_customer_id')
      .eq('id', session.user.user_metadata.organizationId)
      .single();

    let paddleCustomerId = organization?.paddle_customer_id;

    if (!paddleCustomerId) {
      // Create Paddle customer
      const paddle = (await import('@/lib/paddle-config')).initializePaddle();
      const customer = await paddle.customers.create({
        email: session.user.email!,
        name: session.user.user_metadata.full_name || session.user.email!,
        customData: {
          organization_id: session.user.user_metadata.organizationId,
          user_id: session.user.id,
        },
      });

      paddleCustomerId = customer.id;

      // Update organization with Paddle customer ID
      await supabase
        .from('organizations')
        .update({ paddle_customer_id: paddleCustomerId })
        .eq('id', session.user.user_metadata.organizationId);
    }

    // Get the appropriate price ID
    const priceMapping = PLAN_TO_PADDLE_PRICE[planType];
    if (!priceMapping) {
      return NextResponse.json(
        { error: 'Plan not available for purchase' },
        { status: 400 }
      );
    }

    const priceId = billingCycle === 'annual'
      ? priceMapping.annual
      : priceMapping.monthly;

    // Get plan details
    const plan = PLANS[planType as keyof typeof PLANS];

    // Prepare metadata
    const metadata: LoadVoiceSubscriptionMetadata = {
      organization_id: session.user.user_metadata.organizationId,
      plan_type: planType as any,
      billing_cycle: billingCycle,
      included_minutes: plan.maxMinutes,
      included_users: plan.maxMembers,
      overage_rate: 20, // $0.20 per minute in cents
      features: {
        white_label: ['professional', 'enterprise'].includes(planType),
        api_access: ['professional', 'enterprise'].includes(planType),
        custom_ai: planType === 'enterprise',
        priority_support: ['starter', 'professional', 'enterprise'].includes(planType),
      },
    };

    // Create Paddle checkout
    const checkout = await createPaddleCheckout(
      paddleCustomerId,
      priceId,
      metadata
    );

    // Store pending subscription in database
    await supabase.from('pending_subscriptions').insert({
      organization_id: session.user.user_metadata.organizationId,
      user_id: session.user.id,
      plan_type: planType,
      billing_cycle: billingCycle,
      paddle_checkout_id: checkout.id,
      status: 'pending',
    });

    return NextResponse.json({
      checkoutUrl: checkout.checkout?.url || '',
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}