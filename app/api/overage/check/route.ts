// =====================================================
// OVERAGE DEBT CHECK API
// Returns current overage debt status
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { checkOverageDebt } from '@/lib/overage-billing';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userOrg?.organization_id) {
      return NextResponse.json({
        hasDebt: false,
        amount: 0,
        canUpgrade: true,
      });
    }

    // Check overage debt
    const debt = await checkOverageDebt(userOrg.organization_id);

    if (!debt) {
      return NextResponse.json({
        hasDebt: false,
        amount: 0,
        canUpgrade: true,
      });
    }

    // Get current usage for context
    const { data: org } = await supabase
      .from('organizations')
      .select('usage_minutes_current, usage_minutes_limit')
      .eq('id', userOrg.organization_id)
      .single();

    const currentOverage = org
      ? Math.max(0, org.usage_minutes_current - org.usage_minutes_limit)
      : 0;

    return NextResponse.json({
      hasDebt: debt.hasDebt,
      amount: debt.amount,
      dueDate: debt.dueDate,
      isPastDue: debt.isPastDue,
      canUpgrade: debt.canUpgrade,
      mustPayFirst: debt.mustPayFirst,
      currentOverageMinutes: currentOverage,
      message: debt.mustPayFirst
        ? `You have $${debt.amount.toFixed(2)} in unpaid overage charges. Please pay this before upgrading.`
        : null,
    });

  } catch (error) {
    console.error('Overage check error:', error);
    return NextResponse.json(
      { error: 'Failed to check overage status' },
      { status: 500 }
    );
  }
}