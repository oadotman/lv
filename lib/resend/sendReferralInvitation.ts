// =====================================================
// REFERRAL INVITATION EMAIL SERVICE
// Sends referral invitation emails via Resend
// =====================================================

import { sendEmail, SENDER_NAME } from './client';

interface SendReferralInvitationParams {
  email: string;
  referrerName: string;
  referralCode: string;
  referralLink: string;
  personalMessage?: string;
}

export async function sendReferralInvitation({
  email,
  referrerName,
  referralCode,
  referralLink,
  personalMessage,
}: SendReferralInvitationParams) {
  const defaultMessage = `I've been using LoadVoice for call recording and AI-powered transcription, and I think you'd find it really valuable for your business.

Sign up using my referral link to get started with 30 free minutes!`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .benefits { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .benefit-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .benefit-item:last-child { border-bottom: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .gift-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="gift-icon">🎁</div>
            <h1>You've Been Invited to LoadVoice!</h1>
            <p>${referrerName} thinks you'll love LoadVoice</p>
          </div>

          <div class="content">
            ${personalMessage ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <strong>Personal message from ${referrerName}:</strong><br>
                ${personalMessage.replace(/\n/g, '<br>')}
              </div>
            ` : `
              <p><strong>${referrerName}</strong> has invited you to try LoadVoice!</p>
              <p>${defaultMessage.replace(/\n/g, '<br>')}</p>
            `}

            <div class="benefits">
              <h3 style="margin-top: 0;">🎉 What You'll Get:</h3>
              <div class="benefit-item">
                <strong>✅ 30 Free Minutes</strong> - Start with our free plan
              </div>
              <div class="benefit-item">
                <strong>✅ AI-Powered Transcription</strong> - Automatic call transcription with 95%+ accuracy
              </div>
              <div class="benefit-item">
                <strong>✅ Smart Data Extraction</strong> - AI extracts key information from your calls
              </div>
              <div class="benefit-item">
                <strong>✅ CRM Integration</strong> - Seamlessly export to HubSpot, Salesforce, and more
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${referralLink}" class="button" style="color: white;">
                Start Your Free Trial →
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                Referral Code: <strong>${referralCode}</strong>
              </p>
            </div>

            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h4 style="margin-top: 0;">How It Works:</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Click the button above to sign up</li>
                <li>Your referral benefits will be automatically applied</li>
                <li>Start uploading and transcribing calls immediately</li>
                <li>Upgrade anytime to unlock more features</li>
              </ol>
            </div>
          </div>

          <div class="footer">
            <p>This invitation was sent by ${referrerName} via LoadVoice</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #667eea;">Visit LoadVoice</a> |
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy" style="color: #667eea;">Privacy Policy</a> |
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/terms" style="color: #667eea;">Terms of Service</a>
            </p>
            <p style="font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} LoadVoice. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
You've Been Invited to LoadVoice!

${referrerName} thinks you'll love LoadVoice.

${personalMessage || defaultMessage}

What You'll Get:
✅ 30 Free Minutes - Start with our free plan
✅ AI-Powered Transcription - Automatic call transcription with 95%+ accuracy
✅ Smart Data Extraction - AI extracts key information from your calls
✅ CRM Integration - Seamlessly export to HubSpot, Salesforce, and more

Sign up here: ${referralLink}
Referral Code: ${referralCode}

How It Works:
1. Click the link above to sign up
2. Your referral benefits will be automatically applied
3. Start uploading and transcribing calls immediately
4. Upgrade anytime to unlock more features

This invitation was sent by ${referrerName} via LoadVoice
  `.trim();

  try {
    const data = await sendEmail({
      to: email,
      subject: `${referrerName} invited you to ${SENDER_NAME}`,
      html: htmlContent,
      text: textContent,
    });

    console.log('Referral invitation sent successfully:', data?.id);
    return data?.id;
  } catch (error) {
    console.error('Error sending referral invitation:', error);
    throw error;
  }
}