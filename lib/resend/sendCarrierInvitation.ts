import { resendClient, logEmailToConsole } from './client-wrapper';
import { features } from '@/lib/config/feature-flags';

interface CarrierInvitationParams {
  to: string;
  carrierName: string;
  contactName: string;
  invitationToken: string;
  organizationName: string;
  personalMessage?: string;
  senderName: string;
}

export async function sendCarrierInvitation(params: CarrierInvitationParams) {
  const {
    to,
    carrierName,
    contactName,
    invitationToken,
    organizationName,
    personalMessage,
    senderName
  } = params;

  // If Resend is not configured, log to console
  if (!features.resend) {
    logEmailToConsole('Carrier Invitation', {
      to,
      subject: `Invitation to join ${organizationName} network on LoadVoice`,
      data: {
        carrierName,
        contactName,
        invitationToken,
        organizationName,
        personalMessage,
        senderName
      }
    });
    return { success: true, logged: true };
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/carriers/accept-invitation?token=${invitationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Carrier Network Invitation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f7f7f7;
          }
          .container {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #7c3aed;
          }
          h1 {
            color: #1f2937;
            font-size: 24px;
            margin-top: 24px;
          }
          .message-box {
            background: #f3f4f6;
            border-left: 4px solid #7c3aed;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .button {
            display: inline-block;
            padding: 12px 32px;
            background: linear-gradient(to right, #7c3aed, #ec4899);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 24px 0;
          }
          .button:hover {
            opacity: 0.9;
          }
          .details {
            background: #f9fafb;
            padding: 16px;
            border-radius: 6px;
            margin: 16px 0;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .details-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #6b7280;
          }
          .value {
            color: #1f2937;
          }
          .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .warning {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 12px;
            border-radius: 6px;
            margin: 16px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚚 LoadVoice</div>
            <h1>Carrier Network Invitation</h1>
          </div>

          <p>Hello ${contactName},</p>

          <p><strong>${organizationName}</strong> has invited <strong>${carrierName}</strong> to join their preferred carrier network on LoadVoice.</p>

          ${personalMessage ? `
          <div class="message-box">
            <strong>Personal Message from ${senderName}:</strong><br/>
            ${personalMessage}
          </div>
          ` : ''}

          <div class="details">
            <div class="details-row">
              <span class="label">Organization:</span>
              <span class="value">${organizationName}</span>
            </div>
            <div class="details-row">
              <span class="label">Carrier:</span>
              <span class="value">${carrierName}</span>
            </div>
            <div class="details-row">
              <span class="label">Invited By:</span>
              <span class="value">${senderName}</span>
            </div>
          </div>

          <h2>Benefits of Joining:</h2>
          <ul>
            <li>📞 Direct communication channel with ${organizationName}</li>
            <li>📊 Priority access to loads and opportunities</li>
            <li>⚡ Streamlined documentation and compliance</li>
            <li>🤝 Build stronger business relationships</li>
            <li>📈 Track performance and grow your partnership</li>
          </ul>

          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>

          <div class="warning">
            ⏰ This invitation will expire in 30 days. Please accept it before it expires.
          </div>

          <p>If you have any questions about this invitation, please contact ${senderName} directly or reply to this email.</p>

          <div class="footer">
            <p>This invitation was sent via LoadVoice - AI-Powered Freight Documentation</p>
            <p>If you believe this email was sent in error, please ignore it.</p>
            <p style="margin-top: 16px;">
              <a href="${inviteUrl}" style="color: #7c3aed;">Accept Invitation</a> |
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #7c3aed;">Learn More</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Carrier Network Invitation

Hello ${contactName},

${organizationName} has invited ${carrierName} to join their preferred carrier network on LoadVoice.

${personalMessage ? `Personal Message from ${senderName}:\n${personalMessage}\n\n` : ''}

Benefits of Joining:
- Direct communication channel with ${organizationName}
- Priority access to loads and opportunities
- Streamlined documentation and compliance
- Build stronger business relationships
- Track performance and grow your partnership

Accept Invitation: ${inviteUrl}

This invitation will expire in 30 days.

If you have any questions, please contact ${senderName} directly.

This invitation was sent via LoadVoice - AI-Powered Freight Documentation
  `.trim();

  try {
    const result = await resendClient.sendEmail({
      to,
      subject: `Invitation to join ${organizationName} network on LoadVoice`,
      html,
      text,
      from: process.env.RESEND_FROM_EMAIL || 'invitations@loadvoice.com'
    });

    return result;
  } catch (error) {
    console.error('Failed to send carrier invitation:', error);
    // Log to console as fallback
    logEmailToConsole('Carrier Invitation (Failed)', {
      to,
      subject: `Invitation to join ${organizationName} network on LoadVoice`,
      data: params
    });
    return { success: false, error, logged: true };
  }
}