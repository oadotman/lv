// =====================================================
// PARTNER COMMISSION WEBHOOK
// Process subscription events and calculate commissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Verify webhook signature from payment provider
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET!;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return computedSignature === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('x-webhook-signature');

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const supabase = createServerClient();

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionEvent(supabase, event);
        break;

      case 'subscription.cancelled':
      case 'subscription.expired':
        await handleChurnEvent(supabase, event);
        break;

      case 'payment.succeeded':
        await handlePaymentEvent(supabase, event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionEvent(supabase: any, event: any) {
  const { customer_email, subscription_id, plan, amount, metadata } = event.data;

  // Check if this customer was referred by a partner
  const { data: referral } = await supabase
    .from('partner_referrals')
    .select('*, partners!inner(*)')
    .eq('customer_email', customer_email)
    .single();

  if (!referral) {
    console.log('No partner referral found for:', customer_email);
    return;
  }

  // Update referral status
  await supabase
    .from('partner_referrals')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
      subscription_id,
      subscription_plan: plan,
      subscription_value: amount,
    })
    .eq('id', referral.id);

  // Calculate commission
  const commissionRate = referral.partners.commission_rate / 100;
  const commissionAmount = amount * commissionRate;

  // Create or update monthly commission record
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: existingCommission } = await supabase
    .from('partner_commissions')
    .select('*')
    .eq('partner_id', referral.partner_id)
    .eq('month', currentMonth.toString())
    .eq('year', currentYear)
    .single();

  if (existingCommission) {
    // Update existing commission
    await supabase
      .from('partner_commissions')
      .update({
        amount: existingCommission.amount + commissionAmount,
        referrals_count: existingCommission.referrals_count + 1,
      })
      .eq('id', existingCommission.id);
  } else {
    // Create new commission record
    await supabase
      .from('partner_commissions')
      .insert({
        partner_id: referral.partner_id,
        referral_id: referral.id,
        amount: commissionAmount,
        commission_rate: referral.partners.commission_rate,
        month: currentMonth.toString(),
        year: currentYear,
        status: 'pending',
        referrals_count: 1,
      });
  }

  // Update partner statistics
  const { data: stats } = await supabase
    .from('partner_statistics')
    .select('*')
    .eq('partner_id', referral.partner_id)
    .single();

  if (stats) {
    await supabase
      .from('partner_statistics')
      .update({
        active_customers: stats.active_customers + 1,
        total_referrals: stats.total_referrals + 1,
        last_referral_date: new Date().toISOString(),
      })
      .eq('partner_id', referral.partner_id);
  }

  // Check for tier upgrade
  await checkTierUpgrade(supabase, referral.partner_id);

  // Log activity
  await supabase
    .from('partner_activity_logs')
    .insert({
      partner_id: referral.partner_id,
      action: 'referral_converted',
      details: JSON.stringify({
        customer_email,
        plan,
        amount,
        commission: commissionAmount,
      }),
    });
}

async function handleChurnEvent(supabase: any, event: any) {
  const { customer_email, reason } = event.data;

  // Find the referral
  const { data: referral } = await supabase
    .from('partner_referrals')
    .select('*')
    .eq('customer_email', customer_email)
    .single();

  if (!referral) return;

  // Update referral status
  await supabase
    .from('partner_referrals')
    .update({
      status: 'churned',
      churned_at: new Date().toISOString(),
      churn_reason: reason,
    })
    .eq('id', referral.id);

  // Update partner statistics
  const { data: stats } = await supabase
    .from('partner_statistics')
    .select('*')
    .eq('partner_id', referral.partner_id)
    .single();

  if (stats && stats.active_customers > 0) {
    const newActiveCustomers = stats.active_customers - 1;
    const churnRate = ((stats.total_referrals - newActiveCustomers) / stats.total_referrals) * 100;

    await supabase
      .from('partner_statistics')
      .update({
        active_customers: newActiveCustomers,
        churn_rate: churnRate,
      })
      .eq('partner_id', referral.partner_id);
  }

  // Log activity
  await supabase
    .from('partner_activity_logs')
    .insert({
      partner_id: referral.partner_id,
      action: 'referral_churned',
      details: JSON.stringify({
        customer_email,
        reason,
      }),
    });
}

async function handlePaymentEvent(supabase: any, event: any) {
  const { customer_email, amount, subscription_id } = event.data;

  // Find the referral
  const { data: referral } = await supabase
    .from('partner_referrals')
    .select('*, partners!inner(*)')
    .eq('customer_email', customer_email)
    .eq('subscription_id', subscription_id)
    .single();

  if (!referral) return;

  // Update lifetime value
  const newLifetimeValue = (referral.lifetime_value || 0) + amount;
  const commissionRate = referral.partners.commission_rate / 100;
  const additionalCommission = amount * commissionRate;
  const newCommissionEarned = (referral.commission_earned || 0) + additionalCommission;

  await supabase
    .from('partner_referrals')
    .update({
      lifetime_value: newLifetimeValue,
      commission_earned: newCommissionEarned,
      last_payment_date: new Date().toISOString(),
    })
    .eq('id', referral.id);

  // Update monthly commission
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: commission } = await supabase
    .from('partner_commissions')
    .select('*')
    .eq('partner_id', referral.partner_id)
    .eq('month', currentMonth.toString())
    .eq('year', currentYear)
    .single();

  if (commission) {
    await supabase
      .from('partner_commissions')
      .update({
        amount: commission.amount + additionalCommission,
      })
      .eq('id', commission.id);
  } else {
    await supabase
      .from('partner_commissions')
      .insert({
        partner_id: referral.partner_id,
        referral_id: referral.id,
        amount: additionalCommission,
        commission_rate: referral.partners.commission_rate,
        month: currentMonth.toString(),
        year: currentYear,
        status: 'pending',
        referrals_count: 0, // Don't count as new referral
      });
  }

  // Update partner lifetime earnings
  const { data: stats } = await supabase
    .from('partner_statistics')
    .select('*')
    .eq('partner_id', referral.partner_id)
    .single();

  if (stats) {
    await supabase
      .from('partner_statistics')
      .update({
        lifetime_earnings: (stats.lifetime_earnings || 0) + additionalCommission,
      })
      .eq('partner_id', referral.partner_id);
  }
}

async function checkTierUpgrade(supabase: any, partnerId: string) {
  // Get partner and their stats
  const { data: partner } = await supabase
    .from('partners')
    .select('*, partner_statistics!inner(*)')
    .eq('id', partnerId)
    .single();

  if (!partner) return;

  const totalReferrals = partner.partner_statistics.total_referrals;
  const currentTier = partner.tier;
  let newTier = currentTier;
  let newRate = partner.commission_rate;

  // Determine new tier based on total referrals
  if (totalReferrals >= 50) {
    newTier = 'platinum';
    newRate = 30;
  } else if (totalReferrals >= 20) {
    newTier = 'gold';
    newRate = 28;
  } else if (totalReferrals >= 10) {
    newTier = 'silver';
    newRate = 26;
  } else {
    newTier = 'bronze';
    newRate = 25;
  }

  // Update if tier changed
  if (newTier !== currentTier) {
    await supabase
      .from('partners')
      .update({
        tier: newTier,
        commission_rate: newRate,
      })
      .eq('id', partnerId);

    // Log tier upgrade
    await supabase
      .from('partner_activity_logs')
      .insert({
        partner_id: partnerId,
        action: 'tier_upgraded',
        details: JSON.stringify({
          from_tier: currentTier,
          to_tier: newTier,
          new_rate: newRate,
          total_referrals: totalReferrals,
        }),
      });

    // TODO: Send email notification about tier upgrade
  }
}