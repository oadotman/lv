/**
 * LoadVoice Paddle Configuration
 * Three-tier pricing for freight brokers
 * Starter: $99/mo (300 min)
 * Professional: $199/mo (1000 min)
 * Team: $349/mo (3000 min)
 */

// Frontend Paddle SDK - install @paddle/paddle-js if needed
// import { Paddle } from '@paddle/paddle-js';
type Paddle = any; // Temporary type until @paddle/paddle-js is installed

// LoadVoice Product IDs in Paddle
export const LOADVOICE_PRODUCTS = {
  STARTER: {
    productId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRODUCT_ID || 'prod_01hqx8bxqz9p3wvj5kfbw5xyzq',
    priceId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID || 'pri_01hqx8c5zr4mbkfh6s9xyzabcd',
    name: 'LoadVoice Starter',
    price: 99,
    currency: 'USD',
    minutes: 300,
    features: [
      'Upload and extract calls in 60 seconds',
      'AI-powered data extraction',
      '300 minutes/month included',
      'Basic CRM (loads, carriers, shippers)',
      'Rate confirmation generation',
      'Email support',
      'Mobile responsive dashboard',
    ],
    limits: {
      minutesPerMonth: 300,
      usersIncluded: 1,
      apiAccess: false,
      customBranding: false,
      advancedAnalytics: false,
    }
  },
  PROFESSIONAL: {
    productId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRODUCT_ID || 'prod_01hqx8d7mn2q4xyz5kfbw6abcd',
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || 'pri_01hqx8dfgh3mbkfh7s9xyzefgh',
    name: 'LoadVoice Professional',
    price: 199,
    currency: 'USD',
    minutes: 1000,
    popular: true,
    features: [
      'Everything in Starter, plus:',
      '1,000 minutes/month included',
      'Priority AI processing',
      'Advanced lane analytics',
      'Carrier performance tracking',
      'API access for integrations',
      'Priority email & chat support',
      'Custom rate con templates',
      'Bulk extraction processing',
    ],
    limits: {
      minutesPerMonth: 1000,
      usersIncluded: 3,
      apiAccess: true,
      customBranding: false,
      advancedAnalytics: true,
    }
  },
  TEAM: {
    productId: process.env.NEXT_PUBLIC_PADDLE_TEAM_PRODUCT_ID || 'prod_01hqx8efij4q5xyz6kfbw7ijkl',
    priceId: process.env.NEXT_PUBLIC_PADDLE_TEAM_PRICE_ID || 'pri_01hqx8ekl5mbkfh8s9xyzmnop',
    name: 'LoadVoice Team',
    price: 349,
    currency: 'USD',
    minutes: 3000,
    features: [
      'Everything in Professional, plus:',
      '3,000 minutes/month included',
      'Unlimited team members',
      'White-label branding',
      'Advanced reporting & exports',
      'Dedicated account manager',
      'Phone support',
      'Custom AI training on your calls',
      'SSO & advanced security',
      'SLA guarantee',
    ],
    limits: {
      minutesPerMonth: 3000,
      usersIncluded: -1, // Unlimited
      apiAccess: true,
      customBranding: true,
      advancedAnalytics: true,
    }
  },
  // Overage billing
  OVERAGE: {
    pricePerMinute: 0.20, // $0.20 per minute overage
    billingThreshold: 50, // Bill when 50+ overage minutes accumulated
  }
};

// Initialize Paddle
let paddleInstance: Paddle | null = null;

export async function initializePaddle() {
  if (paddleInstance) return paddleInstance;

  // @ts-ignore - Paddle will be loaded from CDN
  const paddle = await (window as any).Paddle?.initialize({
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    checkout: {
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'en',
        frameTarget: 'checkout-container',
        frameInitialHeight: 450,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      }
    }
  });

  paddleInstance = paddle;
  return paddle;
}

// Create checkout session for LoadVoice plans
export async function createCheckout(
  plan: 'STARTER' | 'PROFESSIONAL' | 'TEAM',
  userId: string,
  email: string,
  organizationId: string
) {
  const paddle = await initializePaddle();
  const product = LOADVOICE_PRODUCTS[plan];

  const items = [{
    priceId: product.priceId,
    quantity: 1
  }];

  // Custom data to track in our database
  const customData = {
    userId,
    organizationId,
    plan,
    source: 'loadvoice_app',
  };

  // Open Paddle checkout
  paddle.Checkout.open({
    items,
    customer: {
      email,
    },
    customData,
    settings: {
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/complete?plan=${plan}`,
      allowLogout: false,
    }
  });
}

// Handle subscription webhooks
export async function handleSubscriptionWebhook(event: any) {
  const { type, data } = event;

  switch (type) {
    case 'subscription.created':
      return handleSubscriptionCreated(data);
    case 'subscription.updated':
      return handleSubscriptionUpdated(data);
    case 'subscription.canceled':
      return handleSubscriptionCanceled(data);
    case 'subscription.payment_failed':
      return handlePaymentFailed(data);
    default:
      console.log('Unhandled webhook event:', type);
  }
}

async function handleSubscriptionCreated(data: any) {
  const { custom_data, items, customer } = data;
  const { userId, organizationId, plan } = custom_data;

  // Update organization subscription in database
  const supabase = createServerClient();

  await supabase
    .from('organization_subscriptions')
    .upsert({
      organization_id: organizationId,
      paddle_subscriptionId: data.id,
      paddle_customerId: customer.id,
      status: 'active',
      current_plan_id: plan.toLowerCase(),
      current_period_start: data.current_billing_period.starts_at,
      current_period_end: data.current_billing_period.ends_at,
      minutes_quota: LOADVOICE_PRODUCTS[plan].limits.minutesPerMonth,
      minutes_used: 0,
    });

  // Send welcome email
  await sendWelcomeEmail(customer.email, plan);
}

async function handleSubscriptionUpdated(data: any) {
  // Handle plan upgrades/downgrades
  const { custom_data } = data;
  const { organizationId, plan } = custom_data;

  const supabase = createServerClient();

  await supabase
    .from('organization_subscriptions')
    .update({
      current_plan_id: plan.toLowerCase(),
      minutes_quota: LOADVOICE_PRODUCTS[plan].limits.minutesPerMonth,
    })
    .eq('paddle_subscription_id', data.id);
}

async function handleSubscriptionCanceled(data: any) {
  // Mark subscription as canceled
  const supabase = createServerClient();

  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'canceled',
      cancel_at: data.canceled_at,
    })
    .eq('paddle_subscription_id', data.id);
}

async function handlePaymentFailed(data: any) {
  // Send payment failure notification
  const { customer } = data;
  await sendPaymentFailedEmail(customer.email);

  // Mark subscription as past_due
  const supabase = createServerClient();

  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('paddle_subscription_id', data.id);
}

// Helper functions
import { createServerClient } from '@/lib/supabase/server';
import { sendWelcomeEmail, sendPaymentFailedEmail } from '@/lib/emails/subscription';

// Get current subscription for organization
export async function getCurrentSubscription(organizationId: string) {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('organization_subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  if (!data) return null;

  // Calculate remaining minutes
  const remainingMinutes = data.minutes_quota - data.minutes_used;
  const percentageUsed = (data.minutes_used / data.minutes_quota) * 100;

  return {
    ...data,
    remainingMinutes,
    percentageUsed,
    isOverage: data.minutes_used > data.minutes_quota,
    overageMinutes: Math.max(0, data.minutes_used - data.minutes_quota),
    overageCost: Math.max(0, data.minutes_used - data.minutes_quota) * LOADVOICE_PRODUCTS.OVERAGE.pricePerMinute,
  };
}

// Check if user can perform extraction
export async function canPerformExtraction(organizationId: string, estimatedMinutes: number = 5) {
  const subscription = await getCurrentSubscription(organizationId);

  if (!subscription) {
    return {
      allowed: false,
      reason: 'no_subscription',
      message: 'Please subscribe to a plan to start extracting calls',
    };
  }

  if (subscription.status !== 'active') {
    return {
      allowed: false,
      reason: 'subscription_inactive',
      message: 'Your subscription is not active. Please update your payment method.',
    };
  }

  // Allow overage for Professional and Team plans
  const plan = subscription.current_plan_id.toUpperCase();
  if (plan === 'STARTER' && subscription.minutes_used + estimatedMinutes > subscription.minutes_quota) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      message: `You've used all ${subscription.minutes_quota} minutes this month. Upgrade to continue.`,
      remainingMinutes: subscription.remainingMinutes,
    };
  }

  return {
    allowed: true,
    remainingMinutes: subscription.remainingMinutes,
    willUseOverage: subscription.minutes_used + estimatedMinutes > subscription.minutes_quota,
    overageCost: Math.max(0, (subscription.minutes_used + estimatedMinutes - subscription.minutes_quota) * LOADVOICE_PRODUCTS.OVERAGE.pricePerMinute),
  };
}

// Track extraction usage
export async function trackExtractionUsage(organizationId: string, minutesUsed: number) {
  const supabase = createServerClient();

  // Update minutes used
  await supabase.rpc('increment_minutes_used', {
    org_id: organizationId,
    minutes: minutesUsed,
  });

  // Check if overage billing needed
  const subscription = await getCurrentSubscription(organizationId);
  if (subscription && subscription.overageMinutes >= LOADVOICE_PRODUCTS.OVERAGE.billingThreshold) {
    await triggerOverageBilling(organizationId, subscription.overageMinutes);
  }
}

// Trigger overage billing
async function triggerOverageBilling(organizationId: string, overageMinutes: number) {
  // Create one-time charge in Paddle for overage
  const overageCost = overageMinutes * LOADVOICE_PRODUCTS.OVERAGE.pricePerMinute;

  // This would integrate with Paddle's API to create a one-time charge
  console.log(`Billing ${overageMinutes} overage minutes for $${overageCost.toFixed(2)}`);

  // Reset overage counter after billing
  const supabase = createServerClient();
  await supabase
    .from('organization_subscriptions')
    .update({
      overage_billed_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId);
}