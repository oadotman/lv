import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  updatePaddleSubscription,
  PLAN_TO_PADDLE_PRICE,
} from '@/lib/paddle-config';
import { PLANS } from '@/lib/pricing';

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
    const { targetPlan, billingCycle } = body;

    if (!targetPlan || !billingCycle) {
      return NextResponse.json(
        { error: 'Target plan and billing cycle are required' },
        { status: 400 }
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', session.user.user_metadata.organizationId)
      .single();

    if (!organization?.subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Check if downgrade is valid
    const currentPlan = organization.subscription_plan || 'free';
    const planHierarchy = ['free', 'solo', 'starter', 'professional', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const targetIndex = planHierarchy.indexOf(targetPlan);

    if (targetIndex >= currentIndex) {
      return NextResponse.json(
        { error: 'This is not a downgrade. Use the upgrade endpoint instead.' },
        { status: 400 }
      );
    }

    // Check current usage against target plan limits
    const { data: currentUsage } = await supabase
      .from('simple_usage_tracking')
      .select('minutes_used')
      .eq('organization_id', organization.id)
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
      .order('created_at', { ascending: false });

    const totalMinutesUsed = currentUsage?.reduce((sum, record) => sum + (record.minutes_used || 0), 0) || 0;
    const targetPlanLimits = PLANS[targetPlan as keyof typeof PLANS];

    // Check team size compatibility
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'active');

    const currentMembers = memberCount || 1;

    // Validation checks
    const validationErrors = [];

    // Check minutes limit
    if (targetPlanLimits.maxMinutes > 0 && totalMinutesUsed > targetPlanLimits.maxMinutes) {
      validationErrors.push(
        `Your current usage (${totalMinutesUsed} minutes) exceeds the ${targetPlan} plan limit (${targetPlanLimits.maxMinutes} minutes)`
      );
    }

    // Check team size limit
    if (targetPlanLimits.maxMembers > 0 && currentMembers > targetPlanLimits.maxMembers) {
      validationErrors.push(
        `Your current team size (${currentMembers} members) exceeds the ${targetPlan} plan limit (${targetPlanLimits.maxMembers} members)`
      );
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot downgrade due to current usage',
          details: validationErrors,
          suggestedActions: [
            'Reduce usage to fit within plan limits',
            'Remove team members if necessary',
            'Consider staying on current plan'
          ]
        },
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

    // Update Paddle subscription (downgrades happen at end of billing period)
    const result = await updatePaddleSubscription(
      organization.subscription_id,
      newPriceId,
      false // Downgrades should always happen at period end
    );

    // Log the downgrade
    await supabase.from('subscription_changes').insert({
      organization_id: organization.id,
      user_id: session.user.id,
      from_plan: currentPlan,
      to_plan: targetPlan,
      change_type: 'downgrade',
      effective_date: result.nextBilledAt,
      metadata: {
        reason: body.reason || 'User initiated',
        current_usage: {
          minutes: totalMinutesUsed,
          members: currentMembers
        }
      }
    });

    // Send notification email about downgrade
    await supabase.from('email_queue').insert({
      to: session.user.email,
      subject: 'Your LoadVoice plan will be downgraded',
      template: 'subscription_downgrade',
      data: {
        current_plan: PLANS[currentPlan as keyof typeof PLANS].name,
        new_plan: PLANS[targetPlan as keyof typeof PLANS].name,
        effective_date: result.nextBilledAt,
        current_period_end: organization.current_period_end
      }
    });

    return NextResponse.json({
      success: true,
      message: `Your plan will be downgraded to ${targetPlan} at the end of your current billing period`,
      effectiveDate: result.nextBilledAt,
      currentPeriodEnd: organization.current_period_end,
      willRetainAccessUntil: organization.current_period_end
    });
  } catch (error) {
    console.error('Downgrade subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to downgrade subscription' },
      { status: 500 }
    );
  }
}

// GET endpoint to check downgrade eligibility
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
      .select('*')
      .eq('id', session.user.user_metadata.organizationId)
      .single();

    // Get current usage
    const { data: currentUsage } = await supabase
      .from('simple_usage_tracking')
      .select('minutes_used')
      .eq('organization_id', organization?.id)
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

    const totalMinutesUsed = currentUsage?.reduce((sum, record) => sum + (record.minutes_used || 0), 0) || 0;

    // Get current team member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization?.id)
      .eq('status', 'active');

    const currentPlan = organization?.subscription_plan || 'free';
    const targetPlanLimits = PLANS[targetPlan as keyof typeof PLANS];
    const currentMembers = memberCount || 1;

    // Check if this is actually a downgrade
    const planHierarchy = ['free', 'solo', 'starter', 'professional', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const targetIndex = planHierarchy.indexOf(targetPlan);

    if (targetIndex >= currentIndex) {
      return NextResponse.json({
        eligible: false,
        reason: 'This is not a downgrade',
        isUpgrade: true
      });
    }

    // Check compatibility
    const issues = [];

    if (targetPlanLimits.maxMinutes > 0 && totalMinutesUsed > targetPlanLimits.maxMinutes) {
      issues.push({
        type: 'minutes',
        current: totalMinutesUsed,
        limit: targetPlanLimits.maxMinutes,
        message: `Reduce usage by ${totalMinutesUsed - targetPlanLimits.maxMinutes} minutes`
      });
    }

    if (targetPlanLimits.maxMembers > 0 && currentMembers > targetPlanLimits.maxMembers) {
      issues.push({
        type: 'members',
        current: currentMembers,
        limit: targetPlanLimits.maxMembers,
        message: `Remove ${currentMembers - targetPlanLimits.maxMembers} team members`
      });
    }

    return NextResponse.json({
      eligible: issues.length === 0,
      issues,
      currentPlan,
      targetPlan,
      currentUsage: {
        minutes: totalMinutesUsed,
        members: currentMembers
      },
      targetLimits: {
        minutes: targetPlanLimits.maxMinutes,
        members: targetPlanLimits.maxMembers
      },
      savingsPerMonth: targetPlan === 'free'
        ? PLANS[currentPlan as keyof typeof PLANS].price
        : PLANS[currentPlan as keyof typeof PLANS].price - PLANS[targetPlan as keyof typeof PLANS].price
    });
  } catch (error) {
    console.error('Check downgrade eligibility error:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}