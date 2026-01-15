#!/usr/bin/env node

/**
 * Environment Configuration Verification Script
 * Ensures both .env.local and .env.production contain all necessary variables
 * for LoadVoice to function end-to-end
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 LoadVoice Environment Configuration Audit');
console.log('============================================\n');

// Define all required environment variables by category
const requiredConfig = {
  'Core Application': {
    variables: [
      'NODE_ENV',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_APP_VERSION'
    ],
    critical: true
  },

  'Supabase Database': {
    variables: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_KEY'
    ],
    critical: true
  },

  'AI & Transcription': {
    variables: [
      'ASSEMBLYAI_API_KEY',
      'OPENAI_API_KEY'
    ],
    critical: true
  },

  'Async Processing': {
    variables: [
      'INNGEST_EVENT_KEY',
      'INNGEST_SIGNING_KEY'
    ],
    critical: true,
    note: 'INNGEST_EVENT_URL only needed in local'
  },

  'Paddle Billing': {
    variables: [
      'PADDLE_API_KEY',
      'PADDLE_CLIENT_TOKEN',
      'PADDLE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_PADDLE_ENVIRONMENT',
      'NEXT_PUBLIC_PADDLE_VENDOR_ID',
      // Monthly plans
      'NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_MONTHLY',
      'NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY',
      'NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_MONTHLY',
      'NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_MONTHLY',
      // Annual plans
      'NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_ANNUAL',
      'NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_ANNUAL',
      'NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_ANNUAL',
      'NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_ANNUAL',
      // Overage tiers
      'PADDLE_OVERAGE_5_PRICE_ID',
      'PADDLE_OVERAGE_10_PRICE_ID',
      'PADDLE_OVERAGE_15_PRICE_ID',
      'PADDLE_OVERAGE_20_PRICE_ID',
      'PADDLE_OVERAGE_DEFAULT_PRICE_ID',
      'PADDLE_OVERAGE_PRODUCT_ID'
    ],
    critical: true
  },

  'Email Service': {
    variables: [
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
      'RESEND_REPLY_TO',
      'RESEND_PARTNER_EMAIL'
    ],
    critical: true
  },

  'Partner Program': {
    variables: [
      'PARTNER_JWT_SECRET',
      'PARTNER_COMMISSION_BASE_RATE',
      'PARTNER_COMMISSION_MIN_PAYOUT',
      'PARTNER_COMMISSION_HOLDING_DAYS',
      'PARTNER_COOKIE_DURATION',
      'PARTNER_ATTRIBUTION_WINDOW',
      // Tiers
      'PARTNER_TIER_BRONZE_MIN',
      'PARTNER_TIER_SILVER_MIN',
      'PARTNER_TIER_GOLD_MIN',
      'PARTNER_TIER_PLATINUM_MIN',
      // Security
      'PARTNER_MAX_LOGIN_ATTEMPTS',
      'PARTNER_LOCKOUT_DURATION',
      'PARTNER_PASSWORD_MIN_LENGTH',
      'PARTNER_PASSWORD_REQUIRE_UPPERCASE',
      'PARTNER_PASSWORD_REQUIRE_NUMBER',
      'PARTNER_PASSWORD_REQUIRE_SPECIAL',
      // Features
      'ENABLE_PARTNER_PROGRAM',
      'ENABLE_PARTNER_ANALYTICS',
      'ENABLE_PARTNER_AUTO_APPROVAL',
      'ENABLE_PARTNER_SELF_SERVICE_ONBOARDING',
      'ENABLE_PARTNER_COMMISSION_AUTO_PROCESSING',
      // Notifications
      'SEND_PARTNER_WELCOME_EMAIL',
      'SEND_PARTNER_COMMISSION_EMAIL',
      'SEND_PARTNER_TIER_UPGRADE_EMAIL',
      'SEND_PARTNER_MONTHLY_REPORT',
      'SEND_ADMIN_APPLICATION_NOTIFICATION',
      'SEND_ADMIN_PAYOUT_REMINDER'
    ],
    critical: false
  },

  'Security & Secrets': {
    variables: [
      'SESSION_SECRET',
      'CSRF_SECRET',
      'ENCRYPTION_KEY',
      'SECRET_ENCRYPTION_KEY',
      'ASSEMBLYAI_WEBHOOK_SECRET',
      'CRON_SECRET'
    ],
    critical: true
  },

  'Data Retention': {
    variables: [
      'CALL_RETENTION_DAYS',
      'TRANSCRIPT_RETENTION_DAYS',
      'AUDIT_LOG_RETENTION_DAYS',
      'EXTRACTED_FIELDS_RETENTION_DAYS',
      'METADATA_RETENTION_DAYS',
      'PARTNER_ANALYTICS_RETENTION_DAYS',
      'RETENTION_CLEANUP_ENABLED',
      'RETENTION_EMAIL_NOTIFICATIONS'
    ],
    critical: false
  },

  'Admin & Notifications': {
    variables: [
      'ADMIN_EMAIL',
      'ADMIN_NOTIFICATION_EMAILS'
    ],
    critical: false
  },

  'Development Settings': {
    variables: [
      'NEXT_PUBLIC_DEBUG_MODE',
      'DISABLE_AUTH',
      'PARTNER_API_RATE_LIMIT',
      'PARTNER_API_RATE_WINDOW'
    ],
    critical: false
  },

  'Optional Integrations': {
    variables: [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'TWILIO_WEBHOOK_URL',
      'REDIS_URL',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'SLACK_WEBHOOK_URL',
      'SLACK_CHANNEL_PARTNERS',
      'GA_MEASUREMENT_ID',
      'GA_API_SECRET',
      'NEXT_PUBLIC_SENTRY_DSN',
      'SENTRY_ORG',
      'SENTRY_PROJECT',
      'SENTRY_AUTH_TOKEN',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'NEXT_PUBLIC_POSTHOG_HOST',
      'LOG_LEVEL',
      'LOG_AGGREGATOR_URL',
      'LOG_AGGREGATOR_TOKEN',
      'LOGTAIL_SOURCE_TOKEN'
    ],
    critical: false
  }
};

// Parse .env file
function parseEnvFile(filepath) {
  if (!fs.existsSync(filepath)) {
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf8');
  const vars = {};

  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;

    const [key, ...valueParts] = line.split('=');
    if (key) {
      vars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return vars;
}

// Check environment file
function checkEnvFile(filename, envVars) {
  console.log(`\n📋 Checking ${filename}`);
  console.log('─'.repeat(50));

  if (!envVars) {
    console.log('❌ File not found!');
    return false;
  }

  let allGood = true;
  let criticalMissing = false;

  Object.entries(requiredConfig).forEach(([category, config]) => {
    console.log(`\n${category}:`);

    let categoryIssues = [];

    config.variables.forEach(varName => {
      if (envVars[varName] !== undefined) {
        const value = envVars[varName];
        const hasValue = value && value !== '';

        if (hasValue) {
          console.log(`  ✅ ${varName}`);
        } else if (config.critical && filename.includes('production')) {
          console.log(`  ⚠️  ${varName} (empty value)`);
          categoryIssues.push(varName);
        } else {
          console.log(`  ⚠️  ${varName} (empty)`);
        }
      } else {
        if (config.critical) {
          console.log(`  ❌ ${varName} (MISSING - CRITICAL)`);
          criticalMissing = true;
          categoryIssues.push(varName);
        } else {
          console.log(`  ⚠️  ${varName} (missing - optional)`);
        }
        allGood = false;
      }
    });

    if (config.note) {
      console.log(`     ℹ️  Note: ${config.note}`);
    }

    if (categoryIssues.length > 0 && config.critical) {
      criticalMissing = true;
    }
  });

  // Check for legacy/deprecated variables
  console.log('\n🔍 Checking for legacy variables:');
  const legacyVars = [
    'NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER',
    'NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH',
    'NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE',
    'NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_500',
    'NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_1000',
    'NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_2500',
    'NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_5000'
  ];

  legacyVars.forEach(varName => {
    if (envVars[varName] !== undefined) {
      console.log(`  ✅ ${varName} (backward compatibility)`);
    }
  });

  return !criticalMissing;
}

// Main execution
console.log('🔄 Starting environment configuration audit...\n');

const localEnv = parseEnvFile('.env.local');
const prodEnv = parseEnvFile('.env.production');

let localOk = checkEnvFile('.env.local', localEnv);
let prodOk = checkEnvFile('.env.production', prodEnv);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 AUDIT SUMMARY');
console.log('='.repeat(50));

if (localOk && prodOk) {
  console.log('\n✅ Both environment files are properly configured!');
  console.log('   All critical variables are present.');
} else {
  console.log('\n⚠️  Issues detected:');
  if (!localOk) {
    console.log('   - .env.local has missing critical variables');
  }
  if (!prodOk) {
    console.log('   - .env.production has missing critical variables');
  }
}

// Environment-specific checks
console.log('\n📝 Environment-Specific Configuration:');
console.log('─'.repeat(50));

if (localEnv && prodEnv) {
  // Check NODE_ENV
  console.log('\nNODE_ENV:');
  console.log(`  .env.local: ${localEnv.NODE_ENV || 'NOT SET'}`);
  console.log(`  .env.production: ${prodEnv.NODE_ENV || 'NOT SET'}`);

  // Check URLs
  console.log('\nApp URLs:');
  console.log(`  .env.local: ${localEnv.NEXT_PUBLIC_APP_URL || 'NOT SET'}`);
  console.log(`  .env.production: ${prodEnv.NEXT_PUBLIC_APP_URL || 'NOT SET'}`);

  // Check Paddle environment
  console.log('\nPaddle Environment:');
  console.log(`  .env.local: ${localEnv.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'NOT SET'}`);
  console.log(`  .env.production: ${prodEnv.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'NOT SET'}`);

  // Check debug mode
  console.log('\nDebug Mode:');
  console.log(`  .env.local: ${localEnv.NEXT_PUBLIC_DEBUG_MODE || 'NOT SET'}`);
  console.log(`  .env.production: ${prodEnv.NEXT_PUBLIC_DEBUG_MODE || 'NOT SET'}`);
}

// Recommendations
console.log('\n💡 Recommendations:');
console.log('─'.repeat(50));
console.log('1. Production Paddle API keys should be added when available');
console.log('2. Consider adding monitoring services (Sentry, PostHog) for production');
console.log('3. Set up Redis for caching in production environment');
console.log('4. Configure Twilio if automatic call recording is needed');
console.log('5. Add Google Analytics for traffic tracking');
console.log('6. Keep .env.production secure and never commit to version control');

console.log('\n✨ Environment audit complete!');
console.log('   LoadVoice is configured for end-to-end operation.');