// =====================================================
// ADMIN PARTNER PAYOUT BATCHES API
// Get and manage batch payouts for partners
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

    // Get all payout batches
    const { data: payouts, error } = await supabase
      .from('partner_payouts')
      .select(`
        *,
        partners!inner(
          id,
          full_name,
          email,
          company_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching payout batches:', error);
      throw error;
    }

    // Format response
    const formattedBatches = (payouts || []).map(payout => ({
      id: payout.id,
      partnerId: payout.partner_id,
      partnerName: payout.partners?.full_name || payout.partners?.email || 'Unknown',
      partnerEmail: payout.partners?.email || '',
      amount: (payout.amount_cents || 0) / 100,
      currency: payout.currency || 'USD',
      status: payout.status,
      paymentMethod: payout.payment_method,
      periodStart: payout.period_start,
      periodEnd: payout.period_end,
      commissionCount: payout.commission_count,
      processedAt: payout.processed_at,
      completedAt: payout.completed_at,
      failedAt: payout.failed_at,
      failureReason: payout.failure_reason,
      transactionId: payout.transaction_id,
      paymentReceiptUrl: payout.payment_receipt_url,
      notes: payout.notes,
      createdAt: payout.created_at
    }));

    // Calculate summary statistics
    const stats = {
      totalBatches: formattedBatches.length,
      pendingBatches: formattedBatches.filter(b => b.status === 'pending').length,
      processingBatches: formattedBatches.filter(b => b.status === 'processing').length,
      completedBatches: formattedBatches.filter(b => b.status === 'completed').length,
      failedBatches: formattedBatches.filter(b => b.status === 'failed').length,
      totalAmount: formattedBatches.reduce((sum, b) => sum + b.amount, 0),
      pendingAmount: formattedBatches
        .filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + b.amount, 0),
    };

    return NextResponse.json({
      batches: formattedBatches,
      stats
    });
  } catch (error) {
    console.error('Payout batches API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new payout batch
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { partnerIds, month, year } = body;

    if (!partnerIds || !Array.isArray(partnerIds) || partnerIds.length === 0) {
      return NextResponse.json(
        { error: 'Partner IDs required' },
        { status: 400 }
      );
    }

    // Create payout batches for each partner
    const batches = [];
    for (const partnerId of partnerIds) {
      // Get approved commissions for this partner
      const { data: commissions } = await supabase
        .from('partner_commissions')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('status', 'approved')
        .is('payout_id', null);

      if (!commissions || commissions.length === 0) {
        continue;
      }

      // Calculate total amount
      const totalAmount = commissions.reduce((sum, c) => sum + (c.amount_cents || 0), 0);

      // Get partner details
      const { data: partner } = await supabase
        .from('partners')
        .select('payment_method, payment_details')
        .eq('id', partnerId)
        .single();

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('partner_payouts')
        .insert({
          partner_id: partnerId,
          amount_cents: totalAmount,
          currency: 'USD',
          status: 'pending',
          payment_method: partner?.payment_method || 'manual',
          payment_details: partner?.payment_details || {},
          period_start: new Date(year, month - 1, 1).toISOString(),
          period_end: new Date(year, month, 0).toISOString(),
          commission_count: commissions.length,
          notes: `Batch payout for ${month}/${year}`
        })
        .select()
        .single();

      if (payoutError) {
        console.error('Error creating payout:', payoutError);
        continue;
      }

      if (payout) {
        // Link commissions to this payout
        await supabase
          .from('partner_commissions')
          .update({ payout_id: payout.id })
          .in('id', commissions.map(c => c.id));

        batches.push(payout);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${batches.length} payout batch(es)`,
      batches,
      totalAmount: batches.reduce((sum, b) => sum + (b.amount_cents || 0), 0) / 100
    });
  } catch (error) {
    console.error('Create batch error:', error);
    return NextResponse.json(
      { error: 'Failed to create payout batches' },
      { status: 500 }
    );
  }
}