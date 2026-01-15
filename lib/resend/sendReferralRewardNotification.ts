// =====================================================
// REFERRAL REWARD NOTIFICATION EMAIL SERVICE
// Sends notification when a referrer earns rewards
// =====================================================

import { sendEmail, SENDER_NAME } from './client';

interface SendReferralRewardNotificationParams {
  email: string;
  referrerName: string;
  referredName: string;
  rewardMinutes: number;
  rewardCredits: number;
  currentTier: string;
  totalReferrals: number;
  nextTierInfo?: {
    name: string;
    referralsNeeded: number;
    reward: string;
  };
}

export async function sendReferralRewardNotification({
  email,
  referrerName,
  referredName,
  rewardMinutes,
  rewardCredits,
  currentTier,
  totalReferrals,
  nextTierInfo,
}: SendReferralRewardNotificationParams) {
  const formatCredits = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .reward-box { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .reward-amount { font-size: 32px; font-weight: bold; color: #059669; margin: 10px 0; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-box { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
          .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; margin: 20px 0; overflow: hidden; }
          .progress-fill { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; transition: width 0.3s; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .trophy-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="trophy-icon">🏆</div>
            <h1>Congratulations, ${referrerName}!</h1>
            <p>You've earned a referral reward!</p>
          </div>

          <div class="content">
            <p>Great news! <strong>${referredName}</strong> just became a paying customer through your referral.</p>

            <div class="reward-box">
              <h2 style="margin-top: 0; color: #059669;">Your Reward</h2>
              ${rewardMinutes > 0 ? `
                <div class="reward-amount">🕒 ${rewardMinutes} Minutes</div>
              ` : ''}
              ${rewardCredits > 0 ? `
                <div class="reward-amount">💰 ${formatCredits(rewardCredits)} Credits</div>
              ` : ''}
              <p style="color: #6b7280; margin-bottom: 0;">Added to your account balance</p>
            </div>

            <div class="stats-grid">
              <div class="stat-box">
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">${totalReferrals}</div>
                <div style="color: #6b7280; font-size: 14px;">Total Referrals</div>
              </div>
              <div class="stat-box">
                <div style="font-size: 24px; font-weight: bold; color: #764ba2;">${currentTier}</div>
                <div style="color: #6b7280; font-size: 14px;">Current Tier</div>
              </div>
            </div>

            ${nextTierInfo ? `
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">🎯 Next Milestone: ${nextTierInfo.name}</h3>
                <p>Refer ${nextTierInfo.referralsNeeded} more friend${nextTierInfo.referralsNeeded > 1 ? 's' : ''} to unlock:</p>
                <p style="font-weight: bold; color: #667eea;">${nextTierInfo.reward}</p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min(100, (totalReferrals / (totalReferrals + nextTierInfo.referralsNeeded)) * 100)}%"></div>
                </div>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/referrals" class="button" style="color: white;">
                View Your Referrals →
              </a>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h4 style="margin-top: 0;">💡 Pro Tip</h4>
              <p style="margin-bottom: 0;">Keep the momentum going! Share your referral link with more colleagues who could benefit from LoadVoice's AI-powered call transcription.</p>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for spreading the word about LoadVoice!</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #667eea;">Visit LoadVoice</a> |
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/referrals" style="color: #667eea;">Referral Dashboard</a> |
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #667eea;">Help Center</a>
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
Congratulations, ${referrerName}!

You've earned a referral reward!

Great news! ${referredName} just became a paying customer through your referral.

YOUR REWARD:
${rewardMinutes > 0 ? `🕒 ${rewardMinutes} Minutes` : ''}
${rewardCredits > 0 ? `💰 ${formatCredits(rewardCredits)} Credits` : ''}
Added to your account balance

YOUR STATS:
• Total Referrals: ${totalReferrals}
• Current Tier: ${currentTier}

${nextTierInfo ? `
NEXT MILESTONE: ${nextTierInfo.name}
Refer ${nextTierInfo.referralsNeeded} more friend${nextTierInfo.referralsNeeded > 1 ? 's' : ''} to unlock:
${nextTierInfo.reward}
` : ''}

View your referral dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/referrals

Pro Tip: Keep the momentum going! Share your referral link with more colleagues who could benefit from LoadVoice's AI-powered call transcription.

Thank you for spreading the word about LoadVoice!
  `.trim();

  try {
    const data = await sendEmail({
      to: email,
      subject: `🎉 You've earned a referral reward!`,
      html: htmlContent,
      text: textContent,
    });

    console.log('Referral reward notification sent successfully:', data?.id);
    return data?.id;
  } catch (error) {
    console.error('Error sending reward notification:', error);
    throw error;
  }
}