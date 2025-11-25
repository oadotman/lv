// =====================================================
// URL VALIDATION & SSRF PROTECTION
// Prevents Server-Side Request Forgery attacks
// =====================================================

/**
 * Validates URLs to prevent SSRF attacks
 * Blocks access to:
 * - Local/loopback addresses (127.0.0.1, localhost)
 * - Private network ranges (10.x, 172.16-31.x, 192.168.x)
 * - Link-local addresses (169.254.x.x)
 * - Cloud metadata endpoints
 */

const BLOCKED_IP_PATTERNS = [
  // Loopback
  /^127\./,
  /^localhost$/i,
  /^0\.0\.0\.0$/,

  // Link-local (AWS metadata, etc.)
  /^169\.254\./,

  // Private networks (RFC 1918)
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,

  // IPv6 loopback and link-local
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata',
];

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export interface URLValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Validate URL for SSRF protection
 */
export function validateUrl(urlString: string): URLValidationResult {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        valid: false,
        error: `Invalid protocol: ${url.protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // Check hostname
    const hostname = url.hostname.toLowerCase();

    // Check against blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return {
        valid: false,
        error: 'Access to this hostname is blocked for security reasons.',
      };
    }

    // Check against blocked IP patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          error: 'Access to private/internal IP addresses is blocked for security reasons.',
        };
      }
    }

    // Check for IP address format
    if (isPrivateIP(hostname)) {
      return {
        valid: false,
        error: 'Access to private IP addresses is blocked for security reasons.',
      };
    }

    return {
      valid: true,
      url,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format',
    };
  }
}

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 format check
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (!match) {
    return false;
  }

  const [, a, b, c, d] = match.map(Number);

  // Validate octets
  if (a > 255 || b > 255 || c > 255 || d > 255) {
    return false;
  }

  // Check private ranges
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)
  if (a === 0) return true; // 0.0.0.0/8

  return false;
}

/**
 * Validate and sanitize download URL
 * Specifically for file downloads
 */
export function validateDownloadUrl(urlString: string): URLValidationResult {
  const result = validateUrl(urlString);

  if (!result.valid) {
    return result;
  }

  // Additional checks for downloads
  const url = result.url!;

  // Ensure reasonable URL length
  if (urlString.length > 2048) {
    return {
      valid: false,
      error: 'URL too long',
    };
  }

  // Check for data: or javascript: protocols (defense in depth)
  if (url.protocol === 'data:' || url.protocol === 'javascript:') {
    return {
      valid: false,
      error: 'Invalid protocol for downloads',
    };
  }

  return {
    valid: true,
    url,
  };
}

/**
 * Safe fetch with SSRF protection
 * Use this instead of direct fetch() for user-provided URLs
 */
export async function safeFetch(
  urlString: string,
  options: RequestInit = {}
): Promise<Response> {
  const validation = validateDownloadUrl(urlString);

  if (!validation.valid) {
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(urlString, {
      ...options,
      signal: controller.signal,
      // Prevent following redirects to internal IPs
      redirect: 'manual',
    });

    // Check if redirect
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Validate redirect URL
        const redirectValidation = validateDownloadUrl(location);
        if (!redirectValidation.valid) {
          throw new Error(`Redirect blocked: ${redirectValidation.error}`);
        }
      }
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convert platform-specific URLs to direct download links
 * Handles Google Drive, Zoom, Loom, Dropbox, etc.
 */
export function convertToDirectDownloadUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Google Drive handling
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      // Example: https://drive.google.com/file/d/FILE_ID/view
      // Convert to: https://drive.google.com/uc?export=download&id=FILE_ID

      const fileIdMatch = url.pathname.match(/\/d\/([^\/]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      // Already in download format
      if (url.pathname.includes('/uc') && url.searchParams.has('id')) {
        return urlString;
      }
    }

    // Dropbox handling
    if (hostname.includes('dropbox.com')) {
      // Convert dl=0 to dl=1 for direct download
      if (url.searchParams.get('dl') === '0') {
        url.searchParams.set('dl', '1');
        return url.toString();
      }

      // If no dl parameter, add it
      if (!url.searchParams.has('dl')) {
        url.searchParams.set('dl', '1');
        return url.toString();
      }
    }

    // For other URLs (Zoom, Loom, OneDrive), return as-is
    // These typically require authentication or special handling
    // The user should provide direct download URLs
    return urlString;

  } catch (error) {
    // If URL parsing fails, return original
    return urlString;
  }
}

export default {
  validateUrl,
  validateDownloadUrl,
  safeFetch,
  convertToDirectDownloadUrl,
};
