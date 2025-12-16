// =====================================================
// PARTNER COMMISSION PROCESSING CRON JOB
// Run monthly to process and approve commissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Get current date info
    const now = new Date();
    const currentDay = now.getDate();

    // Run on the 1st of each month
    if (currentDay !== 1 && process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        message: 'Not processing day',
        currentDay,
      });
    }

    // Get last month's info
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthNum = lastMonth.getMonth() + 1;
    const lastMonthYear = lastMonth.getFullYear();

    console.log(`Processing commissions for ${lastMonthNum}/${lastMonthYear}`);

    // Get all pending commissions from last month
    const { data: pendingCommissions, error: commissionsError } = await supabase
      .from('partner_commissions')
      .select(`
        *,
        partners!inner(
          id,
          name,
          email,
          status,
          payment_method,
          payment_details
        )
      `)
      .eq('status', 'pending')
      .eq('month', lastMonthNum.toString())
      .eq('year', lastMonthYear);

    if (commissionsError) {
      throw commissionsError;
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      console.log('No pending commissions to process');
      return NextResponse.json({
        message: 'No pending commissions',
        processed: 0,
      });
    }

    console.log(`Found ${pendingCommissions.length} pending commissions`);

    // Process each commission
    let processedCount = 0;
    let approvedCount = 0;
    let heldCount = 0;
    const emailNotifications = [];

    for (const commission of pendingCommissions) {
      // Skip if partner is not active
      if (commission.partners.status !== 'active') {
        console.log(`Skipping commission for inactive partner: ${commission.partners.id}`);
        continue;
      }

      // Check if commission meets minimum threshold ($100)
      if (commission.amount < 100) {
        // Roll over to next month
        console.log(`Commission below threshold for partner ${commission.partners.id}: $${commission.amount}`);
        heldCount++;
        continue;
      }

      // Check 30-day holding period
      const commissionDate = new Date(commission.created_at);
      const daysSinceCreation = Math.floor((now.getTime() - commissionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceCreation < 30) {
        console.log(`Commission still in holding period for partner ${commission.partners.id}: ${daysSinceCreation} days`);
        heldCount++;
        continue;
      }

      // Approve commission
      const { error: updateError } = await supabase
        .from('partner_commissions')
        .update({
          status: 'approved',
          approved_at: now.toISOString(),
        })
        .eq('id', commission.id);

      if (updateError) {
        console.error(`Error approving commission ${commission.id}:`, updateError);
        continue;
      }

      approvedCount++;
      processedCount++;

      // Prepare email notification
      emailNotifications.push({
        partner: commission.partners,
        amount: commission.amount,
        month: lastMonthNum,
        year: lastMonthYear,
      });

      // Log activity
      await supabase
        .from('partner_activity_logs')
        .insert({
          partner_id: commission.partners.id,
          action: 'commission_approved',
          details: JSON.stringify({
            amount: commission.amount,
            month: lastMonthNum,
            year: lastMonthYear,
          }),
        });
    }

    // Send email notifications
    for (const notification of emailNotifications) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_PARTNER_EMAIL || 'partners@synqall.com',
          to: notification.partner.email,
          subject: `Your SynQall Partner Commission is Ready - $${notification.amount.toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a73e8;">Commission Approved!</h1>
              <p>Hi ${notification.partner.name},</p>

              <p>Great news! Your commission for ${notification.month}/${notification.year} has been approved.</p>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #333; margin-top: 0;">Commission Details</h2>
                <p style="font-size: 24px; color: #1a73e8; margin: 10px 0;">
                  <strong>$${notification.amount.toFixed(2)}</strong>
                </p>
                <p style="color: #666;">Period: ${notification.month}/${notification.year}</p>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Your payment will be processed within 5 business days</li>
                <li>You'll receive a confirmation once the payment is sent</li>
                <li>Check your partner dashboard for detailed breakdown</li>
              </ol>

              <p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/partners/dashboard/earnings"
                   style="display: inline-block; padding: 12px 24px; background-color: #1a73e8;
                          color: white; text-decoration: none; border-radius: 4px;">
                  View Earnings Dashboard
                </a>
              </p>

              <p>Thank you for being a valued SynQall partner!</p>

              <p>Best regards,<br>The SynQall Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${notification.partner.email}:`, emailError);
      }
    }

    // Create summary log
    const summary = {
      processed: processedCount,
      approved: approvedCount,
      held: heldCount,
      month: lastMonthNum,
      year: lastMonthYear,
      totalAmount: emailNotifications.reduce((sum, n) => sum + n.amount, 0),
    };

    console.log('Commission processing complete:', summary);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Commission processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// Manual trigger for testing
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Create a fake cron request
    const cronRequest = new Request(request.url, {
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    // Run the cron job
    return await GET(cronRequest as NextRequest);
  } catch (error) {
    console.error('Manual trigger error:', error);
    return NextResponse.json(
      { error: 'Manual trigger failed' },
      { status: 500 }
    );
  }
}