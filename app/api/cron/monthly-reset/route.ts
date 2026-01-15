// =====================================================
// MONTHLY USAGE RESET CRON JOB
// Automatically resets usage counters at the start of each month
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resetMonthlyUsage } from '@/lib/simple-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for cron jobs

export async function GET(req: NextRequest) {
  // Create admin client for cron operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  try {
    // Verify the request is from an authorized source
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Only check authorization if CRON_SECRET is set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Monthly Reset] Starting monthly usage reset...');

    // Get current date info
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const dayOfMonth = now.getDate();

    console.log(`[Monthly Reset] Current date: ${now.toISOString()}`);
    console.log(`[Monthly Reset] Current month: ${currentMonth}`);
    console.log(`[Monthly Reset] Day of month: ${dayOfMonth}`);

    // Only run on the first few days of the month (to catch any missed runs)
    if (dayOfMonth > 5) {
      console.log('[Monthly Reset] Not the beginning of month, skipping...');
      return NextResponse.json({
        success: true,
        message: 'Not the beginning of the month',
        currentMonth,
        dayOfMonth,
        skipped: true,
      });
    }

    // Check if we've already reset this month
    const { data: lastReset } = await supabaseAdmin
      .from('system_logs')
      .select('created_at')
      .eq('action', 'monthly_usage_reset')
      .eq('metadata->month', currentMonth)
      .single();

    if (lastReset) {
      console.log(`[Monthly Reset] Already reset for ${currentMonth}, skipping...`);
      return NextResponse.json({
        success: true,
        message: `Already reset for ${currentMonth}`,
        lastResetAt: lastReset.created_at,
        skipped: true,
      });
    }

    // Perform the monthly reset
    const result = await resetMonthlyUsage(supabaseAdmin as any);

    if (!result.success) {
      console.error('[Monthly Reset] Failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to reset monthly usage', details: result.error },
        { status: 500 }
      );
    }

    console.log(`[Monthly Reset] Successfully reset ${result.resetCount} organizations`);

    // Log the reset in system_logs (create table if it doesn't exist)
    try {
      await supabaseAdmin.from('system_logs').insert({
        action: 'monthly_usage_reset',
        metadata: {
          month: currentMonth,
          organizations_reset: result.resetCount,
          timestamp: now.toISOString(),
        },
      });
      console.log('[Monthly Reset] Logged reset to system_logs');
    } catch (err) {
      // Table might not exist, that's okay
      console.log('[Monthly Reset] Could not log to system_logs (table may not exist)');
    }

    // Send success notification (if configured)
    if (process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'LoadVoice System <system@loadvoice.ai>',
          to: process.env.ADMIN_EMAIL,
          subject: `Monthly Usage Reset - ${currentMonth}`,
          html: `
            <h2>Monthly Usage Reset Completed</h2>
            <p>The monthly usage counters have been successfully reset.</p>
            <ul>
              <li><strong>Month:</strong> ${currentMonth}</li>
              <li><strong>Organizations Reset:</strong> ${result.resetCount}</li>
              <li><strong>Timestamp:</strong> ${now.toISOString()}</li>
            </ul>
            <p>All organizations are now tracking usage for the new month.</p>
          `,
        });
        console.log('[Monthly Reset] Admin notification sent');
      } catch (emailError) {
        console.error('[Monthly Reset] Failed to send admin notification:', emailError);
        // Don't fail the whole operation just because email failed
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly usage reset completed',
      currentMonth,
      organizationsReset: result.resetCount,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error('[Monthly Reset] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

// Also support POST for some cron services
export async function POST(req: NextRequest) {
  return GET(req);
}