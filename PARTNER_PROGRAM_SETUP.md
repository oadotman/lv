# SynQall Partner Program - Quick Setup Guide

## ✅ Prerequisites Completed
- ✅ Database migration already run
- ✅ Build successful
- ✅ Code pushed to GitHub

## 📋 Environment Variables Setup

Add these to your `.env.local` file:

```env
# ===========================================
# PARTNER PROGRAM CONFIGURATION
# ===========================================

# Generate these secrets (run each command in terminal):
# openssl rand -base64 32
PARTNER_JWT_SECRET=<paste-your-generated-secret-here>

# openssl rand -base64 32
CRON_SECRET=<paste-your-generated-secret-here>

# Partner-specific email (you mentioned adding this)
RESEND_PARTNER_EMAIL=partners@synqall.com

# NOTE: Your existing WEBHOOK_SECRET from Paddle will be used
# No need to add a new one - the partner webhook uses the same secret
```

## 🔧 Paddle Webhook Configuration

1. **Log into your Paddle Dashboard**

2. **Add a new webhook endpoint:**
   - URL: `https://www.synqall.com/api/webhooks/partner-commission`
   - Secret: Use your EXISTING webhook secret (same as main webhook)

3. **Select these events:**
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
   - `payment.succeeded`

## 📧 Email Setup in Resend

Since you're using `partners@synqall.com`:

1. **Add the email in Resend:**
   - Go to Resend dashboard
   - Add `partners@synqall.com` as a sender
   - Verify the email

2. **The system will use:**
   - `noreply@synqall.com` - For user invitations/referrals (existing)
   - `partners@synqall.com` - For partner communications (new)

## 🚀 Vercel Cron Job Setup (for monthly payouts)

Add to your `vercel.json`:

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

This runs on the 1st of each month at 2 AM UTC.

## 🧪 Testing the Setup

1. **Test Partner Application:**
   - Visit: `https://www.synqall.com/partners`
   - Submit a test application

2. **Admin Review:**
   - Visit: `https://www.synqall.com/admin/partners/applications`
   - Review and approve the test application

3. **Test Referral Tracking:**
   - Use the partner's referral link
   - Check that the cookie is set (90-day duration)

4. **Test Commission Processing (manual):**
   - As admin, trigger manually: `POST /api/cron/partner-commissions`

## 📊 Partner Program URLs

- **Public Landing**: `/partners`
- **Partner Application**: `/partners/apply`
- **Partner Login**: `/partners/login`
- **Partner Dashboard**: `/partners/dashboard`
- **Admin Overview**: `/admin/partners`
- **Admin Applications**: `/admin/partners/applications`
- **Admin Payouts**: `/admin/partners/payouts`

## 💰 Commission Structure

- **Bronze** (0-9 referrals): 25%
- **Silver** (10-19 referrals): 26%
- **Gold** (20-49 referrals): 28%
- **Platinum** (50+ referrals): 30%

**Rules:**
- $100 minimum payout threshold
- 30-day holding period (for refunds/chargebacks)
- 90-day cookie attribution window
- Automatic tier upgrades

## 🔒 Security Notes

1. Partner authentication is completely separate from user auth
2. Partners cannot access user areas
3. Users cannot access partner areas
4. All partner data is isolated with Row Level Security (RLS)

## ❓ Troubleshooting

- **Partners can't login**: Check `PARTNER_JWT_SECRET` is set
- **Commissions not tracking**: Verify Paddle webhook is configured
- **Emails not sending**: Verify `RESEND_PARTNER_EMAIL` in Resend
- **Cron not running**: Check Vercel cron configuration

## 📞 Support

For issues, check the error logs in:
- Vercel Functions logs
- Supabase logs
- Resend email logs