// =====================================================
// SIMPLE SANITIZATION UTILITIES (Server-side safe)
// No external dependencies - works in API routes
// =====================================================

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
 * RFC 5322 compliant validation with additional security checks
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  const cleaned = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '');

  // RFC 5322 compliant email validation (more strict)
  // Requires valid TLD (at least 2 chars), disallows localhost/invalid domains
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

  if (!emailRegex.test(cleaned)) {
    throw new Error('Please enter a valid email address (e.g., name@gmail.com or name@company.com)');
  }

  // Additional validation: check for invalid patterns
  if (cleaned.includes('..') || cleaned.startsWith('.') || cleaned.endsWith('.')) {
    throw new Error('Invalid email format: Please check for extra dots in your email');
  }

  // Block common invalid/test domains only
  const domain = cleaned.split('@')[1];
  const invalidDomains = ['localhost', 'test', 'example', 'invalid'];
  if (invalidDomains.some(invalid => domain?.startsWith(invalid))) {
    throw new Error('Please use a real email address, not a test domain');
  }

  return cleaned.substring(0, 255);
}
