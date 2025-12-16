// =====================================================
// PARTNER EARNINGS API
// Track commissions and payouts
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

    // Get all commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (commissionsError) {
      throw commissionsError;
    }

    // Get all payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('partner_payouts')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (payoutsError) {
      throw payoutsError;
    }

    // Calculate summary
    const summary = {
      lifetime_earnings: commissions?.reduce((sum, c) =>
        ['approved', 'paid'].includes(c.status) ? sum + c.amount : sum, 0) || 0,
      pending_earnings: commissions?.reduce((sum, c) =>
        c.status === 'pending' ? sum + c.amount : sum, 0) || 0,
      total_paid: payouts?.reduce((sum, p) =>
        p.status === 'completed' ? sum + p.amount : sum, 0) || 0,
      next_payout: commissions?.find(c => c.status === 'pending')?.amount || 0,
      last_payout_date: payouts?.[0]?.paid_at || null,
    };

    // Group commissions by year for chart
    interface EarningsData {
      month: string;
      amount: number;
      referrals: number;
    }

    const earningsByMonth = commissions?.reduce((acc, commission) => {
      const key = `${commission.year}-${commission.month.padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = {
          month: key,
          amount: 0,
          referrals: 0,
        };
      }
      acc[key].amount += commission.amount;
      acc[key].referrals += commission.referrals_count || 0;
      return acc;
    }, {} as Record<string, EarningsData>);

    const chartData = earningsByMonth
      ? (Object.values(earningsByMonth) as EarningsData[])
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12) // Last 12 months
      : [];

    return NextResponse.json({
      commissions,
      payouts,
      summary,
      chartData,
    });
  } catch (error) {
    console.error('Earnings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}