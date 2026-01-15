import { features } from '@/lib/config/feature-flags';

// Resend client wrapper with feature flag support
export class ResendClient {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = features.resend;
  }

  /**
   * Check if Resend is configured
   */
  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Initialize Resend client if configured
   */
  public async getClient() {
    if (!this.isConfigured) {
      console.warn('Resend is not configured. Email notifications are disabled.');
      return null;
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey ||
        apiKey === 're_temp_not_configured' ||
        apiKey === 're_REPLACE_WITH_YOUR_RESEND_KEY') {
      console.warn('Resend API key is not properly configured');
      return null;
    }

    try {
      const { Resend } = await import('resend');
      return new Resend(apiKey);
    } catch (error) {
      console.error('Failed to initialize Resend client:', error);
      return null;
    }
  }

  /**
   * Send email if Resend is configured
   */
  public async sendEmail({
    to,
    subject,
    html,
    text,
    from,
  }: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }) {
    if (!this.isConfigured) {
      console.log('Email notification (disabled):', { to, subject });
      return {
        success: true,
        message: 'Email notifications are disabled. Message logged to console.',
        logged: true,
      };
    }

    const client = await this.getClient();
    if (!client) {
      console.log('Email notification (client failed):', { to, subject });
      return {
        success: false,
        error: 'Unable to send email. Resend client initialization failed.',
        logged: true,
      };
    }

    const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com';

    try {
      const response = await client.emails.send({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || '',
        text: text || '',
      });

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error: any) {
      console.error('Resend email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send batch emails if Resend is configured
   */
  public async sendBatch(emails: Array<{
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }>) {
    if (!this.isConfigured) {
      console.log('Batch email notifications (disabled):', emails.length, 'emails');
      return {
        success: true,
        message: 'Email notifications are disabled. Messages logged to console.',
        logged: true,
        count: emails.length,
      };
    }

    const client = await this.getClient();
    if (!client) {
      console.log('Batch email notifications (client failed):', emails.length, 'emails');
      return {
        success: false,
        error: 'Unable to send emails. Resend client initialization failed.',
        logged: true,
      };
    }

    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: failed === 0,
      successful,
      failed,
      total: emails.length,
    };
  }
}

// Export singleton instance
export const resendClient = new ResendClient();

// Helper function for API routes
export function checkResendAvailability() {
  if (!features.resend) {
    return {
      available: false,
      message: 'Email notifications are temporarily disabled. Messages will be logged to console.',
      requiresConfiguration: true,
      fallback: 'console',
    };
  }

  return {
    available: true,
    message: 'Resend is configured and ready',
    requiresConfiguration: false,
    fallback: null,
  };
}

// Email templates for when Resend is not configured (console logging)
export function logEmailToConsole(type: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log('=' .repeat(50));
    console.log(`📧 EMAIL NOTIFICATION (${type})`);
    console.log('=' .repeat(50));
    console.log('To:', data.to);
    console.log('Subject:', data.subject);
    if (data.body) {
      console.log('Body:', data.body);
    }
    if (data.data) {
      console.log('Data:', JSON.stringify(data.data, null, 2));
    }
    console.log('=' .repeat(50));
  } else {
    // In production, log less verbose output
    console.log(`Email notification: ${type} to ${data.to}`);
  }
}