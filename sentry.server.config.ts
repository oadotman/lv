// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV,

  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      // Remove sensitive headers
      delete event.request.cookies;

      if (event.request.headers) {
        const safeHeaders: Record<string, string> = {};
        const allowedHeaders = ['content-type', 'user-agent', 'accept', 'content-length'];

        Object.keys(event.request.headers).forEach(key => {
          if (allowedHeaders.includes(key.toLowerCase())) {
            safeHeaders[key] = event.request!.headers![key];
          }
        });

        event.request.headers = safeHeaders;
      }

      // Remove sensitive query params and body
      if (event.request.data) {
        // Redact password, token, key fields
        const sanitizedData = JSON.parse(JSON.stringify(event.request.data));
        const sensitiveFields = ['password', 'token', 'key', 'secret', 'apiKey', 'api_key'];

        const redactSensitiveFields = (obj: any): any => {
          if (typeof obj !== 'object' || obj === null) return obj;

          Object.keys(obj).forEach(key => {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
              redactSensitiveFields(obj[key]);
            }
          });

          return obj;
        };

        event.request.data = redactSensitiveFields(sanitizedData);
      }
    }

    // Filter out local development errors if needed
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (server):', event);
    }

    return event;
  },

  ignoreErrors: [
    // Network timeouts
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    // Common user errors
    'Non-Error promise rejection captured',
  ],
});
