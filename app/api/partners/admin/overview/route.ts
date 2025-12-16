// =====================================================
// ADMIN PARTNER OVERVIEW API
// Get partner program statistics and overview data
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userOrg?.role !== 'owner' && userOrg?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get overall statistics with proper null handling
    const [
      partnersResult,
      applicationsResult,
      referralsResult,
      commissionsResult
    ] = await Promise.all([
      // Active partners
      supabase
        .from('partners')
        .select('*')
        .eq('status', 'active'),

      // Pending applications
      supabase
        .from('partner_applications')
        .select('*')
        .eq('status', 'pending'),

      // All referrals
      supabase
        .from('partner_referrals')
        .select('*'),

      // All commissions
      supabase
        .from('partner_commissions')
        .select('*')
    ]);

    // Calculate statistics with null safety
    const activePartners = partnersResult.data || [];
    const pendingApplications = applicationsResult.data || [];
    const allReferrals = referralsResult.data || [];
    const allCommissions = commissionsResult.data || [];

    const stats = {
      totalPartners: activePartners.length,
      pendingApplications: pendingApplications.length,
      activeReferrals: allReferrals.filter(r => r.status === 'active').length,
      totalReferrals: allReferrals.length,
      totalCommissionsPaid: allCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
      pendingCommissions: allCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
    };

    // Get recent activity with null safety
    const recentActivity = [];

    // Add recent applications
    if (applicationsResult.data && applicationsResult.data.length > 0) {
      applicationsResult.data.slice(0, 3).forEach(app => {
        recentActivity.push({
          type: 'application',
          description: `New application from ${app.full_name}`,
          timestamp: app.submitted_at,
          status: app.status
        });
      });
    }

    // Add recent referrals
    if (allReferrals.length > 0) {
      allReferrals
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 3)
        .forEach(ref => {
          recentActivity.push({
            type: 'referral',
            description: `New referral: ${ref.customer_email}`,
            timestamp: ref.created_at,
            status: ref.status
          });
        });
    }

    // Sort activity by timestamp
    recentActivity.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // Get top performers with null safety
    const partnerStats = await Promise.all(
      activePartners.map(async (partner) => {
        const { data: stats } = await supabase
          .from('partner_statistics')
          .select('*')
          .eq('partner_id', partner.id)
          .single();

        return {
          id: partner.id,
          name: partner.full_name || partner.email,
          email: partner.email,
          tier: partner.tier,
          totalReferrals: stats?.total_customers || 0,
          totalRevenue: (stats?.total_revenue_generated || 0) / 100,
          totalEarnings: (stats?.total_commission_earned || 0) / 100,
          conversionRate: stats?.conversion_rate || 0,
        };
      })
    );

    // Sort by total earnings to get top performers
    const topPerformers = partnerStats
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5);

    // Calculate monthly trends (last 6 months) with null safety
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

      const monthCommissions = allCommissions.filter(c => {
        const commDate = new Date(c.calculated_at || c.created_at);
        return commDate.getMonth() + 1 === month && commDate.getFullYear() === year;
      });

      const monthReferrals = allReferrals.filter(r => {
        const refDate = new Date(r.created_at);
        return refDate.getMonth() + 1 === month && refDate.getFullYear() === year;
      });

      monthlyData.push({
        month: monthStr,
        referrals: monthReferrals.length,
        revenue: monthCommissions.reduce((sum, c) => sum + (c.base_amount_cents || 0), 0) / 100,
        commissions: monthCommissions.reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
      });
    }

    // Reverse to show oldest to newest
    monthlyData.reverse();

    return NextResponse.json({
      stats,
      recentActivity: recentActivity.slice(0, 10),
      topPerformers,
      monthlyTrends: monthlyData,
      partners: activePartners.map(p => ({
        id: p.id,
        name: p.full_name || p.email,
        email: p.email,
        tier: p.tier,
        status: p.status,
        joinedAt: p.created_at,
      }))
    });
  } catch (error) {
    console.error('Partner overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}