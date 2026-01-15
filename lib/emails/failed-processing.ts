// =====================================================
// FAILED PROCESSING EMAIL NOTIFICATION
// Alerts users when call processing fails
// =====================================================

import { sendEmail } from '@/lib/resend/client';
import { createClient } from '@supabase/supabase-js';

interface FailedCallData {
  callId: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  salesRep?: string;
  fileName?: string;
  uploadedAt?: string;
  errorMessage?: string;
  errorType?: 'transcription' | 'extraction' | 'timeout' | 'unknown';
}

/**
 * Send email notification when call processing fails
 * This ensures users know to manually document important calls
 */
export async function sendFailedProcessingEmail(data: FailedCallData) {
  try {
    // Get user details from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user } = await supabase.auth.admin.getUserById(data.userId);

    if (!user?.user?.email) {
      console.error('[Email] No email found for user:', data.userId);
      return;
    }

    const email = user.user.email;
    const userName = user.user.user_metadata?.full_name || user.user.email?.split('@')[0] || 'there';

    // Format the phone number if available
    const phoneDisplay = data.customerPhone || 'Unknown Number';

    // Format upload time
    const uploadTime = data.uploadedAt
      ? new Date(data.uploadedAt).toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          month: 'short',
          day: 'numeric'
        })
      : 'Recently';

    // Determine the error message for users
    let userFriendlyError = 'The system encountered an error while processing your call.';
    let actionRequired = 'You may want to document the key points from this call manually.';

    switch (data.errorType) {
      case 'transcription':
        userFriendlyError = 'The audio transcription service was unable to process this recording.';
        actionRequired = 'Please check the audio quality and try uploading again, or document the call manually.';
        break;
      case 'extraction':
        userFriendlyError = 'The call was transcribed but data extraction failed.';
        actionRequired = 'The transcript may be available, but you\'ll need to extract details manually.';
        break;
      case 'timeout':
        userFriendlyError = 'Processing took too long and timed out.';
        actionRequired = 'Try processing again later when the system is less busy, or document manually.';
        break;
    }

    // Send the email
    await sendEmail({
      to: email,
      subject: `⚠️ Call Processing Failed - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              padding: 25px;
              border-radius: 12px 12px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              background: white;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-radius: 0 0 12px 12px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .alert-box {
              background: #fef2f2;
              border-left: 4px solid #ef4444;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .call-details {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .call-details h3 {
              margin-top: 0;
              color: #111827;
              font-size: 16px;
            }
            .detail-row {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #6b7280;
              min-width: 120px;
            }
            .detail-value {
              color: #111827;
              flex: 1;
            }
            .action-box {
              background: #eff6ff;
              border: 1px solid #3b82f6;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .action-box h3 {
              margin-top: 0;
              color: #1e40af;
              font-size: 16px;
            }
            .action-list {
              margin: 12px 0;
              padding-left: 20px;
            }
            .action-list li {
              margin: 8px 0;
              color: #1e40af;
            }
            .button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .warning-icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="warning-icon">⚠️</div>
              <h1>Call Processing Failed</h1>
            </div>

            <div class="content">
              <p>Hi ${userName},</p>

              <div class="alert-box">
                <strong>Heads up:</strong> Your call with <strong>${phoneDisplay}</strong> at <strong>${uploadTime}</strong> didn't process correctly. You may want to document it manually to ensure no important information is lost.
              </div>

              <div class="call-details">
                <h3>📞 Call Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Customer:</span>
                  <span class="detail-value">${data.customerName || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">${phoneDisplay}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Sales Rep:</span>
                  <span class="detail-value">${data.salesRep || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Uploaded:</span>
                  <span class="detail-value">${uploadTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">File:</span>
                  <span class="detail-value">${data.fileName || 'Unknown'}</span>
                </div>
              </div>

              <div class="action-box">
                <h3>🔧 What Happened?</h3>
                <p>${userFriendlyError}</p>
                <p><strong>${actionRequired}</strong></p>
              </div>

              <div class="action-box" style="background: #fefce8; border-color: #facc15;">
                <h3>✍️ Recommended Actions</h3>
                <ol class="action-list" style="color: #854d0e;">
                  <li>Document key points from the call while they're fresh in your memory</li>
                  <li>Note any rates, lanes, or equipment discussed</li>
                  <li>Record carrier/shipper contact information</li>
                  <li>Save any follow-up actions needed</li>
                  ${data.errorType === 'transcription' ? '<li>Consider re-uploading with better audio quality</li>' : ''}
                </ol>
              </div>

              <center>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/calls/${data.callId}" class="button">
                  View Call Details
                </a>
              </center>

              <div class="footer">
                <p><strong>Why did this happen?</strong></p>
                <p style="font-size: 12px; color: #9ca3af;">
                  Processing can fail due to poor audio quality, network issues, or temporary service outages.<br>
                  ${data.errorMessage ? `Technical details: ${data.errorMessage}` : 'No specific error details available.'}
                </p>
                <p style="margin-top: 20px;">
                  Need help? Contact support at support@loadvoice.com
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Call Processing Failed - Action Required

Hi ${userName},

Heads up: Your call with ${phoneDisplay} at ${uploadTime} didn't process correctly.
You may want to document it manually to ensure no important information is lost.

Call Details:
- Customer: ${data.customerName || 'Not specified'}
- Phone: ${phoneDisplay}
- Sales Rep: ${data.salesRep || 'Not specified'}
- Uploaded: ${uploadTime}
- File: ${data.fileName || 'Unknown'}

What Happened?
${userFriendlyError}
${actionRequired}

Recommended Actions:
1. Document key points from the call while they're fresh in your memory
2. Note any rates, lanes, or equipment discussed
3. Record carrier/shipper contact information
4. Save any follow-up actions needed

View call details: ${process.env.NEXT_PUBLIC_APP_URL}/calls/${data.callId}

Need help? Contact support at support@loadvoice.com
      `,
    });

    console.log(`[Email] Failed processing notification sent to ${email} for call ${data.callId}`);

    // Also create an in-app notification
    await supabase.from('notifications').insert({
      user_id: data.userId,
      notification_type: 'call_failed',
      title: 'Call processing failed',
      message: `Your call with ${phoneDisplay} couldn't be processed. Please document it manually.`,
      link: `/calls/${data.callId}`,
    });

  } catch (error) {
    console.error('[Email] Failed to send processing failure notification:', error);
    // Don't throw - we don't want email failures to break the app
  }
}

/**
 * Send a follow-up email if user hasn't addressed the failed call
 * Can be called by a cron job after 24 hours
 */
export async function sendFailedCallReminder(data: FailedCallData) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if call is still in failed state
    const { data: call } = await supabase
      .from('calls')
      .select('status')
      .eq('id', data.callId)
      .single();

    if (call?.status !== 'failed') {
      // Call has been addressed, no reminder needed
      return;
    }

    const { data: user } = await supabase.auth.admin.getUserById(data.userId);
    if (!user?.user?.email) return;

    await sendEmail({
      to: user.user.email,
      subject: '🔔 Reminder: Failed call still needs documentation',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Reminder: Undocumented Call</h2>
          <p>You have a failed call from ${data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString() : 'recently'} that still needs manual documentation.</p>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <strong>Call Details:</strong><br>
            Customer: ${data.customerName || 'Unknown'}<br>
            Phone: ${data.customerPhone || 'Unknown'}<br>
            Date: ${data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString() : 'Unknown'}
          </div>

          <p>This call couldn't be processed automatically. To ensure no important information is lost, please document it manually.</p>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/calls/${data.callId}"
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">
            Document This Call
          </a>
        </div>
      `,
      text: `
Reminder: You have an undocumented failed call.

Call Details:
- Customer: ${data.customerName || 'Unknown'}
- Phone: ${data.customerPhone || 'Unknown'}
- Date: ${data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString() : 'Unknown'}

Please document this call manually to ensure no important information is lost.

View call: ${process.env.NEXT_PUBLIC_APP_URL}/calls/${data.callId}
      `,
    });

  } catch (error) {
    console.error('[Email] Failed to send reminder:', error);
  }
}