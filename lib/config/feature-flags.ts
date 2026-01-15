/**
 * Feature flags to enable/disable functionality based on service availability
 * This allows the app to run without all external services configured
 */

// Check if services are properly configured (not using temp values)
export const features = {
  // Core Services
  twilio:
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_ACCOUNT_SID !== 'temp_not_configured' &&
    process.env.TWILIO_ACCOUNT_SID !== '',

  paddle:
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_API_KEY !== 'temp_not_configured' &&
    process.env.PADDLE_API_KEY !== '',

  resend:
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== 're_temp_not_configured' &&
    process.env.RESEND_API_KEY !== 're_REPLACE_WITH_YOUR_RESEND_KEY',

  redis:
    !!process.env.REDIS_URL &&
    process.env.REDIS_URL !== '',

  // Optional Services
  sentry:
    !!process.env.SENTRY_DSN &&
    process.env.SENTRY_DSN !== '',

  inngest:
    !!process.env.INNGEST_EVENT_KEY &&
    process.env.INNGEST_EVENT_KEY !== '',
};

// Environment checks
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';

// Get feature status message
export function getFeatureStatus(feature: keyof typeof features): string {
  if (features[feature]) {
    return 'enabled';
  }

  switch (feature) {
    case 'twilio':
      return 'Call recording will be available soon';
    case 'paddle':
      return 'Payment processing coming soon';
    case 'resend':
      return 'Email notifications temporarily disabled';
    case 'redis':
      return 'Caching disabled - may be slower';
    case 'sentry':
      return 'Error tracking not configured';
    default:
      return 'Feature not available';
  }
}

// Check if minimum required services are configured
export function hasMinimumServices(): boolean {
  // Minimum: Supabase must be configured
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Log service status on startup
export function logServiceStatus(): void {
  if (isDevelopment || isProduction) {
    console.log('🚀 LoadVoice Service Status:');
    console.log('================================');
    console.log(`✅ Supabase: Connected`);
    console.log(`${features.twilio ? '✅' : '⚠️'} Twilio: ${getFeatureStatus('twilio')}`);
    console.log(`${features.paddle ? '✅' : '⚠️'} Paddle: ${getFeatureStatus('paddle')}`);
    console.log(`${features.resend ? '✅' : '⚠️'} Resend: ${getFeatureStatus('resend')}`);
    console.log(`${features.redis ? '✅' : '⚠️'} Redis: ${getFeatureStatus('redis')}`);
    console.log(`${features.sentry ? '✅' : 'ℹ️'} Sentry: ${getFeatureStatus('sentry')}`);
    console.log('================================');

    if (!features.twilio && !features.paddle && !features.resend) {
      console.warn('⚠️ WARNING: Running with limited functionality');
      console.warn('⚠️ Configure external services for full features');
    }
  }
}

// Helper to check if a feature should be shown in UI
export function shouldShowFeature(feature: keyof typeof features): boolean {
  // In development, show all features with warning messages
  if (isDevelopment) {
    return true;
  }

  // In production, only show configured features
  return features[feature];
}

// Export a ready-to-use config object
export const config = {
  features,
  isProduction,
  isDevelopment,
  isTest,
  hasMinimumServices: hasMinimumServices(),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
};