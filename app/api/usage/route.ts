// =====================================================
// USAGE API ROUTE
// Returns current month's usage statistics with simple overage data
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { getUsageStatus } from '@/lib/simple-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Check if organizationId is provided in query params
    const { searchParams } = new URL(req.url);
    const queryOrgId = searchParams.get('organizationId');

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    const organizationId = queryOrgId || userOrg?.organization_id;

    if (!organizationId) {
      return NextResponse.json({
        success: true,
        usage: {
          minutesUsed: 0,
          minutesLimit: 30, // Default free plan
          percentUsed: 0,
          callsProcessed: 0,
          planType: 'free',
          baseMinutes: 30,
          purchasedOverageMinutes: 0,
          totalAvailableMinutes: 30,
          overageMinutes: 0,
          overageCost: 0,
          hasOverage: false,
          canUpload: true,
        },
      });
    }

    // If organizationId is provided via query, verify user has access
    if (queryOrgId && queryOrgId !== userOrg?.organization_id) {
      const { data: membership } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', queryOrgId)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: 'Not authorized to view this organization' },
          { status: 403 }
        );
      }
    }

    // Fetch organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan, usage_reset_date, usage_minutes_current, usage_minutes_limit')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Use simple usage calculation (now with monthly tracking!)
    const usage = await getUsageStatus(organizationId, supabase as any);

    // Calculate billing period for display (using the current month from our system)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periodEnd = nextMonth.toISOString();

    // Get call count for this period
    const { data: monthCalls } = await supabase
      .from('calls')
      .select('id, status')
      .eq('organization_id', organizationId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const callsProcessed = (monthCalls || []).filter(
      (call) => call.status === 'completed'
    ).length;

    // Determine warning level based on status
    let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded' = 'none';
    if (usage.status === 'overage') {
      warningLevel = 'exceeded';
    } else if (usage.status === 'warning') {
      warningLevel = 'high';
    } else if (usage.percentUsed >= 80) {
      warningLevel = 'medium';
    } else if (usage.percentUsed >= 70) {
      warningLevel = 'low';
    }

    return NextResponse.json({
      success: true,
      usage: {
        minutesUsed: Math.round(usage.minutesUsed),
        minutesLimit: usage.minutesLimit,
        percentUsed: Math.round(usage.percentUsed),
        callsProcessed,
        planType: org.subscription_plan,
        warningLevel,
        remainingMinutes: Math.max(0, usage.minutesLimit - usage.minutesUsed),
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        // Simple overage fields
        baseMinutes: usage.minutesLimit,
        purchasedOverageMinutes: 0, // Simple system doesn't have pre-purchased packs
        totalAvailableMinutes: usage.minutesLimit,
        overageMinutes: usage.overageMinutes,
        overageCost: usage.overageCharge,
        hasOverage: usage.overageMinutes > 0,
        canUpload: true, // Simple system allows uploads even in overage (pay as you go)
      },
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
