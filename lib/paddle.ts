// =====================================================
// PADDLE CLIENT
// Payment processing via Paddle (Merchant of Record)
// =====================================================

/**
 * Paddle Configuration
 *
 * Paddle is used as the payment processor and Merchant of Record.
 * This means Paddle handles:
 * - Payment processing
 * - VAT/Sales tax collection
 * - Invoicing and receipts
 * - Subscription management
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_PADDLE_VENDOR_ID - Your Paddle vendor ID (public)
 * - NEXT_PUBLIC_PADDLE_ENVIRONMENT - 'sandbox' or 'production'
 * - PADDLE_API_KEY - Server-side API key (secret)
 */

export const paddleConfig = {
  vendorId: process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID || '',
  environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  apiKey: process.env.PADDLE_API_KEY || '',
};

// Plan ID mapping (these will be created in Paddle dashboard)
export const paddlePlanIds = {
  sandbox: {
    solo: 'pri_01hzq...',  // Replace with actual Paddle price ID
    team_5: 'pri_01hzq...',
    team_10: 'pri_01hzq...',
    team_20: 'pri_01hzq...',
  },
  production: {
    solo: 'pri_01hzq...',  // Replace with actual Paddle price ID
    team_5: 'pri_01hzq...',
    team_10: 'pri_01hzq...',
    team_20: 'pri_01hzq...',
  },
};

export function getPaddlePlanId(planType: string): string {
  const env = paddleConfig.environment;
  const plans = paddlePlanIds[env] as any;
  return plans[planType] || '';
}

/**
 * Initialize Paddle.js on the client side
 * This should be called in a useEffect hook
 */
export function initializePaddle(callback?: () => void) {
  if (typeof window === 'undefined') return;

  // Load Paddle.js script
  const script = document.createElement('script');
  script.src = paddleConfig.environment === 'production'
    ? 'https://cdn.paddle.com/paddle/v2/paddle.js'
    : 'https://cdn.paddle.com/paddle/paddle.js';

  script.async = true;
  script.onload = () => {
    if ((window as any).Paddle) {
      (window as any).Paddle.Environment.set(paddleConfig.environment);
      (window as any).Paddle.Setup({ vendor: parseInt(paddleConfig.vendorId) });
      callback?.();
    }
  };

  document.head.appendChild(script);
}

/**
 * Open Paddle checkout for a specific plan
 */
export function openPaddleCheckout(params: {
  planId: string;
  email?: string;
  customData?: Record<string, any>;
  successCallback?: () => void;
  closeCallback?: () => void;
}) {
  if (typeof window === 'undefined' || !(window as any).Paddle) {
    console.error('Paddle not initialized');
    return;
  }

  (window as any).Paddle.Checkout.open({
    items: [{ priceId: params.planId, quantity: 1 }],
    customer: params.email ? { email: params.email } : undefined,
    customData: params.customData,
    successCallback: params.successCallback,
    closeCallback: params.closeCallback,
  });
}

/**
 * Verify Paddle webhook signature (server-side only)
 * Implements proper HMAC-SHA256 signature verification
 * See: https://developer.paddle.com/webhook-reference/verifying-webhooks
 */
export function verifyPaddleWebhook(
  signature: string,
  payload: string | Buffer,
  webhookSecret?: string
): boolean {
  // Use provided secret or fallback to env variable
  const secret = webhookSecret || process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Paddle webhook secret not configured');
    return false;
  }

  if (!signature || !payload) {
    console.error('Missing signature or payload for webhook verification');
    return false;
  }

  try {
    const crypto = require('crypto');

    // Convert payload to string if it's a Buffer
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');

    // Parse the Paddle signature header
    // Format: "ts=timestamp;h1=signature"
    const signatureParts = signature.split(';');
    const timestamp = signatureParts.find(part => part.startsWith('ts='))?.substring(3);
    const receivedSignature = signatureParts.find(part => part.startsWith('h1='))?.substring(3);

    if (!timestamp || !receivedSignature) {
      console.error('Invalid Paddle signature format');
      return false;
    }

    // Check timestamp to prevent replay attacks (5 minute tolerance)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    const timeDifference = currentTime - signatureTime;

    if (timeDifference > 300) { // 5 minutes
      console.error('Paddle webhook timestamp too old (possible replay attack)');
      return false;
    }

    // Construct the signed payload
    // Paddle signs: timestamp + ':' + raw_payload
    const signedPayload = `${timestamp}:${payloadString}`;

    // Calculate expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const signatureBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    // Use crypto.timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  } catch (error) {
    console.error('Error verifying Paddle webhook signature:', error);
    return false;
  }
}
