// =====================================================
// PADDLE CONFIGURATION FOR LOADVOICE
// Subscription and payment management
// =====================================================

import { Paddle } from '@paddle/paddle-node-sdk';

// Paddle Product IDs (you'll need to create these in Paddle dashboard)
export const PADDLE_PRODUCTS = {
  LOADVOICE_FREE: 'pri_01hqk8x9freetrialloadvoice',
  LOADVOICE_STARTER: 'pri_01hqk8x9starterloadvoice',
  LOADVOICE_PRO: 'pri_01hqk8x9proloadvoice',
  LOADVOICE_TEAM: 'pri_01hqk8x9teamloadvoice',
  LOADVOICE_ENTERPRISE: 'pri_01hqk8x9enterpriseloadvoice',

  // Add-ons
  ADDON_EXTRA_MINUTES: 'pri_01hqk8x9extraminutes',
  ADDON_WHITE_LABEL: 'pri_01hqk8x9whitelabel',
  ADDON_API_ACCESS: 'pri_01hqk8x9apiaccess',
  ADDON_CUSTOM_AI: 'pri_01hqk8x9customai',
};

// Paddle Price IDs (monthly and annual)
export const PADDLE_PRICES = {
  // Monthly prices
  STARTER_MONTHLY: 'pri_01hqk8xa99monthly',
  PRO_MONTHLY: 'pri_01hqk8xa199monthly',
  TEAM_MONTHLY: 'pri_01hqk8xa349monthly',
  ENTERPRISE_MONTHLY: 'pri_01hqk8xa999monthly',

  // Annual prices (17% discount)
  STARTER_ANNUAL: 'pri_01hqk8xa986annual',
  PRO_ANNUAL: 'pri_01hqk8xa1982annual',
  TEAM_ANNUAL: 'pri_01hqk8xa3476annual',
  ENTERPRISE_ANNUAL: 'pri_01hqk8xa9940annual',

  // Add-on prices
  EXTRA_MINUTES_100: 'pri_01hqk8xa20per100min',
  WHITE_LABEL_MONTHLY: 'pri_01hqk8xa199whitelabel',
  API_ACCESS_MONTHLY: 'pri_01hqk8xa99api',
  CUSTOM_AI_MONTHLY: 'pri_01hqk8xa299customai',
};

// Initialize Paddle client
export function initializePaddle() {
  const apiKey = process.env.PADDLE_API_KEY;
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';

  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not configured');
  }

  return new Paddle(apiKey, {
    environment: environment as any,
  });
}

// Plan mapping
export const PLAN_TO_PADDLE_PRICE: Record<string, { monthly: string; annual: string }> = {
  starter: {
    monthly: PADDLE_PRICES.STARTER_MONTHLY,
    annual: PADDLE_PRICES.STARTER_ANNUAL,
  },
  pro: {
    monthly: PADDLE_PRICES.PRO_MONTHLY,
    annual: PADDLE_PRICES.PRO_ANNUAL,
  },
  team: {
    monthly: PADDLE_PRICES.TEAM_MONTHLY,
    annual: PADDLE_PRICES.TEAM_ANNUAL,
  },
  enterprise: {
    monthly: PADDLE_PRICES.ENTERPRISE_MONTHLY,
    annual: PADDLE_PRICES.ENTERPRISE_ANNUAL,
  },
};

// Webhook event types we handle
export const PADDLE_WEBHOOK_EVENTS = {
  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',

  // Payment events
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_FAILED: 'transaction.failed',

  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
};

// LoadVoice-specific subscription metadata
export interface LoadVoiceSubscriptionMetadata {
  organization_id: string;
  plan_type: 'starter' | 'pro' | 'team' | 'enterprise';
  billing_cycle: 'monthly' | 'annual';
  included_minutes: number;
  included_users: number;
  overage_rate: number; // cents per minute
  features: {
    white_label?: boolean;
    api_access?: boolean;
    custom_ai?: boolean;
    priority_support?: boolean;
  };
}

// Helper to generate Paddle checkout
export async function createPaddleCheckout(
  customerId: string,
  priceId: string,
  metadata: LoadVoiceSubscriptionMetadata
) {
  const paddle = initializePaddle();

  try {
    const checkout = await paddle.transactions.create({
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customerId: customerId,
      customData: metadata,
      checkout: {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
      },
    });

    return checkout;
  } catch (error) {
    console.error('Failed to create Paddle checkout:', error);
    throw new Error('Failed to initialize checkout');
  }
}

// Helper to cancel subscription
export async function cancelPaddleSubscription(
  subscriptionId: string,
  immediately = false
) {
  const paddle = initializePaddle();

  try {
    const result = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: immediately ? 'immediately' : 'next_billing_period',
    });

    return result;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

// Helper to update subscription
export async function updatePaddleSubscription(
  subscriptionId: string,
  newPriceId: string,
  immediately = false
) {
  const paddle = initializePaddle();

  try {
    const result = await paddle.subscriptions.update(subscriptionId, {
      items: [
        {
          priceId: newPriceId,
          quantity: 1,
        },
      ],
      prorationBillingMode: immediately ? 'prorated_immediately' : 'prorated_next_billing_period',
    });

    return result;
  } catch (error) {
    console.error('Failed to update subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

// Helper to pause subscription
export async function pausePaddleSubscription(subscriptionId: string) {
  const paddle = initializePaddle();

  try {
    const result = await paddle.subscriptions.pause(subscriptionId, {
      effectiveFrom: 'next_billing_period',
    });

    return result;
  } catch (error) {
    console.error('Failed to pause subscription:', error);
    throw new Error('Failed to pause subscription');
  }
}

// Helper to resume subscription
export async function resumePaddleSubscription(subscriptionId: string) {
  const paddle = initializePaddle();

  try {
    const result = await paddle.subscriptions.resume(subscriptionId, {
      effectiveFrom: 'immediately',
    });

    return result;
  } catch (error) {
    console.error('Failed to resume subscription:', error);
    throw new Error('Failed to resume subscription');
  }
}

// Helper to get subscription details
export async function getPaddleSubscription(subscriptionId: string) {
  const paddle = initializePaddle();

  try {
    const subscription = await paddle.subscriptions.get(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to get subscription:', error);
    throw new Error('Failed to get subscription details');
  }
}

// Helper to create usage-based charge for overages
export async function createOverageCharge(
  customerId: string,
  minutes: number,
  amount: number
) {
  const paddle = initializePaddle();

  try {
    const charge = await paddle.adjustments.create({
      action: 'credit',
      customerId: customerId,
      reason: `Overage charge for ${minutes} additional minutes`,
      items: [
        {
          amount: Math.round(amount * 100).toString(), // Convert to cents
          priceId: process.env.PADDLE_OVERAGE_PRICE_ID || '', // Use a price ID for overages
        }
      ],
    } as any);

    return charge;
  } catch (error) {
    console.error('Failed to create overage charge:', error);
    throw new Error('Failed to charge for overages');
  }
}

// Helper to get customer portal URL
export async function getCustomerPortalUrl(customerId: string) {
  const paddle = initializePaddle();

  try {
    // Paddle automatically provides a customer portal URL
    // This would typically be constructed based on your Paddle settings
    const portalUrl = `https://checkout.paddle.com/customer/${customerId}`;
    return portalUrl;
  } catch (error) {
    console.error('Failed to get customer portal URL:', error);
    throw new Error('Failed to get billing portal');
  }
}

// Validate webhook signature
export function validatePaddleWebhook(
  webhookSecret: string,
  signature: string,
  body: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(body);
  const calculatedSignature = hmac.digest('hex');

  return signature === calculatedSignature;
}

// Export Paddle types for use in other files
export type { Paddle } from '@paddle/paddle-node-sdk';