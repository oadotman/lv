// =====================================================
// REFERRAL HISTORY API
// Handles fetching user's referral history and statistics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // Optional filter by status

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('referrals')
      .select(`
        *,
        referred_user:auth.users!referred_user_id (
          email,
          raw_user_meta_data
        )
      `, { count: 'exact' })
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (status && ['pending', 'clicked', 'signed_up', 'active', 'rewarded'].includes(status)) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: referrals, count, error: referralsError } = await query;

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
      return NextResponse.json(
        { error: 'Failed to fetch referral history' },
        { status: 500 }
      );
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('referral_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get rewards history
    const { data: rewards } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get current and next tier info
    const currentTier = stats?.current_tier || 0;
    const { data: tiers } = await supabase
      .from('referral_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    const currentTierInfo = tiers?.find(t => t.tier_level === currentTier);
    const nextTierInfo = tiers?.find(t => t.tier_level === currentTier + 1);

    // Calculate progress to next tier
    const totalSuccessful = stats?.total_active || 0;
    const progressToNextTier = nextTierInfo
      ? {
          current: totalSuccessful,
          required: nextTierInfo.referrals_required,
          percentage: Math.min(
            100,
            Math.round((totalSuccessful / nextTierInfo.referrals_required) * 100)
          ),
        }
      : null;

    return NextResponse.json({
      referrals: referrals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      statistics: {
        totalSent: stats?.total_referrals_sent || 0,
        totalClicks: stats?.total_clicks || 0,
        totalSignups: stats?.total_signups || 0,
        totalActive: stats?.total_active || 0,
        totalRewarded: stats?.total_rewarded || 0,
        currentTier: currentTier,
        currentTierName: currentTierInfo?.tier_name || 'None',
        nextTier: nextTierInfo?.tier_level,
        nextTierName: nextTierInfo?.tier_name,
        progressToNextTier,
        totalMinutesEarned: stats?.total_minutes_earned || 0,
        totalCreditsEarned: stats?.total_credits_earned_cents || 0,
        availableMinutes: stats?.available_minutes || 0,
        availableCredits: stats?.available_credits_cents || 0,
      },
      recentRewards: rewards || [],
      tiers: tiers || [],
    });
  } catch (error) {
    console.error('Referral history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}