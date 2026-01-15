import { features } from '@/lib/config/feature-flags';

// Twilio client wrapper with feature flag support
export class TwilioClient {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = features.twilio;
  }

  /**
   * Check if Twilio is configured
   */
  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Initialize Twilio client if configured
   */
  public async getClient() {
    if (!this.isConfigured) {
      console.warn('Twilio is not configured. Skipping Twilio operations.');
      return null;
    }

    // Only import Twilio if it's configured to avoid errors
    try {
      const twilio = await import('twilio');
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken ||
          accountSid === 'temp_not_configured' ||
          authToken === 'temp_not_configured') {
        console.warn('Twilio credentials are not properly configured');
        return null;
      }

      return twilio.default(accountSid, authToken);
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
      return null;
    }
  }

  /**
   * Make a call if Twilio is configured
   */
  public async makeCall(to: string, from: string, url: string) {
    if (!this.isConfigured) {
      return {
        error: 'Call recording is not available. Twilio service is not configured.',
        requiresConfiguration: true,
      };
    }

    const client = await this.getClient();
    if (!client) {
      return {
        error: 'Unable to make call. Twilio client initialization failed.',
        requiresConfiguration: true,
      };
    }

    try {
      const call = await client.calls.create({
        to,
        from,
        url,
        record: true,
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-status`,
      });

      return {
        success: true,
        callSid: call.sid,
      };
    } catch (error: any) {
      console.error('Twilio call error:', error);
      return {
        error: error.message || 'Failed to make call',
        requiresConfiguration: false,
      };
    }
  }

  /**
   * Get recording URL if Twilio is configured
   */
  public async getRecordingUrl(recordingSid: string) {
    if (!this.isConfigured) {
      return null;
    }

    const client = await this.getClient();
    if (!client) {
      return null;
    }

    try {
      const recording = await client.recordings(recordingSid).fetch();
      return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    } catch (error) {
      console.error('Failed to get recording URL:', error);
      return null;
    }
  }

  /**
   * Send SMS if Twilio is configured
   */
  public async sendSMS(to: string, body: string) {
    if (!this.isConfigured) {
      return {
        error: 'SMS service is not available. Twilio is not configured.',
        requiresConfiguration: true,
      };
    }

    const client = await this.getClient();
    if (!client) {
      return {
        error: 'Unable to send SMS. Twilio client initialization failed.',
        requiresConfiguration: true,
      };
    }

    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from || from === '+1234567890') {
      return {
        error: 'Twilio phone number is not configured',
        requiresConfiguration: true,
      };
    }

    try {
      const message = await client.messages.create({
        to,
        from,
        body,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      return {
        error: error.message || 'Failed to send SMS',
        requiresConfiguration: false,
      };
    }
  }
}

// Export singleton instance
export const twilioClient = new TwilioClient();

// Helper function for API routes
export function checkTwilioAvailability() {
  if (!features.twilio) {
    return {
      available: false,
      message: 'Call recording feature is coming soon! We are setting up our phone system.',
      requiresConfiguration: true,
    };
  }

  return {
    available: true,
    message: 'Twilio is configured and ready',
    requiresConfiguration: false,
  };
}