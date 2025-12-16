// =====================================================
// PARTNER ANALYTICS API
// Comprehensive analytics and reporting for partners
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

    const partnerId = session.partner_id;

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30days';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    let dateFrom: Date;
    let dateTo: Date = new Date();

    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      switch (period) {
        case '7days':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Get click analytics
    const { data: clickData } = await supabase
      .from('partner_clicks')
      .select('*')
      .eq('partner_id', partnerId)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString());

    // Get referral analytics
    const { data: referralData } = await supabase
      .from('partner_referrals')
      .select('*')
      .eq('partner_id', partnerId)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString());

    // Get commission analytics
    const { data: commissionData } = await supabase
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    // Calculate metrics
    const metrics = calculateMetrics(clickData, referralData, commissionData);

    // Generate time series data
    const timeSeries = generateTimeSeries(clickData, referralData, dateFrom, dateTo);

    // Get conversion funnel
    const funnel = calculateFunnel(clickData, referralData);

    // Get top performing campaigns
    const campaigns = analyzeCampaigns(clickData, referralData);

    // Get customer lifetime value distribution
    const ltvDistribution = calculateLTVDistribution(referralData);

    return NextResponse.json({
      metrics,
      timeSeries,
      funnel,
      campaigns,
      ltvDistribution,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateMetrics(clicks: any[], referrals: any[], commissions: any[]) {
  const totalClicks = clicks?.length || 0;
  const totalReferrals = referrals?.length || 0;
  const convertedReferrals = referrals?.filter(r => r.status === 'converted').length || 0;
  const activeCustomers = referrals?.filter(r => r.status === 'converted' && !r.churned_at).length || 0;
  const churnedCustomers = referrals?.filter(r => r.churned_at).length || 0;

  const conversionRate = totalClicks > 0 ? (totalReferrals / totalClicks) * 100 : 0;
  const customerConversionRate = totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0;
  const churnRate = convertedReferrals > 0 ? (churnedCustomers / convertedReferrals) * 100 : 0;

  const totalRevenue = referrals?.reduce((sum, r) => sum + (r.lifetime_value || 0), 0) || 0;
  const totalCommissions = commissions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
  const averageOrderValue = convertedReferrals > 0 ? totalRevenue / convertedReferrals : 0;

  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = referrals
    ?.filter(r => r.status === 'converted' && !r.churned_at)
    .reduce((sum, r) => sum + (r.subscription_value || 0), 0) || 0;

  return {
    totalClicks,
    totalReferrals,
    convertedReferrals,
    activeCustomers,
    conversionRate: conversionRate.toFixed(2),
    customerConversionRate: customerConversionRate.toFixed(2),
    churnRate: churnRate.toFixed(2),
    totalRevenue,
    totalCommissions,
    averageOrderValue,
    monthlyRecurringRevenue: mrr,
    averageCommissionPerCustomer: convertedReferrals > 0 ? totalCommissions / convertedReferrals : 0,
  };
}

function generateTimeSeries(clicks: any[], referrals: any[], dateFrom: Date, dateTo: Date) {
  const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
  const series: any[] = [];

  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(dateFrom);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayClicks = clicks?.filter(c =>
      c.created_at.startsWith(dateStr)
    ).length || 0;

    const dayReferrals = referrals?.filter(r =>
      r.created_at.startsWith(dateStr)
    ).length || 0;

    const dayConversions = referrals?.filter(r =>
      r.converted_at?.startsWith(dateStr)
    ).length || 0;

    series.push({
      date: dateStr,
      clicks: dayClicks,
      referrals: dayReferrals,
      conversions: dayConversions,
    });
  }

  return series;
}

function calculateFunnel(clicks: any[], referrals: any[]) {
  const totalClicks = clicks?.length || 0;
  const uniqueVisitors = new Set(clicks?.map(c => c.visitor_id)).size;
  const signups = referrals?.filter(r => r.status !== 'lead').length || 0;
  const trials = referrals?.filter(r => ['trial', 'converted'].includes(r.status)).length || 0;
  const conversions = referrals?.filter(r => r.status === 'converted').length || 0;

  return [
    { stage: 'Clicks', value: totalClicks, percentage: 100 },
    { stage: 'Unique Visitors', value: uniqueVisitors, percentage: totalClicks > 0 ? (uniqueVisitors / totalClicks) * 100 : 0 },
    { stage: 'Signups', value: signups, percentage: totalClicks > 0 ? (signups / totalClicks) * 100 : 0 },
    { stage: 'Trials', value: trials, percentage: totalClicks > 0 ? (trials / totalClicks) * 100 : 0 },
    { stage: 'Conversions', value: conversions, percentage: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0 },
  ];
}

function analyzeCampaigns(clicks: any[], referrals: any[]) {
  const campaignMap = new Map();

  // Aggregate clicks by campaign
  clicks?.forEach(click => {
    const campaign = click.utm_campaign || 'Direct';
    if (!campaignMap.has(campaign)) {
      campaignMap.set(campaign, {
        name: campaign,
        clicks: 0,
        referrals: 0,
        conversions: 0,
        revenue: 0,
      });
    }
    const data = campaignMap.get(campaign);
    data.clicks++;
  });

  // Aggregate referrals by campaign
  referrals?.forEach(referral => {
    const campaign = referral.utm_campaign || 'Direct';
    if (!campaignMap.has(campaign)) {
      campaignMap.set(campaign, {
        name: campaign,
        clicks: 0,
        referrals: 0,
        conversions: 0,
        revenue: 0,
      });
    }
    const data = campaignMap.get(campaign);
    data.referrals++;
    if (referral.status === 'converted') {
      data.conversions++;
      data.revenue += referral.lifetime_value || 0;
    }
  });

  // Calculate conversion rates
  const campaigns = Array.from(campaignMap.values()).map(campaign => ({
    ...campaign,
    conversionRate: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0,
    averageRevenue: campaign.conversions > 0 ? campaign.revenue / campaign.conversions : 0,
  }));

  // Sort by revenue
  campaigns.sort((a, b) => b.revenue - a.revenue);

  return campaigns.slice(0, 10); // Top 10 campaigns
}

function calculateLTVDistribution(referrals: any[]) {
  const ranges = [
    { min: 0, max: 100, label: '$0-100', count: 0, revenue: 0 },
    { min: 100, max: 500, label: '$100-500', count: 0, revenue: 0 },
    { min: 500, max: 1000, label: '$500-1K', count: 0, revenue: 0 },
    { min: 1000, max: 5000, label: '$1K-5K', count: 0, revenue: 0 },
    { min: 5000, max: 10000, label: '$5K-10K', count: 0, revenue: 0 },
    { min: 10000, max: Infinity, label: '$10K+', count: 0, revenue: 0 },
  ];

  referrals?.forEach(referral => {
    if (referral.status === 'converted') {
      const ltv = referral.lifetime_value || 0;
      const range = ranges.find(r => ltv >= r.min && ltv < r.max);
      if (range) {
        range.count++;
        range.revenue += ltv;
      }
    }
  });

  return ranges.map(range => ({
    label: range.label,
    count: range.count,
    revenue: range.revenue,
    percentage: referrals?.filter(r => r.status === 'converted').length > 0 ?
      (range.count / referrals.filter(r => r.status === 'converted').length) * 100 : 0,
  }));
}