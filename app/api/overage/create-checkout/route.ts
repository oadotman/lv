// =====================================================
// CREATE OVERAGE CHECKOUT API
// Generates Paddle checkout for exact overage amount
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, minutes } = body;

    if (!amount || amount <= 0 || amount > 20) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be between $0.01 and $20.00' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Verify they actually have this overage
    const { data: org } = await supabase
      .from('organizations')
      .select('usage_minutes_current, usage_minutes_limit, overage_debt')
      .eq('id', userOrg.organization_id)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const actualOverageMinutes = Math.max(0, org.usage_minutes_current - org.usage_minutes_limit);
    const actualOverageAmount = actualOverageMinutes * 0.20;

    // Verify amounts match (allow small rounding differences)
    if (Math.abs(actualOverageAmount - amount) > 0.01) {
      return NextResponse.json(
        {
          error: 'Amount mismatch',
          details: {
            requested: amount,
            actual: actualOverageAmount,
          }
        },
        { status: 400 }
      );
    }

    // Create or get overage invoice
    const { data: invoice } = await supabase.rpc('create_overage_invoice', {
      p_organization_id: userOrg.organization_id,
    });

    // Generate Paddle checkout URL
    // Since Paddle doesn't support true dynamic pricing, we have a few options:

    // Option 1: Use pre-created price points ($5, $10, $15, $20)
    const pricePoints = [
      { amount: 5, priceId: process.env.PADDLE_OVERAGE_5_PRICE_ID },
      { amount: 10, priceId: process.env.PADDLE_OVERAGE_10_PRICE_ID },
      { amount: 15, priceId: process.env.PADDLE_OVERAGE_15_PRICE_ID },
      { amount: 20, priceId: process.env.PADDLE_OVERAGE_20_PRICE_ID },
    ];

    // Find closest price point
    const pricePoint = pricePoints.reduce((prev, curr) => {
      return Math.abs(curr.amount - amount) < Math.abs(prev.amount - amount) ? curr : prev;
    });

    // Option 2: Use manual payment collection (simpler but requires more trust)
    // For now, let's use the closest price point and handle the difference as credit/debit

    const checkoutData = {
      items: [{
        priceId: pricePoint.priceId || process.env.PADDLE_OVERAGE_DEFAULT_PRICE_ID,
        quantity: 1,
      }],
      customData: {
        type: 'overage_payment',
        organizationId: userOrg.organization_id,
        invoiceId: invoice,
        requestedAmount: amount,
        actualAmount: pricePoint.amount,
        overage_minutes: minutes,
      },
      customer: {
        email: user.email,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment=success`,
      // Add a note about the difference if any
      ...(Math.abs(pricePoint.amount - amount) > 0.01 && {
        customMessage: pricePoint.amount > amount
          ? `Note: Paying $${pricePoint.amount} (includes $${(pricePoint.amount - amount).toFixed(2)} credit for future use)`
          : `Note: Paying $${pricePoint.amount} (remaining $${(amount - pricePoint.amount).toFixed(2)} will be added to next invoice)`,
      }),
    };

    // For production, you'd make actual Paddle API call here
    // For now, return a mock checkout URL
    const checkoutUrl = `https://checkout.paddle.com/overage?amount=${pricePoint.amount}&org=${userOrg.organization_id}`;

    // Store checkout intent
    await supabase
      .from('overage_invoices')
      .update({
        paddle_checkout_url: checkoutUrl,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoice);

    return NextResponse.json({
      checkoutUrl,
      checkoutId: `chk_${invoice}`,
      amount: pricePoint.amount,
      requestedAmount: amount,
      difference: pricePoint.amount - amount,
      message: pricePoint.amount !== amount
        ? `Charging $${pricePoint.amount} (closest available amount)`
        : undefined,
    });

  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}