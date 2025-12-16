// =====================================================
// ADMIN PARTNER PAYOUTS API
// Get and manage partner commission payouts
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const partnerId = searchParams.get('partner_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('partner_commissions')
      .select(`
        *,
        partners!inner(
          id,
          full_name,
          email,
          company_name,
          payment_method,
          payment_details
        ),
        partner_referrals!inner(
          customer_email,
          customer_organization_id
        )
      `)
      .order('calculated_at', { ascending: false })
      .limit(limit)
      .offset(offset);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }

    // Format response
    const formattedPayouts = (commissions || []).map(commission => ({
      id: commission.id,
      partnerId: commission.partner_id,
      partnerName: commission.partners?.full_name || commission.partners?.email || 'Unknown',
      partnerEmail: commission.partners?.email || '',
      customerEmail: commission.partner_referrals?.customer_email || '',
      amount: (commission.amount_cents || 0) / 100,
      baseAmount: (commission.base_amount_cents || 0) / 100,
      currency: commission.currency || 'USD',
      status: commission.status,
      month: commission.month,
      commissionRate: commission.commission_rate,
      calculatedAt: commission.calculated_at,
      approvedAt: commission.approved_at,
      paidAt: commission.paid_at,
      payoutId: commission.payout_id,
      notes: commission.notes,
      paymentMethod: commission.partners?.payment_method || null,
      paymentDetails: commission.partners?.payment_details || null
    }));

    return NextResponse.json({
      payouts: formattedPayouts,
      total: formattedPayouts.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Payouts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Process a payout
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
    const { commissionIds, action, notes, transactionId } = body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Commission IDs required' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'pay', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action required (approve, pay, reject)' },
        { status: 400 }
      );
    }

    // Update commission statuses based on action
    let updateData: any = {
      notes: notes || null
    };

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        updateData.approved_at = new Date().toISOString();
        break;
      case 'pay':
        updateData.status = 'paid';
        updateData.paid_at = new Date().toISOString();
        if (transactionId) {
          updateData.notes = `${notes || ''} | Transaction: ${transactionId}`.trim();
        }
        break;
      case 'reject':
        updateData.status = 'rejected';
        updateData.reversed_at = new Date().toISOString();
        updateData.reversal_reason = notes || 'Rejected by admin';
        break;
    }

    // Update all selected commissions
    const { error: updateError } = await supabase
      .from('partner_commissions')
      .update(updateData)
      .in('id', commissionIds);

    if (updateError) {
      console.error('Error updating commissions:', updateError);
      throw updateError;
    }

    // Log activity for each commission
    for (const commissionId of commissionIds) {
      const { data: commission } = await supabase
        .from('partner_commissions')
        .select('partner_id, amount_cents')
        .eq('id', commissionId)
        .single();

      if (commission) {
        await supabase
          .from('partner_activity_logs')
          .insert({
            partner_id: commission.partner_id,
            activity_type: `commission_${action}`,
            activity_details: {
              commission_id: commissionId,
              amount: (commission.amount_cents || 0) / 100,
              action,
              notes,
              processed_by: user.email
            }
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${commissionIds.length} commission(s) ${action}ed successfully`,
      processedCount: commissionIds.length
    });
  } catch (error) {
    console.error('Payout processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process payouts' },
      { status: 500 }
    );
  }
}