import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  updatePaddleSubscription,
  PLAN_TO_PADDLE_PRICE,
} from '@/lib/paddle-config';
import { canUpgradeToPlan, PlanType } from '@/lib/pricing';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetPlan, billingCycle, immediately = false } = body;

    if (!targetPlan || !billingCycle) {
      return NextResponse.json(
        { error: 'Target plan and billing cycle are required' },
        { status: 400 }
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('subscription_id, subscription_plan, max_members')
      .eq('id', session.user.user_metadata.organizationId)
      .single();

    if (!organization?.subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Get current team member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', session.user.user_metadata.organizationId)
      .eq('status', 'active');

    // Check if upgrade is allowed
    const canUpgrade = canUpgradeToPlan(
      organization.subscription_plan,
      targetPlan,
      memberCount || 1
    );

    if (!canUpgrade.canUpgrade) {
      return NextResponse.json(
        { error: canUpgrade.reason },
        { status: 400 }
      );
    }

    // Get new price ID
    const priceMapping = PLAN_TO_PADDLE_PRICE[targetPlan];
    if (!priceMapping) {
      return NextResponse.json(
        { error: 'Invalid target plan' },
        { status: 400 }
      );
    }

    const newPriceId = billingCycle === 'annual'
      ? priceMapping.annual
      : priceMapping.monthly;

    // Update Paddle subscription
    const result = await updatePaddleSubscription(
      organization.subscription_id,
      newPriceId,
      immediately
    );

    // Log the upgrade
    await supabase.from('subscription_changes').insert({
      organization_id: session.user.user_metadata.organizationId,
      user_id: session.user.id,
      from_plan: organization.subscription_plan,
      to_plan: targetPlan,
      change_type: 'upgrade',
      effective_date: immediately ? new Date().toISOString() : result.nextBilledAt,
    });

    return NextResponse.json({
      success: true,
      message: immediately
        ? 'Plan upgraded immediately'
        : 'Plan will be upgraded at the next billing cycle',
      effectiveDate: immediately ? new Date().toISOString() : result.nextBilledAt,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}

// GET endpoint to check upgrade eligibility
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const targetPlan = url.searchParams.get('targetPlan');

    if (!targetPlan) {
      return NextResponse.json(
        { error: 'Target plan is required' },
        { status: 400 }
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('subscription_plan, max_members')
      .eq('id', session.user.user_metadata.organizationId)
      .single();

    // Get current team member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', session.user.user_metadata.organizationId)
      .eq('status', 'active');

    // Check eligibility
    const canUpgrade = canUpgradeToPlan(
      organization?.subscription_plan || 'free',
      targetPlan as PlanType,
      memberCount || 1
    );

    return NextResponse.json({
      eligible: canUpgrade.canUpgrade,
      reason: canUpgrade.reason,
      currentPlan: organization?.subscription_plan || 'free',
      targetPlan,
      currentMembers: memberCount || 1,
    });
  } catch (error) {
    console.error('Check upgrade eligibility error:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}