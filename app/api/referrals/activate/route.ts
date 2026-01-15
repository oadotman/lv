// =====================================================
// MANUAL REFERRAL ACTIVATION API
// For testing and manual activation of referrals
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendReferralRewardNotification } from '@/lib/resend/sendReferralRewardNotification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin (you can adjust this check based on your admin system)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For production, add admin check
    // const isAdmin = user.email === process.env.ADMIN_EMAIL || user.user_metadata?.role === 'admin';
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    // }

    const body = await req.json();
    const { referralId, userEmail } = body;

    if (!referralId && !userEmail) {
      return NextResponse.json(
        { error: 'Referral ID or user email required' },
        { status: 400 }
      );
    }

    let referral;

    if (referralId) {
      // Find referral by ID
      const { data } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:auth.users!referrer_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('id', referralId)
        .single();

      referral = data;
    } else {
      // Find referral by referred email
      const { data } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:auth.users!referrer_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('referred_email', userEmail.toLowerCase())
        .eq('product_type', 'loadvoice')
        .in('status', ['signed_up', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      referral = data;
    }

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found or already processed' },
        { status: 404 }
      );
    }

    // Process the referral reward
    const { data: rewardData, error: rewardError } = await supabase
      .rpc('process_referral_reward', {
        p_referral_id: referral.id
      });

    if (rewardError) {
      console.error('Error processing referral reward:', rewardError);
      return NextResponse.json(
        { error: 'Failed to process reward' },
        { status: 500 }
      );
    }

    if (rewardData && rewardData.reward_processed) {
      // Get additional data for email
      const referrerEmail = referral.referrer?.email;
      const referrerName = referral.referrer?.raw_user_meta_data?.full_name ||
                          referrerEmail?.split('@')[0] ||
                          'Friend';

      // Get referred user name
      let referredName = 'New Customer';
      if (referral.referred_user_id) {
        const { data: referredUser } = await supabase
          .from('auth.users')
          .select('raw_user_meta_data')
          .eq('id', referral.referred_user_id)
          .single();

        referredName = referredUser?.raw_user_meta_data?.full_name ||
                      referral.referred_email.split('@')[0];
      } else {
        referredName = referral.referred_email.split('@')[0];
      }

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

      // Send reward notification email
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
        } catch (emailError) {
          console.error('Failed to send reward notification:', emailError);
        }
      }

      // Log audit
      try {
        await supabase.rpc('log_audit', {
          p_user_id: user.id,
          p_action: 'referral_manual_activation',
          p_resource_type: 'referral',
          p_resource_id: referral.id,
          p_metadata: {
            referrer_id: referral.referrer_id,
            referred_email: referral.referred_email,
            reward_minutes: rewardData.reward_minutes,
            reward_credits_cents: rewardData.reward_credits_cents,
            tier: rewardData.current_tier
          }
        });
      } catch (err) {
        console.warn('Failed to log audit:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'Referral activated and reward processed',
        reward: {
          minutes: rewardData.reward_minutes,
          credits: rewardData.reward_credits_cents,
          tier: rewardData.current_tier
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Reward already processed or not eligible'
    });

  } catch (error) {
    console.error('Manual activation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}