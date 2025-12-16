# Google Analytics 4 (GA4) Implementation Guide for SynQall Partner Program

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Partner Program Event Tracking](#partner-program-event-tracking)
3. [E-commerce & Revenue Tracking](#e-commerce--revenue-tracking)
4. [Custom Dimensions & Metrics](#custom-dimensions--metrics)
5. [Conversion Events Setup](#conversion-events-setup)
6. [Audience Segmentation](#audience-segmentation)
7. [Reports & Dashboards](#reports--dashboards)
8. [Implementation Code](#implementation-code)
9. [Testing & Debugging](#testing--debugging)
10. [Maintenance & Optimization](#maintenance--optimization)

---

## 1. Initial Setup

### Prerequisites
- Google Analytics 4 Property created
- Google Tag Manager (GTM) account (optional but recommended)
- Access to SynQall codebase

### Step 1: Install GA4 in Your Application

1. **Get your Measurement ID** from GA4 (looks like `G-XXXXXXXXXX`)

2. **Add to environment variables**:
```env
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

3. **Create the Google Analytics component**:

Create `/components/GoogleAnalytics.tsx`:
```tsx
'use client';

import Script from 'next/script';

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}
```

4. **Add to your root layout** (`app/layout.tsx`):
```tsx
import GoogleAnalytics from '@/components/GoogleAnalytics';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
```

---

## 2. Partner Program Event Tracking

### Create Analytics Helper Functions

Create `/lib/analytics.ts`:
```typescript
// Google Analytics event tracking helper
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Helper to check if GA is available
export const isGAAvailable = () => {
  return typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID;
};

// Generic event tracking
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (!isGAAvailable()) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Partner-specific events
export const partnerAnalytics = {
  // Track partner application submission
  trackApplicationSubmission: (partnerType: string, email: string) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_application_submitted', {
      event_category: 'Partner Program',
      event_label: partnerType,
      partner_type: partnerType,
      user_email: email, // Be careful with PII
      value: 1
    });
  },

  // Track partner approval
  trackApplicationApproval: (partnerId: string, partnerType: string) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_application_approved', {
      event_category: 'Partner Program',
      event_label: partnerType,
      partner_id: partnerId,
      partner_type: partnerType,
      value: 1
    });
  },

  // Track referral link click
  trackReferralClick: (referralCode: string, source?: string) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_referral_click', {
      event_category: 'Partner Program',
      event_label: referralCode,
      referral_code: referralCode,
      traffic_source: source || 'direct',
      value: 1
    });
  },

  // Track customer signup from partner
  trackReferralSignup: (referralCode: string, customerId: string, planType: string) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_referral_signup', {
      event_category: 'Partner Program',
      event_label: referralCode,
      referral_code: referralCode,
      customer_id: customerId,
      plan_type: planType,
      value: 1
    });
  },

  // Track customer conversion (paid subscription)
  trackReferralConversion: (referralCode: string, customerId: string, revenue: number) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_referral_conversion', {
      event_category: 'Partner Program',
      event_label: referralCode,
      referral_code: referralCode,
      customer_id: customerId,
      value: revenue,
      currency: 'USD'
    });
  },

  // Track commission payout
  trackCommissionPayout: (partnerId: string, amount: number, month: string) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_commission_payout', {
      event_category: 'Partner Program',
      event_label: `${month}_payout`,
      partner_id: partnerId,
      payout_amount: amount,
      payout_month: month,
      value: amount,
      currency: 'USD'
    });
  },

  // Track partner dashboard actions
  trackDashboardAction: (action: string, details?: any) => {
    if (!isGAAvailable()) return;

    window.gtag('event', `partner_dashboard_${action}`, {
      event_category: 'Partner Dashboard',
      event_label: action,
      ...details
    });
  },

  // Track partner tier upgrade
  trackTierUpgrade: (partnerId: string, oldTier: string, newTier: string) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_tier_upgrade', {
      event_category: 'Partner Program',
      event_label: `${oldTier}_to_${newTier}`,
      partner_id: partnerId,
      old_tier: oldTier,
      new_tier: newTier,
      value: 1
    });
  }
};
```

---

## 3. E-commerce & Revenue Tracking

### Enhanced E-commerce Setup

1. **Enable Enhanced E-commerce in GA4**:
   - Go to Admin → Property → Data Streams
   - Click on your web stream
   - Toggle ON "Enhanced measurement"
   - Enable "Page views", "Scrolls", "Outbound clicks", "Site search", "Form interactions"

2. **Implement Revenue Tracking**:

```typescript
// Track partner-driven revenue
export const trackPartnerRevenue = {
  // Track when a partner-referred customer makes a purchase
  trackPurchase: (orderData: {
    transactionId: string;
    partnerId: string;
    referralCode: string;
    revenue: number;
    tax?: number;
    shipping?: number;
    currency?: string;
    items: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      price: number;
    }>;
  }) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'purchase', {
      transaction_id: orderData.transactionId,
      value: orderData.revenue,
      tax: orderData.tax || 0,
      shipping: orderData.shipping || 0,
      currency: orderData.currency || 'USD',
      partner_id: orderData.partnerId,
      referral_code: orderData.referralCode,
      items: orderData.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        quantity: item.quantity,
        price: item.price
      }))
    });
  },

  // Track recurring subscription revenue
  trackSubscriptionRevenue: (data: {
    customerId: string;
    partnerId: string;
    referralCode: string;
    subscriptionId: string;
    monthlyValue: number;
    planName: string;
  }) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'subscription_payment', {
      event_category: 'Revenue',
      event_label: 'partner_recurring',
      customer_id: data.customerId,
      partner_id: data.partnerId,
      referral_code: data.referralCode,
      subscription_id: data.subscriptionId,
      value: data.monthlyValue,
      currency: 'USD',
      plan_name: data.planName
    });
  },

  // Track commission calculations
  trackCommission: (data: {
    partnerId: string;
    commissionAmount: number;
    baseRevenue: number;
    commissionRate: number;
    month: string;
  }) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'commission_calculated', {
      event_category: 'Partner Program',
      event_label: 'commission',
      partner_id: data.partnerId,
      commission_amount: data.commissionAmount,
      base_revenue: data.baseRevenue,
      commission_rate: data.commissionRate,
      month: data.month,
      value: data.commissionAmount,
      currency: 'USD'
    });
  }
};
```

---

## 4. Custom Dimensions & Metrics

### Setting Up in GA4 Admin

1. **Navigate to**: Admin → Property → Custom definitions

2. **Create these Custom Dimensions**:

| Dimension Name | Scope | Description | Event Parameter |
|---------------|-------|-------------|-----------------|
| Partner ID | User | Unique partner identifier | partner_id |
| Partner Type | User | Consultant/Agency/Influencer/Affiliate | partner_type |
| Partner Tier | User | Bronze/Silver/Gold/Platinum | partner_tier |
| Referral Code | Event | Partner's referral code | referral_code |
| Commission Rate | Event | Partner's commission percentage | commission_rate |
| Partner Status | User | Active/Inactive/Suspended | partner_status |
| Referral Source | Event | Where referral came from | referral_source |
| Customer Lifetime Value | User | Total revenue from customer | customer_ltv |

3. **Create these Custom Metrics**:

| Metric Name | Unit | Scope | Description |
|------------|------|-------|-------------|
| Commission Amount | Currency | Event | Commission earned |
| Partner Revenue | Currency | Event | Revenue generated by partner |
| Referral Count | Standard | Event | Number of referrals |
| Conversion Rate | Standard | Event | Partner's conversion rate |

### Implementation in Code

```typescript
// Set user properties for partners
export const setPartnerUserProperties = (partner: {
  id: string;
  type: string;
  tier: string;
  status: string;
  joinDate: string;
}) => {
  if (!isGAAvailable()) return;

  window.gtag('set', 'user_properties', {
    partner_id: partner.id,
    partner_type: partner.type,
    partner_tier: partner.tier,
    partner_status: partner.status,
    partner_join_date: partner.joinDate
  });
};

// Track page views with partner context
export const trackPartnerPageView = (pagePath: string, partnerId?: string) => {
  if (!isGAAvailable()) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    partner_id: partnerId,
    partner_context: partnerId ? 'partner_dashboard' : 'public'
  });
};
```

---

## 5. Conversion Events Setup

### Mark Events as Conversions in GA4

1. **Navigate to**: Admin → Events → Mark as conversion

2. **Mark these events as conversions**:
   - `partner_application_submitted`
   - `partner_application_approved`
   - `partner_referral_signup`
   - `partner_referral_conversion`
   - `purchase` (when partner_id is present)
   - `partner_tier_upgrade`

### Set Up Conversion Values

```typescript
// Track high-value conversions
export const trackConversion = {
  // Partner brings in enterprise customer
  enterpriseCustomer: (partnerId: string, dealValue: number) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'enterprise_conversion', {
      event_category: 'Conversions',
      event_label: 'partner_enterprise',
      partner_id: partnerId,
      deal_value: dealValue,
      value: dealValue,
      currency: 'USD'
    });
  },

  // Partner reaches milestone
  partnerMilestone: (partnerId: string, milestone: string, value: number) => {
    if (!isGAAvailable()) return;

    window.gtag('event', 'partner_milestone', {
      event_category: 'Partner Program',
      event_label: milestone,
      partner_id: partnerId,
      milestone_type: milestone,
      value: value
    });
  }
};
```

---

## 6. Audience Segmentation

### Create Partner-Related Audiences

1. **Navigate to**: Admin → Audiences → New audience

2. **Create these audiences**:

#### Active Partners
```
Conditions:
- partner_status = 'active'
- partner_id is not null
```

#### High-Value Partners
```
Conditions:
- partner_tier in ('gold', 'platinum')
- OR total_revenue_generated > 10000
```

#### New Partners (First 30 days)
```
Conditions:
- partner_join_date >= last 30 days
- partner_status = 'active'
```

#### Partner-Referred Customers
```
Conditions:
- referral_code is not null
- first_session_source contains 'partner'
```

#### At-Risk Partners
```
Conditions:
- partner_status = 'active'
- last_referral_date < 60 days ago
- referral_count in last 30 days = 0
```

---

## 7. Reports & Dashboards

### Custom Reports Configuration

#### Partner Performance Report
```javascript
// Report configuration
const partnerPerformanceReport = {
  dimensions: [
    'partner_id',
    'partner_type',
    'partner_tier',
    'date'
  ],
  metrics: [
    'eventCount', // for referral clicks
    'totalUsers', // referred users
    'purchaseRevenue', // revenue generated
    'customEvent:commission_amount' // commissions earned
  ],
  filters: [
    'partner_id != (not set)'
  ],
  dateRange: 'last30days'
};
```

#### Partner Funnel Analysis
```javascript
const partnerFunnelSteps = [
  'partner_referral_click',
  'partner_referral_signup',
  'trial_started',
  'partner_referral_conversion',
  'subscription_renewed'
];
```

### Dashboard Setup in GA4

1. **Create Custom Dashboard**:
   - Name: "Partner Program Overview"
   - Add cards for:
     - Total Active Partners
     - Revenue from Partners (Last 30 days)
     - New Partner Applications
     - Partner Conversion Rate
     - Top 10 Partners by Revenue
     - Commission Payouts

2. **Real-time Monitoring**:
   - Partner referral clicks in real-time
   - New partner applications
   - Live conversions from partners

---

## 8. Implementation Code

### Complete Implementation Example

#### In Partner Application Page (`/app/partners/apply/page.tsx`):
```typescript
import { partnerAnalytics } from '@/lib/analytics';

// When form is submitted
const handleApplicationSubmit = async (formData) => {
  // Track the application
  partnerAnalytics.trackApplicationSubmission(
    formData.partnerType,
    formData.email
  );

  // Submit to API
  const response = await submitApplication(formData);

  if (response.success) {
    // Track successful submission
    trackEvent('form_submit_success', 'Partner Application');
  }
};
```

#### In Referral Tracking (`/middleware.ts`):
```typescript
import { partnerAnalytics } from '@/lib/analytics';

// When referral link is clicked
if (req.nextUrl.searchParams.get('ref')) {
  const referralCode = req.nextUrl.searchParams.get('ref');
  const source = req.headers.get('referer');

  // Track the click
  partnerAnalytics.trackReferralClick(referralCode, source);
}
```

#### In Customer Signup (`/app/api/auth/signup/route.ts`):
```typescript
// After successful signup
if (referralCode) {
  partnerAnalytics.trackReferralSignup(
    referralCode,
    newUser.id,
    selectedPlan
  );
}
```

#### In Payment Processing (`/app/api/webhooks/paddle/route.ts`):
```typescript
// When payment is successful
if (event.type === 'payment.success' && referralCode) {
  // Track conversion
  partnerAnalytics.trackReferralConversion(
    referralCode,
    customerId,
    paymentAmount
  );

  // Track revenue
  trackPartnerRevenue.trackPurchase({
    transactionId: event.id,
    partnerId: partner.id,
    referralCode: referralCode,
    revenue: paymentAmount,
    currency: 'USD',
    items: [{
      id: planId,
      name: planName,
      category: 'subscription',
      quantity: 1,
      price: paymentAmount
    }]
  });
}
```

---

## 9. Testing & Debugging

### Using GA4 DebugView

1. **Enable Debug Mode**:
```javascript
// Add to your GA initialization
gtag('config', GA_MEASUREMENT_ID, {
  debug_mode: true // Enable for development
});
```

2. **Browser Extension**:
   - Install "Google Analytics Debugger" Chrome extension
   - Enable it when testing

3. **Test Checklist**:
   - [ ] Partner application tracking
   - [ ] Referral link click tracking
   - [ ] Customer signup attribution
   - [ ] Payment and commission tracking
   - [ ] Dashboard navigation tracking
   - [ ] Conversion events firing
   - [ ] Custom dimensions populated
   - [ ] E-commerce data accurate

### Validation Script
```typescript
// Test tracking implementation
export const validateTracking = () => {
  console.log('GA Available:', isGAAvailable());
  console.log('Measurement ID:', GA_TRACKING_ID);

  // Test event
  trackEvent('test_event', 'Debug', 'validation', 1);

  // Check dataLayer
  if (window.dataLayer) {
    console.log('DataLayer:', window.dataLayer);
  }
};
```

---

## 10. Maintenance & Optimization

### Monthly Tasks

1. **Review Conversion Rates**:
   - Check partner conversion funnels
   - Identify drop-off points
   - A/B test improvements

2. **Audit Data Quality**:
   - Check for missing parameters
   - Verify revenue tracking accuracy
   - Ensure partner IDs are consistent

3. **Update Audiences**:
   - Refresh high-value partner criteria
   - Update at-risk partner definitions
   - Create seasonal segments

### Quarterly Tasks

1. **Performance Review**:
   - Analyze top performing partners
   - Identify trends in partner types
   - Review commission vs revenue ratios

2. **Report Optimization**:
   - Update custom reports
   - Create new insights dashboards
   - Share reports with stakeholders

### Implementation Checklist

- [ ] GA4 property created and configured
- [ ] Measurement ID added to environment variables
- [ ] GoogleAnalytics component added to layout
- [ ] Analytics helper functions created
- [ ] Partner events implemented in application
- [ ] Custom dimensions configured in GA4
- [ ] Conversion events marked
- [ ] Audiences created
- [ ] Custom reports built
- [ ] Testing completed in DebugView
- [ ] Documentation shared with team

### Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| Events not appearing | Check if GA is blocked by ad blockers |
| Missing partner_id | Ensure user properties are set on login |
| Revenue mismatch | Verify currency and decimal handling |
| Duplicate events | Check for multiple GA installations |
| No real-time data | Confirm debug_mode is disabled in production |

---

## Privacy & Compliance

### GDPR Compliance
```typescript
// Cookie consent implementation
export const initializeAnalyticsWithConsent = (hasConsent: boolean) => {
  if (!hasConsent) {
    // Disable GA
    window['ga-disable-' + GA_TRACKING_ID] = true;
    return;
  }

  // Enable GA
  window['ga-disable-' + GA_TRACKING_ID] = false;

  // Initialize
  gtag('consent', 'update', {
    'analytics_storage': 'granted'
  });
};
```

### Data Retention
- Set data retention to 14 months in GA4 settings
- Implement user data deletion on request
- Document what data is collected in privacy policy

---

## Support & Resources

- [GA4 Documentation](https://developers.google.com/analytics)
- [GA4 Event Builder](https://ga-dev-tools.web.app/ga4/event-builder/)
- [GA4 Dimensions & Metrics Explorer](https://ga-dev-tools.web.app/ga4/dimensions-metrics-explorer/)
- [Google Tag Assistant](https://tagassistant.google.com/)

---

## Next Steps

1. **Immediate Implementation**:
   - Set up GA4 property
   - Add tracking code to application
   - Implement basic partner events

2. **Week 1**:
   - Configure custom dimensions
   - Set up conversion tracking
   - Create initial audiences

3. **Week 2**:
   - Build custom reports
   - Set up dashboards
   - Test all tracking points

4. **Ongoing**:
   - Monitor data quality
   - Optimize based on insights
   - Expand tracking as needed

---

*Last Updated: December 2024*
*Version: 1.0*