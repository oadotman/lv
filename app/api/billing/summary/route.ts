import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.user_metadata?.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get organization subscription details
    const { data: organization } = await supabase
      .from('organizations')
      .select(`
        subscription_id,
        subscription_status,
        subscription_plan,
        billing_cycle,
        subscription_current_period_end,
        subscription_cancel_at,
        max_minutes,
        max_members
      `)
      .eq('id', organizationId)
      .single();

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get current usage from the simple usage tracking system
    // The organizations table directly stores usage_minutes_current which is the total for current period
    const { data: orgUsage } = await supabase
      .from('organizations')
      .select('usage_minutes_current, usage_minutes_limit')
      .eq('id', organizationId)
      .single();

    const minutesUsed = orgUsage?.usage_minutes_current || 0;

    // Get active team members count
    const { count: activeUsers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    // Get recent payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get invoices (mock for now - you'd integrate with Paddle)
    const invoices = payments?.filter(p => p.status === 'succeeded').map(p => ({
      id: p.paddle_transaction_id,
      date: p.paid_at,
      amount: p.amount,
      downloadUrl: `/api/billing/invoice/${p.paddle_transaction_id}`,
    })) || [];

    // Prepare response
    const billingData = {
      subscription: {
        plan: organization.subscription_plan || 'free',
        status: organization.subscription_status || 'trialing',
        billingCycle: organization.billing_cycle || 'monthly',
        currentPeriodEnd: organization.subscription_current_period_end,
        cancelAtPeriodEnd: !!organization.subscription_cancel_at,
      },
      usage: {
        minutesUsed,
        minutesLimit: organization.max_minutes || 30,
        usersActive: activeUsers || 1,
        usersLimit: organization.max_members || 1,
      },
      payments: payments?.map(p => ({
        id: p.id,
        date: p.created_at,
        amount: p.amount,
        status: p.status,
        description: p.description,
      })) || [],
      invoices,
    };

    return NextResponse.json(billingData);
  } catch (error) {
    console.error('Billing summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}