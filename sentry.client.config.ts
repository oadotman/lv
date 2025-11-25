// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps

  environment: process.env.NODE_ENV,

  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      // Remove cookies and headers that might contain tokens
      delete event.request.cookies;

      // Keep only safe headers
      if (event.request.headers) {
        const safeHeaders: Record<string, string> = {};
        const allowedHeaders = ['content-type', 'user-agent', 'accept'];

        Object.keys(event.request.headers).forEach(key => {
          if (allowedHeaders.includes(key.toLowerCase())) {
            safeHeaders[key] = event.request!.headers![key];
          }
        });

        event.request.headers = safeHeaders;
      }
    }

    // Filter out local development errors if needed
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (dev):', event);
    }

    return event;
  },

  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Network errors that are not our fault
    'Non-Error promise rejection captured',
    'Network request failed',
    'Failed to fetch',
    // Common user errors
    'ResizeObserver loop limit exceeded',
  ],
});
