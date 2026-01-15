/**
 * Simple Analytics API
 * Provides straightforward, actionable analytics without complexity
 * Focus on what freight brokers actually need to know
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const organizationId = userOrg.organization_id;
    const adminSupabase = createAdminClient();

    // Get time range from query params (default: last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Parallel fetch all analytics data
    const [
      callMetrics,
      loadMetrics,
      carrierMetrics,
      financialMetrics,
      recentActivity
    ] = await Promise.all([
      getCallMetrics(adminSupabase, organizationId, startDate, endDate),
      getLoadMetrics(adminSupabase, organizationId, startDate, endDate),
      getCarrierMetrics(adminSupabase, organizationId, startDate, endDate),
      getFinancialMetrics(adminSupabase, organizationId, startDate, endDate),
      getRecentActivity(adminSupabase, organizationId)
    ]);

    return NextResponse.json({
      success: true,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days
      },
      metrics: {
        calls: callMetrics,
        loads: loadMetrics,
        carriers: carrierMetrics,
        financial: financialMetrics
      },
      recentActivity,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Call Metrics - How many calls, success rate, average duration
 */
async function getCallMetrics(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Total calls in period
  const { data: calls } = await supabase
    .from('calls')
    .select('id, status, duration_seconds, created_at')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const totalCalls = calls?.length || 0;
  const completedCalls = calls?.filter((c: any) => c.status === 'completed').length || 0;
  const avgDuration = calls?.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / (completedCalls || 1);

  // Daily breakdown for chart
  const dailyCallVolume = getDailyBreakdown(calls || [], 'created_at');

  // Success rate for transcription/extraction
  const { data: processed } = await supabase
    .from('calls')
    .select('transcription_status, extraction_status')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const transcriptionSuccess = processed?.filter((p: any) => p.transcription_status === 'completed').length || 0;
  const extractionSuccess = processed?.filter((p: any) => p.extraction_status === 'completed').length || 0;

  return {
    total: totalCalls,
    completed: completedCalls,
    averageDuration: Math.round(avgDuration),
    transcriptionRate: totalCalls > 0 ? Math.round((transcriptionSuccess / totalCalls) * 100) : 0,
    extractionRate: totalCalls > 0 ? Math.round((extractionSuccess / totalCalls) * 100) : 0,
    dailyVolume: dailyCallVolume,
    trend: calculateTrend(dailyCallVolume)
  };
}

/**
 * Load Metrics - Status distribution, completion rate
 */
async function getLoadMetrics(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get all loads in period
  const { data: loads } = await supabase
    .from('loads')
    .select('id, status, rate_amount, created_at, pickup_date, delivery_date')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .is('deleted_at', null);

  // Status distribution
  const statusCounts = loads?.reduce((acc: any, load: any) => {
    acc[load.status] = (acc[load.status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Calculate key metrics
  const totalLoads = loads?.length || 0;
  const deliveredLoads = statusCounts.delivered || 0;
  const cancelledLoads = statusCounts.cancelled || 0;
  const activeLoads = (statusCounts['in-transit'] || 0) + (statusCounts.dispatched || 0);

  // Average rate
  const totalRevenue = loads?.reduce((sum: number, l: any) => sum + (l.rate_amount || 0), 0) || 0;
  const avgRate = totalLoads > 0 ? totalRevenue / totalLoads : 0;

  return {
    total: totalLoads,
    statusBreakdown: statusCounts,
    active: activeLoads,
    delivered: deliveredLoads,
    cancelled: cancelledLoads,
    completionRate: totalLoads > 0 ? Math.round((deliveredLoads / totalLoads) * 100) : 0,
    averageRate: Math.round(avgRate),
    totalRevenue: Math.round(totalRevenue),
    dailyCreated: getDailyBreakdown(loads || [], 'created_at')
  };
}

/**
 * Carrier Metrics - Top performers, utilization
 */
async function getCarrierMetrics(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get loads with carrier info
  const { data: carrierLoads } = await supabase
    .from('loads')
    .select(`
      id,
      status,
      rate_amount,
      carrier_id,
      carriers!left(
        id,
        carrier_name,
        mc_number
      )
    `)
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('carrier_id', 'is', null);

  // Group by carrier
  const carrierStats = carrierLoads?.reduce((acc: any, load: any) => {
    if (!load.carriers) return acc;

    const carrierId = load.carrier_id;
    if (!acc[carrierId]) {
      acc[carrierId] = {
        name: load.carriers.carrier_name,
        mcNumber: load.carriers.mc_number,
        loads: 0,
        revenue: 0,
        delivered: 0
      };
    }

    acc[carrierId].loads++;
    acc[carrierId].revenue += load.rate_amount || 0;
    if (load.status === 'delivered') acc[carrierId].delivered++;

    return acc;
  }, {}) || {};

  // Convert to array and sort by load count
  const topCarriers = Object.values(carrierStats)
    .sort((a: any, b: any) => b.loads - a.loads)
    .slice(0, 5);

  // Get total active carriers
  const { count: activeCarriers } = await supabase
    .from('carriers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'active');

  return {
    activeCarriers: activeCarriers || 0,
    topPerformers: topCarriers,
    totalLoadsAssigned: carrierLoads?.length || 0,
    averageLoadsPerCarrier: activeCarriers > 0 ? Math.round((carrierLoads?.length || 0) / activeCarriers) : 0
  };
}

/**
 * Financial Metrics - Revenue, overage charges, trends
 */
async function getFinancialMetrics(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get all completed loads for revenue
  const { data: completedLoads } = await supabase
    .from('loads')
    .select('rate_amount, delivery_date')
    .eq('organization_id', orgId)
    .eq('status', 'delivered')
    .gte('delivery_date', startDate.toISOString())
    .lte('delivery_date', endDate.toISOString());

  const totalRevenue = completedLoads?.reduce((sum: number, l: any) => sum + (l.rate_amount || 0), 0) || 0;

  // Get overage charges
  const { data: org } = await supabase
    .from('organizations')
    .select('overage_minutes_current, overage_debt_amount')
    .eq('id', orgId)
    .single();

  const overageCharges = (org?.overage_minutes_current || 0) * 0.20; // $0.20 per minute

  // Calculate daily revenue for trend
  const dailyRevenue = completedLoads?.reduce((acc: any, load: any) => {
    const date = new Date(load.delivery_date).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + (load.rate_amount || 0);
    return acc;
  }, {}) || {};

  return {
    totalRevenue: Math.round(totalRevenue),
    averageDealSize: completedLoads?.length > 0 ? Math.round(totalRevenue / completedLoads.length) : 0,
    overageCharges: Math.round(overageCharges),
    overageDebt: org?.overage_debt_amount || 0,
    dailyRevenue,
    revenueGrowth: calculateGrowthRate(dailyRevenue)
  };
}

/**
 * Get recent activity for activity feed
 */
async function getRecentActivity(supabase: any, orgId: string) {
  const { data: activities } = await supabase
    .from('load_activities')
    .select(`
      id,
      activity_type,
      description,
      created_at,
      loads!inner(
        load_number,
        status
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  return activities?.map((a: any) => ({
    type: a.activity_type,
    description: a.description,
    loadNumber: a.loads?.load_number,
    timestamp: a.created_at
  })) || [];
}

/**
 * Helper: Calculate daily breakdown from array of records
 */
function getDailyBreakdown(records: any[], dateField: string) {
  const breakdown: Record<string, number> = {};

  records.forEach(record => {
    const date = new Date(record[dateField]).toISOString().split('T')[0];
    breakdown[date] = (breakdown[date] || 0) + 1;
  });

  return breakdown;
}

/**
 * Helper: Calculate trend (up/down/stable)
 */
function calculateTrend(dailyData: Record<string, number>): 'up' | 'down' | 'stable' {
  const dates = Object.keys(dailyData).sort();
  if (dates.length < 7) return 'stable';

  // Compare last 7 days to previous 7 days
  const recent = dates.slice(-7).reduce((sum, date) => sum + dailyData[date], 0);
  const previous = dates.slice(-14, -7).reduce((sum, date) => sum + dailyData[date], 0);

  if (recent > previous * 1.1) return 'up';
  if (recent < previous * 0.9) return 'down';
  return 'stable';
}

/**
 * Helper: Calculate growth rate percentage
 */
function calculateGrowthRate(dailyData: Record<string, number>): number {
  const dates = Object.keys(dailyData).sort();
  if (dates.length < 14) return 0;

  const recent = dates.slice(-7).reduce((sum, date) => sum + dailyData[date], 0);
  const previous = dates.slice(-14, -7).reduce((sum, date) => sum + dailyData[date], 0);

  if (previous === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - previous) / previous) * 100);
}