# LoadVoice Environment Configuration

## Overview

LoadVoice uses two consolidated environment configuration files for complete end-to-end functionality:

1. **`.env.local`** - Development environment configuration
2. **`.env.production`** - Production environment configuration

## Environment Files

### Development (`.env.local`)

- **Purpose**: Local development and testing
- **Node Environment**: `development`
- **App URL**: `http://localhost:3000`
- **Paddle Environment**: `sandbox`
- **Debug Mode**: Enabled
- **Key Features**:
  - Uses development Supabase instance
  - Placeholder values for Paddle billing (sandbox mode)
  - Debug logging enabled
  - Development secrets for testing

### Production (`.env.production`)

- **Purpose**: Live production deployment
- **Node Environment**: `production`
- **App URL**: `https://loadvoice.com`
- **Paddle Environment**: `production`
- **Debug Mode**: Disabled
- **Key Features**:
  - Production Supabase instance
  - Live Paddle billing configuration with all price IDs
  - Production API keys and secrets
  - Optimized for performance

## Configuration Categories

### 1. Core Application
- `NODE_ENV` - Environment mode
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NEXT_PUBLIC_APP_VERSION` - Current version

### 2. Database (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for server operations
- `SUPABASE_SERVICE_KEY` - Service key for admin operations

### 3. AI Services
- `ASSEMBLYAI_API_KEY` - For call transcription
- `OPENAI_API_KEY` - For AI-powered data extraction

### 4. Async Processing (Inngest)
- `INNGEST_EVENT_KEY` - Event handling key
- `INNGEST_SIGNING_KEY` - Request signing
- `INNGEST_EVENT_URL` - Local event endpoint (dev only)

### 5. Billing (Paddle)

#### Subscription Plans
**Monthly Plans**:
- Solo: $99/month (500 minutes)
- Starter: $299/month (1,500 minutes)
- Professional: $799/month (4,000 minutes)
- Enterprise: $2,999/month (15,000 minutes)

**Annual Plans** (17% discount):
- Solo: $986/year
- Starter: $2,978/year
- Professional: $7,958/year
- Enterprise: $29,878/year

#### Overage Pricing
- $0.20 per minute
- Tiers: $5 (25 min), $10 (50 min), $15 (75 min), $20 (100 min cap)

### 6. Email Service (Resend)
- `RESEND_API_KEY` - Email service API key
- `RESEND_FROM_EMAIL` - Default sender address
- `RESEND_REPLY_TO` - Reply-to address
- `RESEND_PARTNER_EMAIL` - Partner program email

### 7. Partner Program

#### Commission Structure
- Base rate: 25%
- Minimum payout: $100
- Holding period: 30 days
- Cookie duration: 90 days
- Attribution window: 90 days

#### Tier Requirements
- Bronze: 0+ referrals
- Silver: 10+ referrals
- Gold: 20+ referrals
- Platinum: 50+ referrals

#### Security Settings
- Max login attempts: 5
- Lockout duration: 15 minutes
- Password requirements: 8+ chars, uppercase, number, special char

### 8. Data Retention Policies
- Call audio: 7 days
- Transcripts: 30 days
- Audit logs: 90 days
- Extracted fields: Forever (CRM data)
- Metadata: Forever
- Partner analytics: 365 days

### 9. Security & Encryption
- `SESSION_SECRET` - Session encryption
- `CSRF_SECRET` - CSRF protection
- `ENCRYPTION_KEY` - Data encryption
- `SECRET_ENCRYPTION_KEY` - Secret encryption
- `ASSEMBLYAI_WEBHOOK_SECRET` - Webhook verification
- `CRON_SECRET` - Cron job authentication

### 10. Optional Integrations
- **Twilio**: Automatic call recording (optional)
- **Redis**: Caching layer (optional)
- **Monitoring**: Sentry, PostHog (optional)
- **Analytics**: Google Analytics (optional)
- **Notifications**: Slack webhooks (optional)

## Security Best Practices

### DO's
- ✅ Keep `.env.production` secure and never commit to version control
- ✅ Use different API keys for development and production
- ✅ Rotate secrets regularly
- ✅ Use strong, unique secrets for production
- ✅ Store production credentials in a secure password manager
- ✅ Use environment-specific Supabase projects

### DON'Ts
- ❌ Never commit `.env.local` or `.env.production` to git
- ❌ Don't share production API keys
- ❌ Don't use production keys in development
- ❌ Don't expose sensitive variables to the client (use NEXT_PUBLIC_ prefix carefully)

## Deployment

### Local Development
```bash
# Uses .env.local automatically
npm run dev
```

### Production Build
```bash
# Uses .env.production for build
npm run build
npm start
```

### Docker Deployment
```bash
# Copy .env.production to the container
docker build --build-arg ENV_FILE=.env.production -t loadvoice .
docker run -p 3000:3000 loadvoice
```

### Vercel Deployment
1. Add all production environment variables to Vercel project settings
2. Do not upload `.env.production` file
3. Use Vercel's environment variable UI

## Verification

Run the verification script to ensure all required variables are present:

```bash
node scripts/verify-env-config.js
```

This will check both environment files and report any missing critical variables.

## Migration Notes

### Previous Structure (Deprecated)
- `.env.example` - Example configuration (removed)
- `.env.partner.example` - Partner example (removed)
- Multiple fragmented configurations

### New Structure (Current)
- `.env.local` - Complete development configuration
- `.env.production` - Complete production configuration
- All variables consolidated in two files
- Backward compatibility maintained for legacy Paddle price IDs

## Support

For environment configuration issues:
1. Run the verification script
2. Check that you're using the correct environment file
3. Ensure all critical variables have values
4. Verify API keys are valid and not expired

## Last Updated

- Date: January 12, 2026
- Version: 1.0.0
- LoadVoice Environment Configuration v2.0