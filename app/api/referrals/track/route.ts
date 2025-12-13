// =====================================================
// REFERRAL TRACKING API
// Handles tracking referral clicks and conversions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: Track referral link click
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referralCode, action } = body;

    if (!referralCode || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    if (action === 'click') {
      // Track click without authentication
      const ipAddress = req.headers.get('x-forwarded-for') ||
                       req.headers.get('x-real-ip') ||
                       'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Record click
      await supabase
        .from('referral_click_tracking')
        .insert({
          referral_code: referralCode,
          ip_address: ipAddress === 'unknown' ? null : ipAddress,
          user_agent: userAgent,
          referer: req.headers.get('referer'),
          utm_source: body.utmSource,
          utm_medium: body.utmMedium,
          utm_campaign: body.utmCampaign,
        });

      // Update click count on referral
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, clicked_count')
        .eq('referral_code', referralCode)
        .single();

      if (referral) {
        await supabase
          .from('referrals')
          .update({
            clicked_count: (referral.clicked_count || 0) + 1,
            last_clicked_at: new Date().toISOString(),
            status: referral.clicked_count === 0 ? 'clicked' : undefined,
          })
          .eq('id', referral.id);

        // Update statistics
        const { data: referrerData } = await supabase
          .from('referrals')
          .select('referrer_id')
          .eq('id', referral.id)
          .single();

        if (referrerData) {
          await supabase.rpc('increment_counter', {
            table_name: 'referral_statistics',
            user_id: referrerData.referrer_id,
            column_name: 'total_clicks',
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'signup') {
      // Track signup (requires authentication)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Find referral by code and email
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('referred_email', user.email?.toLowerCase())
        .single();

      if (referralError || !referral) {
        return NextResponse.json(
          { error: 'Referral not found' },
          { status: 404 }
        );
      }

      // Update referral status
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          referred_user_id: user.id,
          status: 'signed_up',
          signup_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Error updating referral:', updateError);
        return NextResponse.json(
          { error: 'Failed to update referral' },
          { status: 500 }
        );
      }

      // Update statistics
      await supabase.rpc('increment_counter', {
        table_name: 'referral_statistics',
        user_id: referral.referrer_id,
        column_name: 'total_signups',
      });

      // Log audit
      await supabase.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'referral_signup',
        p_resource_type: 'referral',
        p_resource_id: referral.id,
        p_metadata: {
          referrer_id: referral.referrer_id,
          referral_code: referralCode,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Referral signup tracked',
      });
    }

    if (action === 'activate') {
      // Track activation (when referred user becomes paying customer)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Find referral by referred user
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', user.id)
        .eq('status', 'signed_up')
        .single();

      if (referralError || !referral) {
        // No referral to activate
        return NextResponse.json({
          success: false,
          message: 'No pending referral found',
        });
      }

      // Update referral status to active
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Error activating referral:', updateError);
        return NextResponse.json(
          { error: 'Failed to activate referral' },
          { status: 500 }
        );
      }

      // Process rewards
      const { data: rewardProcessed } = await supabase
        .rpc('process_referral_reward', { p_referral_id: referral.id });

      if (rewardProcessed) {
        // Send notification to referrer
        await supabase
          .from('notifications')
          .insert({
            user_id: referral.referrer_id,
            notification_type: 'referral_reward',
            title: 'Referral Reward Earned!',
            message: `Your referral has become a paying customer. Check your rewards!`,
            link: '/referrals',
          });
      }

      // Log audit
      await supabase.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'referral_activated',
        p_resource_type: 'referral',
        p_resource_id: referral.id,
        p_metadata: {
          referrer_id: referral.referrer_id,
          reward_processed: rewardProcessed,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Referral activated',
        rewardProcessed,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Referral tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get referral status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referralCode = searchParams.get('code');

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get referral details (public info only)
    const { data: referral, error } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        referrer:auth.users!referrer_id (
          raw_user_meta_data
        )
      `)
      .eq('referral_code', referralCode)
      .single();

    if (error || !referral) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      );
    }

    // Get tier benefits
    const { data: tiers } = await supabase
      .from('referral_tiers')
      .select('*')
      .eq('tier_level', 1)
      .single();

    return NextResponse.json({
      valid: true,
      referrerName: referral.referrer?.raw_user_meta_data?.full_name || 'A friend',
      benefits: {
        minutes: tiers?.reward_minutes || 60,
        credits: tiers?.reward_credits_cents || 0,
        description: tiers?.description || 'Get started with free minutes',
      },
    });
  } catch (error) {
    console.error('Referral status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}