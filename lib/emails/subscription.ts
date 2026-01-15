/**
 * Subscription Email Templates
 * Handles welcome and payment-related emails
 */

import { sendEmail } from '@/lib/resend/client';

export async function sendWelcomeEmail(email: string, plan: string) {
  try {
    await sendEmail({
      to: email,
      subject: `Welcome to LoadVoice ${plan} Plan!`,
      html: `
        <h1>Welcome to LoadVoice!</h1>
        <p>Thank you for subscribing to the ${plan} plan.</p>
        <p>You can now start uploading and processing your calls.</p>
      `,
      text: `Welcome to LoadVoice! Thank you for subscribing to the ${plan} plan.`
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendPaymentFailedEmail(email: string) {
  try {
    await sendEmail({
      to: email,
      subject: 'Payment Failed - Action Required',
      html: `
        <h1>Payment Failed</h1>
        <p>We were unable to process your payment for LoadVoice.</p>
        <p>Please update your payment method to continue using the service.</p>
      `,
      text: 'Payment failed. Please update your payment method to continue using LoadVoice.'
    });
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
}