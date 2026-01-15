// =====================================================
// PADDLE WEBHOOK - REFERRAL ACTIVATION
// Processes referral rewards when payments are confirmed
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendReferralRewardNotification } from '@/lib/resend/sendReferralRewardNotification';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verify Paddle webhook signature
function verifyPaddleWebhook(
  webhookData: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(webhookData);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    // Get webhook signature
    const signature = req.headers.get('paddle-signature');
    const body = await req.text();

    // Verify webhook signature if in production
    if (process.env.NODE_ENV === 'production') {
      const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('PADDLE_WEBHOOK_SECRET not configured');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }

      if (!verifyPaddleWebhook(body, signature, webhookSecret)) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const data = JSON.parse(body);

    // Only process subscription activated or payment success events
    if (!['subscription.activated', 'subscription.payment_succeeded'].includes(data.event_type)) {
      return NextResponse.json({ received: true });
    }

    const supabase = await createClient();
    const customerEmail = data.data?.customer?.email;

    if (!customerEmail) {
      console.warn('No customer email in webhook data');
      return NextResponse.json({ received: true });
    }

    // Find user by email
    const { data: user } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', customerEmail.toLowerCase())
      .single();

    if (!user) {
      console.warn('User not found for email:', customerEmail);
      return NextResponse.json({ received: true });
    }

    // Check for pending referrals for this user
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', user.id)
      .eq('product_type', 'loadvoice')
      .in('status', ['signed_up', 'active'])
      .limit(1);

    if (!referrals || referrals.length === 0) {
      // No referral to process
      return NextResponse.json({ received: true });
    }

    const referral = referrals[0];

    // Get referrer details separately
    const { data: referrerUser } = await supabase
      .from('auth.users')
      .select('email, raw_user_meta_data')
      .eq('id', referral.referrer_id)
      .single();

    // Process the referral reward
    const { data: rewardData, error: rewardError } = await supabase
      .rpc('process_referral_reward', {
        p_referral_id: referral.id
      });

    if (rewardError) {
      console.error('Error processing referral reward:', rewardError);
      return NextResponse.json({ received: true });
    }

    if (rewardData && rewardData.reward_processed) {
      // Get referrer details for email notification
      const referrerEmail = referrerUser?.email;
      const referrerName = referrerUser?.raw_user_meta_data?.full_name ||
                          referrerEmail?.split('@')[0] ||
                          'Friend';

      // Get referred user name
      const { data: referredUser } = await supabase
        .from('auth.users')
        .select('raw_user_meta_data')
        .eq('id', user.id)
        .single();

      const referredName = referredUser?.raw_user_meta_data?.full_name ||
                          customerEmail.split('@')[0];

      // Get referrer's statistics
      const { data: stats } = await supabase
        .from('referral_statistics')
        .select('total_rewards_earned')
        .eq('user_id', referral.referrer_id)
        .single();

      const totalReferrals = stats?.total_rewards_earned || 1;

      // Determine next tier info
      let nextTierInfo;
      if (totalReferrals < 3) {
        nextTierInfo = {
          name: 'Silver Tier',
          referralsNeeded: 3 - totalReferrals,
          reward: '200 minutes'
        };
      } else if (totalReferrals < 5) {
        nextTierInfo = {
          name: 'Gold Tier',
          referralsNeeded: 5 - totalReferrals,
          reward: '500 minutes + $50 credits'
        };
      } else if (totalReferrals < 10) {
        nextTierInfo = {
          name: 'Platinum Tier',
          referralsNeeded: 10 - totalReferrals,
          reward: '1000 minutes + $100 credits'
        };
      }

      // Send reward notification email via Resend
      if (referrerEmail) {
        try {
          await sendReferralRewardNotification({
            email: referrerEmail,
            referrerName,
            referredName,
            rewardMinutes: rewardData.reward_minutes || 0,
            rewardCredits: rewardData.reward_credits_cents || 0,
            currentTier: rewardData.current_tier || 'Bronze',
            totalReferrals,
            nextTierInfo
          });

          console.log('Referral reward notification sent to:', referrerEmail);
        } catch (emailError) {
          console.error('Failed to send reward notification:', emailError);
          // Don't fail the webhook if email fails
        }
      }

      // Log audit
      try {
        await supabase.rpc('log_audit', {
          p_user_id: referral.referrer_id,
          p_action: 'referral_reward_processed',
          p_resource_type: 'referral',
          p_resource_id: referral.id,
          p_metadata: {
            referred_user_id: user.id,
            reward_minutes: rewardData.reward_minutes,
            reward_credits_cents: rewardData.reward_credits_cents,
            tier: rewardData.current_tier,
            webhook_event: data.event_type
          }
        });
      } catch (err) {
        console.warn('Failed to log audit:', err);
      }
    }

    return NextResponse.json({
      received: true,
      processed: rewardData?.reward_processed || false
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}