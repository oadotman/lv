// =====================================================
// REFERRAL REWARDS CLAIM API
// Handles claiming referral rewards
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: Claim available rewards
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { rewardId, claimType = 'all' } = body;

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, organization:organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // If specific reward ID provided, claim that one
    if (rewardId) {
      const { data: reward, error: rewardError } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('id', rewardId)
        .eq('user_id', user.id)
        .single();

      if (rewardError || !reward) {
        return NextResponse.json(
          { error: 'Reward not found' },
          { status: 404 }
        );
      }

      if (reward.claimed) {
        return NextResponse.json(
          { error: 'Reward already claimed' },
          { status: 400 }
        );
      }

      // Check if reward expired
      if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Reward has expired' },
          { status: 400 }
        );
      }

      // Claim the reward
      const { error: claimError } = await supabase
        .from('referral_rewards')
        .update({
          claimed: true,
          claimed_at: new Date().toISOString(),
          applied_to_account: true,
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rewardId);

      if (claimError) {
        console.error('Error claiming reward:', claimError);
        return NextResponse.json(
          { error: 'Failed to claim reward' },
          { status: 500 }
        );
      }

      // Update statistics
      const updates: any = {
        total_minutes_claimed: reward.reward_minutes || 0,
        total_credits_claimed_cents: reward.reward_credits_cents || 0,
        available_minutes: -(reward.reward_minutes || 0),
        available_credits_cents: -(reward.reward_credits_cents || 0),
      };

      for (const [column, value] of Object.entries(updates)) {
        if (value !== 0) {
          await supabase.rpc('increment_counter', {
            table_name: 'referral_statistics',
            user_id: user.id,
            column_name: column,
            increment_value: value,
          });
        }
      }

      // Apply to organization balance
      if (reward.reward_minutes > 0 || reward.reward_credits_cents > 0) {
        const { error: orgUpdateError } = await supabase
          .from('organizations')
          .update({
            bonus_minutes_balance: userOrg.organization.bonus_minutes_balance + (reward.reward_minutes || 0),
            bonus_credits_balance_cents: userOrg.organization.bonus_credits_balance_cents + (reward.reward_credits_cents || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userOrg.organization_id);

        if (orgUpdateError) {
          console.error('Error updating organization balance:', orgUpdateError);
        }
      }

      // Log audit
      await supabase.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'referral_reward_claimed',
        p_resource_type: 'reward',
        p_resource_id: rewardId,
        p_metadata: {
          minutes: reward.reward_minutes,
          credits_cents: reward.reward_credits_cents,
          tier: reward.tier_reached,
        },
      });

      return NextResponse.json({
        success: true,
        claimed: {
          minutes: reward.reward_minutes || 0,
          credits: reward.reward_credits_cents || 0,
        },
        message: 'Reward claimed successfully',
      });
    }

    // Claim all available rewards
    if (claimType === 'all') {
      const { data: unclaimedRewards, error: fetchError } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('claimed', false)
        .gt('expires_at', new Date().toISOString());

      if (fetchError || !unclaimedRewards || unclaimedRewards.length === 0) {
        return NextResponse.json(
          { error: 'No unclaimed rewards available' },
          { status: 404 }
        );
      }

      let totalMinutes = 0;
      let totalCredits = 0;

      // Claim all rewards
      for (const reward of unclaimedRewards) {
        await supabase
          .from('referral_rewards')
          .update({
            claimed: true,
            claimed_at: new Date().toISOString(),
            applied_to_account: true,
            applied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reward.id);

        totalMinutes += reward.reward_minutes || 0;
        totalCredits += reward.reward_credits_cents || 0;
      }

      // Update statistics
      if (totalMinutes > 0 || totalCredits > 0) {
        await supabase
          .from('referral_statistics')
          .update({
            total_minutes_claimed: supabase.raw(`total_minutes_claimed + ${totalMinutes}`),
            total_credits_claimed_cents: supabase.raw(`total_credits_claimed_cents + ${totalCredits}`),
            available_minutes: supabase.raw(`GREATEST(0, available_minutes - ${totalMinutes})`),
            available_credits_cents: supabase.raw(`GREATEST(0, available_credits_cents - ${totalCredits})`),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        // Apply to organization balance
        await supabase
          .from('organizations')
          .update({
            bonus_minutes_balance: supabase.raw(`bonus_minutes_balance + ${totalMinutes}`),
            bonus_credits_balance_cents: supabase.raw(`bonus_credits_balance_cents + ${totalCredits}`),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userOrg.organization_id);
      }

      // Log audit
      await supabase.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'referral_rewards_claimed_bulk',
        p_resource_type: 'reward',
        p_metadata: {
          count: unclaimedRewards.length,
          total_minutes: totalMinutes,
          total_credits_cents: totalCredits,
        },
      });

      return NextResponse.json({
        success: true,
        claimed: {
          count: unclaimedRewards.length,
          minutes: totalMinutes,
          credits: totalCredits,
        },
        message: `Successfully claimed ${unclaimedRewards.length} rewards`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid claim type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Reward claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get available rewards to claim
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get unclaimed rewards
    const { data: unclaimedRewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select(`
        *,
        referral:referrals!referral_id (
          referred_email,
          referred_user:auth.users!referred_user_id (
            email,
            raw_user_meta_data
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('claimed', false)
      .order('created_at', { ascending: false });

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
      return NextResponse.json(
        { error: 'Failed to fetch rewards' },
        { status: 500 }
      );
    }

    // Separate active and expired rewards
    const now = new Date();
    const activeRewards = unclaimedRewards?.filter(r =>
      !r.expires_at || new Date(r.expires_at) > now
    ) || [];
    const expiredRewards = unclaimedRewards?.filter(r =>
      r.expires_at && new Date(r.expires_at) <= now
    ) || [];

    // Calculate totals
    const totalAvailableMinutes = activeRewards.reduce(
      (sum, r) => sum + (r.reward_minutes || 0), 0
    );
    const totalAvailableCredits = activeRewards.reduce(
      (sum, r) => sum + (r.reward_credits_cents || 0), 0
    );

    return NextResponse.json({
      activeRewards,
      expiredRewards,
      summary: {
        totalActive: activeRewards.length,
        totalExpired: expiredRewards.length,
        totalAvailableMinutes,
        totalAvailableCredits,
      },
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}