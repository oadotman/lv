// =====================================================
// RESEND CLIENT
// Email delivery service for transactional emails
// =====================================================

import { Resend } from 'resend';

// Validate API key
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will not work.');
}

// Use a placeholder key if not set (for build time)
export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build');

// Email sender configuration
// Note: These will fail at runtime if not configured, which is intentional
// to prevent sending emails from incorrect addresses
export const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || '';
export const SENDER_NAME = 'SynQall';
export const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO || '';

// Email delivery helper
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo = REPLY_TO_EMAIL,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  // Validate configuration before attempting to send
  if (!SENDER_EMAIL) {
    throw new Error('Email configuration incomplete. Please set RESEND_FROM_EMAIL environment variable.');
  }

  // Use sender email as reply-to if not configured
  const finalReplyTo = replyTo || SENDER_EMAIL;

  try {
    const { data, error } = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to,
      subject,
      html,
      text,
      replyTo: finalReplyTo,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}
