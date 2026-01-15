// =====================================================
// RETENTION NOTIFICATION EMAIL
// =====================================================

import { emailStyles } from './email-templates';

export interface RetentionNotificationEmailProps {
  userName?: string;
  organizationName?: string;
  callCount: number;
  audioDeleteDate: string;
  transcriptDeleteDate?: string;
  dashboardLink: string;
}

export function renderRetentionNotificationEmail(props: RetentionNotificationEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="LoadVoice Data Retention Notice" />
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>⚠️ Audio Files Will Be Deleted Soon</h1>
      </div>
      <div class="content">
        <p>Hi${props.userName ? ` ${props.userName}` : ''},</p>

        <p>
          As part of our storage optimization and cost management, we're notifying you that
          <strong>${props.callCount} call recording${props.callCount > 1 ? 's' : ''}</strong>
          will have their audio files deleted according to our retention policy.
        </p>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">📅 Deletion Schedule:</h3>
          <ul style="margin: 10px 0; color: #92400e;">
            <li><strong>Audio files:</strong> Will be deleted on <strong>${props.audioDeleteDate}</strong></li>
            ${props.transcriptDeleteDate ? `<li><strong>Transcripts:</strong> Will be retained until <strong>${props.transcriptDeleteDate}</strong></li>` : ''}
            <li><strong>Extracted data:</strong> Will be kept permanently</li>
          </ul>
        </div>

        <h3 style="font-size: 16px; margin-top: 24px;">What This Means:</h3>
        <ul>
          <li>✅ Your transcripts and extracted CRM data will remain available</li>
          <li>✅ Call summaries, insights, and metadata are retained permanently</li>
          <li>❌ Original audio files will no longer be playable after deletion</li>
          <li>❌ You won't be able to re-transcribe or re-process these calls</li>
        </ul>

        <h3 style="font-size: 16px; margin-top: 24px;">Need to Keep These Files?</h3>
        <p>
          If you need to retain any specific recordings, please download them from your dashboard
          before the deletion date.
        </p>

        <a href="${props.dashboardLink}" class="button">
          Go to Dashboard
        </a>

        <div class="footer">
          <p><strong>Why do we delete audio files?</strong></p>
          <p style="font-size: 13px; color: #6b7280;">
            Audio files consume significant storage (approximately 1MB per minute), which impacts
            costs for all users. By automatically removing old audio files while preserving all
            extracted data, we can keep LoadVoice affordable while maintaining all your valuable
            business information.
          </p>
          <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">
            You can adjust your retention settings in your dashboard or upgrade to a plan with
            extended retention if needed.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send retention notification email
 * Should be called 24 hours before deletion
 */
export async function sendRetentionNotificationEmail(
  to: string,
  props: RetentionNotificationEmailProps
): Promise<boolean> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = renderRetentionNotificationEmail(props);

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com',
      to,
      subject: `⚠️ Audio files will be deleted in 24 hours - ${props.callCount} recording${props.callCount > 1 ? 's' : ''}`,
      html,
    });

    return !!result.data?.id;
  } catch (error) {
    console.error('Failed to send retention notification email:', error);
    return false;
  }
}