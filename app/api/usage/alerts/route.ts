/**
 * Usage Alerts System
 * Monitors usage and sends alerts at key thresholds
 * Helps prevent surprise overage charges
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUsageStatus } from '@/lib/simple-usage';

// Alert thresholds
const ALERT_THRESHOLDS = [80, 90, 100] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const adminSupabase = createAdminClient();

    // Get current usage
    const usage = await getUsageStatus(userOrg.organization_id, adminSupabase as any);

    // Get alert settings
    const { data: alertSettings } = await adminSupabase
      .from('usage_alert_settings')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .single();

    // Get sent alerts for this month
    const { data: sentAlerts } = await adminSupabase
      .from('usage_alerts')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .eq('month', usage.currentMonth)
      .order('created_at', { ascending: false });

    // Determine current alert status
    const alertStatus = getAlertStatus(usage.percentUsed, sentAlerts || []);

    return NextResponse.json({
      usage: {
        minutesUsed: usage.minutesUsed,
        minutesLimit: usage.minutesLimit,
        percentUsed: usage.percentUsed,
        status: usage.status,
        overageMinutes: usage.overageMinutes,
        overageCharge: usage.overageCharge
      },
      alertSettings: alertSettings || {
        enabled: true,
        email_alerts: true,
        dashboard_alerts: true,
        alert_thresholds: ALERT_THRESHOLDS
      },
      currentAlert: alertStatus,
      alertHistory: sentAlerts || []
    });

  } catch (error) {
    console.error('[Usage Alerts] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger alert check and send if needed
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const adminSupabase = createAdminClient();

    // Check and send alerts
    const result = await checkAndSendAlerts(userOrg.organization_id, adminSupabase);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Usage Alerts] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update alert settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg || !['owner', 'admin'].includes(userOrg.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const adminSupabase = createAdminClient();

    // Upsert alert settings
    const { data: settings, error } = await adminSupabase
      .from('usage_alert_settings')
      .upsert({
        organization_id: userOrg.organization_id,
        enabled: body.enabled ?? true,
        email_alerts: body.email_alerts ?? true,
        dashboard_alerts: body.dashboard_alerts ?? true,
        alert_thresholds: body.alert_thresholds || ALERT_THRESHOLDS,
        alert_emails: body.alert_emails || [],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[Usage Alerts] Settings error:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('[Usage Alerts] PUT Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check usage and send alerts if needed
 */
export async function checkAndSendAlerts(organizationId: string, supabase: any) {
  try {
    // Get current usage
    const usage = await getUsageStatus(organizationId, supabase);

    // Get alert settings
    const { data: settings } = await supabase
      .from('usage_alert_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (!settings?.enabled) {
      return { checked: true, alertSent: false, reason: 'Alerts disabled' };
    }

    // Check if we should send an alert
    const threshold = getThresholdToAlert(usage.percentUsed, settings.alert_thresholds || ALERT_THRESHOLDS);

    if (!threshold) {
      return { checked: true, alertSent: false, reason: 'No threshold reached' };
    }

    // Check if we already sent this alert this month
    const { data: existingAlert } = await supabase
      .from('usage_alerts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('month', usage.currentMonth)
      .eq('threshold', threshold)
      .single();

    if (existingAlert) {
      return { checked: true, alertSent: false, reason: 'Alert already sent for this threshold' };
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, owner_id')
      .eq('id', organizationId)
      .single();

    // Create alert record
    const alertData = {
      organization_id: organizationId,
      month: usage.currentMonth,
      threshold,
      usage_percent: usage.percentUsed,
      minutes_used: usage.minutesUsed,
      minutes_limit: usage.minutesLimit,
      overage_minutes: usage.overageMinutes,
      overage_charge: usage.overageCharge,
      alert_type: threshold >= 100 ? 'overage' : 'warning',
      created_at: new Date().toISOString()
    };

    const { data: alert, error: alertError } = await supabase
      .from('usage_alerts')
      .insert(alertData)
      .select()
      .single();

    if (alertError) {
      console.error('[Usage Alerts] Error creating alert:', alertError);
      return { checked: true, alertSent: false, error: alertError.message };
    }

    // Send email if enabled
    if (settings.email_alerts) {
      // Get owner email
      const { data: owner } = await supabase
        .from('users')
        .select('email')
        .eq('id', org.owner_id)
        .single();

      const emailAddresses = [owner?.email, ...(settings.alert_emails || [])].filter(Boolean);

      for (const email of emailAddresses) {
        await supabase.from('email_queue').insert({
          to: email,
          subject: getAlertSubject(threshold, org.name),
          template: 'usage_alert',
          data: {
            organizationName: org.name,
            threshold,
            minutesUsed: usage.minutesUsed,
            minutesLimit: usage.minutesLimit,
            percentUsed: usage.percentUsed,
            overageMinutes: usage.overageMinutes,
            overageCharge: usage.overageCharge,
            daysRemaining: usage.daysRemaining,
            alertType: threshold >= 100 ? 'overage' : 'warning'
          },
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
      }
    }

    // Create dashboard notification
    if (settings.dashboard_alerts) {
      await supabase.from('notifications').insert({
        organization_id: organizationId,
        type: 'usage_alert',
        title: getAlertTitle(threshold),
        message: getAlertMessage(usage, threshold),
        severity: threshold >= 100 ? 'error' : threshold >= 90 ? 'warning' : 'info',
        data: alertData,
        created_at: new Date().toISOString()
      });
    }

    return {
      checked: true,
      alertSent: true,
      alert,
      threshold,
      message: `Alert sent for ${threshold}% usage threshold`
    };

  } catch (error) {
    console.error('[Usage Alerts] Check error:', error);
    return {
      checked: false,
      alertSent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Determine which threshold to alert for
 */
function getThresholdToAlert(percentUsed: number, thresholds: readonly number[]): number | null {
  // Find the highest threshold that's been passed
  const passedThresholds = thresholds.filter(t => percentUsed >= t);
  return passedThresholds.length > 0 ? Math.max(...passedThresholds) : null;
}

/**
 * Get current alert status
 */
function getAlertStatus(percentUsed: number, sentAlerts: any[]) {
  if (percentUsed >= 100) {
    return {
      level: 'critical',
      message: 'You are now using overage minutes',
      color: 'red',
      icon: '🚨'
    };
  } else if (percentUsed >= 90) {
    return {
      level: 'high',
      message: `${100 - percentUsed}% of minutes remaining`,
      color: 'orange',
      icon: '⚠️'
    };
  } else if (percentUsed >= 80) {
    return {
      level: 'medium',
      message: `${100 - percentUsed}% of minutes remaining`,
      color: 'yellow',
      icon: '📊'
    };
  } else if (percentUsed >= 70) {
    return {
      level: 'low',
      message: 'Usage is within normal range',
      color: 'blue',
      icon: 'ℹ️'
    };
  }

  return {
    level: 'none',
    message: 'Usage is healthy',
    color: 'green',
    icon: '✅'
  };
}

/**
 * Get alert email subject
 */
function getAlertSubject(threshold: number, orgName: string): string {
  if (threshold >= 100) {
    return `🚨 [LoadVoice] Overage Alert - ${orgName} is using overage minutes`;
  } else if (threshold >= 90) {
    return `⚠️ [LoadVoice] Usage Warning - ${orgName} at ${threshold}% of monthly limit`;
  }
  return `📊 [LoadVoice] Usage Alert - ${orgName} at ${threshold}% of monthly limit`;
}

/**
 * Get alert title for dashboard
 */
function getAlertTitle(threshold: number): string {
  if (threshold >= 100) {
    return 'Overage Minutes Active';
  } else if (threshold >= 90) {
    return 'Critical Usage Warning';
  }
  return `${threshold}% Usage Reached`;
}

/**
 * Get alert message
 */
function getAlertMessage(usage: any, threshold: number): string {
  if (threshold >= 100) {
    return `You're now being charged $0.20/minute for overage. Current overage: ${usage.overageMinutes} minutes ($${usage.overageCharge.toFixed(2)})`;
  }
  const remaining = usage.minutesLimit - usage.minutesUsed;
  return `You have ${remaining} minutes remaining (${usage.daysRemaining} days left in billing period)`;
}