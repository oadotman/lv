/**
 * Security validators and utilities for input validation
 * Provides comprehensive validation for all user inputs
 */

import { z } from 'zod';
import crypto from 'crypto';

// =====================================================
// COMMON SCHEMAS
// =====================================================

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .toLowerCase()
  .transform((email) => email.trim());

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format');

export const URLSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

export const SafeStringSchema = z
  .string()
  .min(1, 'Field required')
  .max(1000, 'Text too long')
  .regex(/^[a-zA-Z0-9\s\-_.,!?'"()]+$/, 'Contains invalid characters')
  .transform((str) => str.trim());

// =====================================================
// API REQUEST SCHEMAS
// =====================================================

export const SignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  fullName: z
    .string()
    .min(2, 'Name too short')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  organizationName: z
    .string()
    .min(2, 'Organization name too short')
    .max(100, 'Organization name too long')
    .optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password required'),
});

export const FileUploadSchema = z.object({
  fileName: z
    .string()
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9\-_.]+$/, 'Invalid filename'),
  fileSize: z
    .number()
    .positive('Invalid file size')
    .max(500 * 1024 * 1024, 'File too large (max 500MB)'),
  mimeType: z.enum([
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    'audio/x-m4a',
  ]),
  customerName: SafeStringSchema.optional(),
  customerEmail: EmailSchema.optional(),
  customerPhone: PhoneSchema.optional(),
});

export const TeamInviteSchema = z.object({
  email: EmailSchema,
  role: z.enum(['admin', 'member']),
  organizationId: UUIDSchema,
});

export const PaddleWebhookSchema = z.object({
  event_type: z.string(),
  event_id: z.string(),
  occurred_at: z.string().datetime(),
  data: z.object({}).passthrough(), // Allow any data structure
});

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate and sanitize request body
 */
export async function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const data = await schema.parseAsync(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Invalid request data'] };
  }
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  // Check file size
  const MAX_SIZE = 500 * 1024 * 1024; // 500MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large (max 500MB)' };
  }

  // Check MIME type
  const ALLOWED_TYPES = [
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    'audio/x-m4a',
  ];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }

  // Check filename for path traversal attempts
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }

  return { valid: true };
}

/**
 * Generate secure random tokens
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for storage
 */
export async function hashData(data: string): Promise<string> {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Sanitize user input for display (prevent XSS)
 */
export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and parse JSON safely
 */
export function safeJsonParse<T = unknown>(
  json: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(json);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Invalid JSON format' };
  }
}

/**
 * Check for common SQL injection patterns
 */
export function hasSqlInjectionPattern(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|ORDER BY|GROUP BY|HAVING)\b)/gi,
    /(--|#|\/\*|\*\/|;|\||\\)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+|\bAND\b\s*\d+\s*=\s*\d+)/gi,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(
  identifier: string,
  action: string
): string {
  return `ratelimit:${action}:${identifier}`;
}

/**
 * IP address extractor from request headers
 */
export function extractIPAddress(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || // Vercel
    'unknown'
  );
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return secureCompare(signature, expectedSignature);
}

// =====================================================
// EXPORT VALIDATION MIDDLEWARE
// =====================================================

export const validators = {
  email: EmailSchema,
  password: PasswordSchema,
  phone: PhoneSchema,
  uuid: UUIDSchema,
  url: URLSchema,
  safeString: SafeStringSchema,
  signup: SignupSchema,
  login: LoginSchema,
  fileUpload: FileUploadSchema,
  teamInvite: TeamInviteSchema,
  paddleWebhook: PaddleWebhookSchema,
};

export default {
  validateRequestBody,
  validateFileUpload,
  generateSecureToken,
  hashData,
  secureCompare,
  sanitizeForDisplay,
  safeJsonParse,
  hasSqlInjectionPattern,
  getRateLimitKey,
  extractIPAddress,
  validateWebhookSignature,
  schemas: validators,
};