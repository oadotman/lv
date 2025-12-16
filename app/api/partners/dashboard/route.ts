// =====================================================
// PARTNER DASHBOARD API
// Main dashboard statistics and overview data
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

    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('partner_statistics')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    // Get recent referrals (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentReferrals } = await supabase
      .from('partner_referrals')
      .select(`
        id,
        customer_email,
        status,
        created_at,
        converted_at,
        subscription_value
      `)
      .eq('partner_id', partnerId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Get pending commissions
    const { data: pendingCommissions } = await supabase
      .from('partner_commissions')
      .select('amount')
      .eq('partner_id', partnerId)
      .eq('status', 'pending');

    const totalPending = pendingCommissions?.reduce((sum, c) => sum + c.amount, 0) || 0;

    // Get this month's earnings
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: monthlyEarnings } = await supabase
      .from('partner_commissions')
      .select('amount')
      .eq('partner_id', partnerId)
      .eq('month', currentMonth.toString())
      .eq('year', currentYear)
      .in('status', ['pending', 'approved', 'paid']);

    const thisMonthTotal = monthlyEarnings?.reduce((sum, c) => sum + c.amount, 0) || 0;

    // Calculate conversion rate
    const { count: totalClicks } = await supabase
      .from('partner_clicks')
      .select('*', { count: 'exact' })
      .eq('partner_id', partnerId);

    const { count: totalConversions } = await supabase
      .from('partner_referrals')
      .select('*', { count: 'exact' })
      .eq('partner_id', partnerId)
      .eq('status', 'converted');

    const conversionRate = totalClicks && totalConversions ?
      ((totalConversions / totalClicks) * 100).toFixed(2) : '0';

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('partner_activity_logs')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        tier: partner.tier,
        commission_rate: partner.commission_rate,
        referral_code: partner.referral_code,
        signup_link: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${partner.referral_code}`,
      },
      statistics: {
        total_referrals: stats?.total_referrals || 0,
        active_customers: stats?.active_customers || 0,
        lifetime_earnings: stats?.lifetime_earnings || 0,
        pending_earnings: totalPending,
        this_month_earnings: thisMonthTotal,
        conversion_rate: conversionRate,
        total_clicks: totalClicks || 0,
      },
      recent_referrals: recentReferrals || [],
      recent_activity: recentActivity || [],
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}