/**
 * Twilio Webhook Signature Validation
 * Ensures webhooks are genuinely from Twilio
 */

import twilio from 'twilio';
import { NextRequest } from 'next/server';

/**
 * Validates Twilio webhook signature
 * @param request - Next.js request object
 * @param body - Request body as string or URLSearchParams
 * @param url - Full webhook URL
 * @returns true if valid, false otherwise
 */
export async function validateTwilioWebhook(
  request: NextRequest,
  body: string | URLSearchParams,
  url?: string
): Promise<boolean> {
  try {
    // Get auth token from environment
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('[Twilio Webhook] Missing TWILIO_AUTH_TOKEN');
      return false;
    }

    // Get signature from header
    const signature = request.headers.get('X-Twilio-Signature');
    if (!signature) {
      console.error('[Twilio Webhook] Missing X-Twilio-Signature header');
      return false;
    }

    // Use provided URL or construct from request
    const webhookUrl = url || request.url;

    // Convert body to params object
    let params: Record<string, any> = {};
    if (body instanceof URLSearchParams) {
      body.forEach((value, key) => {
        params[key] = value;
      });
    } else if (typeof body === 'string') {
      // Parse URL-encoded string
      const searchParams = new URLSearchParams(body);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    // Validate signature
    const isValid = twilio.validateRequest(
      authToken,
      signature,
      webhookUrl,
      params
    );

    if (!isValid) {
      console.error('[Twilio Webhook] Invalid signature for URL:', webhookUrl);
    }

    return isValid;
  } catch (error) {
    console.error('[Twilio Webhook] Validation error:', error);
    return false;
  }
}

/**
 * Validates Twilio webhook with form data
 * @param request - Next.js request object
 * @param formData - FormData from request
 * @returns true if valid, false otherwise
 */
export async function validateTwilioWebhookFormData(
  request: NextRequest,
  formData: FormData
): Promise<boolean> {
  // Convert FormData to URLSearchParams for validation
  const params = new URLSearchParams();
  formData.forEach((value, key) => {
    params.append(key, value.toString());
  });

  return validateTwilioWebhook(request, params);
}

/**
 * Middleware to validate Twilio webhooks
 * Use in API routes that receive Twilio webhooks
 */
export function withTwilioAuth(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest) => {
    // Skip validation in development if explicitly disabled
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.SKIP_TWILIO_VALIDATION === 'true'
    ) {
      console.warn('[Twilio Webhook] Skipping validation in development');
      return handler(req);
    }

    // Clone request to read body twice
    const clonedReq = req.clone();
    const formData = await clonedReq.formData();

    // Validate webhook
    const isValid = await validateTwilioWebhookFormData(req, formData);

    if (!isValid) {
      console.error('[Twilio Webhook] Unauthorized request');
      return new Response('Unauthorized', { status: 401 });
    }

    // Call original handler
    return handler(req);
  };
}