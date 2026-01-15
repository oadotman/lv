import { features } from '@/lib/config/feature-flags';

// Paddle client wrapper with feature flag support
export class PaddleClient {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = features.paddle;
  }

  /**
   * Check if Paddle is configured
   */
  public isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Initialize Paddle client if configured
   */
  public async getClient() {
    if (!this.isConfigured) {
      console.warn('Paddle is not configured. Payment processing is disabled.');
      return null;
    }

    const apiKey = process.env.PADDLE_API_KEY;
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';

    if (!apiKey || apiKey === 'temp_not_configured') {
      console.warn('Paddle API key is not properly configured');
      return null;
    }

    // Return a mock client for now - replace with actual Paddle SDK when configured
    return {
      apiKey,
      environment,
      baseUrl: environment === 'production'
        ? 'https://api.paddle.com'
        : 'https://sandbox-api.paddle.com',
    };
  }

  /**
   * Create a checkout session if Paddle is configured
   */
  public async createCheckout(priceId: string, customerId?: string) {
    if (!this.isConfigured) {
      return {
        error: 'Payment processing is not available. Paddle service is not configured.',
        requiresConfiguration: true,
        showComingSoon: true,
      };
    }

    const client = await this.getClient();
    if (!client) {
      return {
        error: 'Unable to process payment. Paddle client initialization failed.',
        requiresConfiguration: true,
      };
    }

    // Mock response for development
    return {
      success: true,
      checkoutUrl: '#',
      message: 'Payment processing will be available soon',
    };
  }

  /**
   * Get subscription details if Paddle is configured
   */
  public async getSubscription(subscriptionId: string) {
    if (!this.isConfigured) {
      return null;
    }

    const client = await this.getClient();
    if (!client) {
      return null;
    }

    // Mock response for development
    return {
      id: subscriptionId,
      status: 'trialing',
      plan: 'free',
      message: 'Subscription management coming soon',
    };
  }

  /**
   * Cancel subscription if Paddle is configured
   */
  public async cancelSubscription(subscriptionId: string) {
    if (!this.isConfigured) {
      return {
        error: 'Subscription management is not available yet.',
        requiresConfiguration: true,
      };
    }

    const client = await this.getClient();
    if (!client) {
      return {
        error: 'Unable to cancel subscription. Paddle client initialization failed.',
        requiresConfiguration: true,
      };
    }

    // Mock response for development
    return {
      success: true,
      message: 'Subscription management will be available soon',
    };
  }

  /**
   * Verify webhook signature
   */
  public verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.isConfigured) {
      console.warn('Cannot verify webhook - Paddle is not configured');
      return false;
    }

    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret === 'temp_not_configured') {
      console.warn('Paddle webhook secret is not configured');
      return false;
    }

    // TODO: Implement actual signature verification when Paddle is configured
    // For now, return false to reject all webhooks when not properly configured
    return false;
  }
}

// Export singleton instance
export const paddleClient = new PaddleClient();

// Helper function for API routes
export function checkPaddleAvailability() {
  if (!features.paddle) {
    return {
      available: false,
      message: 'Payment processing coming soon! We are setting up our payment system.',
      requiresConfiguration: true,
      showFreeTier: true, // Show that app is in free tier mode
    };
  }

  return {
    available: true,
    message: 'Paddle is configured and ready',
    requiresConfiguration: false,
    showFreeTier: false,
  };
}

// Mock pricing data for when Paddle is not configured
export const DEFAULT_PRICING = {
  free: {
    name: 'Free',
    minutes: 60,
    price: 0,
    features: [
      '60 minutes per month',
      'AI transcription',
      'Data extraction',
      'Basic support',
    ],
  },
  basic: {
    name: 'Basic',
    minutes: 500,
    price: 49,
    features: [
      '500 minutes per month',
      'Everything in Free',
      'Team collaboration',
      'Priority support',
    ],
  },
  professional: {
    name: 'Professional',
    minutes: 2000,
    price: 149,
    features: [
      '2000 minutes per month',
      'Everything in Basic',
      'API access',
      'Custom integrations',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    minutes: 'Unlimited',
    price: 'Custom',
    features: [
      'Unlimited minutes',
      'Everything in Professional',
      'Dedicated support',
      'Custom features',
    ],
  },
};