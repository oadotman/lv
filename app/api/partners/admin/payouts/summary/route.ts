// =====================================================
// ADMIN PARTNER PAYOUTS SUMMARY API
// Get summary statistics for partner payouts
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

    // Get all commissions for statistics
    const { data: commissions, error: commissionsError } = await supabase
      .from('partner_commissions')
      .select('*');

    if (commissionsError) {
      console.error('Error fetching commissions:', commissionsError);
      throw commissionsError;
    }

    // Get all payouts for statistics
    const { data: payouts, error: payoutsError } = await supabase
      .from('partner_payouts')
      .select('*');

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError);
      throw payoutsError;
    }

    // Get active partners count
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    if (partnersError) {
      console.error('Error fetching partners:', partnersError);
      throw partnersError;
    }

    // Calculate summary statistics
    const allCommissions = commissions || [];
    const allPayouts = payouts || [];

    const summary = {
      // Commission statistics
      totalCommissions: allCommissions.length,
      pendingCommissions: allCommissions.filter(c => c.status === 'pending').length,
      approvedCommissions: allCommissions.filter(c => c.status === 'approved').length,
      paidCommissions: allCommissions.filter(c => c.status === 'paid').length,
      rejectedCommissions: allCommissions.filter(c => c.status === 'rejected').length,

      // Amount statistics (in dollars)
      totalPendingAmount: allCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
      totalApprovedAmount: allCommissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
      totalPaidAmount: allCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
      totalAmount: allCommissions
        .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,

      // Payout statistics
      totalPayoutBatches: allPayouts.length,
      pendingPayouts: allPayouts.filter(p => p.status === 'pending').length,
      processingPayouts: allPayouts.filter(p => p.status === 'processing').length,
      completedPayouts: allPayouts.filter(p => p.status === 'completed').length,
      failedPayouts: allPayouts.filter(p => p.status === 'failed').length,

      // Partner statistics
      totalPartners: partners?.length || 0,
      partnersWithPendingPayouts: new Set(
        allCommissions
          .filter(c => c.status === 'pending' || c.status === 'approved')
          .map(c => c.partner_id)
      ).size,

      // Monthly breakdown (last 6 months)
      monthlyBreakdown: []
    };

    // Calculate monthly breakdown
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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

      summary.monthlyBreakdown.push({
        month: monthStr,
        commissionsCount: monthCommissions.length,
        pendingAmount: monthCommissions
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
        approvedAmount: monthCommissions
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
        paidAmount: monthCommissions
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
        totalAmount: monthCommissions
          .reduce((sum, c) => sum + (c.amount_cents || 0), 0) / 100,
      });
    }

    // Reverse to show oldest to newest
    summary.monthlyBreakdown.reverse();

    // Get partners needing payout (have approved commissions)
    const partnersNeedingPayout = await supabase
      .from('partner_commissions')
      .select(`
        partner_id,
        partners!inner(
          id,
          full_name,
          email
        ),
        amount_cents
      `)
      .eq('status', 'approved')
      .is('payout_id', null);

    // Group by partner
    const partnerPayoutMap = new Map();
    (partnersNeedingPayout.data || []).forEach(commission => {
      const partnerId = commission.partner_id;
      if (!partnerPayoutMap.has(partnerId)) {
        partnerPayoutMap.set(partnerId, {
          partnerId,
          partnerName: commission.partners?.full_name || commission.partners?.email || 'Unknown',
          partnerEmail: commission.partners?.email || '',
          totalAmount: 0,
          commissionCount: 0
        });
      }
      const partner = partnerPayoutMap.get(partnerId);
      partner.totalAmount += (commission.amount_cents || 0) / 100;
      partner.commissionCount += 1;
    });

    // Convert to array and sort by amount
    const partnersWithPendingPayoutsList = Array.from(partnerPayoutMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10); // Top 10 partners

    return NextResponse.json({
      summary,
      partnersNeedingPayout: partnersWithPendingPayoutsList,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Payout summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}