import { createClient } from '@/lib/supabase/server';

export interface OverageStatus {
  isOverLimit: boolean;
  usage: number;
  limit: number;
  percentage: number;
  overage: number;
}

export async function checkOverageStatus(organizationId: string): Promise<OverageStatus> {
  const supabase = createClient();

  // Get the organization's current usage
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  const currentUsage = usage?.call_minutes_used || 0;
  const limit = usage?.call_minutes_limit || 1000;

  return {
    isOverLimit: currentUsage > limit,
    usage: currentUsage,
    limit,
    percentage: (currentUsage / limit) * 100,
    overage: Math.max(0, currentUsage - limit)
  };
}

export async function processOveragePayment(
  organizationId: string,
  paymentIntentId: string,
  amount: number
): Promise<boolean> {
  const supabase = createClient();

  // Record the overage payment
  const { error } = await supabase
    .from('overage_payments')
    .insert({
      organization_id: organizationId,
      payment_intent_id: paymentIntentId,
      amount,
      status: 'completed',
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error recording overage payment:', error);
    return false;
  }

  // Reset or increase the limit
  await supabase
    .from('usage_tracking')
    .update({
      call_minutes_limit: amount * 10, // Convert payment to minutes
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId);

  return true;
}

export async function getOveragePrice(minutes: number): Promise<number> {
  // $0.10 per minute overage
  return minutes * 0.10;
}
/**
 * Credit overage pack purchase to organization
 * This is called when a user purchases additional overage minutes
 */
export async function creditOveragePack(
  organizationId: string,
  packMinutes: number,
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Update organization's overage credits
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('overage_credits')
      .eq('id', organizationId)
      .single();

    if (fetchError) {
      console.error('[Overage] Failed to fetch organization:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const currentCredits = org?.overage_credits || 0;
    const newCredits = currentCredits + packMinutes;

    const { error } = await supabase
      .from('organizations')
      .update({
        overage_credits: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (error) {
      console.error('[Overage] Failed to credit pack:', error);
      return { success: false, error: error.message };
    }

    // Log the transaction
    await supabase.from('overage_transactions').insert({
      organization_id: organizationId,
      transaction_type: 'credit',
      minutes: packMinutes,
      transaction_id: transactionId,
      description: `Purchased ${packMinutes} minute overage pack`,
      created_at: new Date().toISOString()
    });

    console.log('[Overage] Credited pack:', {
      organizationId,
      minutes: packMinutes,
      transactionId
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Overage] Error crediting pack:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset overage minutes at the start of new billing period
 * This is called when subscription renews
 */
export async function resetOverageMinutes(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Reset overage tracking for new billing period
    const { error } = await supabase
      .from('organizations')
      .update({
        overage_minutes: 0,
        overage_debt: 0,
        has_unpaid_overage: false,
        overage_debt_due_date: null,
        can_upgrade: true,
        billing_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (error) {
      console.error('[Overage] Failed to reset minutes:', error);
      return { success: false, error: error.message };
    }

    // Log the reset
    await supabase.from('overage_transactions').insert({
      organization_id: organizationId,
      transaction_type: 'reset',
      minutes: 0,
      description: 'Billing period reset - overage minutes cleared',
      created_at: new Date().toISOString()
    });

    console.log('[Overage] Reset minutes for org:', organizationId);

    return { success: true };
  } catch (error: any) {
    console.error('[Overage] Error resetting minutes:', error);
    return { success: false, error: error.message };
  }
}
