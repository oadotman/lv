# SynQall Partner Program - Environment Variables

Add these environment variables to your `.env.local` file to enable the partner program functionality.

## Required Variables

```env
# =====================================================
# ESSENTIAL PARTNER PROGRAM VARIABLES
# =====================================================

# Partner Authentication Secret (REQUIRED)
# Generate with: openssl rand -base64 32
PARTNER_JWT_SECRET=

# Cron Job Secret (REQUIRED for automated commission processing)
# Generate with: openssl rand -base64 32
CRON_SECRET=

# Webhook Secret (REQUIRED - get from your payment provider)
# This must match the secret configured in Paddle/Stripe
WEBHOOK_SECRET=

# Email Configuration (REQUIRED if not already configured)
RESEND_API_KEY=
RESEND_FROM_EMAIL=partners@synqall.com

# App URL (REQUIRED - use your production URL)
NEXT_PUBLIC_APP_URL=https://www.synqall.com
```

## Optional Configuration Variables

```env
# =====================================================
# PARTNER PROGRAM CONFIGURATION (Optional)
# =====================================================

# Commission Configuration
PARTNER_COMMISSION_BASE_RATE=25
PARTNER_COMMISSION_MIN_PAYOUT=100
PARTNER_COMMISSION_HOLDING_DAYS=30

# Referral Tracking
PARTNER_COOKIE_DURATION=7776000  # 90 days in seconds
PARTNER_ATTRIBUTION_WINDOW=90    # Days to attribute conversion

# Tier Thresholds
PARTNER_TIER_SILVER_MIN=10
PARTNER_TIER_GOLD_MIN=20
PARTNER_TIER_PLATINUM_MIN=50

# Admin Notifications
ADMIN_EMAIL=admin@synqall.com
ADMIN_NOTIFICATION_EMAILS=admin@synqall.com,finance@synqall.com

# Feature Flags
ENABLE_PARTNER_PROGRAM=true
ENABLE_PARTNER_ANALYTICS=true
ENABLE_PARTNER_AUTO_APPROVAL=false
ENABLE_PARTNER_COMMISSION_AUTO_PROCESSING=true
```

## Setup Instructions

### 1. Generate Secure Secrets

Run these commands to generate secure secrets:

```bash
# Generate Partner JWT Secret
openssl rand -base64 32

# Generate Cron Secret
openssl rand -base64 32
```

### 2. Configure Payment Webhook

1. Go to your payment provider dashboard (Paddle/Stripe)
2. Add webhook endpoint: `https://www.synqall.com/api/webhooks/partner-commission`
3. Subscribe to these events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
   - `payment.succeeded`
4. Copy the webhook secret to `WEBHOOK_SECRET`

### 3. Set Up Cron Job

#### For Vercel:
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/partner-commissions",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

#### For Other Platforms:
Configure a monthly cron job to call:
```
GET https://www.synqall.com/api/cron/partner-commissions
Headers: Authorization: Bearer <CRON_SECRET>
```

### 4. Email Configuration

Make sure you have configured Resend:
1. Sign up at https://resend.com
2. Add and verify your domain (synqall.com)
3. Create an API key
4. Add the API key to `RESEND_API_KEY`

## Testing Environment Variables

For development/testing, you can use these additional variables:

```env
# Development Only
NODE_ENV=development
BYPASS_PARTNER_AUTH=false
MOCK_PAYMENT_PROCESSING=true
TEST_PARTNER_EMAIL=test-partner@example.com
```

## Important Notes

1. **Security**: Never commit actual values to version control
2. **Database**: Run migrations before using the partner program
3. **RLS**: Ensure Supabase Row Level Security is enabled
4. **Email**: Test email sending before going live
5. **Webhooks**: Test webhook processing with your payment provider's test mode

## Verification Checklist

- [ ] PARTNER_JWT_SECRET is set (32+ characters)
- [ ] CRON_SECRET is set (32+ characters)
- [ ] WEBHOOK_SECRET matches payment provider
- [ ] RESEND_API_KEY is valid
- [ ] NEXT_PUBLIC_APP_URL is set to https://www.synqall.com
- [ ] Database migrations have been run
- [ ] Webhook endpoint is configured in payment provider
- [ ] Cron job is scheduled for monthly processing
- [ ] Email domain is verified in Resend

## Support

For any issues with the partner program setup, contact the development team or refer to the partner program documentation.