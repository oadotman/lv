/**
 * Environment Variable Validation
 * Ensures all required environment variables are set and valid
 * Run this on application startup to catch configuration errors early
 */

import { z } from 'zod';

// =====================================================
// ENVIRONMENT VARIABLE SCHEMAS
// =====================================================

const EnvSchema = z.object({
  // Supabase Configuration (Required)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .min(1, 'NEXT_PUBLIC_SUPABASE_URL is required')
    .refine(
      (url) => url.includes('supabase.co') || url.includes('supabase.in'),
      'Invalid Supabase URL format'
    ),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .regex(
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      'Invalid Supabase anon key format (should be a JWT)'
    ),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .regex(
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      'Invalid Supabase service role key format (should be a JWT)'
    ),

  // AI Services (Required)
  ASSEMBLYAI_API_KEY: z
    .string()
    .min(1, 'ASSEMBLYAI_API_KEY is required')
    .regex(/^[a-f0-9]{32}$/, 'Invalid AssemblyAI API key format'),

  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .regex(/^sk-[A-Za-z0-9_-]{20,}$/, 'Invalid OpenAI API key format'),

  // Inngest (Required)
  INNGEST_EVENT_KEY: z
    .string()
    .min(1, 'INNGEST_EVENT_KEY is required'),

  INNGEST_SIGNING_KEY: z
    .string()
    .min(1, 'INNGEST_SIGNING_KEY is required'),

  // Application Configuration (Required)
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .min(1, 'NEXT_PUBLIC_APP_URL is required'),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Email Service (Optional but recommended)
  RESEND_API_KEY: z
    .string()
    .regex(/^re_[A-Za-z0-9_]+$/, 'Invalid Resend API key format')
    .optional(),

  RESEND_FROM_EMAIL: z
    .string()
    .email('Invalid RESEND_FROM_EMAIL format')
    .optional(),

  RESEND_REPLY_TO: z
    .string()
    .email('Invalid RESEND_REPLY_TO format')
    .optional(),

  // Paddle Billing (Optional)
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_CLIENT_TOKEN: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_PADDLE_ENVIRONMENT: z
    .enum(['sandbox', 'production'])
    .default('sandbox'),
  NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER: z.string().optional(),
  NEXT_PUBLIC_PADDLE_PRICE_ID_GROWTH: z.string().optional(),
  NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE: z.string().optional(),

  // Monitoring (Optional)
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .url()
    .optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z
    .string()
    .url()
    .default('https://app.posthog.com'),

  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (x.y.z)')
    .default('1.0.0'),

  // Security (Production only)
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .optional()
    .refine(
      (val) => process.env.NODE_ENV !== 'production' || !!val,
      'SESSION_SECRET is required in production'
    ),

  CSRF_SECRET: z
    .string()
    .min(32, 'CSRF_SECRET must be at least 32 characters')
    .optional()
    .refine(
      (val) => process.env.NODE_ENV !== 'production' || !!val,
      'CSRF_SECRET is required in production'
    ),

  ASSEMBLYAI_WEBHOOK_SECRET: z.string().optional(),

  REDIS_URL: z
    .string()
    .url()
    .optional(),

  // Development Tools
  NEXT_PUBLIC_DEBUG_MODE: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  DISABLE_AUTH: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true')
    .refine(
      (val) => process.env.NODE_ENV !== 'production' || val === false,
      'DISABLE_AUTH must be false in production'
    ),
});

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Validate environment variables
 * Call this on application startup
 */
export function validateEnv(): {
  success: boolean;
  errors?: string[];
  config?: EnvConfig;
} {
  try {
    const config = EnvSchema.parse(process.env);
    return { success: true, config };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: ['Unknown error validating environment variables'],
    };
  }
}

/**
 * Get validated environment config
 * Throws error if validation fails
 */
export function getEnvConfig(): EnvConfig {
  const result = validateEnv();
  if (!result.success) {
    const errorMessage = [
      'Environment validation failed:',
      ...(result.errors || []),
    ].join('\n  - ');
    throw new Error(errorMessage);
  }
  return result.config!;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get required environment variable or throw
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Log environment status (safe for production)
 * Doesn't log actual values, only validation status
 */
export function logEnvStatus(): void {
  const result = validateEnv();

  if (result.success) {
    console.log('✅ Environment variables validated successfully');

    // Log which optional services are configured
    const optionalServices = {
      'Email (Resend)': !!process.env.RESEND_API_KEY,
      'Billing (Paddle)': !!process.env.PADDLE_API_KEY,
      'Monitoring (Sentry)': !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      'Analytics (PostHog)': !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      'Cache (Redis)': !!process.env.REDIS_URL,
    };

    console.log('📦 Optional services configured:');
    Object.entries(optionalServices).forEach(([service, configured]) => {
      console.log(`  ${configured ? '✅' : '⚪'} ${service}`);
    });
  } else {
    console.error('❌ Environment validation failed:');
    result.errors?.forEach((error) => {
      console.error(`  - ${error}`);
    });
  }
}

// =====================================================
// RUNTIME CHECKS
// =====================================================

/**
 * Check critical services are available
 * Use this for health checks
 */
export async function checkCriticalServices(): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
  errors: string[];
}> {
  const services: Record<string, boolean> = {};
  const errors: string[] = [];

  // Check Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }).catch(() => null);
      services.supabase = response?.ok || false;
      if (!services.supabase) {
        errors.push('Supabase health check failed');
      }
    }
  } catch (error) {
    services.supabase = false;
    errors.push('Supabase connection error');
  }

  // Check OpenAI
  services.openai = !!process.env.OPENAI_API_KEY;
  if (!services.openai) {
    errors.push('OpenAI API key not configured');
  }

  // Check AssemblyAI
  services.assemblyai = !!process.env.ASSEMBLYAI_API_KEY;
  if (!services.assemblyai) {
    errors.push('AssemblyAI API key not configured');
  }

  // Check Inngest
  services.inngest = !!(
    process.env.INNGEST_EVENT_KEY &&
    process.env.INNGEST_SIGNING_KEY
  );
  if (!services.inngest) {
    errors.push('Inngest not configured');
  }

  const healthy = Object.values(services).every((status) => status);

  return { healthy, services, errors };
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default {
  validate: validateEnv,
  getConfig: getEnvConfig,
  isProduction,
  isDevelopment,
  getRequired: getRequiredEnv,
  logStatus: logEnvStatus,
  checkServices: checkCriticalServices,
};