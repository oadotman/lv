/**
 * Centralized URL utilities for consistent URL handling across the application.
 *
 * This module provides type-safe utilities for constructing URLs in both
 * client-side and server-side contexts, with proper validation and error handling.
 */

/**
 * Get the base application URL.
 *
 * @throws {Error} If NEXT_PUBLIC_APP_URL is not configured
 * @returns {string} The base URL (e.g., "https://app.example.com" or "http://localhost:3000")
 *
 * @example
 * const baseUrl = getBaseUrl(); // "https://app.example.com"
 */
export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is not configured. Please set it in your environment variables.'
    );
  }

  // Remove trailing slash for consistency
  return url.replace(/\/$/, '');
}

/**
 * Get the base URL with a safe fallback for development.
 * Only use this in contexts where the URL is truly optional (e.g., development tools).
 *
 * @param {string} fallback - Optional fallback URL (defaults to http://localhost:3000)
 * @returns {string} The base URL or fallback
 *
 * @example
 * const baseUrl = getBaseUrlOrFallback(); // Returns configured URL or localhost
 */
export function getBaseUrlOrFallback(fallback: string = 'http://localhost:3000'): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  return url ? url.replace(/\/$/, '') : fallback;
}

/**
 * Construct a full URL for an API endpoint.
 *
 * @param {string} path - The API path (e.g., "/api/calls/upload")
 * @returns {string} The full URL
 *
 * @example
 * const uploadUrl = getApiUrl('/api/calls/upload');
 * // "https://app.example.com/api/calls/upload"
 */
export function getApiUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Construct a full URL for a page route.
 *
 * @param {string} path - The page path (e.g., "/invite/abc123")
 * @returns {string} The full URL
 *
 * @example
 * const inviteUrl = getPageUrl('/invite/abc123');
 * // "https://app.example.com/invite/abc123"
 */
export function getPageUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get allowed origins for CORS and CSRF protection.
 * Includes the configured app URL and localhost variants in development.
 *
 * @returns {string[]} Array of allowed origin URLs
 *
 * @example
 * const origins = getAllowedOrigins();
 * // ["https://app.example.com"] in production
 * // ["https://app.example.com", "http://localhost:3000", "http://127.0.0.1:3000"] in development
 */
export function getAllowedOrigins(): string[] {
  const baseUrl = getBaseUrlOrFallback();
  const appUrl = new URL(baseUrl);
  const origins = [appUrl.origin];

  // Add localhost variants in development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * Check if a URL is from an allowed origin.
 *
 * @param {string} urlString - The URL to check
 * @returns {boolean} True if the URL origin is allowed
 *
 * @example
 * isAllowedOrigin('https://app.example.com/api/test'); // true
 * isAllowedOrigin('https://evil.com/api/test'); // false
 */
export function isAllowedOrigin(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const allowedOrigins = getAllowedOrigins();
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

/**
 * Get the current environment's base URL.
 * This is a convenience function that combines environment detection with URL retrieval.
 *
 * @returns {Object} Environment information and base URL
 *
 * @example
 * const { environment, baseUrl, isProduction } = getEnvironmentUrl();
 */
export function getEnvironmentUrl() {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  const baseUrl = getBaseUrlOrFallback();

  return {
    environment,
    isProduction,
    isDevelopment,
    baseUrl,
  };
}

/**
 * Construct URLs for common routes in the application.
 * Provides a centralized place for all application route URLs.
 */
export const AppUrls = {
  // Authentication
  signIn: () => getPageUrl('/signin'),
  signUp: () => getPageUrl('/signup'),
  signOut: () => getPageUrl('/signout'),

  // Main app pages
  dashboard: () => getPageUrl('/dashboard'),
  calls: () => getPageUrl('/calls'),
  call: (id: string) => getPageUrl(`/calls/${id}`),

  // Settings
  settings: () => getPageUrl('/settings'),
  settingsProfile: () => getPageUrl('/settings/profile'),
  settingsTeam: () => getPageUrl('/settings/team'),
  settingsBilling: () => getPageUrl('/settings/billing'),

  // Invitations
  invite: (token: string) => getPageUrl(`/invite/${token}`),

  // API endpoints
  api: {
    health: () => getApiUrl('/api/health'),
    signup: () => getApiUrl('/api/auth/signup'),
    callsUpload: () => getApiUrl('/api/calls/upload'),
    callsImportUrl: () => getApiUrl('/api/calls/import-url'),
    callPoll: (id: string) => getApiUrl(`/api/calls/${id}/poll`),
    callExtract: (id: string) => getApiUrl(`/api/calls/${id}/extract`),
    teamsInvite: () => getApiUrl('/api/teams/invite'),
    teamsMembers: () => getApiUrl('/api/teams/members'),
    usage: () => getApiUrl('/api/usage'),
    overagePurchase: () => getApiUrl('/api/overage/purchase'),
    gdprExport: () => getApiUrl('/api/gdpr/export'),
    gdprDelete: () => getApiUrl('/api/gdpr/delete'),
    gdprCancelDeletion: () => getApiUrl('/api/gdpr/cancel-deletion'),
  },

  // Webhooks
  webhooks: {
    assemblyai: () => getApiUrl('/api/webhooks/assemblyai'),
    paddle: () => getApiUrl('/api/paddle/webhook'),
  },
} as const;
