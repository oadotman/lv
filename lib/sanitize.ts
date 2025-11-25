// =====================================================
// INPUT SANITIZATION UTILITIES
// Prevents XSS, SQL injection, and other injection attacks
// =====================================================

/**
 * Sanitize HTML content (for rich text inputs)
 * Removes dangerous tags and attributes using a simple allow-list approach
 * Note: For production use with user-generated HTML, consider using DOMPurify in a separate service
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  // Simple HTML sanitization - strips all HTML tags except safe ones
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre'];
  const tagPattern = new RegExp(`<(?!\/?(${allowedTags.join('|')})(\\s|>))[^>]*>`, 'gi');

  let sanitized = dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '') // Remove event handlers (unquoted)
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove objects
    .replace(/<embed\b[^<]*>/gi, '') // Remove embed tags
    .replace(tagPattern, ''); // Remove all other disallowed tags

  // Remove dangerous protocols from remaining links
  sanitized = sanitized.replace(/href\s*=\s*["']?(javascript|data|vbscript):[^"']*["']?/gi, 'href="#"');

  return sanitized.substring(0, 10000); // Limit length
}

/**
 * Sanitize plain text input
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize email address
 * Validates format and removes dangerous characters
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  const cleaned = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '');

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format');
  }

  return cleaned.substring(0, 255);
}

/**
 * Sanitize filename (already exists in fileValidation.ts, but included here for completeness)
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'untitled';

  return filename
    .replace(/[^a-z0-9._-]/gi, '_') // Only alphanumeric, dot, dash, underscore
    .replace(/\.{2,}/g, '.') // No multiple dots (prevent traversal)
    .replace(/^\.+/, '') // No leading dots
    .replace(/\._/g, '_') // No dot-underscore combinations
    .substring(0, 255); // Limit length
}

/**
 * Sanitize URL
 * Validates URL format and removes dangerous protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const cleaned = url.trim();

  // Only allow http, https, and mailto protocols
  const urlRegex = /^(https?:\/\/|mailto:)/i;
  if (!urlRegex.test(cleaned)) {
    throw new Error('Invalid URL protocol. Only http, https, and mailto are allowed.');
  }

  // Prevent javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(cleaned)) {
    throw new Error('Dangerous URL protocol detected');
  }

  return cleaned.substring(0, 2048);
}

/**
 * Sanitize phone number
 * Keeps only digits and basic formatting characters
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  return phone
    .trim()
    .replace(/[^0-9+() -]/g, '')
    .substring(0, 20);
}

/**
 * Sanitize SQL-like input (for search queries, etc.)
 * Removes SQL injection attempts
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';

  // Remove common SQL injection patterns
  const cleaned = input
    .trim()
    .replace(/('|--|;|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|truncate)/gi, '')
    .substring(0, 500);

  return cleaned;
}

/**
 * Sanitize number input
 * Ensures value is a valid number within optional range
 */
export function sanitizeNumber(
  input: string | number,
  options?: { min?: number; max?: number; integer?: boolean }
): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }

  let result = num;

  // Enforce integer if required
  if (options?.integer) {
    result = Math.floor(result);
  }

  // Enforce min/max bounds
  if (options?.min !== undefined && result < options.min) {
    result = options.min;
  }
  if (options?.max !== undefined && result > options.max) {
    result = options.max;
  }

  return result;
}

/**
 * Sanitize JSON input
 * Safely parses JSON and validates structure
 */
export function sanitizeJson<T = any>(input: string): T {
  if (!input || !input.trim()) {
    throw new Error('Empty JSON input');
  }

  try {
    const parsed = JSON.parse(input);

    // Prevent prototype pollution
    if (parsed && typeof parsed === 'object') {
      delete parsed.__proto__;
      delete parsed.constructor;
      delete parsed.prototype;
    }

    return parsed as T;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Escape special regex characters
 * Useful for user input that will be used in regex patterns
 */
export function escapeRegex(input: string): string {
  if (!input) return '';

  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize object keys (prevent prototype pollution)
 */
export function sanitizeObjectKeys<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const dangerous = ['__proto__', 'constructor', 'prototype'];

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (dangerous.includes(key)) {
      continue; // Skip dangerous keys
    }

    const sanitizedKey = sanitizeInput(key);
    (sanitized as any)[sanitizedKey] =
      typeof value === 'object' && value !== null
        ? sanitizeObjectKeys(value)
        : value;
  }

  return sanitized as T;
}
