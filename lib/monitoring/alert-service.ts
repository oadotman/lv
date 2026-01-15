// =====================================================
// ALERT SERVICE - Monitoring & Notifications
// Sends alerts for failed recordings, transcriptions, extractions
// =====================================================

import { createAdminClient } from '@/lib/supabase/admin';

// Alert types
export type AlertType =
  | 'recording_failed'
  | 'transcription_failed'
  | 'extraction_failed'
  | 'twilio_webhook_failed'
  | 'processing_timeout'
  | 'api_error';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Alert configuration
interface AlertConfig {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  callId?: string;
  userId?: string;
  organizationId?: string;
  errorDetails?: any;
  metadata?: Record<string, any>;
}

// =====================================================
// MAIN ALERT FUNCTION
// =====================================================

export async function sendAlert(config: AlertConfig): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Log to database for audit trail
    await logAlertToDatabase(config);

    // Send based on severity
    switch (config.severity) {
      case 'critical':
        // Critical: Send everywhere immediately
        await Promise.all([
          sendSlackAlert(config),
          sendEmailAlert(config),
          createSystemNotification(config),
        ]);
        break;

      case 'high':
        // High: Slack and email
        await Promise.all([
          sendSlackAlert(config),
          sendEmailAlert(config),
        ]);
        break;

      case 'medium':
        // Medium: Just Slack
        await sendSlackAlert(config);
        break;

      case 'low':
        // Low: Just log to database (already done)
        break;
    }

    console.log(`[Alert] Sent ${config.severity} alert:`, config.title);
  } catch (error) {
    // If alerting fails, at least log to console
    console.error('[Alert] Failed to send alert:', error);
    console.error('[Alert] Original alert config:', config);
  }
}

// =====================================================
// SLACK INTEGRATION
// =====================================================

async function sendSlackAlert(config: AlertConfig): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[Alert] Slack webhook not configured');
    return;
  }

  const color = {
    critical: '#FF0000',
    high: '#FF9900',
    medium: '#FFCC00',
    low: '#36C5F0',
  }[config.severity];

  const payload = {
    username: 'LoadVoice Alerts',
    icon_emoji: ':warning:',
    attachments: [
      {
        color,
        title: `[${config.severity.toUpperCase()}] ${config.title}`,
        text: config.message,
        fields: [
          ...(config.callId ? [{ title: 'Call ID', value: config.callId, short: true }] : []),
          ...(config.userId ? [{ title: 'User ID', value: config.userId, short: true }] : []),
          ...(config.type ? [{ title: 'Alert Type', value: config.type, short: true }] : []),
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
        ],
        footer: 'LoadVoice Monitoring',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  // Add error details if present
  if (config.errorDetails) {
    payload.attachments.push({
      color: '#808080',
      title: 'Error Details',
      text: '```' + JSON.stringify(config.errorDetails, null, 2).substring(0, 500) + '```',
      fields: [],
      footer: 'LoadVoice Monitoring',
      ts: Math.floor(Date.now() / 1000),
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error('[Alert] Failed to send Slack alert:', error);
  }
}

// =====================================================
// EMAIL INTEGRATION (via Resend)
// =====================================================

async function sendEmailAlert(config: AlertConfig): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  if (!adminEmail) {
    console.warn('[Alert] Admin email not configured');
    return;
  }

  try {
    // Import Resend dynamically to avoid build issues
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '📢',
      low: 'ℹ️',
    }[config.severity];

    await resend.emails.send({
      from: 'LoadVoice Alerts <alerts@loadvoice.com>',
      to: adminEmail,
      subject: `${severityEmoji} [${config.severity.toUpperCase()}] ${config.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${config.severity === 'critical' ? '#FF0000' : '#333'};">
            ${config.title}
          </h2>

          <p style="font-size: 16px; line-height: 1.5;">
            ${config.message}
          </p>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Details:</h3>
            <ul style="list-style: none; padding: 0;">
              ${config.callId ? `<li><strong>Call ID:</strong> ${config.callId}</li>` : ''}
              ${config.userId ? `<li><strong>User ID:</strong> ${config.userId}</li>` : ''}
              <li><strong>Alert Type:</strong> ${config.type}</li>
              <li><strong>Severity:</strong> ${config.severity}</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>

          ${config.errorDetails ? `
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px;">
              <h4 style="margin-top: 0; color: #856404;">Error Details:</h4>
              <pre style="overflow-x: auto; background: white; padding: 10px; border-radius: 3px;">
${JSON.stringify(config.errorDetails, null, 2).substring(0, 1000)}
              </pre>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px;">
              This is an automated alert from LoadVoice monitoring system.
              ${config.callId ? `<br><a href="${process.env.NEXT_PUBLIC_APP_URL}/calls/${config.callId}">View Call</a>` : ''}
            </p>
          </div>
        </div>
      `,
    });

    console.log('[Alert] Email sent to:', adminEmail);
  } catch (error) {
    console.error('[Alert] Failed to send email alert:', error);
  }
}

// =====================================================
// DATABASE LOGGING
// =====================================================

async function logAlertToDatabase(config: AlertConfig): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from('system_alerts').insert({
      alert_type: config.type,
      severity: config.severity,
      title: config.title,
      message: config.message,
      call_id: config.callId,
      user_id: config.userId,
      organization_id: config.organizationId,
      error_details: config.errorDetails,
      metadata: config.metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Alert] Failed to log to database:', error);
  }
}

// =====================================================
// USER NOTIFICATIONS (in-app)
// =====================================================

async function createSystemNotification(config: AlertConfig): Promise<void> {
  if (!config.userId) return;

  try {
    const supabase = createAdminClient();

    await supabase.from('notifications').insert({
      user_id: config.userId,
      notification_type: 'system_alert',
      title: `Processing Failed: ${config.title}`,
      message: config.message,
      link: config.callId ? `/calls/${config.callId}` : null,
      metadata: {
        severity: config.severity,
        alert_type: config.type,
        error_details: config.errorDetails,
      },
    });
  } catch (error) {
    console.error('[Alert] Failed to create user notification:', error);
  }
}

// =====================================================
// SPECIFIC ALERT HELPERS
// =====================================================

export async function alertRecordingFailed(
  callId: string,
  userId: string,
  error: any,
  metadata?: any
): Promise<void> {
  await sendAlert({
    type: 'recording_failed',
    severity: 'high',
    title: 'Call Recording Failed',
    message: `Failed to record call ${callId}. User may not have received their call data.`,
    callId,
    userId,
    errorDetails: {
      error: error?.message || error,
      stack: error?.stack,
      ...metadata,
    },
  });
}

export async function alertTranscriptionFailed(
  callId: string,
  userId: string,
  error: any,
  audioUrl?: string
): Promise<void> {
  await sendAlert({
    type: 'transcription_failed',
    severity: 'medium',
    title: 'Transcription Failed',
    message: `Failed to transcribe call ${callId}. Recording exists but text extraction failed.`,
    callId,
    userId,
    errorDetails: {
      error: error?.message || error,
      audioUrl,
      provider: 'AssemblyAI',
    },
  });
}

export async function alertExtractionFailed(
  callId: string,
  userId: string,
  error: any
): Promise<void> {
  await sendAlert({
    type: 'extraction_failed',
    severity: 'low',
    title: 'Data Extraction Failed',
    message: `Failed to extract CRM data from call ${callId}. Transcript exists but AI extraction failed.`,
    callId,
    userId,
    errorDetails: {
      error: error?.message || error,
      provider: 'OpenAI GPT-4',
    },
  });
}

export async function alertProcessingTimeout(
  callId: string,
  userId: string,
  timeoutMinutes: number
): Promise<void> {
  await sendAlert({
    type: 'processing_timeout',
    severity: 'high',
    title: 'Call Processing Timeout',
    message: `Call ${callId} has been processing for over ${timeoutMinutes} minutes. May be stuck.`,
    callId,
    userId,
    metadata: {
      timeout_minutes: timeoutMinutes,
    },
  });
}

export async function alertTwilioWebhookFailed(
  webhookType: string,
  error: any,
  requestData?: any
): Promise<void> {
  await sendAlert({
    type: 'twilio_webhook_failed',
    severity: 'critical',
    title: `Twilio Webhook Failed: ${webhookType}`,
    message: `Failed to process Twilio ${webhookType} webhook. Calls may not be recording properly.`,
    errorDetails: {
      webhook_type: webhookType,
      error: error?.message || error,
      request_data: requestData,
    },
  });
}