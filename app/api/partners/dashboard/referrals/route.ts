// =====================================================
// PARTNER REFERRALS API
// Manage and track partner referrals
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const partnerToken = cookieStore.get('partner_token')?.value;

    if (!partnerToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Verify partner session
    const { data: session, error: sessionError } = await supabase
      .from('partner_sessions')
      .select('partner_id')
      .eq('token', partnerToken)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const partnerId = session.partner_id;

    // Get filter parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    let query = supabase
      .from('partner_referrals')
      .select(`
        *,
        organizations (
          name,
          subscription_status,
          subscription_plan
        )
      `)
      .eq('partner_id', partnerId);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: referrals, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get click statistics for each referral
    const referralIds = referrals?.map(r => r.id) || [];

    const { data: clickStats } = await supabase
      .from('partner_clicks')
      .select('referral_id, count')
      .in('referral_id', referralIds);

    // Combine data
    const enrichedReferrals = referrals?.map(referral => {
      const clicks = clickStats?.find(c => c.referral_id === referral.id);
      return {
        ...referral,
        total_clicks: clicks?.count || 0,
      };
    });

    // Calculate summary statistics
    const summary = {
      total: referrals?.length || 0,
      leads: referrals?.filter(r => r.status === 'lead').length || 0,
      trials: referrals?.filter(r => r.status === 'trial').length || 0,
      converted: referrals?.filter(r => r.status === 'converted').length || 0,
      churned: referrals?.filter(r => r.status === 'churned').length || 0,
      total_value: referrals?.reduce((sum, r) => sum + (r.lifetime_value || 0), 0) || 0,
      total_commission: referrals?.reduce((sum, r) => sum + (r.commission_earned || 0), 0) || 0,
    };

    return NextResponse.json({
      referrals: enrichedReferrals,
      summary,
    });
  } catch (error) {
    console.error('Referrals API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate new referral link
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const partnerToken = cookieStore.get('partner_token')?.value;

    if (!partnerToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Verify partner session
    const { data: session } = await supabase
      .from('partner_sessions')
      .select('partner_id')
      .eq('token', partnerToken)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { campaign, utm_source, utm_medium, utm_campaign } = body;

    // Get partner's referral code
    const { data: partner } = await supabase
      .from('partners')
      .select('referral_code')
      .eq('id', session.partner_id)
      .single();

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Build custom link with UTM parameters
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.loadvoice.com';
    const url = new URL('/signup', baseUrl);
    url.searchParams.append('ref', partner.referral_code);

    if (campaign) url.searchParams.append('campaign', campaign);
    if (utm_source) url.searchParams.append('utm_source', utm_source);
    if (utm_medium) url.searchParams.append('utm_medium', utm_medium);
    if (utm_campaign) url.searchParams.append('utm_campaign', utm_campaign);

    // Log link generation
    await supabase
      .from('partner_activity_logs')
      .insert({
        partner_id: session.partner_id,
        action: 'generated_custom_link',
        details: JSON.stringify({ campaign, utm_source, utm_medium, utm_campaign }),
      });

    return NextResponse.json({
      link: url.toString(),
      referral_code: partner.referral_code,
    });
  } catch (error) {
    console.error('Generate link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}