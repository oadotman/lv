import { createHmac } from 'crypto';
import { headers } from 'next/headers';

/**
 * Validates Twilio webhook signatures to ensure requests are from Twilio
 * This is CRITICAL for security - prevents webhook spoofing attacks
 */

interface TwilioWebhookValidationOptions {
  authToken: string;
  url: string;
  params: Record<string, any>;
  signature: string;
}

/**
 * Validates a Twilio webhook signature
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function validateTwilioSignature({
  authToken,
  url,
  params,
  signature
}: TwilioWebhookValidationOptions): boolean {
  // Remove the 'bodySHA256' field if present (Twilio doesn't include it in signature)
  const { bodySHA256, ...signatureParams } = params;

  // Sort the POST parameters alphabetically by key
  const sortedParams = Object.keys(signatureParams)
    .sort()
    .reduce((acc, key) => {
      acc[key] = signatureParams[key];
      return acc;
    }, {} as Record<string, any>);

  // Build the message string
  let message = url;
  for (const [key, value] of Object.entries(sortedParams)) {
    message += key + (value ?? '');
  }

  // Calculate the expected signature
  const expectedSignature = createHmac('sha1', authToken)
    .update(message)
    .digest('base64');

  // Compare signatures (timing-safe comparison)
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates Twilio webhook from Next.js request
 * This is the main function to use in API routes
 */
export async function validateTwilioWebhook(
  request: Request,
  authToken: string
): Promise<{ isValid: boolean; params?: Record<string, any>; error?: string }> {
  try {
    // Get the signature from headers
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) {
      return { isValid: false, error: 'Missing X-Twilio-Signature header' };
    }

    // Get the full URL (including protocol and query params)
    const url = new URL(request.url);
    const webhookUrl = `${url.protocol}//${url.host}${url.pathname}`;

    // Parse the request body
    let params: Record<string, any> = {};

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });
    } else if (contentType?.includes('application/json')) {
      params = await request.json();
    } else {
      const text = await request.text();
      // Parse URL-encoded format manually if needed
      const searchParams = new URLSearchParams(text);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    // Validate the signature
    const isValid = validateTwilioSignature({
      authToken,
      url: webhookUrl,
      params,
      signature
    });

    return { isValid, params };
  } catch (error) {
    console.error('Error validating Twilio webhook:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Middleware to validate Twilio webhooks in API routes
 * Usage:
 * ```ts
 * export async function POST(req: Request) {
 *   const validation = await validateTwilioWebhook(req, process.env.TWILIO_AUTH_TOKEN!);
 *   if (!validation.isValid) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *   // Process the webhook...
 * }
 * ```
 */
export function withTwilioAuth(
  handler: (req: Request, params: Record<string, any>) => Promise<Response>
) {
  return async (req: Request) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    const validation = await validateTwilioWebhook(req, authToken);

    if (!validation.isValid) {
      console.warn('Invalid Twilio webhook signature:', validation.error);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(req, validation.params!);
  };
}

/**
 * Generate a secure webhook URL with a token
 * This adds an additional layer of security beyond signature validation
 */
export function generateSecureWebhookUrl(baseUrl: string, organizationId: string): string {
  const token = createHmac('sha256', process.env.WEBHOOK_SECRET || 'default-secret')
    .update(organizationId + Date.now())
    .digest('hex')
    .substring(0, 32);

  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('org', organizationId);

  return url.toString();
}

/**
 * Validate recording access - recordings should require authentication
 */
export async function validateRecordingAccess(
  recordingSid: string,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // This would check the database to ensure the user has access to this recording
  // For now, we'll implement a basic check

  if (!recordingSid || !userId || !organizationId) {
    return false;
  }

  // TODO: Check database to verify:
  // 1. Recording belongs to a call in the user's organization
  // 2. User has appropriate permissions
  // 3. Recording hasn't been deleted or expired

  return true;
}

/**
 * Generate a time-limited signed URL for recording access
 */
export function generateSignedRecordingUrl(
  recordingUrl: string,
  expiresInMinutes: number = 60
): string {
  const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);

  const signature = createHmac('sha256', process.env.RECORDING_SECRET || 'recording-secret')
    .update(recordingUrl + expiresAt)
    .digest('hex');

  const url = new URL(recordingUrl);
  url.searchParams.set('expires', expiresAt.toString());
  url.searchParams.set('signature', signature);

  return url.toString();
}

/**
 * Validate a signed recording URL
 */
export function validateSignedRecordingUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get('expires');
    const signature = urlObj.searchParams.get('signature');

    if (!expires || !signature) {
      return false;
    }

    // Check if URL has expired
    if (parseInt(expires) < Date.now()) {
      return false;
    }

    // Rebuild the original URL without signature params
    const originalUrl = new URL(url);
    originalUrl.searchParams.delete('expires');
    originalUrl.searchParams.delete('signature');

    // Validate signature
    const expectedSignature = createHmac('sha256', process.env.RECORDING_SECRET || 'recording-secret')
      .update(originalUrl.toString() + expires)
      .digest('hex');

    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('Error validating signed recording URL:', error);
    return false;
  }
}

/**
 * Log webhook activity for audit purposes
 */
export async function logWebhookActivity(
  type: string,
  success: boolean,
  metadata: Record<string, any>
): Promise<void> {
  // TODO: Implement database logging
  console.log('Webhook activity:', {
    type,
    success,
    timestamp: new Date().toISOString(),
    metadata
  });
}

export default {
  validateTwilioWebhook,
  withTwilioAuth,
  generateSecureWebhookUrl,
  validateRecordingAccess,
  generateSignedRecordingUrl,
  validateSignedRecordingUrl,
  logWebhookActivity
};