// =====================================================
// PARTNER COMMISSION CALCULATION SYSTEM
// Handles commission calculations, tracking, and payouts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  PartnerCommission,
  PartnerPayout,
  Partner,
  PartnerReferral,
} from './types';

export class CommissionCalculator {
  private static readonly STANDARD_RATE = 0.25; // 25%
  private static readonly PREMIUM_RATE = 0.30; // 30%
  private static readonly HOLDING_PERIOD_DAYS = 30;
  private static readonly MAX_EARNING_MONTHS = 12;
  private static readonly MIN_PAYOUT_AMOUNT = 10000; // $100 in cents

  /**
   * Calculate commission for a payment
   */
  static calculateCommission(
    amount: number,
    tier: 'standard' | 'premium',
    monthsSinceStart: number
  ): number {
    // No commission after 12 months
    if (monthsSinceStart >= this.MAX_EARNING_MONTHS) {
      return 0;
    }

    const rate = tier === 'premium' ? this.PREMIUM_RATE : this.STANDARD_RATE;
    return Math.round(amount * rate);
  }

  /**
   * Process monthly commissions for all partners
   */
  static async processMonthlyCommissions(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    const supabase = await createClient();
    const errors: string[] = [];
    let processed = 0;

    try {
      // Get the current month and previous month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

      // Get all active partner referrals
      const { data: referrals, error: referralsError } = await supabase
        .from('partner_referrals')
        .select(`
          *,
          partner:partners(*)
        `)
        .eq('status', 'active');

      if (referralsError) {
        errors.push(`Failed to fetch referrals: ${referralsError.message}`);
        return { success: false, processed: 0, errors };
      }

      // Process each referral
      for (const referral of referrals || []) {
        try {
          // Calculate months since customer started
          const startDate = new Date(referral.converted_at);
          const monthsSinceStart = this.getMonthsDifference(startDate, now);

          // Skip if beyond earning period
          if (monthsSinceStart >= this.MAX_EARNING_MONTHS) {
            continue;
          }

          // Check if commission already exists for this month
          const { data: existingCommission } = await supabase
            .from('partner_commissions')
            .select('id')
            .eq('partner_id', referral.partner_id)
            .eq('referral_id', referral.id)
            .eq('month', previousMonthStr)
            .single();

          if (existingCommission) {
            continue; // Already processed
          }

          // Get payment data for the customer from previous month
          // This would need to integrate with your payment system
          const monthlyAmount = referral.monthly_value || 0;

          if (monthlyAmount === 0) {
            continue; // No payment to process
          }

          // Calculate commission
          const partner = referral.partner as Partner;
          const commissionAmount = this.calculateCommission(
            monthlyAmount,
            partner.tier,
            monthsSinceStart
          );

          if (commissionAmount === 0) {
            continue;
          }

          // Create commission record
          const commission: Partial<PartnerCommission> = {
            id: crypto.randomUUID(),
            partner_id: referral.partner_id,
            referral_id: referral.id,
            customer_id: referral.customer_id!,
            amount_cents: commissionAmount,
            currency: 'USD',
            status: 'pending',
            month: previousMonthStr,
            calculated_at: new Date().toISOString(),
          };

          const { error: commissionError } = await supabase
            .from('partner_commissions')
            .insert(commission);

          if (commissionError) {
            errors.push(`Failed to create commission for referral ${referral.id}: ${commissionError.message}`);
          } else {
            processed++;
          }
        } catch (error) {
          errors.push(`Error processing referral ${referral.id}: ${error}`);
        }
      }

      // Approve commissions that have passed the holding period
      await this.approveEligibleCommissions();

      return { success: errors.length === 0, processed, errors };
    } catch (error) {
      errors.push(`General processing error: ${error}`);
      return { success: false, processed, errors };
    }
  }

  /**
   * Approve commissions that have passed the holding period
   */
  static async approveEligibleCommissions(): Promise<void> {
    const supabase = await createClient();
    const holdingPeriodDate = new Date();
    holdingPeriodDate.setDate(holdingPeriodDate.getDate() - this.HOLDING_PERIOD_DAYS);

    await supabase
      .from('partner_commissions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .lte('calculated_at', holdingPeriodDate.toISOString());
  }

  /**
   * Process partner payouts
   */
  static async processPayouts(): Promise<{
    success: boolean;
    payouts: PartnerPayout[];
    errors: string[];
  }> {
    const supabase = await createClient();
    const errors: string[] = [];
    const payouts: PartnerPayout[] = [];

    try {
      // Get all partners with approved commissions
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select(`
          *,
          commissions:partner_commissions(*)
        `)
        .eq('status', 'active')
        .eq('commissions.status', 'approved');

      if (partnersError) {
        errors.push(`Failed to fetch partners: ${partnersError.message}`);
        return { success: false, payouts: [], errors };
      }

      // Process each partner
      for (const partner of partners || []) {
        const approvedCommissions = partner.commissions.filter(
          (c: PartnerCommission) => c.status === 'approved'
        );

        if (approvedCommissions.length === 0) {
          continue;
        }

        // Calculate total payout amount
        const totalAmount = approvedCommissions.reduce(
          (sum: number, c: PartnerCommission) => sum + c.amount_cents,
          0
        );

        // Check if meets minimum threshold
        if (totalAmount < this.MIN_PAYOUT_AMOUNT) {
          continue; // Will be included in next payout
        }

        // Create payout record
        const payout: Partial<PartnerPayout> = {
          id: crypto.randomUUID(),
          partner_id: partner.id,
          amount_cents: totalAmount,
          currency: 'USD',
          status: 'pending',
          payment_method: partner.payment_method || 'paypal',
          payment_details: partner.payment_details,
          period_start: this.getOldestCommissionDate(approvedCommissions),
          period_end: this.getNewestCommissionDate(approvedCommissions),
          commission_ids: approvedCommissions.map((c: PartnerCommission) => c.id),
          processed_at: new Date().toISOString(),
        };

        const { data: createdPayout, error: payoutError } = await supabase
          .from('partner_payouts')
          .insert(payout)
          .select()
          .single();

        if (payoutError) {
          errors.push(`Failed to create payout for partner ${partner.id}: ${payoutError.message}`);
        } else {
          payouts.push(createdPayout as PartnerPayout);

          // Mark commissions as paid
          await supabase
            .from('partner_commissions')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payout_id: createdPayout.id,
            })
            .in('id', approvedCommissions.map((c: PartnerCommission) => c.id));
        }
      }

      return { success: errors.length === 0, payouts, errors };
    } catch (error) {
      errors.push(`General payout error: ${error}`);
      return { success: false, payouts: [], errors };
    }
  }

  /**
   * Reverse commission (for refunds/chargebacks)
   */
  static async reverseCommission(
    customerId: string,
    reason: string
  ): Promise<{ success: boolean; reversed: number }> {
    const supabase = await createClient();

    try {
      // Find the commission for this customer
      const { data: commission, error: findError } = await supabase
        .from('partner_commissions')
        .select('*')
        .eq('customer_id', customerId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !commission) {
        return { success: false, reversed: 0 };
      }

      // If already paid, we need to deduct from future earnings
      if (commission.status === 'paid') {
        // Create a negative commission entry
        const reversal: Partial<PartnerCommission> = {
          id: crypto.randomUUID(),
          partner_id: commission.partner_id,
          referral_id: commission.referral_id,
          customer_id: commission.customer_id,
          amount_cents: -commission.amount_cents, // Negative amount
          currency: commission.currency,
          status: 'approved', // Immediately approved for deduction
          month: new Date().toISOString().substring(0, 7),
          calculated_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          reversal_reason: reason,
        };

        await supabase.from('partner_commissions').insert(reversal);
      } else {
        // If not paid yet, just mark as reversed
        await supabase
          .from('partner_commissions')
          .update({
            status: 'reversed',
            reversed_at: new Date().toISOString(),
            reversal_reason: reason,
          })
          .eq('id', commission.id);
      }

      return { success: true, reversed: commission.amount_cents };
    } catch (error) {
      console.error('Commission reversal error:', error);
      return { success: false, reversed: 0 };
    }
  }

  /**
   * Get partner earnings summary
   */
  static async getPartnerEarnings(partnerId: string): Promise<{
    total_earned: number;
    total_paid: number;
    total_pending: number;
    total_approved: number;
    this_month: number;
    last_month: number;
    next_payout: number;
    next_payout_date: string | null;
  }> {
    const supabase = await createClient();

    const { data: commissions } = await supabase
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partnerId);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    let totalEarned = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalApproved = 0;
    let thisMonthEarnings = 0;
    let lastMonthEarnings = 0;

    for (const commission of commissions || []) {
      if (commission.amount_cents > 0) {
        totalEarned += commission.amount_cents;
      }

      switch (commission.status) {
        case 'paid':
          totalPaid += commission.amount_cents;
          break;
        case 'pending':
          totalPending += commission.amount_cents;
          break;
        case 'approved':
          totalApproved += commission.amount_cents;
          break;
      }

      if (commission.month === thisMonth) {
        thisMonthEarnings += commission.amount_cents;
      } else if (commission.month === lastMonthStr) {
        lastMonthEarnings += commission.amount_cents;
      }
    }

    // Calculate next payout
    const nextPayoutAmount = totalApproved >= this.MIN_PAYOUT_AMOUNT ? totalApproved : 0;
    const nextPayoutDate = nextPayoutAmount > 0 ? this.getNextPayoutDate() : null;

    return {
      total_earned: totalEarned,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_approved: totalApproved,
      this_month: thisMonthEarnings,
      last_month: lastMonthEarnings,
      next_payout: nextPayoutAmount,
      next_payout_date: nextPayoutDate,
    };
  }

  /**
   * Helper: Calculate months difference
   */
  private static getMonthsDifference(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  }

  /**
   * Helper: Get next payout date (15th of next month)
   */
  private static getNextPayoutDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return nextMonth.toISOString().split('T')[0];
  }

  /**
   * Helper: Get oldest commission date
   */
  private static getOldestCommissionDate(commissions: PartnerCommission[]): string {
    return commissions.reduce((oldest, c) => {
      return c.calculated_at < oldest ? c.calculated_at : oldest;
    }, commissions[0].calculated_at);
  }

  /**
   * Helper: Get newest commission date
   */
  private static getNewestCommissionDate(commissions: PartnerCommission[]): string {
    return commissions.reduce((newest, c) => {
      return c.calculated_at > newest ? c.calculated_at : newest;
    }, commissions[0].calculated_at);
  }
}