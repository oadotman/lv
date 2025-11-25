# Overage System Implementation

## Overview

The CallSync AI overage system allows organizations to continue processing calls after exceeding their base monthly minute allocation by purchasing overage packs or being billed for additional usage at $0.02/minute.

## Architecture

### Pricing Model

- **Base Rate**: $0.02 per minute ($1.20 per hour)
- **Pre-Purchase Packs** (with discounts):
  - Small: 500 minutes for $10 (0% discount)
  - Medium: 1,000 minutes for $18 (10% discount)
  - Large: 2,500 minutes for $40 (20% discount)
  - XLarge: 5,000 minutes for $75 (25% discount)

### How It Works

1. **Base Plan**: Organizations have a monthly minute allocation based on their plan
2. **Overage Packs**: Organizations can pre-purchase additional minutes
3. **Usage Tracking**: System tracks total available minutes (base + purchased overages)
4. **Upload Validation**: Uploads are allowed as long as usage < total available minutes
5. **Pay-As-You-Go**: Any usage beyond purchased overages is billed at $0.02/minute at end of billing cycle
6. **Monthly Reset**: Overage pack minutes reset at the start of each billing period

## Database Schema

### New Columns in `organizations` table:

```sql
-- Paddle payment integration
paddle_customer_id TEXT UNIQUE
paddle_subscription_id TEXT UNIQUE

-- Overage tracking
overage_minutes_purchased INTEGER DEFAULT 0
```

### New `usage_metrics` table:

Tracks overage pack purchases, billing events, and usage warnings:

```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  metric_type TEXT CHECK (metric_type IN ('overage_pack_purchased', 'overage_billed', 'usage_warning', 'limit_reached')),
  metric_value NUMERIC NOT NULL,
  cost_cents INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### 1. Get Overage Packs
**GET** `/api/overage/purchase`

Returns available overage packs with pricing and savings calculations.

**Response:**
```json
{
  "basePrice": 0.02,
  "packs": [
    {
      "id": "small",
      "minutes": 500,
      "price": 10,
      "pricePerMinute": 0.02,
      "savings": 0,
      "savingsPercent": 0,
      "paddlePriceId": "pri_overage_500"
    }
  ]
}
```

### 2. Purchase Overage Pack
**POST** `/api/overage/purchase`

Initiates Paddle checkout for overage pack purchase.

**Request:**
```json
{
  "packSize": "medium",
  "organizationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "checkout": {
    "priceId": "pri_overage_1000",
    "customData": {
      "user_id": "uuid",
      "organization_id": "uuid",
      "pack_size": "medium",
      "type": "overage_pack"
    }
  },
  "pack": {
    "size": "medium",
    "minutes": 1000,
    "price": 18
  }
}
```

### 3. Get Usage Data
**GET** `/api/usage?organizationId=uuid`

Returns current usage with overage information.

**Response:**
```json
{
  "success": true,
  "usage": {
    "minutesUsed": 850,
    "baseMinutes": 500,
    "purchasedOverageMinutes": 1000,
    "totalAvailableMinutes": 1500,
    "overageMinutes": 0,
    "overageCost": 0,
    "percentUsed": 56.67,
    "hasOverage": false,
    "canUpload": true,
    "warningLevel": "none"
  }
}
```

### 4. Paddle Webhook
**POST** `/api/paddle/webhook`

Handles Paddle subscription events including overage pack purchases.

**Webhook Events:**
- `transaction.completed` with `type: overage_pack` → Credits minutes to organization
- `subscription.renewed` → Resets overage minutes to 0

## Core Functions

### `lib/overage.ts`

#### `calculateUsageAndOverage(organizationId, periodStart, periodEnd)`

Calculates comprehensive usage data including overages.

**Returns:**
```typescript
{
  minutesUsed: number;
  baseMinutes: number;
  purchasedOverageMinutes: number;
  totalAvailableMinutes: number;
  overageMinutes: number;  // Minutes used beyond total available
  overageCost: number;      // Cost of unpurchased overages
  percentUsed: number;      // Percentage of total available
  hasOverage: boolean;      // Whether any overages exist
  canUpload: boolean;       // Whether uploads are allowed
}
```

#### `creditOveragePack(organizationId, packSize, transactionId)`

Credits purchased overage pack to organization and creates audit trail.

#### `resetOverageMinutes(organizationId)`

Resets overage minutes at start of new billing period (called from Paddle webhook).

#### `checkUsageWarning(organizationId)`

Checks if organization should receive usage warnings at 80%, 90%, 100% thresholds.

## UI Components

### `OverageBanner` Component

Located at: `components/dashboard/OverageBanner.tsx`

Displays usage warnings and overage purchase options on the dashboard.

**Features:**
- Shows warning at 80% usage
- Shows error at 100% usage (blocked uploads)
- Displays overage pack options with pricing
- Integrates with Paddle checkout
- Auto-refreshes after purchase

**States:**
- **Warning (80-99%)**: Orange banner with upgrade CTA
- **Blocked (100%+)**: Red banner with overage pack purchase options
- **Dismissed**: Can be dismissed by user (session-based)

### Integration in Dashboard

```tsx
import { OverageBanner } from "@/components/dashboard/OverageBanner";

// In dashboard render:
<OverageBanner />
```

## Upload Validation

The upload route (`app/api/calls/upload/route.ts`) now uses overage-aware validation:

```typescript
// Check usage limits BEFORE accepting upload
const usage = await calculateUsageAndOverage(organizationId, periodStart, periodEnd);

if (!usage.canUpload) {
  return NextResponse.json({
    error: 'Monthly transcription limit exceeded',
    details: {
      used: Math.round(usage.minutesUsed),
      baseLimit: usage.baseMinutes,
      overageMinutesAvailable: usage.purchasedOverageMinutes,
      totalLimit: usage.totalAvailableMinutes,
      canPurchaseOverage: true,
    }
  }, { status: 402 }); // Payment Required
}
```

## Paddle Integration

### Environment Variables Required:

```bash
# Paddle Configuration
NEXT_PUBLIC_PADDLE_VENDOR_ID=your_vendor_id
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox  # or 'production'
PADDLE_API_KEY=your_api_key
```

### Paddle Product Setup:

1. Create overage pack products in Paddle dashboard
2. Update `lib/overage.ts` with actual Paddle price IDs:
   ```typescript
   packs: {
     small: { minutes: 500, price: 10, paddlePriceId: 'pri_01xxx' },
     medium: { minutes: 1000, price: 18, paddlePriceId: 'pri_01yyy' },
     large: { minutes: 2500, price: 40, paddlePriceId: 'pri_01zzz' },
     xlarge: { minutes: 5000, price: 75, paddlePriceId: 'pri_01www' },
   }
   ```

### Webhook Configuration:

Configure Paddle webhook URL: `https://yourdomain.com/api/paddle/webhook`

**Events to subscribe:**
- `transaction.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`

## Billing Workflow

### Monthly Cycle:

1. **Start of Month**:
   - Base minutes reset automatically (part of plan)
   - Overage pack minutes reset to 0

2. **During Month**:
   - Users can purchase overage packs anytime
   - Overage packs add to available minutes immediately
   - Usage is tracked against total available minutes

3. **End of Month**:
   - If usage > total available minutes:
     - Calculate unpurchased overage cost
     - Create Paddle adjustment/charge for overage
   - Unused overage pack minutes expire

### Overage Pack Purchase Flow:

1. User clicks "Purchase Overage Pack" in banner
2. API creates Paddle checkout session
3. User completes payment via Paddle
4. Paddle webhook fires `transaction.completed`
5. System credits minutes to organization
6. Dashboard refreshes to show updated limits

## Testing

### Test Scenarios:

1. **Below 80% usage**: No banner shown
2. **80-99% usage**: Orange warning banner
3. **100% usage (with overages available)**: Red error banner
4. **Overage pack purchase**: Test Paddle checkout flow
5. **Upload blocking**: Verify uploads blocked at 100%
6. **Monthly reset**: Test overage reset on subscription renewal

### Test Data:

```sql
-- Manually set overage minutes for testing
UPDATE organizations
SET overage_minutes_purchased = 1000
WHERE id = 'test-org-id';

-- Simulate usage
UPDATE calls
SET duration = 600  -- 10 hours = 600 minutes
WHERE organization_id = 'test-org-id';
```

## Notifications

The system creates notifications for:

1. **Overage Pack Purchased**: Confirms purchase and shows minutes added
2. **Usage Warning (80%)**: Suggests purchasing overage pack
3. **Usage Warning (90%)**: Urgent warning
4. **Limit Reached (100%)**: Blocked with purchase CTA

## Security Considerations

1. **Webhook Verification**: Paddle webhooks are verified using signature
2. **Authorization**: Usage API verifies organization membership
3. **Rate Limiting**: Consider adding rate limiting to overage purchase endpoint
4. **Audit Trail**: All overage purchases logged in `usage_metrics` table

## Migration Steps

To apply the overage system to production:

1. Run migration: `database/003_ADD_OVERAGE_SYSTEM.sql`
2. Configure Paddle environment variables
3. Create overage products in Paddle dashboard
4. Update Paddle price IDs in `lib/overage.ts`
5. Configure Paddle webhook endpoint
6. Test in sandbox environment first
7. Deploy to production

## Future Enhancements

1. **Auto-purchase**: Allow organizations to auto-purchase overage packs at thresholds
2. **Usage analytics**: Show historical overage patterns
3. **Overage rollover**: Option to roll over unused overage minutes (subscription upgrade)
4. **Custom pricing**: Enterprise-specific overage rates
5. **Email alerts**: Email notifications for usage warnings
6. **Slack integration**: Post usage alerts to Slack channels
