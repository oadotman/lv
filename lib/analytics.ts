// =====================================================
// ANALYTICS CONFIGURATION
// PostHog analytics for user behavior tracking
// =====================================================

import posthog from 'posthog-js';

// Initialize PostHog (client-side only)
export function initAnalytics() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics disabled.');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,

    // Disable in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.opt_out_capturing();
        console.log('PostHog: Opted out in development');
      }
    },

    // Capture pageviews automatically
    capture_pageview: true,
    capture_pageleave: true,

    // Session recording
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-private]',
    },

    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ['click', 'submit', 'change'],
    },
  });
}

// Track custom events
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (typeof window === 'undefined') return;
  posthog.capture(eventName, properties);
}

// Identify user
export function identifyUser(
  userId: string,
  traits?: Record<string, any>
) {
  if (typeof window === 'undefined') return;
  posthog.identify(userId, traits);
}

// Reset user (on logout)
export function resetUser() {
  if (typeof window === 'undefined') return;
  posthog.reset();
}

// Pre-defined event tracking functions
export const analytics = {
  // Auth events
  signUp: (method: string = 'email') => {
    trackEvent('user_signed_up', { method });
  },

  signIn: (method: string = 'email') => {
    trackEvent('user_signed_in', { method });
  },

  signOut: () => {
    trackEvent('user_signed_out');
    resetUser();
  },

  // Call events
  callUploaded: (props: {
    fileSize: number;
    format: string;
    duration?: number;
  }) => {
    trackEvent('call_uploaded', props);
  },

  callTranscribed: (props: {
    callId: string;
    duration: number;
    wordCount: number;
    speakerCount: number;
  }) => {
    trackEvent('call_transcribed', props);
  },

  callExtracted: (props: {
    callId: string;
    fieldCount: number;
    templateId?: string;
  }) => {
    trackEvent('call_extracted', props);
  },

  // CRM events
  crmCopied: (format: 'plain' | 'hubspot' | 'salesforce' | 'csv') => {
    trackEvent('crm_output_copied', { format });
  },

  // Template events
  templateCreated: (props: {
    fieldCount: number;
    isCustom: boolean;
  }) => {
    trackEvent('template_created', props);
  },

  templateUsed: (templateId: string) => {
    trackEvent('template_used', { templateId });
  },

  // Team events
  teamInviteSent: (role: string) => {
    trackEvent('team_invite_sent', { role });
  },

  teamInviteAccepted: (role: string) => {
    trackEvent('team_invite_accepted', { role });
  },

  teamMemberRemoved: () => {
    trackEvent('team_member_removed');
  },

  // Settings events
  settingsUpdated: (section: string) => {
    trackEvent('settings_updated', { section });
  },

  // Error tracking
  errorOccurred: (props: {
    error: string;
    component?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }) => {
    trackEvent('error_occurred', props);
  },

  // Performance tracking
  performanceMetric: (props: {
    metric: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count';
  }) => {
    trackEvent('performance_metric', props);
  },

  // Feature usage
  featureUsed: (featureName: string) => {
    trackEvent('feature_used', { feature: featureName });
  },
};

export { posthog };
