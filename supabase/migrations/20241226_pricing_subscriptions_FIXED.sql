-- =====================================================
-- LOADVOICE PRICING & SUBSCRIPTIONS - FIXED VERSION
-- Complete billing and subscription management
-- Fixed to use user_organizations instead of organization_members
-- =====================================================

-- Add Paddle customer ID to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_cancel_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_minutes INTEGER DEFAULT 30;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 1;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_paddle_customer_id ON organizations(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_id ON organizations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paddle_subscription_id TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_type ON subscriptions(plan_type);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  paddle_transaction_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  failure_reason TEXT,
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Pending subscriptions (for checkout tracking)
CREATE TABLE IF NOT EXISTS pending_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  paddle_checkout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Create indexes
CREATE INDEX idx_pending_subscriptions_organization_id ON pending_subscriptions(organization_id);
CREATE INDEX idx_pending_subscriptions_user_id ON pending_subscriptions(user_id);
CREATE INDEX idx_pending_subscriptions_expires_at ON pending_subscriptions(expires_at);

-- Subscription changes log
CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  from_plan TEXT,
  to_plan TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'cancel', 'resume', 'pause')),
  reason TEXT,
  effective_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_subscription_changes_organization_id ON subscription_changes(organization_id);
CREATE INDEX idx_subscription_changes_user_id ON subscription_changes(user_id);
CREATE INDEX idx_subscription_changes_created_at ON subscription_changes(created_at DESC);

-- Usage billing (for overage tracking)
CREATE TABLE IF NOT EXISTS usage_billing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  minutes_included INTEGER NOT NULL,
  minutes_used INTEGER NOT NULL DEFAULT 0,
  overage_minutes INTEGER GENERATED ALWAYS AS (GREATEST(0, minutes_used - minutes_included)) STORED,
  overage_cost INTEGER GENERATED ALWAYS AS (GREATEST(0, minutes_used - minutes_included) * 20) STORED, -- $0.20 per minute in cents
  billed BOOLEAN DEFAULT false,
  billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_usage_billing_organization_id ON usage_billing(organization_id);
CREATE INDEX idx_usage_billing_billing_period ON usage_billing(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_billing_billed ON usage_billing(billed);

-- Email queue for billing notifications
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created_at ON email_queue(created_at);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their organization subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations  -- FIXED: Changed from organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view their organization payments"
  ON payments
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations  -- FIXED: Changed from organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for pending_subscriptions
CREATE POLICY "Users can view their pending subscriptions"
  ON pending_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create pending subscriptions"
  ON pending_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for subscription_changes
CREATE POLICY "Users can view their organization subscription changes"
  ON subscription_changes
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations  -- FIXED: Changed from organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for usage_billing
CREATE POLICY "Users can view their organization usage billing"
  ON usage_billing
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations  -- FIXED: Changed from organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to calculate current period usage
CREATE OR REPLACE FUNCTION get_current_period_usage(org_id UUID)
RETURNS TABLE (
  minutes_used INTEGER,
  minutes_limit INTEGER,
  overage_minutes INTEGER,
  overage_cost INTEGER
) AS $$
DECLARE
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
  limit_minutes INTEGER;
  used_minutes INTEGER;
BEGIN
  -- Get current billing period from organization
  SELECT
    subscription_current_period_start,
    subscription_current_period_end,
    max_minutes
  INTO period_start, period_end, limit_minutes
  FROM organizations
  WHERE id = org_id;

  -- If no subscription, use month boundaries
  IF period_start IS NULL THEN
    period_start := date_trunc('month', NOW());
    period_end := date_trunc('month', NOW() + INTERVAL '1 month');
    limit_minutes := 30; -- Free tier
  END IF;

  -- Calculate usage in current period
  SELECT COALESCE(SUM(metric_value), 0)
  INTO used_minutes
  FROM usage_metrics
  WHERE organization_id = org_id
    AND metric_type = 'minutes_processed'
    AND created_at >= period_start
    AND created_at < period_end;

  RETURN QUERY
  SELECT
    used_minutes::INTEGER,
    limit_minutes::INTEGER,
    GREATEST(0, used_minutes - limit_minutes)::INTEGER,
    (GREATEST(0, used_minutes - limit_minutes) * 20)::INTEGER; -- $0.20 per minute
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if organization can use more minutes
CREATE OR REPLACE FUNCTION can_use_minutes(org_id UUID, requested_minutes INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  usage_data RECORD;
  subscription_status TEXT;
BEGIN
  -- Get current usage
  SELECT * INTO usage_data FROM get_current_period_usage(org_id);

  -- Get subscription status
  SELECT organizations.subscription_status
  INTO subscription_status
  FROM organizations
  WHERE id = org_id;

  -- If canceled or paused, only allow if within limits
  IF subscription_status IN ('canceled', 'paused') THEN
    RETURN (usage_data.minutes_used + requested_minutes) <= usage_data.minutes_limit;
  END IF;

  -- Active subscriptions can go over (will be billed)
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update organization limits when subscription changes
CREATE OR REPLACE FUNCTION update_organization_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update organization limits based on plan
  UPDATE organizations
  SET
    max_minutes = CASE NEW.plan_type
      WHEN 'free' THEN 30
      WHEN 'starter' THEN 500
      WHEN 'solo' THEN 500
      WHEN 'pro' THEN 1500
      WHEN 'professional' THEN 4000
      WHEN 'team' THEN 4000
      WHEN 'enterprise' THEN 15000
      ELSE 30
    END,
    max_members = CASE NEW.plan_type
      WHEN 'free' THEN 1
      WHEN 'starter' THEN 1
      WHEN 'solo' THEN 1
      WHEN 'pro' THEN 3
      WHEN 'professional' THEN 10
      WHEN 'team' THEN 10
      WHEN 'enterprise' THEN 50
      ELSE 1
    END
  WHERE id = NEW.organization_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_limits_on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_limits();

-- Clean up expired pending subscriptions
CREATE OR REPLACE FUNCTION cleanup_expired_pending_subscriptions()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_subscriptions
  WHERE expires_at < NOW()
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT SELECT, INSERT ON pending_subscriptions TO authenticated;
GRANT SELECT ON subscription_changes TO authenticated;
GRANT SELECT ON usage_billing TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_period_usage TO authenticated;
GRANT EXECUTE ON FUNCTION can_use_minutes TO authenticated;