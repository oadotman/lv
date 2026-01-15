// =====================================================
// OVERAGE BILLING SYSTEM
// Handles collection of overage payments
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { Paddle } from '@paddle/paddle-node-sdk';

const OVERAGE_RATE = 0.20; // $0.20 per minute
const OVERAGE_CAP = 20.00; // $20 maximum
const PAYMENT_DUE_DAYS = 7; // 7 days to pay

/**
 * Check if organization has unpaid overage
 */
export async function checkOverageDebt(organizationId: string) {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('overage_debt, has_unpaid_overage, overage_debt_due_date, can_upgrade')
    .eq('id', organizationId)
    .single();

  if (!org) return null;

  const isPastDue = org.overage_debt_due_date
    ? new Date(org.overage_debt_due_date) < new Date()
    : false;

  return {
    hasDebt: org.has_unpaid_overage,
    amount: org.overage_debt || 0,
    dueDate: org.overage_debt_due_date,
    isPastDue,
    canUpgrade: org.can_upgrade,
    mustPayFirst: org.has_unpaid_overage && org.overage_debt > 0,
  };
}

/**
 * Create overage invoice at end of billing period
 * This should be called by a cron job or webhook
 */
export async function createOverageInvoice(organizationId: string) {
  const supabase = createAdminClient();

  // Call database function to create invoice
  const { data, error } = await supabase.rpc('create_overage_invoice', {
    p_organization_id: organizationId,
  });

  if (error) {
    console.error('[Overage] Failed to create invoice:', error);
    throw new Error('Failed to create overage invoice');
  }

  const invoiceId = data;
  if (!invoiceId) {
    console.log('[Overage] No overage to invoice for org:', organizationId);
    return null;
  }

  // Get invoice details
  const { data: invoice } = await supabase
    .from('overage_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    throw new Error('Invoice created but not found');
  }

  console.log('[Overage] Created invoice:', {
    invoiceId,
    organizationId,
    amount: invoice.amount,
    minutes: invoice.minutes_overage,
  });

  // Create Paddle checkout for this exact amount
  const checkoutUrl = await createPaddleOverageCheckout(
    organizationId,
    invoiceId,
    invoice.amount,
    invoice.minutes_overage
  );

  // Update invoice with Paddle URL
  await supabase
    .from('overage_invoices')
    .update({
      paddle_checkout_url: checkoutUrl,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  // Send email notification
  await sendOverageInvoiceEmail(organizationId, invoice, checkoutUrl);

  return {
    invoiceId,
    amount: invoice.amount,
    checkoutUrl,
  };
}

/**
 * Create Paddle checkout for specific overage amount
 * Uses Paddle's custom amount feature
 */
async function createPaddleOverageCheckout(
  organizationId: string,
  invoiceId: string,
  amount: number,
  minutes: number
): Promise<string> {
  const paddle = new Paddle(process.env.PADDLE_API_KEY!);

  try {
    // Create a one-time checkout with custom amount
    const checkout = await paddle.transactions.create({
      items: [
        {
          price: {
            description: `Overage charges: ${minutes} minutes @ $${OVERAGE_RATE}/min`,
            productId: process.env.PADDLE_OVERAGE_PRODUCT_ID!, // Create this in Paddle
            unitPrice: {
              amount: Math.round(amount * 100).toString(), // Convert to cents
              currencyCode: 'USD',
            },
          },
          quantity: 1,
        },
      ],
      customData: {
        type: 'overage_payment',
        organization_id: organizationId,
        invoice_id: invoiceId,
        minutes: minutes.toString(),
      },
    });

    // The Paddle SDK returns the transaction directly with a checkout URL
    return (checkout as any).checkout?.url || (checkout as any).urls?.checkout || (checkout as any).url || '';
  } catch (error) {
    console.error('[Paddle] Failed to create overage checkout:', error);

    // Fallback: Use a fixed $20 product if custom amount fails
    const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay-overage?org=${organizationId}&invoice=${invoiceId}&amount=${amount}`;
    return fallbackUrl;
  }
}

/**
 * Send overage invoice email
 */
async function sendOverageInvoiceEmail(
  organizationId: string,
  invoice: any,
  checkoutUrl: string
) {
  const supabase = createAdminClient();

  // Get organization admins
  const { data: adminUsers } = await supabase
    .from('user_organizations')
    .select('user_id')
    .eq('organization_id', organizationId)
    .in('role', ['owner', 'admin']);

  if (!adminUsers || adminUsers.length === 0) return;

  // Send email to each admin using existing Resend setup
  const { sendEmail } = await import('@/lib/resend/client');

  for (const adminUser of adminUsers) {
    // Get user email from auth.users
    const { data: userData } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', adminUser.user_id)
      .single();

    if (!userData?.email) continue;

    try {
      await sendEmail({
        to: userData.email,
        subject: `Overage Invoice - $${invoice.amount} Due`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
              .invoice-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Overage Usage Invoice</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your monthly minute allowance has been exceeded</p>
              </div>

              <div class="content">
                <div class="invoice-box">
                  <h3 style="margin-top: 0;">Invoice Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Overage Minutes:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.minutes_overage} minutes</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Rate:</td>
                      <td style="padding: 8px 0; text-align: right;">$${OVERAGE_RATE}/minute</td>
                    </tr>
                    <tr style="border-top: 2px solid #e5e7eb;">
                      <td style="padding: 12px 0 8px 0; font-size: 18px; font-weight: 600;">Total Due:</td>
                      <td style="padding: 12px 0 8px 0; text-align: right; font-size: 24px; font-weight: 700; color: #4F46E5;">$${invoice.amount}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
                      <td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: 600;">${new Date(Date.now() + PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString()}</td>
                    </tr>
                  </table>
                </div>

                <div class="warning">
                  <strong>⚠️ Account Restrictions Active</strong><br>
                  Until this invoice is paid, you cannot:
                  <ul style="margin: 10px 0;">
                    <li>Upgrade your subscription plan</li>
                    <li>Add new team members</li>
                    <li>Process additional calls (at $20 cap)</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${checkoutUrl}" class="button">Pay Now - $${invoice.amount}</a>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
                    Secure payment via Paddle
                  </p>
                </div>

                <div style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-top: 30px;">
                  <h4 style="margin-top: 0; color: #1e40af;">💡 Avoid Future Overages</h4>
                  <p style="margin: 10px 0; color: #1e40af;">
                    Consider upgrading your plan to get more included minutes and reduce overage costs.
                    After paying this invoice, you'll be able to upgrade immediately.
                  </p>
                </div>

                <div class="footer">
                  <p>Questions? Contact support at support@loadvoice.com</p>
                  <p style="font-size: 12px;">LoadVoice • Intelligent Call Analytics</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Overage Usage Invoice

Your organization has exceeded its monthly minute allowance.

Invoice Details:
- Overage Minutes: ${invoice.minutes_overage}
- Rate: $${OVERAGE_RATE}/minute
- Total Due: $${invoice.amount}
- Due Date: ${new Date(Date.now() + PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString()}

IMPORTANT: Until this invoice is paid, you cannot upgrade your plan or add new team members.

Pay now: ${checkoutUrl}

After payment, your account will be immediately restored to full functionality.
        `,
      });
    } catch (emailError) {
      console.error('[Email] Failed to send overage invoice:', emailError);
    }
  }
}

/**
 * Handle successful overage payment from Paddle webhook
 */
export async function handleOveragePayment(
  invoiceId: string,
  paddleTransactionId: string
) {
  const supabase = createAdminClient();

  // Mark as paid using database function
  const { data, error } = await supabase.rpc('mark_overage_paid', {
    p_invoice_id: invoiceId,
    p_paddle_transaction_id: paddleTransactionId,
  });

  if (error) {
    console.error('[Overage] Failed to mark as paid:', error);
    throw new Error('Failed to process overage payment');
  }

  console.log('[Overage] Payment processed successfully:', {
    invoiceId,
    transactionId: paddleTransactionId,
  });

  // Get organization for notification
  const { data: invoice } = await supabase
    .from('overage_invoices')
    .select('organization_id, amount')
    .eq('id', invoiceId)
    .single();

  if (invoice) {
    // Create notification
    await supabase.from('notifications').insert({
      user_id: invoice.organization_id, // Will be distributed to all admins
      notification_type: 'overage_paid',
      title: 'Overage payment received',
      message: `Your overage payment of $${invoice.amount} has been processed. You can now upgrade your plan and add team members.`,
    });
  }

  return true;
}

/**
 * Block upgrade attempts if overage is unpaid
 */
export async function canUpgradePlan(organizationId: string): Promise<{
  allowed: boolean;
  reason?: string;
  overageDebt?: number;
}> {
  const debt = await checkOverageDebt(organizationId);

  if (!debt) {
    return { allowed: true };
  }

  if (debt.mustPayFirst) {
    return {
      allowed: false,
      reason: `You have an unpaid overage of $${debt.amount.toFixed(2)}. Please pay this before upgrading.`,
      overageDebt: debt.amount,
    };
  }

  return { allowed: true };
}

/**
 * Get payment options for current overage
 */
export function getOveragePaymentOptions(overageAmount: number) {
  // Round to nearest $5 for cleaner payment options
  const rounded = Math.ceil(overageAmount / 5) * 5;

  return {
    exactAmount: overageAmount,
    suggestedAmount: rounded,
    paymentOptions: [
      {
        label: 'Pay Exact Amount',
        amount: overageAmount,
        description: `Pay $${overageAmount.toFixed(2)} (exact overage)`,
      },
      {
        label: 'Pay Rounded Amount',
        amount: rounded,
        description: `Pay $${rounded.toFixed(2)} (rounded up)`,
        credit: rounded - overageAmount,
      },
      {
        label: 'Pay Maximum',
        amount: OVERAGE_CAP,
        description: `Pay $${OVERAGE_CAP.toFixed(2)} (add credit for future)`,
        credit: OVERAGE_CAP - overageAmount,
      },
    ],
  };
}